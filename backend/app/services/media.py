"""ffprobe / ffmpeg wrappers. Never modifies the input file."""

from __future__ import annotations

import json
import subprocess
from dataclasses import dataclass
from fractions import Fraction
from pathlib import Path


class MediaError(Exception):
    pass


@dataclass(frozen=True)
class MediaInfo:
    duration_s: float
    size_bytes: int
    width: int | None
    height: int | None
    fps: float | None
    video_codec: str | None
    audio_codec: str | None
    bitrate: int | None
    container: str | None


def _run(args: list[str], timeout: float) -> subprocess.CompletedProcess[str]:
    try:
        return subprocess.run(args, capture_output=True, text=True, timeout=timeout, check=False)
    except FileNotFoundError as exc:
        raise MediaError(f"{args[0]} is not installed") from exc
    except subprocess.TimeoutExpired as exc:
        raise MediaError(f"{args[0]} timed out") from exc


def probe(path: Path) -> MediaInfo:
    proc = _run(
        [
            "ffprobe",
            "-v",
            "error",
            "-print_format",
            "json",
            "-show_format",
            "-show_streams",
            str(path),
        ],
        timeout=60,
    )
    if proc.returncode != 0:
        raise MediaError(f"not a readable media file: {path.name}")
    data = json.loads(proc.stdout or "{}")
    streams = data.get("streams", [])
    video = next((s for s in streams if s.get("codec_type") == "video"), None)
    audio = next((s for s in streams if s.get("codec_type") == "audio"), None)
    fmt = data.get("format", {})
    if video is None or "duration" not in fmt:
        raise MediaError(f"no video stream found in {path.name}")
    fps: float | None = None
    rate = video.get("avg_frame_rate") or video.get("r_frame_rate")
    if rate and rate != "0/0":
        fps = float(Fraction(rate))
    return MediaInfo(
        duration_s=float(fmt["duration"]),
        size_bytes=path.stat().st_size,
        width=video.get("width"),
        height=video.get("height"),
        fps=fps,
        video_codec=video.get("codec_name"),
        audio_codec=audio.get("codec_name") if audio else None,
        bitrate=int(fmt["bit_rate"]) if fmt.get("bit_rate") else None,
        container=fmt.get("format_name"),
    )


def make_thumbnail(src: Path, dest: Path, at_s: float, width: int = 640) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_name(dest.name + ".part.jpg")
    proc = _run(
        [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-ss",
            f"{at_s:.3f}",
            "-i",
            str(src),
            "-frames:v",
            "1",
            "-vf",
            f"scale={width}:-2",
            "-q:v",
            "3",
            str(tmp),
        ],
        timeout=120,
    )
    if proc.returncode != 0 or not tmp.exists():
        tmp.unlink(missing_ok=True)
        raise MediaError(f"could not extract a thumbnail from {src.name}")
    tmp.replace(dest)
