"""Owner request 2026-11-13: highlight reels from a Veo match. The helper cuts the
chosen highlights from the full match saved on this computer (downloading it first
if needed, through the same path as Download), then joins them with the title cards.
Synthetic video and fakes only; no Veo."""

import subprocess
from pathlib import Path

import pytest

from app.connectors.hudl_batch import CardStore
from app.connectors.hudl_capture import CaptureError
from app.connectors.veo._connection import VeoConnection
from app.services.media import probe
from tests.connectors.test_veo_playback import IDENTITY, FakeMedia, setup


def _video(path: Path, seconds: int, colour: str = "testsrc") -> Path:
    source = (
        "testsrc=size=160x120:rate=25"
        if colour == "testsrc"
        else f"color=c={colour}:size=160x120:rate=25"
    )
    subprocess.run(
        [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-f",
            "lavfi",
            "-i",
            source,
            "-f",
            "lavfi",
            "-i",
            "sine=frequency=440:sample_rate=48000",
            "-t",
            str(seconds),
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            str(path),
        ],
        check=True,
    )
    return path


@pytest.fixture(scope="module")
def match_video(tmp_path_factory: pytest.TempPathFactory) -> Path:
    return _video(tmp_path_factory.mktemp("veo-match") / "match.mp4", 20)


def _ready(tmp_path: Path, media: FakeMedia):  # noqa: ANN202
    veo, api, sessions, folder, index = setup(tmp_path, media)
    veo.cards = CardStore(tmp_path / "cards")
    veo.start("refresh")
    library = veo.library()
    for item in library:
        if item["id"] == IDENTITY:
            item["moments"] = [
                {"id": "h-1", "category": "SHOT ON GOAL", "time_s": 2.0, "duration_s": 3.0},
                {"id": "h-2", "category": "GOAL", "time_s": 10.0, "duration_s": 4.0},
                {"id": "h-3", "category": "GOAL", "time_s": 15.0, "duration_s": 4.0},
            ]
    veo._write(library)
    return veo, api, sessions, folder, index


def _card(veo: VeoConnection, tmp_path: Path) -> str:
    return veo.cards.save(_video(tmp_path / "card-src.mp4", 1, "navy").read_bytes())


def _seed_download(veo: VeoConnection, folder: Path, index, match_video: Path) -> Path:  # noqa: ANN001
    folder.mkdir(parents=True, exist_ok=True)
    saved = folder / "Riverside v Northgate 2026-11-08.mp4"
    saved.write_bytes(match_video.read_bytes())
    item = veo._match(IDENTITY)
    index.record("match", IDENTITY, item["title"], saved, folder, item["moments"])
    return saved


def test_reel_from_a_downloaded_match_needs_no_veo_request(
    tmp_path: Path, match_video: Path
) -> None:
    media = FakeMedia()
    veo, api, sessions, folder, index = _ready(tmp_path, media)
    saved = _seed_download(veo, folder, index, match_video)
    (folder / "reels").mkdir()
    other = folder / "reels" / "Norton Lindsay v Town (abcd1234).mp4"
    other.write_bytes(b"an earlier reel")
    before = saved.read_bytes()
    calls, signed_in = len(api.paths), len(sessions)
    card = _card(veo, tmp_path)

    veo.start(
        "reel",
        IDENTITY,
        name="Norton Lindsay v Northgate",
        reel={"moment_ids": ["h-1", "h-2"], "opening_card": card},
    )

    status = veo.status()
    assert status["state"] == "done", status["message"]
    assert status["filename"].startswith("reels/Norton Lindsay v Northgate (")
    output = folder / status["filename"]
    info = probe(output)
    assert info.video_codec == "h264" and info.audio_codec == "aac"
    assert 7.0 < info.duration_s < 9.5  # card 1 s + highlights 3 s + 4 s
    assert (len(api.paths), len(sessions), media.downloads) == (calls, signed_in, [])
    assert saved.read_bytes() == before and other.read_bytes() == b"an earlier reel"
    reels = [e for e in index.entries(folder) if e["kind"] == "reel"]
    assert [e["match_id"] for e in reels] == [IDENTITY]
    assert not veo.cards.path(card).exists()  # used once, then removed
    assert not list(folder.rglob(".veo-reel-*"))  # scratch cleaned up


@pytest.fixture(scope="module")
def long_video(tmp_path_factory: pytest.TempPathFactory) -> Path:
    """90 s at about 2 Mbit/s (~22 MB): big enough that what the local connection
    buffers before ffmpeg hangs up is a small part of it, as with a real match."""
    path = tmp_path_factory.mktemp("veo-long") / "long.mp4"
    subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
         "-f", "lavfi", "-i", "testsrc=size=640x360:rate=25",
         "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000", "-t", "90",
         "-c:v", "libx264", "-b:v", "2M", "-x264-params", "nal-hrd=cbr",
         "-minrate", "2M", "-maxrate", "2M", "-bufsize", "1M",
         "-pix_fmt", "yuv420p", "-c:a", "aac", str(path)],
        check=True,
    )  # fmt: skip
    return path


class ChunkedMedia(FakeMedia):
    """Answers each range with at most 64 KB, as Veo's host is read (8 MB) in the app."""

    def __init__(self, body: bytes, refuse_after: int | None = None) -> None:
        super().__init__(body=body)
        self.sent = 0
        self.refuse_after = refuse_after

    def media_range(self, url: str, start: int, end: int | None) -> tuple[int, int, bytes]:
        if self.refuse_after is not None and len(self.ranges) >= self.refuse_after:
            from app.connectors.veo._client import VeoRefused

            raise VeoRefused(403)
        stop = start + 65_535 if end is None else min(end, start + 65_535)
        first, total, body = super().media_range(url, start, stop)
        self.sent += len(body)
        return first, total, body


# Owner request 2026-11-15 (replaces "downloads the full match first"): like Hudl, a
# reel from a match not saved on this computer reads only the parts its highlights
# need, not the whole match.
def test_reel_reads_only_the_parts_it_needs_when_the_match_is_not_saved(
    tmp_path: Path, long_video: Path
) -> None:
    media = ChunkedMedia(long_video.read_bytes())
    veo, _, _, folder, index = _ready(tmp_path, media)
    library = veo.library()
    for item in library:
        if item["id"] == IDENTITY:
            item["moments"] = [{"id": "h-9", "category": "GOAL", "time_s": 60.0, "duration_s": 4.0}]
    veo._write(library)

    veo.start("reel", IDENTITY, name="Riverside highlights", reel={"moment_ids": ["h-9"]})

    status = veo.status()
    assert status["state"] == "done", status["message"]
    assert media.downloads == []
    assert [e["kind"] for e in index.entries(folder)] == ["reel"]
    assert 3.0 < probe(folder / status["filename"]).duration_s < 5.0
    assert 0 < media.sent < len(media.body) * 0.6  # not the whole match
    assert "http" not in status["message"]


def test_a_refusal_while_reading_a_part_saves_nothing(tmp_path: Path, long_video: Path) -> None:
    media = ChunkedMedia(long_video.read_bytes(), refuse_after=1)
    veo, _, _, folder, _ = _ready(tmp_path, media)
    veo.start("moments", IDENTITY, name="x", reel={"moment_ids": ["h-2"], "combined": True})
    status = veo.status()
    assert status["state"] == "error"
    assert "http" not in status["message"]
    assert not (folder / "moments").exists() or not any(
        p.suffix in {".mp4", ".zip"} for p in (folder / "moments").iterdir()
    )
    assert media.downloads == []


def test_reel_with_no_known_highlight_saves_nothing(tmp_path: Path, match_video: Path) -> None:
    veo, _, _, folder, index = _ready(tmp_path, FakeMedia())
    _seed_download(veo, folder, index, match_video)
    veo.start("reel", IDENTITY, name="Empty", reel={"moment_ids": ["nope"]})
    assert veo.status()["state"] == "error"
    assert not (folder / "reels").exists() or not list((folder / "reels").iterdir())


def test_reel_needs_a_match_veo_still_has(tmp_path: Path) -> None:
    veo, *_ = _ready(tmp_path, FakeMedia())
    with pytest.raises(CaptureError):
        veo.start("reel", "veo-unknown", name="x", reel={"moment_ids": ["h-1"]})


# Owner request 2026-11-13: download the ticked Veo highlights, as on a Hudl match.


def test_selected_highlights_download_as_one_video(tmp_path: Path, match_video: Path) -> None:
    media = FakeMedia()
    veo, api, sessions, folder, index = _ready(tmp_path, media)
    saved = _seed_download(veo, folder, index, match_video)
    before, calls = saved.read_bytes(), len(api.paths)

    veo.start(
        "moments",
        IDENTITY,
        name="Norton Lindsay v Northgate",
        reel={"moment_ids": ["h-2", "h-1"], "combined": True},
    )

    status = veo.status()
    assert status["state"] == "done", status["message"]
    assert status["filename"].startswith("moments/Norton Lindsay v Northgate moments (")
    assert status["filename"].endswith(".mp4")
    info = probe(folder / status["filename"])
    assert info.video_codec == "h264" and 6.0 < info.duration_s < 8.5  # 3 s + 4 s
    assert (len(api.paths), media.downloads) == (calls, [])
    assert saved.read_bytes() == before
    entry = next(e for e in index.entries(folder) if e["kind"] == "moments")
    assert entry["match_id"] == IDENTITY and entry["combined"] is True


def test_selected_highlights_download_as_separate_files_in_a_zip(
    tmp_path: Path, match_video: Path
) -> None:
    import zipfile

    veo, _, _, folder, index = _ready(tmp_path, FakeMedia())
    _seed_download(veo, folder, index, match_video)

    veo.start(
        "moments",
        IDENTITY,
        name="Norton Lindsay v Northgate",
        reel={"moment_ids": ["h-1", "h-3"], "combined": False},
    )

    status = veo.status()
    assert status["state"] == "done", status["message"]
    assert status["filename"].endswith(".zip")
    with zipfile.ZipFile(folder / status["filename"]) as archive:
        names = archive.namelist()
    assert names == ["01 0-02 SHOT ON GOAL.mp4", "02 0-15 GOAL.mp4"]
    assert not list(folder.rglob(".veo-reel-*"))


# Owner request 2026-11-15: a team event (from Veo's team data) downloads like a highlight.
def test_a_team_event_downloads_like_a_highlight(tmp_path: Path, match_video: Path) -> None:
    media = FakeMedia()
    veo, api, sessions, folder, index = _ready(tmp_path, media)
    library = veo.library()
    for item in library:
        if item["id"] == IDENTITY:
            item["team_data"] = {
                "stats": {},
                "events": [{"type": "CORNER KICK", "side": "own", "time_s": 12.0, "period": 1}],
            }
    veo._write(library)
    _seed_download(veo, folder, index, match_video)
    veo.start(
        "moments",
        IDENTITY,
        name="Riverside v Northgate",
        reel={"moment_ids": ["t-own-corner-kick-12000"], "combined": True},
    )
    status = veo.status()
    assert status["state"] == "done", status["message"]
    info = probe(folder / status["filename"])
    assert 14.0 < info.duration_s < 16.0  # from 2 s (10 s before the corner), 15 s long


# Real-match check 2026-11-15: a 15 s clip came out 13.6 s, because ffmpeg took the end
# of one capped answer for the end of the file. A clip longer than one answer must
# come out whole.
def test_a_clip_longer_than_one_read_comes_out_whole(tmp_path: Path, long_video: Path) -> None:
    media = ChunkedMedia(long_video.read_bytes())
    veo, _, _, folder, _ = _ready(tmp_path, media)
    library = veo.library()
    for item in library:
        if item["id"] == IDENTITY:
            item["moments"] = [
                {"id": "h-8", "category": "GOAL", "time_s": 20.0, "duration_s": 40.0}
            ]
    veo._write(library)
    veo.start("moments", IDENTITY, name="x", reel={"moment_ids": ["h-8"], "combined": True})
    status = veo.status()
    assert status["state"] == "done", status["message"]
    assert 39.0 < probe(folder / status["filename"]).duration_s < 41.0
    assert media.downloads == []


# Owner request 2026-11-15: the team stats card plays after the highlights, before the
# closing card, and is removed once used.
def test_reel_puts_the_team_stats_card_after_the_highlights(
    tmp_path: Path, match_video: Path
) -> None:
    from unittest.mock import patch

    media = FakeMedia()
    veo, _, _, folder, index = _ready(tmp_path, media)
    _seed_download(veo, folder, index, match_video)
    match_card, stats, closing = (_card(veo, tmp_path) for _ in range(3))
    card_names = [veo.cards.path(c).name for c in (match_card, stats, closing)]
    seen: list[list[Path]] = []

    def fake_assemble(parts, output, **kwargs):  # noqa: ANN001, ANN003, ANN202
        seen.append(list(parts))
        output.write_bytes(match_video.read_bytes())

    with patch("app.connectors.veo._reels.assemble_reel", side_effect=fake_assemble):
        veo.start(
            "reel",
            IDENTITY,
            name="R",
            reel={
                "moment_ids": ["h-1", "h-2"],
                "match_card": match_card,
                "stats_card": stats,
                "closing_card": closing,
            },
        )
    assert veo.status()["state"] == "done", veo.status()["message"]
    names = [p.name for p in seen[0]]
    assert names[0] == card_names[0]
    assert names[1:3] == ["clip-0001.mp4", "clip-0002.mp4"]
    assert names[3:] == card_names[1:]
    assert not veo.cards.path(stats).exists()


class _Overlap:
    """Counts how many calls are in progress at once."""

    def __init__(self) -> None:
        import threading

        self.lock = threading.Lock()
        self.active = self.peak = 0

    def __enter__(self) -> None:
        with self.lock:
            self.active += 1
            self.peak = max(self.peak, self.active)

    def __exit__(self, *exc: object) -> None:
        with self.lock:
            self.active -= 1


class OverlapMedia(ChunkedMedia):
    """Each read of Veo's video host takes a moment, so overlapping reads can be seen."""

    def __init__(self, body: bytes) -> None:
        super().__init__(body)
        self.overlap = _Overlap()

    def media_range(self, url: str, start: int, end: int | None) -> tuple[int, int, bytes]:
        import time

        with self.overlap:
            time.sleep(0.02)
            return super().media_range(url, start, end)


def _five_highlights(veo: VeoConnection) -> None:
    library = veo.library()
    for item in library:
        if item["id"] == IDENTITY:
            item["moments"] = [
                {"id": f"h-{n}", "category": "GOAL", "time_s": 10.0 + 15 * n, "duration_s": d}
                for n, d in enumerate((2.0, 3.0, 4.0, 5.0, 6.0))
            ]
    veo._write(library)


# Owner request 2026-11-28 ("enable Veo reels to make more simultaneous requests"):
# highlights of a match not saved here are cut at the same time, reading Veo's video
# host up to three reads at once, and the reel keeps match order.
def test_a_reel_reads_several_highlights_from_veo_at_once_but_never_more_than_three(
    tmp_path: Path, long_video: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    import os

    from app.connectors.veo import _reels

    monkeypatch.setattr(os, "cpu_count", lambda: 30)  # room for more than three by CPU
    monkeypatch.setattr(_reels, "memory_limit", lambda: None)
    media = OverlapMedia(long_video.read_bytes())
    veo, _, _, folder, _ = _ready(tmp_path, media)
    _five_highlights(veo)
    lengths: list[float] = []
    real_assemble = _reels.assemble_reel

    def spy(parts, output, **kwargs):  # noqa: ANN001, ANN003, ANN202
        lengths.extend(round(probe(p).duration_s) for p in parts)
        return real_assemble(parts, output, **kwargs)

    monkeypatch.setattr(_reels, "assemble_reel", spy)
    veo.start("reel", IDENTITY, name="R", reel={"moment_ids": [f"h-{n}" for n in range(5)]})

    status = veo.status()
    assert status["state"] == "done", status["message"]
    assert 2 <= media.overlap.peak <= 3
    assert lengths == [2, 3, 4, 5, 6]
    assert media.downloads == []


def test_highlights_from_a_saved_match_are_cut_at_the_same_time(
    tmp_path: Path, match_video: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    import os

    from app.connectors.veo import _reels

    monkeypatch.setattr(os, "cpu_count", lambda: 9)
    monkeypatch.setattr(_reels, "memory_limit", lambda: None)
    overlap, real = _Overlap(), _reels._ffmpeg

    def slow_ffmpeg(arguments: list[str]) -> bool:
        import time

        with overlap:
            time.sleep(0.3)
            return real(arguments)

    monkeypatch.setattr(_reels, "_ffmpeg", slow_ffmpeg)
    media = FakeMedia()
    veo, api, _, folder, index = _ready(tmp_path, media)
    _seed_download(veo, folder, index, match_video)
    veo.start("reel", IDENTITY, name="R", reel={"moment_ids": ["h-1", "h-2", "h-3"]})
    assert veo.status()["state"] == "done", veo.status()["message"]
    assert overlap.peak >= 2
    assert media.ranges == []
