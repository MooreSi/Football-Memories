"""Video Lab: a bounded analysis window from a Hudl match, cut from the stream segments only."""

import hashlib
import re
import subprocess
import time
from contextlib import ExitStack
from unittest.mock import MagicMock, patch

import pytest
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


@pytest.fixture(scope="module")
def fmp4(tmp_path_factory, tiny_video):
    """The same 4 s video as fragmented MP4: its init segment is its own asset (#EXT-X-MAP)."""
    folder = tmp_path_factory.mktemp("fmp4")
    subprocess.run(
        [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            str(tiny_video),
            "-c:v",
            "libx264",
            "-g",
            "25",
            "-keyint_min",
            "25",
            "-sc_threshold",
            "0",
            "-c:a",
            "aac",
            "-f",
            "hls",
            "-hls_time",
            "1",
            "-hls_playlist_type",
            "vod",
            "-hls_segment_type",
            "fmp4",
            str(folder / "src.m3u8"),
        ],
        check=True,
    )
    lines, segments = [], []
    for line in (folder / "src.m3u8").read_text().splitlines():
        if line.startswith("#EXT-X-MAP:"):
            uri = line.split('URI="', 1)[1].split('"', 1)[0]
            lines.append(f'#EXT-X-MAP:URI="asset-{len(segments)}.bin"')
            segments.append((folder / uri).read_bytes())
        elif line and not line.startswith("#"):
            lines.append(f"asset-{len(segments)}.bin")
            segments.append((folder / line).read_bytes())
        else:
            lines.append(line)
    assert lines.count('#EXT-X-MAP:URI="asset-0.bin"') == 1
    return "\n".join(lines) + "\n", segments


def test_analysis_window_fetches_the_init_segment_of_a_fragmented_mp4_stream(tmp_path, fmp4):
    """Hudl streams in fMP4 with an #EXT-X-MAP init segment; without it nothing decodes."""
    playlist, segments = fmp4
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
    assert sorted(set(fetched)) == [0, 2, 3]  # init, then the segments covering 1-3 s
    sample = tmp_path / ".hudl-account" / "analysis" / status["analysis_ticket"] / "sample.mp4"
    media = probe(sample)
    assert media.video_codec == "h264"
    assert abs(media.duration_s - 2.0) < 0.35
    connection._executor.shutdown()


def _run_window(tmp_path, stream, extra_patches=()):
    playlist, segments = stream
    connection = _connection(tmp_path)
    _open_stream(connection, playlist, segments)

    def fetch(context, url):
        return segments[int(re.search(r"/(\d+)\.ts", url)[1])]

    progress = []
    real = connection._set_progress

    def record(label, step, done, total):
        progress.append((label, step, connection._steps, done, total))
        real(label, step, done, total)

    with ExitStack() as stack:
        for active in (
            patch.object(connection, "_download", side_effect=AssertionError("no full download")),
            patch.object(connection, "_observe", side_effect=AssertionError("stream open")),
            patch.object(connection, "_set_progress", side_effect=record),
            patch("app.connectors.hudl_browser._account.fetch_media", side_effect=fetch),
            *extra_patches,
        ):
            stack.enter_context(active)
        connection.start("analysis", "match", window={"start_s": 1.0, "duration_s": 2.0})
        status = _wait(connection)
    connection._executor.shutdown()
    return status, progress


def test_the_encode_reports_measured_progress_as_its_own_step(tmp_path, fmp4):
    """Owner report 2026-11-27: the page sat on "Encoding the analysis window" for ten
    minutes with no moving bar, because the encode cleared the progress. The encode is
    step 2 of 2 and reports encoded seconds of the window."""
    status, progress = _run_window(tmp_path, fmp4)
    assert status["state"] == "done", status["message"]
    fetches = [p for p in progress if p[0] == "Fetching the selected footage"]
    encodes = [p for p in progress if p[0] == "Encoding the analysis window"]
    assert fetches and all(step == 1 and steps == 2 for _, step, steps, _, _ in fetches)
    assert encodes and all(step == 2 and steps == 2 for _, step, steps, _, _ in encodes)
    assert all(total == 2.0 for *_, total in encodes)
    done = [d for *_, d, _ in encodes]
    assert done == sorted(done) and done[0] == 0 and done[-1] >= 1.5


def test_the_analysis_clip_is_encoded_near_source_size_and_exports_keep_theirs(tmp_path, fmp4):
    """Owner report 2026-11-27: CRF 18 made a ten-minute clip 454 MB from about 350 MB of
    HEVC segments. CRF 20 measured at source size on real footage (60 s: 35.8 MB source,
    37.0 MB at CRF 20, 50.6 MB at CRF 18). Moment exports are a user-visible quality
    default and keep CRF 18 (golden rule 5)."""
    from app.connectors import hudl_exports
    from app.connectors.veo import _encoding

    calls = []
    real = _encoding.encode

    def spy(arguments, duration, report):
        calls.append(arguments)
        return real(arguments, duration, report)

    status, _ = _run_window(
        tmp_path, fmp4, [patch("app.connectors.hudl_browser._analysis.encode", side_effect=spy)]
    )
    assert status["state"] == "done", status["message"]
    (arguments,) = calls
    assert arguments[arguments.index("-c:v") + 1] == "libx264"
    assert arguments[arguments.index("-crf") + 1] == "20"
    assert hudl_exports._VIDEO[hudl_exports._VIDEO.index("-crf") + 1] == "18"
