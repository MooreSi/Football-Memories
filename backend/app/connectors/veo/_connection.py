"""Test and Refresh for the Veo account, one operation at a time (spec 250)."""

from __future__ import annotations

import json
import os
import re
import secrets
import subprocess
import tempfile
import threading
import time
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any

from app.connectors.hudl_capture import CaptureError

from ._parse import ACTIVE, best_video, library_item, next_page

MAX_PAGES = 100


class VeoConnection:
    def __init__(
        self,
        loader: Callable[[], Any],
        directory: Path,
        session: Any = None,
        run: Callable[[Callable[[], None]], Any] | None = None,
        media: Any = None,
        probe: Callable[[Path], float | None] | None = None,
        index: Any = None,
        folder: Callable[[], Path] | None = None,
    ) -> None:
        if session is None:
            from ._client import session as real_session

            session = real_session
        if media is None:
            from . import _client as media
        self._media = media
        self._probe = probe or _probe_duration
        self.index = index
        self._folder = folder or (lambda: directory.parent)
        # Spec 260: video addresses and the stream token live in memory only.
        self._videos: dict[str, str] = {}
        self._stream: tuple[str, str] | None = None
        self._media_lock = threading.Lock()
        self._downloading = False
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
            "match_id": None,
            "stream_url": None,
            "filename": None,
        }

    def __repr__(self) -> str:
        return f"VeoConnection(state={self._state['state']!r})"

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

    def start(self, action: str, match_id: str | None = None) -> None:
        if action not in {"test", "refresh", "watch", "download"}:
            raise CaptureError("Choose Test, Refresh, Watch or Download.")
        if action in {"watch", "download"}:
            item = self._match(match_id)
            if item is None or not item.get("available") or not item.get("slug"):
                raise CaptureError("Veo has no video for this match.")
        with self._lock:
            if self._busy:
                raise CaptureError("A Veo operation is already running.")
            self._busy = True
            self._downloading = action == "download"
            message = "Signing in to Veo…"
            if action in {"watch", "download"} and match_id in self._videos:
                message = "Preparing the Veo video…"
            self._state.update(state="working", message=message, progress=None)
        self._run(lambda: self._perform(action, match_id))

    def _match(self, identity: str | None) -> dict[str, Any] | None:
        return next((i for i in self.library() if i.get("id") == identity), None)

    def _perform(self, action: str, match_id: str | None = None) -> None:
        try:
            if action in {"watch", "download"} and match_id:
                url = self._videos.get(match_id) or self._read_video(match_id)
                if action == "watch":
                    self._watch(match_id, url)
                else:
                    self._download(match_id, url)
                return
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
                self._downloading = False

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
            self._remember(f"veo-{r['identifier']}", videos)
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

    def _remember(self, identity: str, videos: Any) -> str | None:
        video = best_video(videos if isinstance(videos, list) else [])
        url = video.get("url") if video else None
        if isinstance(url, str) and url:
            self._videos[identity] = url
            return url
        return None

    def _read_video(self, identity: str) -> str:
        """One sign-in and one JSON read: this match's video list (no match page, no view)."""
        item = self._match(identity) or {}
        with self._session(self.loader) as api:
            _, videos = api.get(f"/api/app/matches/{item.get('slug')}/videos/")
        url = self._remember(identity, videos)
        if url is None:
            raise CaptureError("Veo has no video for this match.")
        return url

    def _watch(self, identity: str, url: str) -> None:
        token = secrets.token_urlsafe(24)
        with self._lock:
            self._stream = (token, identity)
        self._report(
            state="ready",
            match_id=identity,
            stream_url=f"http://127.0.0.1:8766/veo/stream/{token}",
            message="Veo video ready. It plays through the desktop helper.",
            progress=None,
        )

    def stream(self, token: str, header: str | None) -> tuple[int, int, int, bytes]:
        """One Range read for the browser's video element: (start, end, total, bytes)."""
        with self._lock:
            current = self._stream
            downloading = self._downloading
        if not token or current is None or token != current[0]:
            raise CaptureError("This stream has expired. Select Watch again.")
        if downloading:
            raise CaptureError("Wait for the Veo download to finish, then play the match.")
        found = re.fullmatch(r"bytes=(\d+)-(\d*)", (header or "bytes=0-").strip())
        if not found:
            raise CaptureError("That part of the video does not exist.")
        url = self._videos.get(current[1])
        if url is None:
            raise CaptureError("This stream has expired. Select Watch again.")
        with self._media_lock:
            start, total, body = self._media.media_range(
                url, int(found[1]), int(found[2]) if found[2] else None
            )
        return start, start + len(body) - 1, total, body

    def _download(self, identity: str, url: str) -> None:
        item = self._match(identity) or {}
        folder = self._folder()
        folder.mkdir(parents=True, exist_ok=True)
        height = item.get("video_height") or "full"
        target = folder / f"veo-{item.get('capture_key')}-{height}p.mp4"
        if target.exists():
            self._report(
                state="done",
                filename=target.name,
                match_id=identity,
                message="This Veo match is already downloaded. Nothing was replaced.",
            )
            return
        part = target.with_name(target.name + ".part")

        def progress(done: int, total: int) -> None:
            self._report(
                message=(
                    f"Downloading the Veo match… {done // 1_000_000} of {total // 1_000_000} MB"
                ),
                progress={"done": done, "total": total, "fraction": done / total if total else 0},
            )

        with self._media_lock:
            self._media.media_download(url, part, progress)
        if not self._probe(part):
            raise CaptureError(
                f"The downloaded video could not be read, so it was kept as {part.name}."
            )
        try:
            os.link(part, target)  # fails if the target appeared meanwhile: never overwrite
        except FileExistsError:
            raise CaptureError(
                f"{target.name} appeared during the download; the new copy is {part.name}."
            ) from None
        except OSError:
            if target.exists():
                raise CaptureError(f"{target.name} already exists; kept {part.name}.") from None
            os.rename(part, target)
        else:
            part.unlink()
        if self.index is not None:
            self.index.record(
                "match", identity, item.get("title"), target, folder, item.get("moments") or []
            )
        self._report(
            state="done",
            progress=None,
            filename=target.name,
            match_id=identity,
            message=f"Downloaded {item.get('title') or 'the Veo match'} to the download folder.",
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


def _probe_duration(path: Path) -> float | None:
    """ffprobe's duration of a downloaded video, or None when it cannot read it."""
    try:
        done = subprocess.run(
            [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "csv=p=0",
                str(path),
            ],
            capture_output=True,
            text=True,
            timeout=120,
            check=False,
        )
        value = float(done.stdout.strip()) if done.returncode == 0 else 0.0
    except (OSError, subprocess.TimeoutExpired, ValueError):
        return None
    return value if value > 0 else None
