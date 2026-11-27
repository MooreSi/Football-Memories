"""Shared local HLS streams shaped like the Hudl helper's playlist (asset-N.bin lines)."""

import subprocess

import pytest


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
