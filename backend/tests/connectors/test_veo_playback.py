"""Spec 260 tasks 2-3: watch and download a Veo match over fakes. The video address
stays in memory: never in status, the cache, a message or a log."""

import json
from contextlib import contextmanager
from pathlib import Path
from typing import Any

import pytest

from app.connectors.hudl_capture import CaptureError
from app.connectors.hudl_index import DownloadIndex
from app.connectors.veo._connection import VeoConnection
from tests.connectors.test_veo_connection import ACTIVE, FakeApi
from tests.connectors.veo_fixtures.synthetic import videos

URL = videos()[0]["url"]
TOTAL = 40_000


class FakeMedia:
    def __init__(self, body: bytes = b"v" * TOTAL, short: bool = False) -> None:
        self.body = body
        self.short = short
        self.ranges: list[tuple[str, int, int | None]] = []
        self.downloads: list[str] = []

    def media_range(self, url: str, start: int, end: int | None) -> tuple[int, int, bytes]:
        self.ranges.append((url, start, end))
        stop = len(self.body) - 1 if end is None else min(end, len(self.body) - 1)
        return start, len(self.body), self.body[start : stop + 1]

    def media_download(self, url: str, target: Path, progress: Any) -> int:
        self.downloads.append(url)
        if self.short:
            target.write_bytes(self.body[:10])
            raise CaptureError("The Veo download was incomplete. Nothing was retried.")
        target.write_bytes(self.body)
        progress(len(self.body), len(self.body))
        return len(self.body)


def setup(tmp_path: Path, media: FakeMedia, probe: Any = lambda path: 3600.0):  # noqa: ANN201
    api = FakeApi()
    sessions: list[int] = []

    @contextmanager
    def session(loader):  # noqa: ANN001, ANN202
        sessions.append(1)
        yield api

    folder = tmp_path / "downloads"
    index = DownloadIndex(tmp_path / "index.json")
    veo = VeoConnection(
        lambda: None,
        tmp_path / "veo",
        session=session,
        run=lambda work: work(),
        media=media,
        probe=probe,
        index=index,
        folder=lambda: folder,
    )
    return veo, api, sessions, folder, index


IDENTITY = f"veo-{ACTIVE['identifier']}"


def everything(veo: VeoConnection, tmp_path: Path) -> str:
    return (
        json.dumps(veo.status())
        + repr(veo)
        + "".join(p.read_text(errors="ignore") for p in tmp_path.rglob("*.json"))
    )


def test_watch_after_refresh_needs_no_new_sign_in_and_hides_the_address(tmp_path: Path) -> None:
    veo, api, sessions, _, _ = setup(tmp_path, FakeMedia())
    veo.start("refresh")
    calls = len(api.paths)
    veo.start("watch", IDENTITY)
    status = veo.status()
    assert status["state"] == "ready" and status["match_id"] == IDENTITY
    assert status["stream_url"].startswith("http://127.0.0.1:8766/veo/stream/")
    assert len(api.paths) == calls and len(sessions) == 1
    assert URL not in everything(veo, tmp_path)


def test_watch_without_a_refresh_signs_in_once_and_reads_only_that_match(tmp_path: Path) -> None:
    veo, api, sessions, _, _ = setup(tmp_path, FakeMedia())
    veo.start("refresh")
    fresh, api2, sessions2, _, _ = setup(tmp_path, FakeMedia())  # a restarted helper
    fresh.start("watch", IDENTITY)
    assert fresh.status()["state"] == "ready"
    assert api2.paths == [f"/api/app/matches/{ACTIVE['slug']}/videos/"]
    assert len(sessions2) == 1


def test_stream_serves_ranges_for_its_own_token_only(tmp_path: Path) -> None:
    media = FakeMedia()
    veo, _, _, _, _ = setup(tmp_path, media)
    veo.start("refresh")
    veo.start("watch", IDENTITY)
    token = veo.status()["stream_url"].rsplit("/", 1)[1]
    assert veo.stream(token, "bytes=100-199") == (100, 199, TOTAL, b"v" * 100)
    start, end, total, body = veo.stream(token, None)
    assert (start, total) == (0, TOTAL) and end == len(body) - 1
    assert media.ranges[0] == (URL, 100, 199)
    with pytest.raises(CaptureError, match="expired"):
        veo.stream("not-the-token", "bytes=0-1")
    with pytest.raises(CaptureError):
        veo.stream(token, "bytes=oops")


def test_watch_refuses_a_match_without_video(tmp_path: Path) -> None:
    veo, _, _, _, _ = setup(tmp_path, FakeMedia())
    veo.start("refresh")
    with pytest.raises(CaptureError, match="no video"):
        veo.start("watch", "veo-not-a-match")


def test_download_writes_a_part_file_then_renames_and_indexes(tmp_path: Path) -> None:
    veo, _, _, folder, index = setup(tmp_path, FakeMedia())
    veo.start("refresh")
    veo.start("download", IDENTITY)
    status = veo.status()
    assert status["state"] == "done", status["message"]
    files = sorted(p.name for p in folder.iterdir())
    assert len(files) == 1 and files[0].startswith("veo-") and files[0].endswith("-1080p.mp4")
    assert (folder / files[0]).stat().st_size == TOTAL
    entry = index.entries(folder)[0]
    assert entry["kind"] == "match" and entry["match_id"] == IDENTITY
    assert URL not in everything(veo, tmp_path)


def test_an_existing_download_is_never_overwritten_or_fetched(tmp_path: Path) -> None:
    media = FakeMedia()
    veo, _, _, folder, _ = setup(tmp_path, media)
    veo.start("refresh")
    veo.start("download", IDENTITY)
    target = next(folder.iterdir())
    target.write_bytes(b"owner's copy")
    media.downloads.clear()
    veo.start("download", IDENTITY)
    assert target.read_bytes() == b"owner's copy"
    assert media.downloads == []
    assert "already" in veo.status()["message"]


@pytest.mark.parametrize("problem", ["short", "unreadable"])
def test_a_bad_download_stays_a_part_file(tmp_path: Path, problem: str) -> None:
    probe = (lambda path: None) if problem == "unreadable" else (lambda path: 3600.0)
    veo, _, _, folder, index = setup(tmp_path, FakeMedia(short=problem == "short"), probe=probe)
    veo.start("refresh")
    veo.start("download", IDENTITY)
    assert veo.status()["state"] == "error"
    assert [p.suffix for p in folder.iterdir()] == [".part"]
    assert index.entries(folder) == []


def test_streaming_waits_while_a_download_runs(tmp_path: Path) -> None:
    held: list[Any] = []
    veo, _, _, _, _ = setup(tmp_path, FakeMedia())
    veo._run = held.append  # the download is queued, not finished
    veo.start("refresh")
    held.pop()()
    veo.start("watch", IDENTITY)
    held.pop()()
    token = veo.status()["stream_url"].rsplit("/", 1)[1]
    veo.start("download", IDENTITY)
    with pytest.raises(CaptureError, match="download"):
        veo.stream(token, "bytes=0-1")
