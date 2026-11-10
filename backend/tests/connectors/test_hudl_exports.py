import hashlib
import zipfile

from app.connectors.hudl_exports import export_ranges
from app.services.media import probe


def test_moment_download_preserves_source_resolution_and_original_bytes(tiny_video, tmp_path):
    digest = hashlib.file_digest(tiny_video.open("rb"), "sha256").hexdigest()
    result = export_ranges(
        tiny_video,
        [{"id": "synthetic-tag", "category": "Sam Example", "time_s": 1, "duration_s": 2}],
        tmp_path,
    )
    with zipfile.ZipFile(result) as archive:
        archive.extract("moment-0001.mp4", tmp_path / "verify")
        assert "Sam Example" in archive.read("moments.json").decode()
    original, clip = probe(tiny_video), probe(tmp_path / "verify" / "moment-0001.mp4")
    assert (clip.width, clip.height) == (original.width, original.height)
    assert clip.video_codec == original.video_codec
    assert hashlib.file_digest(tiny_video.open("rb"), "sha256").hexdigest() == digest
