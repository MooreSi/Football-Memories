"""Full-resolution match snapshots (spec 190, owner request 2026-11-10).

Hudl's library thumbnails are 320x240. Once a match's highest-quality stream is
known, one media segment about a fifth of the way in is fetched and a single
frame is saved as the match's poster. Only that one segment is read; the poster
is written to a temporary file and renamed into place after it decodes.
"""

from __future__ import annotations

import os
import subprocess
import tempfile
from collections.abc import Callable
from pathlib import Path

from app.connectors.hudl_exports import _HLS_INPUT, _segments


def poster_from_playlist(playlist: str, fetch: Callable[[int], bytes], target: Path) -> bool:
    header, segments = _segments(playlist)
    if not segments:
        return False
    start, length, index, init = segments[min(len(segments) - 1, len(segments) // 5)]
    target.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=".poster-", dir=target.parent) as folder:
        scratch = Path(folder)
        try:
            needed = [index]
            if init:
                needed.append(int(init.split("asset-", 1)[1].split(".bin", 1)[0]))
            for asset in needed:
                data = fetch(asset)
                if not data:
                    return False
                (scratch / f"asset-{asset}.bin").write_bytes(data)
        except Exception:
            return False
        lines = [*header, *([init] if init else []), f"#EXTINF:{length},", f"asset-{index}.bin"]
        source = scratch / "one.m3u8"
        source.write_text("\n".join([*lines, "#EXT-X-ENDLIST"]) + "\n")
        frame = scratch / "poster.jpg"
        try:
            done = subprocess.run(
                [
                    "ffmpeg",
                    "-hide_banner",
                    "-loglevel",
                    "error",
                    "-nostdin",
                    "-n",
                    *_HLS_INPUT,
                    "-i",
                    str(source),
                    "-ss",
                    str(min(1.0, length / 2)),
                    "-frames:v",
                    "1",
                    "-q:v",
                    "2",
                    str(frame),
                ],
                capture_output=True,
                timeout=60,
                check=False,
            )
        except (OSError, subprocess.TimeoutExpired):
            return False
        if done.returncode != 0 or not frame.is_file() or frame.stat().st_size < 3:
            return False
        if not frame.read_bytes().startswith(b"\xff\xd8\xff"):
            return False
        os.replace(frame, target)
    return True
