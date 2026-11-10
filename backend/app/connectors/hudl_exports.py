"""Local moment exports at source resolution, encoded for reliable playback.

Owner request (2026-11-10): moments download either as separate files or as
one combined file, encoded properly for viewing. Each range is re-encoded to
H.264/AAC with frame-accurate cuts at the source's resolution, so clips start
on the tagged frame and play in browsers, QuickTime and phones even when the
source is HEVC. The source file is only read.
"""

from __future__ import annotations

import json
import os
import subprocess
import tempfile
import uuid
import zipfile
from pathlib import Path
from typing import Any

from app.connectors.hudl_capture import CaptureError
from app.services.media import probe

# Near-transparent quality at the source resolution; yuv420p for universal playback.
_VIDEO = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p"]
_AUDIO = ["-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2"]


def _ffmpeg(arguments: list[str], timeout: int = 900) -> bool:
    process = subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-nostdin", "-n", *arguments],
        capture_output=True,
        timeout=timeout,
        check=False,
    )
    return process.returncode == 0


def _encode(source: Path, moment: dict[str, Any], clip: Path) -> None:
    ok = _ffmpeg(
        [
            "-ss",
            str(moment["time_s"]),
            "-i",
            str(source),
            "-t",
            str(max(0.1, moment["duration_s"])),
            "-map",
            "0:v:0",
            "-map",
            "0:a?",
            *_VIDEO,
            *_AUDIO,
            "-movflags",
            "+faststart",
            str(clip),
        ]
    )
    if not ok or not clip.is_file():
        raise CaptureError("Clip export failed. The original video is unchanged.")


def _verify(clip: Path, width: int | None, height: int | None) -> None:
    info = probe(clip)
    if info.width != width or info.height != height or info.video_codec != "h264":
        raise CaptureError("Clip verification failed; no download was published.")


def export_ranges(
    source: Path, moments: list[dict[str, Any]], output: Path, *, combined: bool = False
) -> Path:
    if not moments:
        raise CaptureError("Select at least one tagged moment or player code.")
    ordered = sorted(moments, key=lambda m: (m["time_s"], m["id"]))
    original = probe(source)
    stem = f"hudl-moments-{uuid.uuid4().hex[:16]}"
    target = output / f"{stem}.{'mp4' if combined else 'zip'}"
    with tempfile.TemporaryDirectory(prefix=".hudl-clips-", dir=output) as folder:
        scratch = Path(folder)
        clips = []
        for index, moment in enumerate(ordered):
            clip = scratch / f"moment-{index + 1:04}.mp4"
            _encode(source, moment, clip)
            _verify(clip, original.width, original.height)
            clips.append(clip)
        if combined:
            listing = scratch / "list.txt"
            listing.write_text("".join(f"file '{c.name}'\n" for c in clips))
            result = scratch / "combined.mp4"
            # Every part shares one encoder configuration, so concatenation is exact.
            ok = _ffmpeg(
                [
                    "-f",
                    "concat",
                    "-safe",
                    "0",
                    "-i",
                    str(listing),
                    "-c",
                    "copy",
                    "-movflags",
                    "+faststart",
                    str(result),
                ]
            )
            if not ok or not result.is_file():
                raise CaptureError("Combining moments failed. The original video is unchanged.")
            _verify(result, original.width, original.height)
        else:
            result = scratch / "moments.zip"
            with zipfile.ZipFile(result, "x", compression=zipfile.ZIP_STORED) as bundle:
                for clip in clips:
                    bundle.write(clip, clip.name)
                bundle.writestr("moments.json", json.dumps(ordered))
        os.link(result, target)  # Exclusive publication, never replaces a user file.
    return target
