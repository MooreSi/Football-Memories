"""Local stream-copy clips: no resize, no video/audio re-encoding or source writes."""

from __future__ import annotations

import os
import subprocess
import tempfile
import uuid
import zipfile
from pathlib import Path
from typing import Any

from app.connectors.hudl_capture import CaptureError
from app.services.media import probe


def export_ranges(source: Path, moments: list[dict[str, Any]], output: Path) -> Path:
    if not moments:
        raise CaptureError("Select at least one tagged moment or player code.")
    original = probe(source)
    target = output / f"hudl-moments-{uuid.uuid4().hex[:16]}.zip"
    with tempfile.TemporaryDirectory(prefix=".hudl-clips-", dir=output) as folder:
        scratch = Path(folder)
        archive = scratch / "moments.zip"
        with zipfile.ZipFile(archive, "x", compression=zipfile.ZIP_STORED) as bundle:
            for index, moment in enumerate(moments):
                clip = scratch / f"moment-{index + 1:04}.mp4"
                # Stream copy retains encoded source quality. Start may include the
                # preceding keyframe; exact labels/ranges travel alongside the clips.
                process = subprocess.run(
                    [
                        "ffmpeg",
                        "-hide_banner",
                        "-loglevel",
                        "error",
                        "-nostdin",
                        "-n",
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
                        "-c",
                        "copy",
                        "-avoid_negative_ts",
                        "make_zero",
                        "-movflags",
                        "+faststart",
                        str(clip),
                    ],
                    capture_output=True,
                    timeout=300,
                    check=False,
                )
                if process.returncode or not clip.is_file():
                    raise CaptureError("Clip export failed. The original video is unchanged.")
                info = probe(clip)
                if info.width != original.width or info.height != original.height:
                    raise CaptureError("Clip verification failed; no download was published.")
                bundle.write(clip, clip.name)
                clip.unlink()
            import json

            bundle.writestr("moments.json", json.dumps(moments))
        os.link(archive, target)  # Exclusive publication, never replaces a user file.
    return target
