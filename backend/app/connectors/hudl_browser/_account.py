"""Local desktop helper: normal interactive login, observe, download, verify.

Run on the user's desktop, not inside Docker. Auth stays in an incognito browser
context. No storage-state, cookies, headers, response dumps or traces are saved.
"""

from __future__ import annotations

import contextlib
import re
import tempfile
import threading
import time
from collections.abc import Callable
from pathlib import Path
from typing import Any, cast
from urllib.parse import urlsplit

from playwright.sync_api import Response, sync_playwright

from app.connectors.hudl_capture import (
    CaptureError,
    capture_hls,
    media_url,
    parse_manifest,
    save_capture,
)
from app.connectors.hudl_metadata import MatchCache, capture_key, optional_moments

from ._capture import (
    LOGIN_URL,
    MAX_FAILURES_IN_A_ROW,
    UNAVAILABLE_RETRY_S,
    HudlBlocked,
    Observation,
    authenticate,
    fetch_media,
)


class BrowserConnection:
    """One worker owns one ephemeral session. Remote URLs never leave this worker."""

    def __init__(self, loader: Callable[[], Any], catalogue: Any, output: Path) -> None:
        import threading
        from concurrent.futures import ThreadPoolExecutor

        self.loader = loader
        self.catalogue = catalogue
        self.output = output
        self.details = MatchCache(output.parent / ".hudl-account" / "details")
        self._thumbnails: dict[str, str] = {}
        self._libraries: set[str] = set()
        self._teams: dict[str, dict[str, str]] = {}
        self._executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="hudl-account")
        self._lock = threading.Lock()
        self._pending = 0
        self._syncing = False
        self._cancel_sync = threading.Event()
        self._visible_next = False
        self._visible_session = False
        self._progress: dict[str, Any] | None = None
        self._stream_match = ""
        self._stream_playlist = ""
        self._progress_start = 0.0
        self._steps = 1
        self._browser: Any = None
        self._playwright: Any = None
        self._context: Any = None
        self._page: Any = None
        self._assets: dict[str, str] = {}
        self._observed_matches: dict[str, dict[str, str]] = {}
        self._library_failure: str | None = None
        self._playlist = b""
        self._stream_id = ""
        self._state: dict[str, Any] = {
            "state": "idle",
            "message": "Save your Hudl account, then Test to find matches.",
            "stream_url": None,
            "filename": None,
        }

    def status(self) -> dict[str, Any]:
        with self._lock:
            return {
                **self._state,
                "busy": self._pending > 0,
                "syncing": self._syncing,
                "progress": dict(self._progress) if self._progress else None,
                "matches": self.catalogue.items(),
                "session_active": self._context is not None,
            }

    def _set_progress(self, label: str, step: int, done: int, total: int) -> None:
        """Step fraction plus a time-left estimate from this step's own pace."""
        now = time.monotonic()
        with self._lock:
            if not self._progress or self._progress["label"] != label:
                self._progress_start = now
            elapsed = now - self._progress_start
            self._progress = {
                "label": label,
                "step": step,
                "steps": self._steps,
                "done": done,
                "total": total,
                "fraction": done / total if total else 0.0,
                "eta_s": round(elapsed / done * (total - done), 1) if done else None,
            }

    def report(self, state: str, message: str) -> None:
        with self._lock:
            self._state.update(state=state, message=message)

    def start(
        self,
        action: str,
        identity: str | None = None,
        moment_ids: list[str] | None = None,
        *,
        combined: bool = False,
    ) -> None:
        with self._lock:
            # A background tag sync yields to one user action; nothing else queues.
            if self._pending and not (
                self._syncing and self._pending == 1 and action != "sync_tags"
            ):
                raise CaptureError("A Hudl operation is already running.")
            if self._syncing:
                self._cancel_sync.set()
            self._pending += 1
            if action == "sync_tags":
                self._syncing = True
                self._cancel_sync.clear()
                self._state.update(state="syncing", message="Indexing tags for your matches…")
                self._executor.submit(self._perform, action, identity, moment_ids, combined)
                return
            completed = (
                self._state.get("filename")
                if action == "stream" and self._state.get("match_id") == identity
                else None
            )
            # A moment export of the match being watched keeps its stream playing.
            keep = action == "clips" and self._state.get("match_id") == identity
            self._state.update(
                state="working",
                message="Preparing moments…" if action == "clips" else "Opening Hudl…",
                stream_url=self._state.get("stream_url") if keep else None,
                filename=completed,
                match_id=identity,
            )
        self._executor.submit(self._perform, action, identity, moment_ids, combined)

    def close(self) -> None:
        def finish() -> None:
            self._close()
            if self._playwright is not None:
                self._playwright.stop()
                self._playwright = None

        self._executor.submit(finish)
        self._executor.shutdown(wait=False)

    def reset(self) -> None:
        # Call only while idle. Clearing account metadata prevents account switching
        # from exposing another account's catalogue or active proxy resources.
        self.catalogue.replace([])
        with self._lock:
            self._state.update(
                state="idle",
                stream_url=None,
                filename=None,
                message="Credentials saved. Select Test to connect.",
            )
        self._executor.submit(self._close)

    def _close(self) -> None:
        if self._browser:
            # It may already have been closed by the owner; never log browser errors.
            with contextlib.suppress(Exception):
                self._browser.close()
        self._browser = self._context = self._page = None
        self._assets.clear()
        self._stream_id = ""
        self._stream_match = ""
        self._stream_playlist = ""
        self._observed_matches.clear()
        self._thumbnails.clear()
        self._libraries.clear()
        self._teams.clear()
        self._library_failure = None
        self._playlist = b""

    def _login(self) -> None:
        if self._playwright is None:
            self._playwright = sync_playwright().start()
        if self._visible_session and self._signed_in():
            # The owner completed Hudl's own verification in the visible window.
            self._visible_session = False
            return
        self._close()
        # Owner choice (D-022): headless, no window. Chrome reports itself as
        # HeadlessChrome; never disguise it. Any hidden failure falls back to a
        # visible window on the next attempt, never a hidden retry.
        visible = self._visible_next
        self._visible_next = False
        self._browser = self._playwright.chromium.launch(channel="chrome", headless=not visible)
        self._context = self._browser.new_context()
        self._page = self._context.new_page()
        self._page.on("response", self._library_response)
        self.report("login", "Signing into Hudl using this Mac's Keychain.")
        self._page.goto(LOGIN_URL, wait_until="domcontentloaded")
        if visible:
            self._page.bring_to_front()
        credentials = self.loader()
        try:
            authenticate(self._page, credentials)
        except Exception as error:
            if visible:
                # Verification, CAPTCHA or terms are the owner's to complete, never automated.
                self._visible_session = True
                self._visible_next = True
                raise HudlBlocked(
                    "Hudl asked for verification or terms. The Hudl window is open: complete "
                    "it there, then select Test again."
                ) from error
            self._close()
            self._visible_next = True
            raise HudlBlocked(
                "Hudl sign-in did not finish in the hidden browser. Select Test again to sign "
                "in with a visible Hudl window."
            ) from error
        finally:
            del credentials

    def _signed_in(self) -> bool:
        try:
            address = urlsplit(self._page.url)
        except Exception:
            return False
        return address.hostname in {"www.hudl.com", "app.hudl.com"} and address.path not in {
            "/login",
            "/app/users/oidc/callback",
        }

    def _library_response(self, response: Response) -> None:
        from app.connectors.hudl_account import library_matches

        parsed = urlsplit(response.url)
        if not (parsed.hostname or "").endswith(".hudl.com") or "graphql" not in parsed.path:
            return
        if response.status in {401, 403, 429}:
            self._library_failure = "Hudl requires sign-in, verification or a rate-limit pause."
            return
        if response.status != 200:
            return
        try:
            payload = response.json()
            if isinstance(payload, dict):
                for match in library_matches(payload):
                    self._observed_matches[match["id"]] = match
                for edge in (payload.get("data") or {}).get("library", {}).get("edges", []):
                    node = edge.get("node") or {}
                    if node.get("id") in self._observed_matches and isinstance(
                        node.get("thumbnailUri"), str
                    ):
                        self._thumbnails[node["id"]] = media_url(node["thumbnailUri"])
        except Exception:
            return  # Ignore cancelled speculative response bodies.

    def _links(self) -> list[dict[str, str]]:
        return cast(
            list[dict[str, str]],
            self._page.locator("a[href]").evaluate_all(
                "elements => elements.map(a => ({href:a.href, "
                "text:(a.innerText || a.getAttribute('aria-label') || a.title || '').trim()}))"
            ),
        )

    def _team_links(self) -> list[dict[str, str]]:
        links = self._links()
        if not any(
            "/ui/webnav/context/team/" in link["href"] and link["text"].strip() for link in links
        ):
            selector = self._page.locator("a[href]").filter(
                has_text=re.compile(r"^\s*\d+\.\s+.*\bU\d+\b", re.I)
            )
            if selector.count() and selector.first.is_visible():
                selector.first.click()
                self._page.wait_for_timeout(300)
                links = self._links()
        return links

    def _discover(self, refresh: bool = False) -> None:
        from app.connectors.hudl_account import extract_matches, team_libraries

        if not refresh or self._context is None or not self._libraries:
            self._login()
        self.report("discovering", "Reading accessible matches from your Hudl team libraries.")
        self._page.wait_for_timeout(1500)
        links = self._team_links()
        library_pattern = r"https://(?:app|www)\.hudl\.com/watch/team/([0-9]+)/analyze/?"
        if re.fullmatch(library_pattern, self._page.url):
            self._libraries.add(self._page.url)
        for team in team_libraries(links):
            self._teams[team["team_id"]] = team
        libraries = sorted(
            self._libraries
            | {item["href"] for item in links if re.fullmatch(library_pattern, item["href"])}
        )
        prepared: str | None = None
        if libraries and not self._teams and not re.fullmatch(library_pattern, self._page.url):
            self._observed_matches.clear()
            prepared = libraries[0]
            self._page.goto(prepared, wait_until="domcontentloaded")
            self._page.wait_for_timeout(1500)
            for team in team_libraries(self._team_links()):
                self._teams[team["team_id"]] = team
        libraries = [
            url
            for url in libraries
            if cast(re.Match[str], re.fullmatch(library_pattern, url)).group(1) not in self._teams
        ]
        libraries += [team["url"] for team in self._teams.values()]
        libraries = libraries[:20]
        if not libraries:
            library = self._page.get_by_role("link", name=re.compile(r"^(Video|Library)$", re.I))
            if library.count():
                library.first.click()
                self._page.wait_for_timeout(1500)
                for team in team_libraries(self._team_links()):
                    self._teams[team["team_id"]] = team
                libraries = [team["url"] for team in self._teams.values()][:20]
        matches: list[dict[str, Any]] = []
        self._thumbnails.clear()
        addresses: list[str | None] = list(libraries) if libraries else [None]
        for address in addresses:
            if prepared is None or address != prepared:
                self._observed_matches.clear()
                if address:
                    fragment_only = (
                        "#" in self._page.url and self._page.url.split("#", 1)[0] == address
                    )
                    self._page.goto(address, wait_until="domcontentloaded")
                    if fragment_only:
                        self._page.reload(wait_until="domcontentloaded")
            current_team = next((t for t in self._teams.values() if t["url"] == address), None)
            links = []
            unchanged = 0
            previous = 0
            for step in range(60):
                self._page.wait_for_timeout(800)
                if self._library_failure:
                    raise CaptureError(self._library_failure)
                if re.fullmatch(library_pattern, self._page.url):
                    links.extend(self._links())
                count = len(extract_matches(links)) + len(self._observed_matches)
                unchanged = unchanged + 1 if count == previous else 0
                previous = count
                if unchanged >= 4 and (count > 0 or step >= 14):
                    break
                viewport = self._page.viewport_size or {"width": 1280, "height": 720}
                self._page.mouse.move(viewport["width"] * 0.7, viewport["height"] * 0.7)
                self._page.mouse.wheel(0, 850)
            on_library = re.fullmatch(library_pattern, self._page.url)
            if current_team and (not on_library or on_library.group(1) != current_team["team_id"]):
                raise CaptureError(
                    "Hudl did not open the selected team library. Cached matches preserved."
                )
            if on_library:
                self._libraries.add(self._page.url)
            metadata = [
                {"href": item["url"], "text": item["title"]}
                for item in self._observed_matches.values()
            ]
            found = extract_matches(metadata + (links if on_library else []))
            if not found:
                raise CaptureError(
                    "Login completed, but no match links were found. Open your Video library "
                    "in the Hudl window, then Refresh matches."
                )
            matches.extend(
                {**item, **({"age_groups": [current_team["age_group"]]} if current_team else {})}
                for item in found
            )
        self.catalogue.replace(matches)
        for item in self.catalogue.items():
            address = self._thumbnails.get(item["id"])
            if address and not self.details.path(item["id"], ".image").exists():
                self.report("discovering", "Caching match thumbnails…")
                self.details.image(item["id"], fetch_media(self._context, address))
        self.report("ready", f"Connected. Cached {len(self.catalogue.items())} available matches.")

    def _observe(self, identity: str, need_tags: bool) -> Observation:
        match = self.catalogue.find(identity)
        if self._context is None:
            self._login()
        observation = Observation(identity)
        self._page.on("response", observation.response)
        try:
            self._page.goto(match["url"] + "/explore/sportscode", wait_until="domcontentloaded")
            deadline = time.monotonic() + 90
            settled, count = time.monotonic(), 0
            while time.monotonic() < deadline:
                self._page.wait_for_timeout(500)
                if observation.failure:
                    raise (HudlBlocked if observation.blocked else CaptureError)(
                        observation.failure
                    )
                if len(observation.payloads) != count:
                    count, settled = len(observation.payloads), time.monotonic()
                if (
                    observation.manifests
                    and time.monotonic() - settled >= 3
                    and (
                        observation.payloads or (not need_tags and time.monotonic() > deadline - 80)
                    )
                ):
                    break
            if not observation.manifests or (need_tags and not observation.payloads):
                raise CaptureError(
                    "This match's playback or tags did not load. Test the connection again."
                )
            pause = self._page.get_by_title("Pause", exact=True)
            if pause.count() == 1:
                pause.click()
            return observation
        finally:
            self._page.remove_listener("response", observation.response)

    def _prepare_stream(self, identity: str) -> None:
        import secrets

        observation = self._observe(identity, False)
        address = observation.master(65536)
        for _ in range(3):
            manifest = parse_manifest(
                fetch_media(self._context, address).decode(), address, max_height=65536
            )
            if manifest.variant_url is None:
                break
            address = manifest.variant_url
        else:
            raise CaptureError("Unsupported nested stream manifest.")
        if isinstance(observation.payloads, list) and observation.payloads:
            duration = self._page.locator("video").first.evaluate("element => element.duration")
            moments, tag_status = optional_moments(observation.payloads, identity, duration)
            self.details.write(
                identity,
                {
                    "duration_s": duration,
                    "tag_status": tag_status,
                    "moments": [
                        {
                            "id": m.source_event_id,
                            "time_s": m.time_s,
                            "duration_s": m.duration_s,
                            "category": m.category,
                        }
                        for m in moments
                    ],
                },
            )
        self._stream_id = secrets.token_urlsafe(24)
        self._stream_match = identity
        self._stream_playlist = manifest.local_playlist
        self._assets = {str(index): url for index, url in enumerate(manifest.resources)}
        playlist = manifest.local_playlist
        for index in range(len(manifest.resources)):
            playlist = playlist.replace(f"asset-{index}.bin", f"/stream/{self._stream_id}/{index}")
        self._playlist = playlist.encode()
        with self._lock:
            self._state["stream_url"] = (
                f"http://127.0.0.1:8766/stream/{self._stream_id}/playlist.m3u8"
            )
        self.report("ready", "Stream ready. Playback uses your active Hudl connection.")

    def resource(self, stream: str, asset: str) -> tuple[bytes, str]:
        return self._executor.submit(self._resource, stream, asset).result(timeout=90)

    def _resource(self, stream: str, asset: str) -> tuple[bytes, str]:
        if stream != self._stream_id or not stream:
            raise CaptureError("This stream has expired. Select Stream again.")
        if asset == "playlist.m3u8":
            return self._playlist, "application/vnd.apple.mpegurl"
        if asset not in self._assets:
            raise CaptureError("Unknown stream resource.")
        return fetch_media(self._context, self._assets[asset]), "application/octet-stream"

    def _download(self, identity: str) -> Path:
        observation = self._observe(identity, False)
        master = observation.master(65536)
        rendition = parse_manifest(observation.manifests[master], master, max_height=65536)
        name = f"hudl-{capture_key(identity)}-highest-{rendition.height}p-{rendition.bandwidth}"
        destination = self.output / f"{name}.mp4"
        if destination.exists() and destination.with_suffix(".tags.csv").exists():
            with self._lock:
                self._state["filename"] = destination.name
            self.report(
                "done", "This match is already captured. Use Import to add it to the Library."
            )
            return destination
        video = self._page.locator("video").first
        duration = video.evaluate("element => element.duration")
        moments, tag_status = optional_moments(observation.payloads, identity, duration)
        self.details.write(
            identity,
            {
                "duration_s": duration,
                "quality_height": rendition.height,
                "tag_status": tag_status,
                "moments": [
                    {
                        "id": m.source_event_id,
                        "time_s": m.time_s,
                        "duration_s": m.duration_s,
                        "category": m.category,
                    }
                    for m in moments
                ],
            },
        )
        self.output.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(prefix=".hudl-download-", dir=self.output) as temp:

            def progress(done: int, total: int) -> None:
                self._set_progress("Caching the full-quality match video", 1, done, total)
                if done == total or done % 25 == 0:
                    self.report("downloading", f"Downloaded {done}/{total} media parts")

            source, length = capture_hls(
                lambda url: fetch_media(self._context, url),
                master,
                Path(temp),
                max_height=65536,
                progress=progress,
            )
            self.report("verifying", "Verifying captured video and moments.")
            target = save_capture(source, self.output, name, moments, length)
        with self._lock:
            self._state["filename"] = target.name
        self.report(
            "done", f"Verified video and {len(moments)} moments saved. Use Import to add the match."
        )

        return target

    def _cache_tags(self, identity: str) -> int:
        """Record one match's tag metadata from its normal playback page; never the video."""
        observation = self._observe(identity, False)
        duration = self._page.locator("video").first.evaluate("element => element.duration")
        moments, tag_status = (
            optional_moments(observation.payloads, identity, duration)
            if observation.payloads
            else ([], "none")
        )
        self.details.write(
            identity,
            {
                **self.details.read(identity),
                "duration_s": duration,
                "tag_status": tag_status,
                "moments": [
                    {
                        "id": m.source_event_id,
                        "time_s": m.time_s,
                        "duration_s": m.duration_s,
                        "category": m.category,
                    }
                    for m in moments
                ],
            },
        )
        return len(moments)

    def _queue_sync(self) -> None:
        """New matches get their tag metadata recorded automatically after discovery."""
        with self._lock:
            self._pending += 1
            self._syncing = True
            self._cancel_sync.clear()
        self._executor.submit(self._perform, "sync_tags", None)

    def _sync_tags(self) -> None:
        """Sequential, paced sweep of matches whose tags were never recorded.

        Pacing is provisional owner decision 003: one match at a time with a pause
        between pages (golden rule 3). A video Hudl cannot show (no player, no tag
        data) is recorded as unavailable with its reason and skipped for a week, so
        the sweep resumes past it. Account-level refusals stop at once.
        """
        items = self.catalogue.items()
        now = time.time()

        def due(identity: str) -> bool:
            saved = self.details.read(identity)
            if saved.get("tag_status") == "unavailable":
                return now - float(saved.get("checked_at", 0)) > UNAVAILABLE_RETRY_S
            return "tag_status" not in saved

        pending = [item["id"] for item in items if due(item["id"])]
        known = len(items) - len(pending)
        failures = unreadable = 0
        for done, identity in enumerate(pending):
            if self._cancel_sync.is_set():
                self.report(
                    "ready", f"Tag indexing paused at {known + done} of {len(items)} matches."
                )
                return
            self.report("syncing", f"Indexing tags: {known + done + 1} of {len(items)} matches…")
            try:
                self._cache_tags(identity)
                failures = 0
            except HudlBlocked as error:
                self.report("error", f"Tag indexing stopped: {error} Cached tags are kept.")
                return
            except CaptureError as error:
                self.details.write(
                    identity,
                    {
                        **self.details.read(identity),
                        "tag_status": "unavailable",
                        "tag_error": str(error),
                        "checked_at": time.time(),
                    },
                )
                unreadable += 1
                failures += 1
                if failures >= MAX_FAILURES_IN_A_ROW:
                    self.report(
                        "error",
                        f"Tag indexing stopped after {failures} Hudl pages in a row failed to "
                        "load. Cached tags are kept; Refresh Hudl to continue.",
                    )
                    return
            if self._page is not None:
                self._page.wait_for_timeout(2500)
        skipped = f" {unreadable} videos had no readable tags." if unreadable else ""
        self.report("ready", f"Tags indexed for {len(items)} matches.{skipped}")

    def _perform(
        self,
        action: str,
        identity: str | None,
        moment_ids: list[str] | None = None,
        combined: bool = False,
    ) -> None:
        if action in {"clips", "download"}:
            with self._lock:
                self._steps = 1
                self._progress = None
        handed_off = False
        try:
            if action == "sync_tags":
                self._sync_tags()
            elif action in {"test", "refresh"}:
                self._discover(refresh=action == "refresh")
                self._queue_sync()
            elif action == "disconnect":
                self._close()
                with self._lock:
                    self._state.update(stream_url=None, filename=None)
                self.report(
                    "idle", "Disconnected. Credentials and cached matches remain on this Mac."
                )
            elif action == "stream" and identity:
                self._prepare_stream(identity)
            elif action == "clips" and identity:
                available = self.details.read(identity).get("moments", [])
                selected = [m for m in available if m["id"] in (moment_ids or [])]
                if not selected or len(selected) != len(set(moment_ids or [])):
                    raise CaptureError("Select moments loaded from this match first.")
                if self._stream_match != identity or not self._stream_id:
                    self._prepare_stream(identity)
                # Encode on another thread: the segment fetches go through this worker
                # one at a time, interleaved with the player's own stream requests.
                worker = threading.Thread(
                    target=self._export_worker,
                    args=(self._stream_id, self._stream_playlist, selected, combined),
                    daemon=True,
                )
                worker.start()
                handed_off = True
            elif action == "download" and identity:
                self._download(identity)
            else:
                raise CaptureError("Unknown Hudl operation.")
        except CaptureError as error:
            self.report("error", str(error))
        except Exception:
            self.report(
                "error",
                "Hudl operation stopped. Check credentials, browser verification and connection, "
                "then Test again.",
            )
        finally:
            if not handed_off:
                with self._lock:
                    self._pending -= 1
                    if action in {"clips", "download"}:
                        self._progress = None
                    if action == "sync_tags":
                        self._syncing = False

    def _export_worker(
        self, stream: str, playlist: str, selected: list[dict[str, Any]], combined: bool
    ) -> None:
        """Fetch only the stream segments covering the moments, then encode them."""
        from app.connectors.hudl_exports import export_from_segments

        try:
            self.report("exporting", "Fetching and encoding the selected moments…")
            target = export_from_segments(
                playlist,
                lambda index: self.resource(stream, str(index))[0],
                selected,
                self.output,
                combined=combined,
                progress=lambda done, total: self._set_progress(
                    "Fetching and encoding the selected moments", 1, done, total
                ),
            )
            with self._lock:
                self._state["filename"] = target.name
            self.report(
                "done",
                "Combined moments video ready to download."
                if combined
                else "Moments ZIP (one video per moment) ready to download.",
            )
        except CaptureError as error:
            self.report("error", str(error))
        except Exception:
            self.report("error", "Moment export stopped. The stream and your files are unchanged.")
        finally:
            with self._lock:
                self._pending -= 1
                self._progress = None
