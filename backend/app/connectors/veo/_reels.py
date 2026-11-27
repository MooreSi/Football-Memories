"""Highlight reels from a Veo match (owner request 2026-11-13).

The chosen highlights reuse a match already saved on this computer. Otherwise a
private range relay reads the video index and footage needed for the selected
windows, without first downloading the full match. The reel joins title cards via
`assemble_reel`, which publishes it without replacing any file.
"""

from __future__ import annotations

import re
import secrets
import tempfile
import zipfile
from collections.abc import Callable, Iterator
from contextlib import contextmanager
from pathlib import Path
from typing import TYPE_CHECKING, Any

from app.connectors.hudl_batch import _ffmpeg, assemble_reel
from app.connectors.hudl_capture import CaptureError
from app.services.publish import publish_new

from ._encoding import encode
from ._parse import team_moments
from ._ranges import RelayState, range_relay

if TYPE_CHECKING:
    from ._connection import VeoConnection

DEFAULT_LENGTH = 20.0  # seconds, when Veo gives a highlight no duration
MAX_HIGHLIGHTS = 150
CARDS = ("opening_card", "match_card", "stats_card", "closing_card")


def _cut(
    source: str,
    start: float,
    length: float,
    target: Path,
    progress: Callable[[float], None] | None = None,
) -> None:
    # A relay address (owner request 2026-11-15) gets a read timeout so a stalled
    # read ends the job instead of hanging it.
    remote = ["-rw_timeout", "60000000"] if source.startswith("http://127.0.0.1:") else []
    arguments = [
        *remote,
        "-ss", f"{max(0.0, start):.3f}",
        "-i", source,
        "-t", f"{length:.3f}",
        "-map", "0:v:0", "-map", "0:a:0?",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
        str(target),
    ]  # fmt: skip
    ok = _ffmpeg(arguments) if progress is None else encode(arguments, length, progress)
    if not ok or not target.is_file():
        raise CaptureError("A highlight could not be cut from the saved match; nothing was saved.")


def _prepare(
    connection: VeoConnection, identity: str, wanted: list[str]
) -> tuple[dict[str, Any], list[dict[str, Any]], Path]:
    """The match, its chosen highlights in match order and the download folder."""
    item = connection._match(identity) or {}
    # Owner request 2026-11-15: Veo's team events can be chosen like its highlights.
    every = [*(item.get("moments") or []), *team_moments(item.get("team_data"))]
    chosen = sorted(
        (m for m in every if isinstance(m, dict) and m.get("id") in wanted),
        key=lambda m: float(m.get("time_s") or 0),
    )
    if not chosen:
        raise CaptureError("None of those highlights is in the Veo cache. Refresh matches first.")
    if len(chosen) > MAX_HIGHLIGHTS:
        raise CaptureError(f"Choose at most {MAX_HIGHLIGHTS} highlights at a time.")
    return item, chosen, connection._folder()


@contextmanager
def _match_source(
    connection: VeoConnection, identity: str, folder: Path
) -> Iterator[tuple[str, RelayState | None]]:
    """The saved full match when there is one; otherwise (owner request 2026-11-15) a
    private relay that reads only the parts ffmpeg asks for from Veo's video host."""
    saved = connection._saved_match(identity, folder)
    if saved is not None:
        yield str(saved), None
        return
    url = connection._video_url(identity)

    def fetch(start: int, end: int | None) -> tuple[int, int, bytes]:
        with connection._media_lock:
            return connection._media.media_range(url, start, end)  # type: ignore[no-any-return]

    with range_relay(fetch) as relay:
        yield relay


def _cut_all(
    connection: VeoConnection,
    chosen: list[dict[str, Any]],
    source: tuple[str, RelayState | None],
    scratch: Path,
) -> list[Path]:
    address, relay = source
    clips = []
    for number, moment in enumerate(chosen, start=1):
        read = f" ({relay.bytes // 1_000_000} MB read from Veo)" if relay else ""
        connection._report(
            state="working",
            message=f"Cutting highlight {number} of {len(chosen)}…{read}",
            progress={
                "done": number - 1,
                "total": len(chosen),
                "fraction": (number - 1) / len(chosen),
            },
        )
        target = scratch / f"clip-{number:04}.mp4"
        length = float(moment.get("duration_s") or 0) or DEFAULT_LENGTH
        try:
            _cut(address, float(moment.get("time_s") or 0), length, target)
        except CaptureError:
            if relay is not None and relay.failure is not None:
                failure = relay.failure
                raise (
                    failure
                    if isinstance(failure, CaptureError)
                    else CaptureError("Veo's video could not be read. Nothing was retried.")
                ) from None
            raise
        clips.append(target)
    return clips


def make_reel(
    connection: VeoConnection, identity: str, name: str | None, reel: dict[str, Any]
) -> None:
    from ._connection import file_label

    cards = connection.cards
    try:
        wanted = [str(i) for i in reel.get("moment_ids") or []]
        item, chosen, folder = _prepare(connection, identity, wanted)
        label = file_label(name, item.get("title"))
        reels = folder / "reels"
        reels.mkdir(parents=True, exist_ok=True)
        with (
            _match_source(connection, identity, folder) as source,
            tempfile.TemporaryDirectory(prefix=".veo-reel-", dir=reels) as scratch_name,
        ):
            scratch = Path(scratch_name)
            card = {key: cards.path(str(reel[key])) if reel.get(key) else None for key in CARDS}
            parts = [p for p in (card["opening_card"], card["match_card"]) if p is not None]
            parts += _cut_all(connection, chosen, source, scratch)
            # Owner request 2026-11-15: the team stats card after the highlights.
            if card["stats_card"] is not None:
                parts.append(card["stats_card"])
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


def _clip_name(number: int, moment: dict[str, Any]) -> str:
    seconds = int(float(moment.get("time_s") or 0))
    kind = (
        re.sub(r"[^\w &'-]", " ", str(moment.get("category") or "Highlight")).strip() or "Highlight"
    )
    return f"{number:02} {seconds // 60}-{seconds % 60:02} {' '.join(kind.split())[:60]}.mp4"


def save_moments(
    connection: VeoConnection, identity: str, name: str | None, request: dict[str, Any]
) -> None:
    """The ticked highlights as one video (match order) or a ZIP of one file each, in
    moments/, never replacing a file; listed in the download index like Hudl's."""
    from ._connection import file_label

    wanted = [str(i) for i in request.get("moment_ids") or []]
    combined = bool(request.get("combined"))
    item, chosen, folder = _prepare(connection, identity, wanted)
    label = f"{file_label(name, item.get('title'))} moments"
    moments = folder / "moments"
    moments.mkdir(parents=True, exist_ok=True)
    suffix = ".mp4" if combined else ".zip"
    output = moments / f"{label} ({secrets.token_hex(4)}){suffix}"
    with (
        _match_source(connection, identity, folder) as source,
        tempfile.TemporaryDirectory(prefix=".veo-reel-", dir=moments) as scratch_name,
    ):
        scratch = Path(scratch_name)
        clips = _cut_all(connection, chosen, source, scratch)
        connection._report(message="Saving the highlights…", progress=None)
        if combined:
            assemble_reel(clips, output, metadata=["-metadata", f"title={label}"])
        else:
            packed = scratch / "moments.zip"
            with zipfile.ZipFile(packed, "x", zipfile.ZIP_STORED) as archive:
                for number, (clip, moment) in enumerate(zip(clips, chosen, strict=True), start=1):
                    archive.write(clip, _clip_name(number, moment))
            publish_new(packed, output)
    if connection.index is not None:
        connection.index.record(
            "moments", identity, item.get("title"), output, folder, chosen, combined=combined
        )
    connection._report(
        state="done",
        progress=None,
        match_id=identity,
        filename=f"moments/{output.name}",
        message=f"{len(chosen)} highlights saved in the moments folder.",
    )
