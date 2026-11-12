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
from collections.abc import Callable
from pathlib import Path
from typing import Any

from app.connectors.hudl_capture import CaptureError
from app.connectors.hudl_media import MediaDetails, current_details
from app.connectors.hudl_names import download_name
from app.services.media import probe

# Near-transparent quality at the source resolution; yuv420p for universal playback.
_VIDEO = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p"]
_AUDIO = ["-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2"]


def _export_stem(title: str | None, moments: list[dict[str, Any]]) -> str:
    if not title:
        return f"hudl-moments-{uuid.uuid4().hex[:16]}"
    codes = sorted({m["category"] for m in moments})
    # A short unique marker keeps concurrent/repeated exports append-only.
    return download_name(
        title, (codes[0] if len(codes) == 1 else "Selected moments") + f" ({uuid.uuid4().hex[:8]})"
    )


def _ffmpeg(arguments: list[str], timeout: int = 900) -> bool:
    process = subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-nostdin", "-n", *arguments],
        capture_output=True,
        timeout=timeout,
        check=False,
    )
    return process.returncode == 0


_HLS_INPUT = [
    "-protocol_whitelist",
    "file",
    "-allowed_extensions",
    "ALL",
    "-allowed_segment_extensions",
    "ALL",
    "-extension_picky",
    "0",
]


def _encode(
    source: Path,
    moment: dict[str, Any],
    clip: Path,
    *,
    offset: float = 0.0,
    metadata: list[str] | None = None,
) -> None:
    hls = source.suffix == ".m3u8"
    ok = _ffmpeg(
        [
            *(_HLS_INPUT if hls else []),
            "-ss",
            str(max(0.0, moment["time_s"] - offset)),
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
            *(metadata or []),
            "-movflags",
            "+faststart",
            str(clip),
        ]
    )
    if not ok or not clip.is_file():
        raise CaptureError("Clip export failed. The original video is unchanged.")


def _clip_tags(
    details: MediaDetails | None, combined: bool, number: int, moment: dict[str, Any]
) -> list[str] | None:
    """Spec 220: a clip in a ZIP is titled by its moment; a combined video's parts
    need none (the joined file gets the download's details)."""
    if details is None or combined:
        return None
    return details.clip(number, str(moment.get("category") or "Moment")).ffmpeg_args()


def _verify(clip: Path, width: int | None, height: int | None) -> None:
    info = probe(clip)
    if info.width != width or info.height != height or info.video_codec != "h264":
        raise CaptureError("Clip verification failed; no download was published.")


def export_ranges(
    source: Path,
    moments: list[dict[str, Any]],
    output: Path,
    *,
    combined: bool = False,
    match_title: str | None = None,
    progress: Callable[[int, int], None] | None = None,
    details: MediaDetails | None = None,
) -> Path:
    if not moments:
        raise CaptureError("Select at least one tagged moment or player code.")
    ordered = sorted(moments, key=lambda m: (m["time_s"], m["id"]))
    original = probe(source)
    stem = _export_stem(match_title, ordered)
    target = output / f"{stem}.{'mp4' if combined else 'zip'}"
    with tempfile.TemporaryDirectory(prefix=".hudl-clips-", dir=output) as folder:
        scratch = Path(folder)
        clips = []
        total = len(ordered) + (1 if combined else 0)
        report = progress or (lambda done, total: None)
        report(0, total)
        for index, moment in enumerate(ordered):
            clip = scratch / f"moment-{index + 1:04}.mp4"
            _encode(source, moment, clip, metadata=_clip_tags(details, combined, index + 1, moment))
            _verify(clip, original.width, original.height)
            clips.append(clip)
            report(index + 1, total)
        _publish(scratch, clips, ordered, combined, report, total, match_title, details)
        os.link(scratch / ("combined.mp4" if combined else "moments.zip"), target)
    return target


def _publish(
    scratch: Path,
    clips: list[Path],
    ordered: list[dict[str, Any]],
    combined: bool,
    report: Callable[[int, int], None],
    total: int,
    match_title: str | None = None,
    details: MediaDetails | None = None,
) -> None:
    """Join encoded parts into one MP4, or store them as one file per moment."""
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
                *(details.ffmpeg_args() if details else []),
                "-movflags",
                "+faststart",
                str(result),
            ]
        )
        if not ok or not result.is_file():
            raise CaptureError("Combining moments failed. The original video is unchanged.")
        first = probe(clips[0])
        _verify(result, first.width, first.height)
        report(total, total)
    else:
        result = scratch / "moments.zip"
        with zipfile.ZipFile(result, "x", compression=zipfile.ZIP_STORED) as bundle:
            for index, (clip, moment) in enumerate(zip(clips, ordered, strict=True), start=1):
                name = (
                    download_name(match_title, moment["category"], index) + ".mp4"
                    if match_title
                    else clip.name
                )
                bundle.write(clip, name)
            bundle.writestr("moments.json", json.dumps(ordered))


def _segments(playlist: str) -> tuple[list[str], list[tuple[float, float, int, str | None]]]:
    """Header lines and (start, duration, asset index, active init-map line) per segment."""
    header: list[str] = []
    segments: list[tuple[float, float, int, str | None]] = []
    clock, pending, current_map = 0.0, None, None
    for line in playlist.splitlines():
        if line.startswith("#EXT-X-MAP:"):
            current_map = line
        elif line.startswith("#EXTINF:"):
            pending = float(line.split(":", 1)[1].split(",", 1)[0])
        elif line.startswith("asset-") and pending is not None:
            index = int(line.removeprefix("asset-").removesuffix(".bin"))
            segments.append((clock, pending, index, current_map))
            clock, pending = clock + pending, None
        elif line.startswith("#") and not segments and pending is None:
            if line not in {"#EXT-X-ENDLIST"} and not line.startswith("#EXT-X-PLAYLIST-TYPE"):
                header.append(line)
    return header, segments


def export_from_segments(
    playlist: str,
    fetch: Callable[[int], bytes],
    moments: list[dict[str, Any]],
    output: Path,
    *,
    combined: bool = False,
    match_title: str | None = None,
    progress: Callable[[int, int], None] | None = None,
) -> Path:
    """Fetch only the stream segments covering the chosen moments, then encode them.

    Spec 220: details set with ``hudl_media.tagging`` are written into the files.

    Owner request (2026-11-10): selected moments must not wait for the whole match.
    `playlist` is the helper's local media playlist (asset-N.bin references).
    """
    details = current_details()
    if not moments:
        raise CaptureError("Select at least one tagged moment or player code.")
    ordered = sorted(moments, key=lambda m: (m["time_s"], m["id"]))
    header, segments = _segments(playlist)
    if not segments:
        raise CaptureError("The stream playlist is empty. Stream the match again.")
    plans = []
    for moment in ordered:
        start, end = moment["time_s"], moment["time_s"] + max(0.1, moment["duration_s"])
        chosen = [s for s in segments if s[0] < end and s[0] + s[1] > start]
        if not chosen:
            raise CaptureError("A selected moment is outside this video.")
        plans.append(chosen)
    needed = sorted(
        {s[2] for plan in plans for s in plan}
        | {
            int(m.split("asset-", 1)[1].split(".bin", 1)[0])
            for plan in plans
            for *_, m in plan
            if m
        }
    )
    total = len(needed) + len(ordered) + (1 if combined else 0)
    report = progress or (lambda done, total: None)
    report(0, total)
    target = output / f"{_export_stem(match_title, ordered)}.{'mp4' if combined else 'zip'}"
    with tempfile.TemporaryDirectory(prefix=".hudl-clips-", dir=output) as folder:
        scratch = Path(folder)
        for done, index in enumerate(needed, start=1):
            data = fetch(index)
            if not data:
                raise CaptureError("An empty video segment was received; nothing was saved.")
            (scratch / f"asset-{index}.bin").write_bytes(data)
            report(done, total)
        clips: list[Path] = []
        for number, (moment, plan) in enumerate(zip(ordered, plans, strict=True), start=1):
            lines, last_map = list(header), None
            for _, length, index, init in plan:
                if init and init != last_map:
                    lines.append(init)
                    last_map = init
                lines += [f"#EXTINF:{length},", f"asset-{index}.bin"]
            lines.append("#EXT-X-ENDLIST")
            source = scratch / f"moment-{number:04}.m3u8"
            source.write_text("\n".join(lines) + "\n")
            clip = scratch / f"moment-{number:04}.mp4"
            _encode(
                source,
                moment,
                clip,
                offset=plan[0][0],
                metadata=_clip_tags(details, combined, number, moment),
            )
            reference = probe(clips[0]) if clips else probe(clip)
            _verify(clip, reference.width, reference.height)
            clips.append(clip)
            report(len(needed) + number, total)
        _publish(scratch, clips, ordered, combined, report, total, match_title, details)
        os.link(scratch / ("combined.mp4" if combined else "moments.zip"), target)
    return target
