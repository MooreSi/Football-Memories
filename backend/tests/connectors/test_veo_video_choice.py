"""Owner report 2026-11-26: analysing 260926 Racing Club Warwick vs. NL failed with "The
Veo connection only reads Veo's own match videos." Veo's video list for that match led
with an entry the app may not read. The app now uses the first entry it can read
(standard preferred), and says what Veo offered when none qualifies, never the address."""

from pathlib import Path
from typing import Any

import pytest

from tests.connectors.test_veo_connection import ACTIVE
from tests.connectors.test_veo_playback import IDENTITY, FakeMedia, everything, setup

VIDEOS = f"/api/app/matches/{ACTIVE['slug']}/videos/"
GOOD = "https://c.veocdn.com/synthetic/match-follow.mp4"


def video(url: str, render: str = "standard", available: str = "available") -> dict[str, Any]:
    return {
        "availability": available,
        "mime_type": "video/mp4",
        "width": 1920,
        "height": 1080,
        "render_type": render,
        "url": url,
    }


class Watched:
    def __init__(self, veo: Any, error: str | None) -> None:
        self.veo, self.error = veo, error

    def status(self) -> dict[str, Any]:
        if self.error is not None:
            return {"state": "error", "message": self.error}
        return self.veo.status()  # type: ignore[no-any-return]

    def stream(self, token: str, header: str) -> Any:
        return self.veo.stream(token, header)


def watch_with(tmp_path: Path, listed: list[dict[str, Any]]) -> tuple[Watched, FakeMedia]:
    first, _, _, _, _ = setup(tmp_path, FakeMedia())
    first.start("refresh")  # the library cache on disk, as after any earlier Refresh
    media = FakeMedia()
    veo, api, _, _, _ = setup(tmp_path, media)  # a restarted helper: no video in memory
    api.pages[VIDEOS] = ({}, listed)
    try:
        veo.start("watch", IDENTITY)
    except Exception as error:  # noqa: BLE001 (start may raise or report; both count)
        return Watched(veo, str(error)), media
    return Watched(veo, None), media


def test_a_readable_render_is_used_when_the_standard_one_is_elsewhere(tmp_path: Path) -> None:
    veo, media = watch_with(
        tmp_path,
        [
            video("https://other.example-cdn.net/synthetic/match.mp4"),
            video(GOOD, render="follow"),
        ],
    )
    assert veo.status()["state"] == "ready"
    token = veo.status()["stream_url"].rsplit("/", 1)[1]
    veo.stream(token, "bytes=0-9")
    assert media.ranges == [(GOOD, 0, 9)]


def test_the_standard_render_is_still_preferred_among_readable_ones(tmp_path: Path) -> None:
    standard = "https://c.veocdn.com/synthetic/match-standard.mp4"
    veo, media = watch_with(tmp_path, [video(GOOD, render="follow"), video(standard)])
    token = veo.status()["stream_url"].rsplit("/", 1)[1]
    veo.stream(token, "bytes=0-9")
    assert media.ranges == [(standard, 0, 9)]


@pytest.mark.parametrize(
    ("url", "reason"),
    [
        ("https://other.example-cdn.net/synthetic/match.mp4", "other.example-cdn.net"),
        ("https://c.veocdn.com/synthetic/match.mp4?Signature=secret-token", "a signed address"),
        ("https://c.veocdn.com/synthetic/playlist.m3u8", "a .m3u8 stream"),
    ],
)
def test_no_readable_render_names_what_veo_offered_but_not_the_address(
    tmp_path: Path, url: str, reason: str
) -> None:
    veo, media = watch_with(tmp_path, [video(url)])
    status = veo.status()
    assert status["state"] == "error"
    assert reason in status["message"]
    assert "secret-token" not in status["message"] + everything(veo.veo, tmp_path)
    assert url not in status["message"] + everything(veo.veo, tmp_path)
    assert media.ranges == []


def test_unavailable_renders_are_still_ignored(tmp_path: Path) -> None:
    veo, _ = watch_with(tmp_path, [video(GOOD, available="processing")])
    assert veo.status()["state"] == "error"
    assert veo.status()["message"] == "Veo has no video for this match."
