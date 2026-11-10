"""Local desktop helper: normal interactive login, observe, download, verify.

Run on the user's desktop, not inside Docker. Auth stays in an incognito browser
context. No storage-state, cookies, headers, response dumps or traces are saved.
"""

from __future__ import annotations

import argparse
import contextlib
import hashlib
import json
import re
import sys
import tempfile
import time
from collections.abc import Callable
from pathlib import Path
from typing import Any, cast
from urllib.parse import urlsplit

from playwright.sync_api import BrowserContext, Page, Response, sync_playwright

from app.connectors.hudl_capture import (
    CaptureError,
    capture_hls,
    clip_tag_padding,
    media_url,
    parse_manifest,
    parse_moments,
    save_capture,
)
from app.connectors.hudl_metadata import MatchCache, capture_key, optional_moments

LOGIN_URL = "https://www.hudl.com/login"


def match_id(url: str) -> str:
    parsed = urlsplit(url)
    found = re.fullmatch(r"/watch/video/([A-Za-z0-9_=+-]+)(?:/explore/sportscode)?/?", parsed.path)
    if (
        parsed.scheme != "https"
        or parsed.hostname not in {"www.hudl.com", "hudl.com"}
        or parsed.username
        or parsed.password
        or parsed.port not in (None, 443)
        or parsed.query
        or parsed.fragment
        or found is None
    ):
        raise CaptureError("Use a Hudl match page address, without query parameters or fragments.")
    return found.group(1)


class Observation:
    def __init__(self, video_id: str) -> None:
        self.video_id = video_id
        self.payloads: list[dict[str, Any]] = []
        self.manifests: dict[str, str] = {}
        self.failure: str | None = None

    def response(self, response: Response) -> None:
        parsed = urlsplit(response.url)
        relevant = parsed.path.endswith(".m3u8") or parsed.path == "/api/graphql/query"
        if not relevant or not (parsed.hostname or "").endswith(".hudl.com"):
            return
        if response.status in {401, 403, 429}:
            self.failure = (
                "Hudl requires sign-in, access verification or a rate-limit pause. Capture stopped."
            )
            return
        if response.status != 200:
            self.failure = "Hudl returned a playback/data error. Capture stopped without retrying."
            return
        try:
            if parsed.path.endswith(".m3u8"):
                text = response.text()
                if text.strip().startswith("#EXTM3U"):
                    self.manifests[media_url(response.url)] = text
            else:
                payload = response.json()
                if isinstance(payload, dict) and (
                    "taggingSessions" in (payload.get("data") or {}) or payload.get("errors")
                ):
                    self.payloads.append(payload)
        except Exception:
            # Hudl cancels speculative prefetches during rendition changes.
            # Such a body is not capture evidence. Require a successfully read
            # manifest AND matching tags below, without retrying cancelled reads.
            return

    def master(self, max_height: int) -> str:
        for address, text in self.manifests.items():
            parsed = parse_manifest(text, address, max_height=max_height)
            if parsed.variant_url:
                return address
        raise CaptureError("No supported master playlist was observed in the match player.")


def fetch_media(context: BrowserContext, address: str) -> bytes:
    try:
        # Serial requests, no redirects and no retries. Playwright shares only
        # this ephemeral context's auth with its own request client.
        time.sleep(0.5)
        response = context.request.get(media_url(address), max_redirects=0, timeout=60_000)
        try:
            if response.status in {401, 403, 429}:
                raise CaptureError(
                    "Hudl requires sign-in, access verification or a rate-limit pause. "
                    "Capture stopped."
                )
            if response.status != 200:
                raise CaptureError(
                    "Hudl could not supply a video segment. Capture stopped without retrying."
                )
            length = response.headers.get("content-length")
            if length and int(length) > 100_000_000:
                raise CaptureError("An unexpectedly large segment was refused.")
            body = response.body()
            if length and not response.headers.get("content-encoding") and len(body) != int(length):
                raise CaptureError("A video segment was truncated; capture stopped.")
            return body
        finally:
            response.dispose()
    except CaptureError:
        raise
    except Exception:
        raise CaptureError(
            "Video transfer failed; reconnect before trying a new capture."
        ) from None


def run(args: argparse.Namespace, report: Callable[[str, str], None] | None = None) -> Path | None:
    def publish(state: str, message: str) -> None:
        if report is None:
            print(message, flush=True)
        else:
            report(state, message)

    video_id = match_id(args.url)
    observation = Observation(video_id)
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(channel="chrome", headless=False)
        try:
            context = browser.new_context()
            page = context.new_page()
            publish(
                "login",
                "Sign in directly to Hudl in the new Chrome window. Passwords stay in Hudl.",
            )
            page.goto(LOGIN_URL, wait_until="domcontentloaded")
            page.bring_to_front()
            page.wait_for_url(
                lambda url: (
                    urlsplit(url).hostname in {"www.hudl.com", "app.hudl.com"}
                    and urlsplit(url).path not in {"/login", "/login/", "/app/users/oidc/callback"}
                ),
                timeout=600_000,
            )
            page.on("response", observation.response)
            publish("discovering", "Reading this match's playback and Sportscode tags.")
            page.goto(
                f"https://www.hudl.com/watch/video/{video_id}/explore/sportscode",
                wait_until="domcontentloaded",
            )
            deadline = time.monotonic() + 90
            while time.monotonic() < deadline:
                page.wait_for_timeout(500)
                if observation.failure:
                    raise CaptureError(observation.failure)
                if observation.manifests and observation.payloads:
                    break
            if not observation.manifests or not observation.payloads:
                raise CaptureError(
                    "Playback or synced tag data did not load. "
                    "Open the match's Tags view and try again."
                )
            # Normal UI pause; do not alter the account, create clips or playlists.
            pause = page.get_by_title("Pause", exact=True)
            if pause.count() == 1:
                pause.click()
            video = page.locator("video").first
            video.wait_for(state="attached", timeout=30_000)
            duration_deadline = time.monotonic() + 30
            duration_s = float("nan")
            while time.monotonic() < duration_deadline:
                duration_s = video.evaluate("element => element.duration")
                if isinstance(duration_s, (int, float)) and duration_s > 0:
                    break
                page.wait_for_timeout(500)
            payloads = clip_tag_padding(observation.payloads, video_id, duration_s)
            codes = sorted({moment.category for moment in parse_moments(payloads, video_id, set())})
            publish("discovering", f"Observed {len(codes)} Sportscode codes.")
            if args.inspect_only:
                print(
                    json.dumps(
                        {
                            "codes": codes,
                            "moments": len(parse_moments(payloads, video_id, set())),
                        }
                    )
                )
                return None
            players = set(args.player_code)
            if players - set(codes):
                raise CaptureError(
                    "A selected player code was not present in this match; check its spelling."
                )
            moments = parse_moments(payloads, video_id, players)
            if not moments:
                raise CaptureError(
                    "No matching synced moments were observed; no capture was published."
                )
            master = observation.master(args.max_height)
            directory = Path(args.output).expanduser().resolve()
            directory.mkdir(parents=True, exist_ok=True)
            name = args.name or f"hudl-{hashlib.sha256(video_id.encode()).hexdigest()[:16]}"
            with tempfile.TemporaryDirectory(prefix=".hudl-download-", dir=directory) as temp:

                def progress(done: int, total: int) -> None:
                    if done == total or done % 25 == 0:
                        publish("downloading", f"Downloaded {done}/{total} media parts")

                source, duration = capture_hls(
                    lambda address: fetch_media(context, address),
                    master,
                    Path(temp),
                    max_height=args.max_height,
                    progress=progress,
                )
                if observation.failure:
                    raise CaptureError(observation.failure)
                publish("verifying", "Verifying the saved video and moment timings.")
                target = save_capture(source, directory, name, moments, duration)
            publish(
                "done",
                f"Verified video and {len(moments)} moments saved. "
                f"Import {target.name} in Football Memories.",
            )
            return target
        finally:
            browser.close()


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Capture an authorized Hudl match using your own browser sign-in."
    )
    parser.add_argument("url", help="Hudl /watch/video/ match page")
    parser.add_argument(
        "--output",
        required=True,
        help="New capture output folder (then copy/import into your inbox)",
    )
    parser.add_argument("--name", help="New filename stem; existing files are never overwritten")
    parser.add_argument(
        "--max-height", type=int, choices=[360, 480, 540, 720, 1080, 2160, 65536], default=65536
    )
    parser.add_argument(
        "--player-code",
        action="append",
        default=[],
        help="Exact Sportscode code to catalogue as a player; repeat as needed",
    )
    parser.add_argument(
        "--inspect-only",
        action="store_true",
        help="List codes/counts locally; do not download media",
    )
    args = parser.parse_args()
    try:
        run(args)
    except CaptureError as error:
        print(f"Capture stopped: {error}", file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        print("Capture cancelled. No session was saved.", file=sys.stderr)
        return 130
    except Exception:
        # Browser exceptions can contain cookie-bearing URLs and request headers.
        print(
            "Capture stopped. Check Chrome, sign-in, disk space and ffmpeg. "
            "No session details were logged.",
            file=sys.stderr,
        )
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())


def authenticate(page: Page, credentials: Any) -> None:
    def check() -> None:
        challenge = page.locator(
            'iframe[src*="captcha"], input[autocomplete="one-time-code"], input[name="otp"]'
        )
        if challenge.count() and challenge.first.is_visible():
            raise CaptureError(
                "Hudl requires verification. Complete it in the browser, then test again."
            )
        heading = page.get_by_role(
            "heading", name=re.compile(r"^(Verify|Enter.*code|Security check|Accept.*terms)", re.I)
        )
        if heading.count() and heading.first.is_visible():
            raise CaptureError("Hudl requires verification or terms acceptance in the browser.")

    check()
    page.locator('input[name="username"], input[type="email"]').first.fill(credentials.username)
    page.get_by_role("button", name=re.compile(r"^(Continue|Log in|Sign in)$", re.I)).first.click()
    page.locator('input[type="password"]').first.wait_for(state="visible", timeout=30_000)
    check()
    page.locator('input[type="password"]').first.fill(credentials.password.get_secret_value())
    page.get_by_role("button", name=re.compile(r"^(Continue|Log in|Sign in)$", re.I)).first.click()
    page.wait_for_url(
        lambda url: (
            urlsplit(url).hostname in {"www.hudl.com", "app.hudl.com"}
            and urlsplit(url).path not in {"/login", "/app/users/oidc/callback"}
        ),
        timeout=45_000,
    )
    check()


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
        self._busy = False
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
                "busy": self._busy,
                "matches": self.catalogue.items(),
                "session_active": self._context is not None,
            }

    def report(self, state: str, message: str) -> None:
        with self._lock:
            self._state.update(state=state, message=message)

    def start(
        self, action: str, identity: str | None = None, moment_ids: list[str] | None = None
    ) -> None:
        with self._lock:
            if self._busy:
                raise CaptureError("A Hudl operation is already running.")
            self._busy = True
            completed = (
                self._state.get("filename")
                if action == "stream" and self._state.get("match_id") == identity
                else None
            )
            self._state.update(
                state="working",
                message="Opening Hudl…",
                stream_url=None,
                filename=completed,
                match_id=identity,
            )
        self._executor.submit(self._perform, action, identity, moment_ids)

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
        self._observed_matches.clear()
        self._thumbnails.clear()
        self._libraries.clear()
        self._teams.clear()
        self._library_failure = None
        self._playlist = b""

    def _login(self) -> None:
        if self._playwright is None:
            self._playwright = sync_playwright().start()
        self._close()
        self._browser = self._playwright.chromium.launch(channel="chrome", headless=False)
        self._context = self._browser.new_context()
        self._page = self._context.new_page()
        self._page.on("response", self._library_response)
        self.report("login", "Signing into Hudl using this Mac's Keychain.")
        self._page.goto(LOGIN_URL, wait_until="domcontentloaded")
        self._page.bring_to_front()
        credentials = self.loader()
        try:
            authenticate(self._page, credentials)
        finally:
            del credentials

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
                    raise CaptureError(observation.failure)
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

    def _perform(
        self, action: str, identity: str | None, moment_ids: list[str] | None = None
    ) -> None:
        try:
            if action == "test":
                self._discover()
            elif action == "refresh":
                self._discover(refresh=True)
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
                from app.connectors.hudl_exports import export_ranges

                available = self.details.read(identity).get("moments", [])
                selected = [m for m in available if m["id"] in (moment_ids or [])]
                if not selected or len(selected) != len(set(moment_ids or [])):
                    raise CaptureError("Select moments loaded from this match first.")
                source = self._download(identity)
                self.report("exporting", "Saving moments at original encoded quality…")
                target = export_ranges(source, selected, self.output)
                with self._lock:
                    self._state["filename"] = target.name
                self.report("done", "Original-quality moments ZIP ready to download.")
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
            with self._lock:
                self._busy = False
