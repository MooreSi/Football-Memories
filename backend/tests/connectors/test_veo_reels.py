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


def test_reel_downloads_the_full_match_first_when_it_is_not_saved(
    tmp_path: Path, match_video: Path
) -> None:
    media = FakeMedia(body=match_video.read_bytes())
    veo, _, _, folder, index = _ready(tmp_path, media)

    veo.start("reel", IDENTITY, name="Riverside highlights", reel={"moment_ids": ["h-3"]})

    status = veo.status()
    assert status["state"] == "done", status["message"]
    assert len(media.downloads) == 1
    kinds = sorted(e["kind"] for e in index.entries(folder))
    assert kinds == ["match", "reel"]  # the full match is kept in the archive too
    assert 3.0 < probe(folder / status["filename"]).duration_s < 5.0
    assert "http" not in status["message"]


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
