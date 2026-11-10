import csv
import hashlib
from unittest.mock import MagicMock, patch

import pytest

from app.connectors.hudl_browser import BrowserConnection, Observation
from app.connectors.hudl_capture import CaptureError
from tests.connectors.test_hudl_capture import VIDEO, payload

MASTER = "https://video.hudl.com/master.m3u8"
MASTER_BODY = "#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=100,RESOLUTION=1280x720\nchild.m3u8\n"
MEDIA = b"#EXTM3U\n#EXT-X-TARGETDURATION:4\n#EXTINF:4,\npart.ts\n#EXT-X-ENDLIST\n"


def observation():
    observed = Observation(VIDEO)
    observed.manifests[MASTER] = MASTER_BODY
    observed.payloads = [payload(synced=False, start=1000, end=2000)]
    return observed


def test_unsynced_tags_do_not_block_preparing_video_stream(tmp_path):
    connection = BrowserConnection(MagicMock(), MagicMock(), tmp_path / "inbox")
    connection._page = MagicMock()
    connection._page.locator.return_value.first.evaluate.return_value = 4.0
    with (
        patch.object(connection, "_observe", return_value=observation()),
        patch("app.connectors.hudl_browser.fetch_media", side_effect=[MASTER_BODY.encode(), MEDIA]),
    ):
        connection._prepare_stream(VIDEO)
    assert connection.status()["stream_url"].startswith("http://127.0.0.1:8766/stream/")
    assert connection.details.read(VIDEO)["tag_status"] == "unsynced"
    assert connection.details.read(VIDEO)["moments"] == []
    connection._executor.shutdown()


def test_unsynced_tags_do_not_block_verified_full_video_copy(tmp_path, tiny_video):
    connection = BrowserConnection(MagicMock(), MagicMock(), tmp_path / "inbox")
    connection._page = MagicMock()
    connection._page.locator.return_value.first.evaluate.return_value = 4.0
    with (
        patch.object(connection, "_observe", return_value=observation()),
        patch("app.connectors.hudl_browser.capture_hls", return_value=(tiny_video, 4.0)),
    ):
        saved = connection._download(VIDEO)
    assert (
        hashlib.sha256(saved.read_bytes()).digest()
        == hashlib.sha256(tiny_video.read_bytes()).digest()
    )
    with saved.with_suffix(".tags.csv").open() as stream:
        assert list(csv.DictReader(stream)) == []
    assert connection.details.read(VIDEO)["tag_status"] == "unsynced"
    assert connection.status()["filename"] == saved.name
    connection._executor.shutdown()


def test_tag_graphql_errors_still_stop_video_preparation(tmp_path):
    connection = BrowserConnection(MagicMock(), MagicMock(), tmp_path / "inbox")
    connection._page = MagicMock()
    connection._page.locator.return_value.first.evaluate.return_value = 4.0
    observed = observation()
    observed.payloads = [{"errors": [{"message": "synthetic access failure"}]}]
    with (
        patch.object(connection, "_observe", return_value=observed),
        patch("app.connectors.hudl_browser.fetch_media", side_effect=[MASTER_BODY.encode(), MEDIA]),
        pytest.raises(CaptureError, match="could not return the tag data"),
    ):
        connection._prepare_stream(VIDEO)
    assert connection.status()["stream_url"] is None
    connection._executor.shutdown()
