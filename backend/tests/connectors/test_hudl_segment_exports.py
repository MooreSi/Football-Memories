"""Owner request 2026-11-10: export selected moments without downloading the whole match."""

import re
import subprocess
import zipfile
from unittest.mock import MagicMock, patch

import pytest

from app.connectors.hudl_browser import BrowserConnection
from app.connectors.hudl_exports import export_from_segments
from app.services.media import probe


@pytest.fixture(scope="module")
def hls(tmp_path_factory, tiny_video):
    """A 4 s video split into 1 s segments, shaped like the helper's local playlist."""
    folder = tmp_path_factory.mktemp("hls")
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
            str(folder / "src.m3u8"),
        ],
        check=True,
    )
    lines, segments = [], []
    for line in (folder / "src.m3u8").read_text().splitlines():
        if line and not line.startswith("#"):
            lines.append(f"asset-{len(segments)}.bin")
            segments.append((folder / line).read_bytes())
        else:
            lines.append(line)
    return "\n".join(lines) + "\n", segments


def test_only_segments_covering_the_moments_are_fetched(hls, tmp_path):
    playlist, segments = hls
    fetched = []

    def fetch(index):
        fetched.append(index)
        return segments[index]

    moments = [{"id": "a", "category": "SAM", "time_s": 1.2, "duration_s": 0.6}]
    result = export_from_segments(playlist, fetch, moments, tmp_path, combined=True)
    assert len(segments) >= 4
    assert sorted(set(fetched)) == [1]
    info = probe(result)
    assert info.video_codec == "h264"
    assert abs(info.duration_s - 0.6) < 0.35


def test_separate_files_and_progress_across_fetch_and_encode(hls, tmp_path):
    playlist, segments = hls
    seen = []
    moments = [
        {"id": "b", "category": "SAM", "time_s": 2.5, "duration_s": 1.0},
        {"id": "a", "category": "SAM", "time_s": 0.2, "duration_s": 0.5},
    ]
    result = export_from_segments(
        playlist,
        lambda i: segments[i],
        moments,
        tmp_path,
        progress=lambda d, t: seen.append((d, t)),
    )
    with zipfile.ZipFile(result) as archive:
        assert sorted(n for n in archive.namelist() if n.endswith(".mp4")) == [
            "moment-0001.mp4",
            "moment-0002.mp4",
        ]
        archive.extractall(tmp_path / "out")
    assert abs(probe(tmp_path / "out" / "moment-0001.mp4").duration_s - 0.5) < 0.35
    assert seen[-1][0] == seen[-1][1]
    assert [d for d, _ in seen] == sorted(d for d, _ in seen)


def test_clips_use_the_open_stream_and_keep_it_playing(tmp_path, hls):
    playlist, segments = hls
    connection = BrowserConnection(MagicMock(), MagicMock(), tmp_path / "inbox")
    connection.output.mkdir(parents=True)
    connection.details.write(
        "match",
        {
            "tag_status": "synced",
            "moments": [{"id": "a", "category": "SAM", "time_s": 1.2, "duration_s": 0.5}],
        },
    )
    connection._stream_id = "s1"
    connection._stream_match = "match"
    connection._stream_playlist = playlist
    connection._state["stream_url"] = "http://127.0.0.1:8766/stream/s1/playlist.m3u8"
    connection._state["match_id"] = "match"
    connection._assets = {str(i): f"https://video.hudl.com/{i}.ts" for i in range(len(segments))}
    with (
        patch.object(connection, "_download", side_effect=AssertionError("no full download")),
        patch(
            "app.connectors.hudl_browser._account.fetch_media",
            side_effect=lambda context, url: segments[int(re.search(r"/(\d+)\.ts", url)[1])],
        ),
    ):
        connection.start("clips", "match", ["a"], combined=True)
        assert connection.status()["stream_url"].endswith("/stream/s1/playlist.m3u8")
        for _ in range(300):
            if not connection.status()["busy"]:
                break
            import time

            time.sleep(0.05)
    status = connection.status()
    assert status["state"] == "done", status["message"]
    assert status["filename"].startswith("hudl-moments-")
    assert status["stream_url"].endswith("/stream/s1/playlist.m3u8")
    connection._executor.shutdown()
