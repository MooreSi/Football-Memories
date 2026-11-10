"""Spec 190: full-resolution match snapshots grabbed from the stream, replacing
Hudl's 320x240 library thumbnails on the match page and in the Library."""

from fastapi.testclient import TestClient

from app.connectors.hudl_companion import create_companion
from app.connectors.hudl_posters import poster_from_playlist
from app.services.media import probe
from tests.connectors.test_hudl_segment_exports import hls  # noqa: F401 (fixture)

ORIGIN = {"Origin": "http://127.0.0.1:8765"}


def test_poster_is_one_frame_at_the_stream_resolution_from_one_segment(hls, tiny_video, tmp_path):  # noqa: F811
    playlist, segments = hls
    fetched = []
    target = tmp_path / "poster.jpg"

    def fetch(index):
        fetched.append(index)
        return segments[index]

    assert poster_from_playlist(playlist, fetch, target) is True
    assert target.read_bytes().startswith(b"\xff\xd8\xff")
    source, poster = probe(tiny_video), probe(target)
    assert (poster.width, poster.height) == (source.width, source.height)
    assert len(fetched) == 1  # never the whole match


def test_poster_failure_leaves_nothing_behind(tmp_path):
    target = tmp_path / "poster.jpg"
    assert poster_from_playlist("#EXTM3U\n", lambda i: b"", target) is False
    assert not target.exists()


def test_library_prefers_the_full_resolution_poster(tmp_path):
    app = create_companion(tmp_path / "inbox")
    app.state.catalogue.replace(
        [{"id": "a", "title": "U10 vs Rovers", "url": "https://www.hudl.com/watch/video/a"}]
    )
    app.state.details.image("a", b"\xff\xd8\xffsmall-thumbnail")
    with TestClient(app, base_url="http://127.0.0.1:8766") as client:
        item = client.get("/library", headers=ORIGIN).json()[0]
        assert item["thumbnail_url"].endswith("/account/match/a/thumbnail")
        assert item["poster_url"] is None
        app.state.details.path("a", ".poster").write_bytes(b"\xff\xd8\xffbig-poster")
        item = client.get("/library", headers=ORIGIN).json()[0]
        assert item["poster_url"].endswith("/account/match/a/poster")
        assert item["thumbnail_url"] == item["poster_url"]
        image = client.get("/account/match/a/poster", headers=ORIGIN)
        assert image.content == b"\xff\xd8\xffbig-poster"
    app.state.account._executor.shutdown()
