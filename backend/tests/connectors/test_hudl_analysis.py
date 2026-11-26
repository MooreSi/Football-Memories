"""Video Lab: a bounded analysis window from a Hudl match, cut from the stream segments only."""

import hashlib
import re
import time
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app.connectors.hudl_browser import BrowserConnection
from app.connectors.hudl_companion import create_companion
from app.services.media import probe
from tests.connectors.test_hudl_segment_exports import hls as hls  # noqa: F401

APP = {"Origin": "http://127.0.0.1:8765"}


def _open_stream(connection, playlist, segments):
    connection._stream_id = "s1"
    connection._stream_match = "match"
    connection._stream_playlist = playlist
    connection._state["stream_url"] = "http://127.0.0.1:8766/stream/s1/playlist.m3u8"
    connection._state["match_id"] = "match"
    connection._assets = {str(i): f"https://video.hudl.com/{i}.ts" for i in range(len(segments))}


def _wait(connection):
    for _ in range(300):
        if not connection.status()["busy"]:
            return connection.status()
        time.sleep(0.05)
    raise AssertionError("analysis did not finish")


def _connection(tmp_path):
    catalogue = MagicMock()
    catalogue.find.return_value = {"id": "match", "title": "261122 U11 v Synthetic (Game 1)"}
    connection = BrowserConnection(MagicMock(), catalogue, tmp_path / "inbox")
    connection.output.mkdir(parents=True)
    connection.details.write(
        "match",
        {
            "tag_status": "synced",
            "moments": [
                {"id": "in", "category": "SAM", "time_s": 1.5, "duration_s": 0.5},
                {"id": "out", "category": "SAM", "time_s": 3.6, "duration_s": 0.2},
            ],
        },
    )
    return connection


def test_analysis_window_fetches_only_its_segments_and_publishes_a_verified_ticket(
    tmp_path,
    hls,  # noqa: F811
):
    playlist, segments = hls
    connection = _connection(tmp_path)
    _open_stream(connection, playlist, segments)
    fetched = []

    def fetch(context, url):
        index = int(re.search(r"/(\d+)\.ts", url)[1])
        fetched.append(index)
        return segments[index]

    with (
        patch.object(connection, "_download", side_effect=AssertionError("no full download")),
        patch.object(connection, "_observe", side_effect=AssertionError("stream already open")),
        patch("app.connectors.hudl_browser._account.fetch_media", side_effect=fetch),
    ):
        connection.start("analysis", "match", window={"start_s": 1.0, "duration_s": 2.0})
        status = _wait(connection)
    assert status["state"] == "done", status["message"]
    assert status["match_id"] == "match"
    assert sorted(set(fetched)) == [1, 2]
    assert status["stream_url"].endswith("/stream/s1/playlist.m3u8")
    ticket = status["analysis_ticket"]
    folder = tmp_path / ".hudl-account" / "analysis" / ticket
    import json

    info = json.loads((folder / "info.json").read_text())
    sample = folder / "sample.mp4"
    assert info["match_id"] == "match"
    assert info["title"] == "261122 U11 v Synthetic (Game 1)"
    assert info["source_offset_s"] == 1.0
    assert info["sha256"] == hashlib.sha256(sample.read_bytes()).hexdigest()
    assert info["size_bytes"] == sample.stat().st_size
    assert info["tags"] == {}  # never relabelled as Veo teacher records by the worker
    media = probe(sample)
    assert media.video_codec == "h264"
    assert abs(media.duration_s - 2.0) < 0.35
    assert not list(connection.output.iterdir())  # nothing added to the user's downloads
    connection._executor.shutdown()


def test_analysis_rejects_a_window_over_ten_minutes_before_touching_hudl(tmp_path):
    connection = _connection(tmp_path)
    with patch.object(connection, "_observe", side_effect=AssertionError("no Hudl request")):
        connection.start("analysis", "match", window={"start_s": 0, "duration_s": 1200})
        status = _wait(connection)
    assert status["state"] == "error"
    assert "ten minutes" in status["message"]
    assert not (tmp_path / ".hudl-account" / "analysis").exists()
    connection._executor.shutdown()


def test_companion_accepts_the_action_and_serves_only_ticket_files(tmp_path):
    app = create_companion(tmp_path / "companion")
    started = []
    app.state.catalogue = MagicMock()
    app.state.account = MagicMock()
    app.state.account.start.side_effect = lambda *a, **k: started.append((a, k))
    folder = tmp_path / ".hudl-account" / "analysis" / ("a" * 32)
    folder.mkdir(parents=True)
    (folder / "info.json").write_text('{"match_id": "match"}')
    (folder / "sample.mp4").write_bytes(b"synthetic")
    with TestClient(app, base_url="http://127.0.0.1:8766") as client:
        accepted = client.post(
            "/account/action",
            headers=APP,
            json={"action": "analysis", "match_id": "match", "start_s": 60, "duration_s": 300},
        )
        assert accepted.status_code == 202
        assert started == [(("analysis", "match"), {"window": {"start_s": 60, "duration_s": 300}})]
        assert (
            client.post(
                "/account/action",
                headers=APP,
                json={"action": "analysis", "match_id": "match", "duration_s": 1200},
            ).status_code
            == 400
        )
        assert client.get(f"/analysis/{'a' * 32}/info", headers=APP).json() == {"match_id": "match"}
        assert client.get(f"/analysis/{'a' * 32}/video", headers=APP).content == b"synthetic"
        assert client.get("/analysis/not-a-ticket/video", headers=APP).status_code == 404
        assert client.get(f"/analysis/{'b' * 32}/info", headers=APP).status_code == 404
