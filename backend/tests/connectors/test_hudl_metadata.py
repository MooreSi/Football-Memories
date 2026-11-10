import hashlib
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from app.connectors.hudl_browser import BrowserConnection
from app.connectors.hudl_capture import CaptureError, parse_manifest
from app.connectors.hudl_metadata import MatchCache, age_group


def test_title_age_groups_keep_mixed_and_unknown_distinct() -> None:
    assert age_group("261108 U10s v Rovers") == "U10"
    assert age_group("U9/10 Internal Fixture") == "U9/U10"
    assert age_group("First Team") == "Unclassified"


def test_details_cache_persists_tags_but_never_source_urls(tmp_path: Path) -> None:
    cache = MatchCache(tmp_path)
    cache.write(
        "synthetic-a",
        {
            "moments": [{"id": "e1", "time_s": 2, "duration_s": 4, "category": "Sam Example"}],
            "playbackUrl": "FAKE_SECRET",
        },
    )
    assert MatchCache(tmp_path).read("synthetic-a")["moments"][0]["category"] == "Sam Example"
    content = next(tmp_path.glob("*.json")).read_text()
    assert "FAKE_SECRET" not in content
    assert "FAKE_SECRET" in "playbackUrl=FAKE_SECRET"


def test_highest_rendition_prioritises_resolution_then_bitrate() -> None:
    manifest = (
        "#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=9000,RESOLUTION=1280x720\nlow.m3u8\n"
        "#EXT-X-STREAM-INF:BANDWIDTH=6000,RESOLUTION=3840x2160\nhigh.m3u8\n"
    )
    assert (
        parse_manifest(manifest, "https://video.hudl.com/master.m3u8", max_height=65536).variant_url
        == "https://video.hudl.com/high.m3u8"
    )


def test_old_capped_capture_is_never_reused_as_highest_quality(tmp_path: Path) -> None:
    name = "hudl-" + hashlib.sha256(b"synthetic-a").hexdigest()[:16]
    original = tmp_path / (name + ".mp4")
    original.write_bytes(b"old-low-quality")
    original.with_suffix(".tags.csv").write_text("time,category\n")
    connection = BrowserConnection(MagicMock(), MagicMock(), tmp_path)
    with patch.object(connection, "_observe", side_effect=CaptureError("new source required")):
        with pytest.raises(CaptureError, match="new source required"):
            connection._download("synthetic-a")
    assert original.read_bytes() == b"old-low-quality"
    connection._executor.shutdown()


def test_full_match_download_does_not_require_a_tagged_video(tmp_path):
    connection = BrowserConnection(MagicMock(), MagicMock(), tmp_path)
    with patch.object(connection, "_observe", side_effect=CaptureError("probe")) as observe:
        with pytest.raises(CaptureError, match="probe"):
            connection._download("synthetic-a")
        observe.assert_called_once_with("synthetic-a", False)
    connection._executor.shutdown()


def test_resuming_same_match_stream_keeps_completed_download_available(tmp_path):
    connection = BrowserConnection(MagicMock(), MagicMock(), tmp_path)
    connection._state.update(match_id="synthetic-a", filename="hudl-moments-synthetic.zip")
    with patch.object(connection._executor, "submit"):
        connection.start("stream", "synthetic-a")
    assert connection.status()["filename"] == "hudl-moments-synthetic.zip"
    connection._executor.shutdown()
