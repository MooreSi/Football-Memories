"""Moment exports, batch exports and highlight reels (spec 190), split from _account.py.

Runs on the connection's single account worker, so segment fetches use
`_resource` directly (calling `resource()` from the worker would deadlock).
"""

from __future__ import annotations

import re
import secrets
import tempfile
import time
from collections.abc import Callable
from pathlib import Path
from typing import TYPE_CHECKING, Any

from app.connectors.hudl_capture import CaptureError

if TYPE_CHECKING:
    from ._account import BrowserConnection


def start_batch(
    connection: BrowserConnection,
    items: list[dict[str, Any]],
    *,
    combined: bool = False,
    reel: dict[str, Any] | None = None,
) -> None:
    """Spec 190: export moments from several matches in turn, or one reel from them."""
    with connection._lock:
        if connection._pending and not (connection._syncing and connection._pending == 1):
            raise CaptureError("A Hudl operation is already running.")
        if connection._syncing:
            connection._cancel_sync.set()
        connection._pending += 1
        connection._steps = max(1, len(items)) + (1 if reel else 0)
        connection._progress = None
        connection._state.update(
            state="working",
            message="Preparing the batch…",
            filename=None,
            download_name=None,
            download_kind=None,
            match_id=None,
        )
    connection._executor.submit(connection._run_batch, items, combined, reel)


def _pause(connection: BrowserConnection) -> None:
    """Golden rule 3: a normal person's pause between Hudl match pages."""
    if connection._page is not None:
        connection._page.wait_for_timeout(2500)
    else:
        time.sleep(2.5)


def _fetcher(connection: BrowserConnection, stream: str) -> Callable[[int], bytes]:
    return lambda index: connection._resource(stream, str(index))[0]


def _reporter(connection: BrowserConnection, label: str, step: int) -> Callable[[int, int], None]:
    return lambda done, total: connection._set_progress(label, step, done, total)


def _run_batch(
    connection: BrowserConnection,
    items: list[dict[str, Any]],
    combined: bool,
    reel: dict[str, Any] | None,
) -> None:
    from app.connectors import hudl_exports
    from app.connectors.hudl_batch import assemble_reel

    card_ids = [i.get("card_id") for i in items] + (
        [reel.get("opening_card"), reel.get("closing_card")] if reel else []
    )
    try:
        plans = []
        for item in items:
            available = connection.details.read(item["match_id"]).get("moments", [])
            ids, codes = set(item.get("moment_ids") or []), set(item.get("codes") or [])
            chosen = [m for m in available if (m["id"] in ids if ids else m["category"] in codes)]
            if chosen:
                plans.append((item["match_id"], chosen, item.get("card_id")))
        if not plans:
            raise CaptureError("None of the chosen matches has those tagged moments cached.")
        with connection._lock:
            connection._steps = len(plans) + (1 if reel else 0)
        folder = connection.output / ("reels" if reel else "moments")
        folder.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(prefix=".batch-", dir=folder) as scratch_name:
            scratch = Path(scratch_name)
            parts: list[Path] = []
            cards: list[Path] = []
            if reel and reel.get("opening_card"):
                cards.append(connection.cards.path(reel["opening_card"]))
                parts.append(cards[-1])
            for number, (identity, chosen, card_id) in enumerate(plans, start=1):
                if number > 1:
                    connection._pause()
                title = connection.catalogue.find(identity).get("title")
                label = f"Match {number} of {len(plans)}: fetching and encoding moments"
                connection.report("exporting", f"{label}…")
                if connection._stream_match != identity or not connection._stream_id:
                    connection._prepare_stream(identity)
                stream = connection._stream_id
                target = hudl_exports.export_from_segments(
                    connection._stream_playlist,
                    connection._fetcher(stream),
                    chosen,
                    scratch if reel else folder,
                    combined=True if reel else combined,
                    match_title=title if isinstance(title, str) else None,
                    progress=connection._reporter(label, number),
                )
                if reel:
                    if card_id:
                        cards.append(connection.cards.path(card_id))
                        parts.append(cards[-1])
                    parts.append(target)
                else:
                    connection.index.record(
                        "moments",
                        identity,
                        title if isinstance(title, str) else None,
                        target,
                        connection.output,
                        chosen,
                        combined=combined,
                    )
            if not reel:
                connection.report(
                    "done",
                    f"Moments from {len(plans)} matches saved in the moments folder.",
                )
                return
            if reel.get("closing_card"):
                cards.append(connection.cards.path(reel["closing_card"]))
                parts.append(cards[-1])
            name = re.sub(r"[^\w .,()&'-]", "", str(reel.get("name") or "")).strip()[:80]
            output = folder / f"{name or 'Highlight reel'} ({secrets.token_hex(4)}).mp4"
            connection.report("exporting", "Assembling the highlight reel…")
            assemble_reel(
                parts,
                output,
                cards=cards,
                progress=lambda done, total: connection._set_progress(
                    "Assembling the highlight reel", len(plans) + 1, done, total
                ),
            )
        moments = [m for _, chosen, _ in plans for m in chosen]
        connection.index.record(
            "reel",
            None,
            str(reel.get("name") or "Highlight reel"),
            output,
            connection.output,
            moments,
            combined=True,
            matches=[identity for identity, _, _ in plans],
        )
        with connection._lock:
            connection._state["filename"] = f"reels/{output.name}"
            connection._state["download_name"] = output.name
            connection._state["download_kind"] = "reel"
        connection.report(
            "done", f"Highlight reel ready: {len(moments)} moments from {len(plans)} matches."
        )
    except CaptureError as error:
        connection.report("error", str(error))
    except Exception:
        connection.report("error", "The batch stopped. Files already saved are kept.")
    finally:
        connection.cards.discard(card_ids)
        with connection._lock:
            connection._pending -= 1
            connection._progress = None


def _export_worker(
    connection: BrowserConnection,
    stream: str,
    playlist: str,
    selected: list[dict[str, Any]],
    combined: bool,
) -> None:
    """Fetch only the stream segments covering the moments, then encode them."""
    from app.connectors.hudl_exports import export_from_segments

    try:
        connection.report("exporting", "Fetching and encoding the selected moments…")
        identity = connection._stream_match
        title = connection.catalogue.find(identity).get("title")
        # Spec 190: moment exports are kept apart from full matches.
        folder = connection.output / "moments"
        folder.mkdir(parents=True, exist_ok=True)
        target = export_from_segments(
            playlist,
            lambda index: connection.resource(stream, str(index))[0],
            selected,
            folder,
            combined=combined,
            **({"match_title": title} if isinstance(title, str) else {}),
            progress=lambda done, total: connection._set_progress(
                "Fetching and encoding the selected moments", 1, done, total
            ),
        )
        connection.index.record(
            "moments",
            identity,
            title if isinstance(title, str) else None,
            target,
            connection.output,
            selected,
            combined=combined,
        )
        with connection._lock:
            connection._state["filename"] = f"moments/{target.name}"
            connection._state["download_name"] = target.name
            connection._state["download_kind"] = "moments"
        connection.report(
            "done",
            "Combined moments video ready to download."
            if combined
            else "Moments ZIP (one video per moment) ready to download.",
        )
    except CaptureError as error:
        connection.report("error", str(error))
    except Exception:
        connection.report(
            "error", "Moment export stopped. The stream and your files are unchanged."
        )
    finally:
        with connection._lock:
            connection._pending -= 1
            connection._progress = None
