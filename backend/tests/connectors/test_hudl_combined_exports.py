"""Owner request 2026-11-10: moments as separate files or one combined, playable file."""

import hashlib
import zipfile

from app.connectors.hudl_exports import export_ranges
from app.services.media import probe

MOMENTS = [
    {"id": "b", "category": "SAM EXAMPLE", "time_s": 2.5, "duration_s": 1.0},
    {"id": "a", "category": "SAM EXAMPLE", "time_s": 0.5, "duration_s": 1.5},
]


def test_combined_export_is_one_browser_playable_file_in_match_order(tiny_video, tmp_path):
    digest = hashlib.file_digest(tiny_video.open("rb"), "sha256").hexdigest()
    result = export_ranges(tiny_video, MOMENTS, tmp_path, combined=True)
    assert result.suffix == ".mp4"
    assert result.name.startswith("hudl-moments-")
    info, original = probe(result), probe(tiny_video)
    assert (info.width, info.height) == (original.width, original.height)
    assert info.video_codec == "h264"
    assert abs(info.duration_s - 2.5) < 0.35
    # faststart: the moov atom precedes media data so playback starts immediately.
    head = result.read_bytes()[:4096]
    moov, mdat = head.find(b"moov"), head.find(b"mdat")
    assert moov != -1 and (mdat == -1 or moov < mdat)
    assert hashlib.file_digest(tiny_video.open("rb"), "sha256").hexdigest() == digest
    assert [p.name for p in tmp_path.iterdir()] == [result.name]


def test_separate_export_encodes_each_moment_for_playback(tiny_video, tmp_path):
    result = export_ranges(tiny_video, MOMENTS, tmp_path)
    assert result.suffix == ".zip"
    with zipfile.ZipFile(result) as archive:
        names = sorted(n for n in archive.namelist() if n.endswith(".mp4"))
        assert names == ["moment-0001.mp4", "moment-0002.mp4"]
        archive.extractall(tmp_path / "out")
    for name, expected in zip(names, (1.5, 1.0), strict=True):
        clip = probe(tmp_path / "out" / name)
        assert clip.video_codec == "h264"
        assert abs(clip.duration_s - expected) < 0.35
