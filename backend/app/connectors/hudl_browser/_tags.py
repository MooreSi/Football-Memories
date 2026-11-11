"""Paced background sweep: tag metadata, then full-quality snapshots. Split from _account.py."""

from __future__ import annotations

import time
from typing import TYPE_CHECKING

from app.connectors.hudl_capture import CaptureError

from ._capture import MAX_FAILURES_IN_A_ROW, UNAVAILABLE_RETRY_S, HudlBlocked

if TYPE_CHECKING:
    from ._account import BrowserConnection


def _queue_sync(connection: BrowserConnection) -> None:
    """New matches get their tag metadata recorded automatically after discovery."""
    with connection._lock:
        connection._pending += 1
        connection._syncing = True
        connection._cancel_sync.clear()
    connection._executor.submit(connection._perform, "sync_tags", None)


def _sync_tags(connection: BrowserConnection) -> None:
    """Sequential, paced sweep of matches whose tags were never recorded.

    Pacing is provisional owner decision 003: one match at a time with a pause
    between pages (golden rule 3). A video Hudl cannot show (no player, no tag
    data) is recorded as unavailable with its reason and skipped for a week, so
    the sweep resumes past it. Account-level refusals stop at once.
    """
    age = connection._tag_age
    items = [
        m
        for m in connection.catalogue.items()
        if age is None or (age and age in (m.get("age_groups") or [m.get("age_group")]))
    ]
    now = time.time()

    def due(identity: str) -> bool:
        saved = connection.details.read(identity)
        if saved.get("tag_error") == "The player has not reported a recorded video duration.":
            return True  # Retry this now-fixed metadata readiness failure within the chosen age.
        if saved.get("tag_status") == "unavailable":
            return now - float(saved.get("checked_at", 0)) > UNAVAILABLE_RETRY_S
        return "tag_status" not in saved

    pending = [item["id"] for item in items if due(item["id"])]
    known = len(items) - len(pending)
    failures = unreadable = 0
    for done, identity in enumerate(pending):
        if connection._cancel_sync.is_set() or age != connection._tag_age:
            connection.report(
                "ready", f"Tag indexing paused at {known + done} of {len(items)} matches."
            )
            return
        connection.report("syncing", f"Indexing tags: {known + done + 1} of {len(items)} matches…")
        try:
            connection._cache_tags(identity)
            failures = 0
        except HudlBlocked as error:
            connection.report("error", f"Tag indexing stopped: {error} Cached tags are kept.")
            return
        except CaptureError as error:
            connection.details.write(
                identity,
                {
                    **connection.details.read(identity),
                    "tag_status": "unavailable",
                    "tag_error": str(error),
                    "checked_at": time.time(),
                },
            )
            unreadable += 1
            failures += 1
            if failures >= MAX_FAILURES_IN_A_ROW:
                connection.report(
                    "error",
                    f"Tag indexing stopped after {failures} Hudl pages in a row failed to "
                    "load. Cached tags are kept; Refresh Hudl to continue.",
                )
                return
        if connection._page is not None:
            connection._page.wait_for_timeout(2500)
    # Owner report 2026-11-11: matches indexed before posters existed kept Hudl's
    # 320x240 thumbnail. Same pacing and stop rules as the tag sweep above.
    posters = [item["id"] for item in items if connection._needs_poster(item["id"], time.time())]
    for done, identity in enumerate(posters):
        if connection._cancel_sync.is_set() or age != connection._tag_age:
            connection.report("ready", f"Snapshots paused at {done} of {len(posters)}.")
            return
        connection.report(
            "syncing", f"Making full-quality snapshots: {done + 1} of {len(posters)}…"
        )
        try:
            connection._try_poster(identity, connection._observe(identity, False))
        except HudlBlocked as error:
            connection.report("error", f"Snapshots stopped: {error} Saved snapshots are kept.")
            return
        except CaptureError:
            connection.details.write(
                identity, {**connection.details.read(identity), "poster_checked_at": time.time()}
            )
        if connection._page is not None:
            connection._page.wait_for_timeout(2500)
    skipped = f" {unreadable} videos had no readable tags." if unreadable else ""
    connection.report("ready", f"Tags indexed for {len(items)} matches.{skipped}")
