"""Spec 260 tasks 2-3: Veo's video files, read through _client only. A fake opener stands
in for c.veocdn.com (owner-approved check 2026-11-13: public MP4, Range answered 206)."""

import io
import urllib.error
from pathlib import Path

import pytest

from app.connectors.hudl_capture import CaptureError
from app.connectors.veo._client import CHUNK, media_download, media_range

URL = "https://c.veocdn.com/synthetic/match.mp4"
TOTAL = 50_000_000


class Response(io.BytesIO):
    def __init__(self, status: int, headers: dict[str, str], body: bytes) -> None:
        super().__init__(body)
        self.status = status
        self.headers = headers


class Opener:
    def __init__(self, respond) -> None:  # noqa: ANN001
        self.respond = respond
        self.sent: list[tuple[str, str, dict[str, str]]] = []

    def __call__(self, request, timeout):  # noqa: ANN001, ANN204
        headers = {k.lower(): v for k, v in request.header_items()}
        self.sent.append((request.get_method(), request.full_url, headers))
        return self.respond(headers)


def ranged(headers: dict[str, str]) -> Response:
    start, _, end = headers["range"].removeprefix("bytes=").partition("-")
    first, last = int(start), int(end)
    return Response(
        206, {"Content-Range": f"bytes {first}-{last}/{TOTAL}"}, b"x" * (last - first + 1)
    )


def test_reads_one_capped_range_and_reports_the_total() -> None:
    opener = Opener(ranged)
    start, total, body = media_range(URL, 100, None, opener=opener)
    assert (start, total, len(body)) == (100, TOTAL, CHUNK)
    assert opener.sent == [("GET", URL, {"range": f"bytes=100-{100 + CHUNK - 1}"})]
    _, _, small = media_range(URL, 0, 1023, opener=opener)
    assert len(small) == 1024


def test_refuses_anything_but_veos_video_host_before_any_request() -> None:
    opener = Opener(ranged)
    for url in (
        "http://c.veocdn.com/synthetic/match.mp4",
        "https://evil.test/match.mp4",
        "https://c.veocdn.com.evil.test/match.mp4",
        "https://c.veocdn.com/synthetic/match.mp4?token=x",
        "https://c.veocdn.com/synthetic/page.html",
    ):
        with pytest.raises(CaptureError):
            media_range(url, 0, 10, opener=opener)
    assert opener.sent == []


@pytest.mark.parametrize("status", [302, 403, 429, 500])
def test_stops_on_a_refusal_or_redirect_without_retrying(status: int) -> None:
    def refuse(headers: dict[str, str]) -> Response:
        raise urllib.error.HTTPError(URL, status, "no", {}, None)  # type: ignore[arg-type]

    opener = Opener(refuse)
    with pytest.raises(CaptureError) as error:
        media_range(URL, 0, 10, opener=opener)
    assert len(opener.sent) == 1
    assert URL not in str(error.value)


def test_a_range_answer_that_does_not_match_is_refused() -> None:
    opener = Opener(lambda h: Response(200, {}, b"whole file"))
    with pytest.raises(CaptureError):
        media_range(URL, 0, 10, opener=opener)


def test_downloads_the_whole_file_into_the_given_part_file(tmp_path: Path) -> None:
    body = b"m" * 3_000_000
    opener = Opener(lambda h: Response(200, {"Content-Length": str(len(body))}, body))
    seen: list[tuple[int, int]] = []
    part = tmp_path / "veo-x-1080p.mp4.part"
    assert media_download(
        URL, part, lambda done, total: seen.append((done, total)), opener=opener
    ) == len(body)
    assert part.read_bytes() == body
    assert seen[-1] == (len(body), len(body))
    assert opener.sent == [("GET", URL, {})]


def test_a_short_download_is_an_error(tmp_path: Path) -> None:
    opener = Opener(lambda h: Response(200, {"Content-Length": "5000"}, b"m" * 100))
    with pytest.raises(CaptureError, match="incomplete"):
        media_download(URL, tmp_path / "x.part", lambda d, t: None, opener=opener)
