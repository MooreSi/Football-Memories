"""Batch moment exports and highlight-reel assembly (spec 190, owner request 2026-11-10).

Title cards are short animated videos drawn and recorded in the browser (the Mac's
ffmpeg has no text renderer) and uploaded here. A reel is every part normalised to
one size, frame rate and audio layout, then joined without a further re-encode.
Parts are written in a hidden scratch folder beside the output and the finished
reel is linked into place only after it probes as valid H.264/AAC.
"""

from __future__ import annotations

import os
import re
import secrets
import subprocess
import tempfile
from collections.abc import Callable, Iterable
from pathlib import Path

from app.connectors.hudl_capture import CaptureError
from app.services.media import MediaError, probe

_VIDEO = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p"]
_AUDIO = ["-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2"]
_CARD_ID = re.compile(r"[A-Za-z0-9_-]{16,64}")


class CardStore:
    """Uploaded title-card videos, kept only until their reel is made."""

    MAX_BYTES = 25_000_000

    def __init__(self, folder: Path) -> None:
        self.folder = folder

    def save(self, data: bytes) -> str:
        if len(data) > self.MAX_BYTES:
            raise CaptureError("That title card is too large.")
        if data.startswith(b"\x1a\x45\xdf\xa3"):
            suffix = ".webm"
        elif len(data) > 12 and data[4:8] == b"ftyp":
            suffix = ".mp4"
        else:
            raise CaptureError("Title cards must be a WebM or MP4 video.")
        self.folder.mkdir(parents=True, exist_ok=True, mode=0o700)
        card_id = secrets.token_urlsafe(18)
        with (self.folder / f"{card_id}{suffix}").open("xb") as stream:
            stream.write(data)
        return card_id

    def path(self, card_id: str) -> Path:
        if not _CARD_ID.fullmatch(card_id):
            raise CaptureError("Unknown title card.")
        for suffix in (".webm", ".mp4"):
            candidate = self.folder / f"{card_id}{suffix}"
            if candidate.is_file() and not candidate.is_symlink():
                return candidate
        return self.folder / f"{card_id}.missing"

    def discard(self, card_ids: Iterable[str | None]) -> None:
        for card_id in card_ids:
            if card_id:
                try:
                    self.path(card_id).unlink(missing_ok=True)
                except CaptureError:
                    pass


def _ffmpeg(arguments: list[str]) -> bool:
    try:
        done = subprocess.run(
            ["ffmpeg", "-hide_banner", "-loglevel", "error", "-nostdin", "-n", *arguments],
            capture_output=True,
            timeout=1800,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired):
        return False
    return done.returncode == 0


def assemble_reel(
    parts: list[Path],
    output: Path,
    *,
    cards: Iterable[Path] = (),
    progress: Callable[[int, int], None] | None = None,
) -> None:
    """Join cards and clips into one H.264/AAC MP4 at the largest clip's size."""
    if not parts:
        raise CaptureError("Nothing to put in the reel.")
    card_set = {Path(c) for c in cards}
    try:
        infos = [probe(p) for p in parts]
    except MediaError as error:
        raise CaptureError("A reel part could not be read; nothing was saved.") from error
    clips = [i for p, i in zip(parts, infos, strict=True) if p not in card_set] or infos
    biggest = max(clips, key=lambda i: (i.width or 0) * (i.height or 0))
    width, height = (biggest.width or 1280) // 2 * 2, (biggest.height or 720) // 2 * 2
    fps = round(next((i.fps for i in clips if i.fps), 25.0), 3)
    report = progress or (lambda done, total: None)
    total = len(parts) + 1
    with tempfile.TemporaryDirectory(prefix=".reel-", dir=output.parent) as folder:
        scratch = Path(folder)
        normalised = []
        for number, (part, info) in enumerate(zip(parts, infos, strict=True), start=1):
            target = scratch / f"part-{number:04}.mp4"
            silent = info.audio_codec is None
            ok = _ffmpeg(
                [
                    "-i",
                    str(part),
                    *(["-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo"] if silent else []),
                    "-map",
                    "0:v:0",
                    "-map",
                    "1:a:0" if silent else "0:a:0",
                    "-vf",
                    f"scale={width}:{height}:force_original_aspect_ratio=decrease,"
                    f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,fps={fps}",
                    *_VIDEO,
                    *_AUDIO,
                    *(["-shortest"] if silent else []),
                    str(target),
                ]
            )
            if not ok or not target.is_file():
                raise CaptureError("A reel part could not be encoded; nothing was saved.")
            normalised.append(target)
            report(number, total)
        listing = scratch / "list.txt"
        listing.write_text("".join(f"file '{p.name}'\n" for p in normalised))
        joined = scratch / "reel.mp4"
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
                str(joined),
            ]
        )
        try:
            result = probe(joined) if ok else None
        except MediaError:
            result = None
        if (
            result is None
            or result.video_codec != "h264"
            or (result.width, result.height)
            != (
                width,
                height,
            )
        ):
            raise CaptureError("The reel could not be verified; nothing was saved.")
        os.link(joined, output)
        report(total, total)
