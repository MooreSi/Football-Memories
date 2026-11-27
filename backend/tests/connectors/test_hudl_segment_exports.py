"""Owner request 2026-11-10: export selected moments without downloading the whole match."""

import re
import zipfile
from unittest.mock import MagicMock, patch

import pytest

from app.connectors import hudl_exports
from app.connectors.hudl_browser import BrowserConnection
from app.connectors.hudl_exports import export_from_segments
from app.services.media import probe


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
    assert status["filename"].startswith("moments/hudl-moments-")  # spec 190 folder
    assert status["stream_url"].endswith("/stream/s1/playlist.m3u8")
    connection._executor.shutdown()


def test_a_moment_mid_match_on_a_fragmented_mp4_stream_keeps_its_full_length(fmp4, tmp_path):
    """Owner report 2026-11-27: every highlight reel stopped with "MediaError in media.py:60".
    Hudl serves fMP4. Input-side -ss on a mini playlist that starts mid-match is taken
    as an absolute time, so the cut landed before the first segment and came out short,
    or with no frames at all once the moment was a segment or more into the match."""
    playlist, segments = fmp4
    moments = [
        {"id": "a", "category": "SAM", "time_s": 2.6, "duration_s": 1.2},
        {"id": "b", "category": "SAM", "time_s": 1.5, "duration_s": 1.0},
    ]
    result = export_from_segments(playlist, lambda i: segments[i], moments, tmp_path)
    with zipfile.ZipFile(result) as archive:
        archive.extractall(tmp_path / "out")
    assert abs(probe(tmp_path / "out" / "moment-0001.mp4").duration_s - 1.0) < 0.15
    assert abs(probe(tmp_path / "out" / "moment-0002.mp4").duration_s - 1.2) < 0.15


def test_the_cut_seeks_on_the_output_side_of_a_mini_playlist(fmp4, tmp_path):
    """Owner report 2026-11-27: ffmpeg 7.1 (the capture image) reads an input-side -ss on
    a mini playlist that starts mid-match as an absolute time; with Hudl's segment lengths
    every clip had no frames. ffmpeg 8 (this Mac) reads it relative, so the length check
    above passes here either way: this pins where the seek goes."""
    playlist, segments = fmp4
    calls = []
    real = hudl_exports._ffmpeg

    def spy(arguments, *rest, **kwargs):
        calls.append(arguments)
        return real(arguments, *rest, **kwargs)

    moments = [{"id": "a", "category": "SAM", "time_s": 2.6, "duration_s": 1.2}]
    with patch.object(hudl_exports, "_ffmpeg", side_effect=spy):
        export_from_segments(playlist, lambda i: segments[i], moments, tmp_path)
    cut = next(a for a in calls if any(str(x).endswith(".m3u8") for x in a))
    assert cut.index("-ss") > cut.index("-i")
    assert float(cut[cut.index("-ss") + 1]) == pytest.approx(0.6)
