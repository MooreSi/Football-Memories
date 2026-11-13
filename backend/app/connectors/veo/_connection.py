"""Test and Refresh for the Veo account, one operation at a time (spec 250)."""

from __future__ import annotations

import json
import os
import tempfile
import threading
import time
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any

from app.connectors.hudl_capture import CaptureError

from ._parse import ACTIVE, library_item, next_page

MAX_PAGES = 100


class VeoConnection:
    def __init__(
        self,
        loader: Callable[[], Any],
        directory: Path,
        session: Any = None,
        run: Callable[[Callable[[], None]], Any] | None = None,
    ) -> None:
        if session is None:
            from ._client import session as real_session

            session = real_session
        self.loader = loader
        self.directory = directory
        self.path = directory / "library.json"
        self._session = session
        self._lock = threading.Lock()
        self._busy = False
        self._executor: ThreadPoolExecutor | None = None
        self._run = run or self._submit
        self._state: dict[str, Any] = {
            "state": "idle",
            "message": "",
            "summary": None,
            "progress": None,
        }

    def _submit(self, work: Callable[[], None]) -> None:
        if self._executor is None:
            self._executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="veo")
        self._executor.submit(work)

    def status(self) -> dict[str, Any]:
        with self._lock:
            try:
                checked: float | None = self.path.stat().st_mtime
            except OSError:
                checked = None
            return {**self._state, "busy": self._busy, "library_checked_at": checked}

    def _report(self, **values: Any) -> None:
        with self._lock:
            self._state.update(values)

    def start(self, action: str) -> None:
        if action not in {"test", "refresh"}:
            raise CaptureError("Choose Test or Refresh.")
        with self._lock:
            if self._busy:
                raise CaptureError("A Veo operation is already running.")
            self._busy = True
            self._state.update(state="working", message="Signing in to Veo…", progress=None)
        self._run(lambda: self._perform(action))

    def _perform(self, action: str) -> None:
        try:
            with self._session(self.loader) as api:
                if action == "test":
                    self._test(api)
                else:
                    self._refresh(api)
        except CaptureError as error:
            self._report(state="error", message=str(error), progress=None)
        except Exception:
            self._report(
                state="error",
                message="The Veo connection stopped unexpectedly. Try again.",
                progress=None,
            )
        finally:
            with self._lock:
                self._busy = False

    def _clubs(self, api: Any) -> list[dict[str, Any]]:
        api.get("/api/app/user/")
        _, clubs = api.get("/api/app/clubs/?filter=own")
        return [c for c in clubs or [] if isinstance(c, dict) and isinstance(c.get("slug"), str)]

    def _test(self, api: Any) -> None:
        clubs = self._clubs(api)
        total = expired = expiring = 0
        for club in clubs:
            headers, _ = api.get(f"/api/app/clubs/{club['slug']}/recordings/?filter=own")
            total += int(headers.get("x-veo-total-count", 0) or 0)
            expired += int(headers.get("x-veo-matches-expired", 0) or 0)
            expiring += int(headers.get("x-veo-matches-soon-expiring", 0) or 0)
        summary = {
            "clubs": len(clubs),
            "matches": total,
            "with_video": total - expired,
            "expired": expired,
            "expiring": expiring,
        }
        self._report(
            state="ready",
            summary=summary,
            message=(
                f"Connected to Veo: {total} matches in {len(clubs)} "
                f"club{'s' if len(clubs) != 1 else ''}, {total - expired} with video, "
                f"{expired} expired. Select Refresh matches to read them."
            ),
        )

    def _refresh(self, api: Any) -> None:
        recordings: list[dict[str, Any]] = []
        clubs = self._clubs(api)
        for club in clubs:
            base = f"/api/app/clubs/{club['slug']}/recordings/?filter=own"
            page: int | None = 1
            for _ in range(MAX_PAGES):
                if page is None:
                    break
                self._report(message=f"Listing Veo matches… ({len(recordings)} so far)")
                headers, items = api.get(base if page == 1 else f"{base}&page={page}")
                recordings += [
                    r for r in items or [] if isinstance(r, dict) and r.get("identifier")
                ]
                page = next_page(headers.get("link"))
        active = [
            r
            for r in recordings
            if r.get("is_accessible") and r.get("expiration_status") in ACTIVE and r.get("slug")
        ]
        library: list[dict[str, Any]] = []
        done = 0
        for r in recordings:
            if r not in active:
                library.append(library_item(r))
                continue
            done += 1
            self._report(
                message=f"Reading Veo match {done} of {len(active)}…",
                progress={
                    "done": done - 1,
                    "total": len(active),
                    "fraction": (done - 1) / len(active),
                },
            )
            slug = r["slug"]
            _, detail = api.get(f"/api/app/matches/{slug}/")
            _, videos = api.get(f"/api/app/matches/{slug}/videos/")
            _, highlights = api.get(f"/api/app/matches/{slug}/highlights/?include_ai=true")
            _, periods = api.get(f"/api/app/matches/{slug}/periods/")
            library.append(library_item(r, detail, highlights, periods, videos))
        self._write(library)
        moments = sum(len(i["moments"]) for i in library)
        with_video = sum(1 for i in library if i["available"])
        self._report(
            state="ready",
            progress=None,
            summary={
                "clubs": len(clubs),
                "matches": len(library),
                "with_video": with_video,
                "expired": sum(1 for i in library if i["expiration_status"] == "expired"),
                "expiring": sum(1 for i in library if i["expiration_status"] == "expires-soon"),
                "moments": moments,
            },
            message=(
                f"Read {len(library)} Veo matches: {with_video} with video and "
                f"{moments} highlights."
            ),
        )

    def _write(self, library: list[dict[str, Any]]) -> None:
        self.directory.mkdir(parents=True, exist_ok=True, mode=0o700)
        descriptor, temporary = tempfile.mkstemp(dir=self.directory, suffix=".tmp")
        try:
            with os.fdopen(descriptor, "w") as stream:
                json.dump({"saved_at": time.time(), "matches": library}, stream)
            os.replace(temporary, self.path)
        finally:
            Path(temporary).unlink(missing_ok=True)

    def library(self) -> list[dict[str, Any]]:
        try:
            data = json.loads(self.path.read_text())
            items = data.get("matches") if isinstance(data, dict) else None
            return [i for i in items or [] if isinstance(i, dict)]
        except (OSError, ValueError):
            return []

    def reset(self) -> None:
        self.path.unlink(missing_ok=True)
        self._report(
            state="idle",
            summary=None,
            progress=None,
            message="Veo account saved. Select Test to connect.",
        )

    def close(self) -> None:
        if self._executor is not None:
            self._executor.shutdown(wait=False)
