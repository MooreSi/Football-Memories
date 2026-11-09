from pathlib import Path

import pytest

from app.services.media import MediaError, make_thumbnail, probe


def test_probe_reports_the_real_properties_of_the_file(tiny_video: Path) -> None:
    info = probe(tiny_video)
    assert (info.width, info.height) == (320, 240)
    assert info.video_codec == "h264"
    assert info.audio_codec == "aac"
    assert info.fps == pytest.approx(25.0)
    assert info.duration_s == pytest.approx(4.0, abs=0.15)
    assert info.size_bytes == tiny_video.stat().st_size


def test_probe_rejects_a_file_that_is_not_video(tmp_path: Path) -> None:
    bogus = tmp_path / "notes.mp4"
    bogus.write_text("this is not a video")
    with pytest.raises(MediaError):
        probe(bogus)


def test_make_thumbnail_writes_a_jpeg(tiny_video: Path, tmp_path: Path) -> None:
    out = tmp_path / "thumbs" / "t.jpg"
    make_thumbnail(tiny_video, out, at_s=1.0)
    assert out.read_bytes()[:3] == b"\xff\xd8\xff"
