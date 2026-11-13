"""Highlight reels from a Veo match (owner request 2026-11-13).

The chosen highlights are cut from the full match saved on this computer. When it
is not saved yet it is downloaded first, through the same path as Download (one
video read, `.part`, verify, never overwrite), so the archive keeps the whole match
and nothing else reads Veo's video. The reel is then joined with the title cards by
`assemble_reel`, which publishes it without replacing any file.
"""

from __future__ import annotations

import secrets
import tempfile
from pathlib import Path
from typing import TYPE_CHECKING, Any

from app.connectors.hudl_batch import _ffmpeg, assemble_reel
from app.connectors.hudl_capture import CaptureError

if TYPE_CHECKING:
    from ._connection import VeoConnection

DEFAULT_LENGTH = 20.0  # seconds, when Veo gives a highlight no duration
MAX_HIGHLIGHTS = 150
CARDS = ("opening_card", "match_card", "closing_card")


def _cut(source: Path, start: float, length: float, target: Path) -> None:
    ok = _ffmpeg(
        [
            "-ss", f"{max(0.0, start):.3f}",
            "-i", str(source),
            "-t", f"{length:.3f}",
            "-map", "0:v:0", "-map", "0:a:0?",
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
            str(target),
        ]
    )  # fmt: skip
    if not ok or not target.is_file():
        raise CaptureError("A highlight could not be cut from the saved match; nothing was saved.")


def make_reel(
    connection: VeoConnection, identity: str, name: str | None, reel: dict[str, Any]
) -> None:
    from ._connection import file_label

    cards = connection.cards
    try:
        item = connection._match(identity) or {}
        wanted = [str(i) for i in reel.get("moment_ids") or []]
        chosen = sorted(
            (m for m in item.get("moments") or [] if isinstance(m, dict) and m.get("id") in wanted),
            key=lambda m: float(m.get("time_s") or 0),
        )
        if not chosen:
            raise CaptureError(
                "None of those highlights is in the Veo cache. Refresh matches first."
            )
        if len(chosen) > MAX_HIGHLIGHTS:
            raise CaptureError(f"Choose at most {MAX_HIGHLIGHTS} highlights for one reel.")
        folder = connection._folder()
        source = connection._saved_match(identity, folder)
        if source is None:
            connection._report(
                message="Downloading the full Veo match first; the reel is cut from it…"
            )
            url = connection._videos.get(identity) or connection._read_video(identity)
            source = connection._download(identity, url, reel.get("match_label"))
        label = file_label(name, item.get("title"))
        reels = folder / "reels"
        reels.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(prefix=".veo-reel-", dir=reels) as scratch_name:
            scratch = Path(scratch_name)
            card = {key: cards.path(str(reel[key])) if reel.get(key) else None for key in CARDS}
            parts = [p for p in (card["opening_card"], card["match_card"]) if p is not None]
            for number, moment in enumerate(chosen, start=1):
                connection._report(
                    state="working",
                    message=f"Cutting highlight {number} of {len(chosen)}…",
                    progress={
                        "done": number - 1,
                        "total": len(chosen),
                        "fraction": (number - 1) / len(chosen),
                    },
                )
                target = scratch / f"clip-{number:04}.mp4"
                length = float(moment.get("duration_s") or 0) or DEFAULT_LENGTH
                _cut(source, float(moment.get("time_s") or 0), length, target)
                parts.append(target)
            if card["closing_card"] is not None:
                parts.append(card["closing_card"])
            output = reels / f"{label} ({secrets.token_hex(4)}).mp4"
            connection._report(message="Assembling the highlight reel…", progress=None)
            assemble_reel(
                parts,
                output,
                cards=[p for p in card.values() if p is not None],
                metadata=["-metadata", f"title={label}"],
            )
        if connection.index is not None:
            connection.index.record("reel", identity, label, output, folder, chosen, combined=True)
        connection._report(
            state="done",
            progress=None,
            match_id=identity,
            filename=f"reels/{output.name}",
            message=f"Highlight reel ready: {len(chosen)} highlights.",
        )
    finally:
        if cards is not None:
            cards.discard(reel.get(key) for key in CARDS)
