"""Local desktop helper: normal interactive login, observe, download, verify.

Run on the user's desktop, not inside Docker. Auth stays in an incognito browser
context. No storage-state, cookies, headers, response dumps or traces are saved.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import tempfile
import time
from collections.abc import Callable
from pathlib import Path
from typing import Any
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


class HudlBlocked(CaptureError):
    """Hudl refused the account (sign-in, access check or rate limit): stop everything."""


# Owner decision 003 (provisional): skip unreadable videos for a week; stop when
# this many pages in a row fail, which points at a wider problem than one video.
UNAVAILABLE_RETRY_S = 7 * 86400
MAX_FAILURES_IN_A_ROW = 5


class Observation:
    def __init__(self, video_id: str) -> None:
        self.video_id = video_id
        self.payloads: list[dict[str, Any]] = []
        self.manifests: dict[str, str] = {}
        self.failure: str | None = None
        self.blocked = False

    def response(self, response: Response) -> None:
        parsed = urlsplit(response.url)
        relevant = parsed.path.endswith(".m3u8") or parsed.path == "/api/graphql/query"
        if not relevant or not (parsed.hostname or "").endswith(".hudl.com"):
            return
        if response.status in {401, 403, 429}:
            self.blocked = True
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
