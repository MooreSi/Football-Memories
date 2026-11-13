"""The one module that talks to Veo (spec 250, D-035).

Normal-user sign-in in an ephemeral Chrome context (headless, as D-022 for Hudl),
then GET-only reads of Veo's own web-app JSON under /api/app/, one at a time and
at least a second apart. No retries: a refusal, rate limit or challenge stops the
run and is shown to the owner. Cookies stay in the browser context's memory; no
storage state, response body or URL is written or logged here.
"""

from __future__ import annotations

import re
import time
import urllib.error
import urllib.request
from collections.abc import Callable, Iterator
from contextlib import contextmanager
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

from playwright.sync_api import Page, sync_playwright

from app.connectors.hudl_capture import CaptureError

APP = "https://app.veo.co"
GAP_S = 1.0
CHALLENGE = (
    'iframe[src*="captcha"], iframe[src*="recaptcha"], iframe[src*="hcaptcha"], '
    'input[autocomplete="one-time-code"], input[name="otp"], input[name="code"]'
)
_PATH = re.compile(r"^/api/app/[A-Za-z0-9_\-./?=&%:+]*$")

Http = Callable[[str], tuple[int, dict[str, str], Any]]


class VeoRefused(CaptureError):
    """Veo said no (401, 403, 429, 5xx...). The run stops; nothing is retried."""

    def __init__(self, status: int) -> None:
        self.status = status
        reason = {
            401: "Veo signed this session out",
            403: "Veo refused access to that page",
            429: "Veo asked the app to slow down",
        }.get(status, f"Veo answered with an error ({status})")
        super().__init__(f"{reason}. Nothing was retried; try again later.")


class VeoApi:
    """GET-only reads of Veo's web-app JSON, paced. There is no write method."""

    def __init__(
        self,
        http: Http,
        sleep: Callable[[float], None] = time.sleep,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self._http = http
        self._sleep = sleep
        self._clock = clock
        self._last: float | None = None

    def get(self, path: str) -> tuple[dict[str, str], Any]:
        if not _PATH.fullmatch(path) or ".." in path:
            raise CaptureError("The Veo connection only reads Veo's own match lists.")
        if self._last is not None:
            wait = GAP_S - (self._clock() - self._last)
            if wait > 0:
                self._sleep(wait)
        self._last = self._clock()
        status, headers, body = self._http(APP + path)
        if status != 200:
            raise VeoRefused(status)
        return {k.lower(): v for k, v in headers.items()}, body


def _check(page: Page) -> None:
    found = page.locator(CHALLENGE)
    if found.count() and found.first.is_visible():
        raise CaptureError(
            "Veo asked for verification. Sign in to Veo in your own browser once, then test again."
        )


def sign_in(page: Page, credentials: Any) -> None:
    """One attempt at Veo's normal sign-in form; stops at any challenge."""
    _check(page)
    try:
        # app.veo.co hands over to auth.veo.co in the page's own script, so the
        # form can appear after the first load settles (owner report 2026-11-13).
        page.wait_for_selector("#email", state="visible", timeout=30_000)
    except Exception:
        _check(page)
        raise CaptureError(
            "Veo did not show its sign-in form. Nothing was typed; try again later."
        ) from None
    _check(page)
    page.fill("#email", credentials.username)
    page.fill("#password", credentials.password.get_secret_value())
    page.click('button[type="submit"]')
    try:
        page.wait_for_url(lambda url: urlsplit(url).hostname == "app.veo.co", timeout=45_000)
    except Exception:
        _check(page)
        raise CaptureError(
            "Veo sign-in did not finish. Check the email and password in Settings, then test again."
        ) from None
    try:
        # The first app.veo.co address is /signin-redirect/, before the page has its
        # token and has read the account; let the app finish loading first.
        page.wait_for_load_state("networkidle", timeout=30_000)
    except Exception:  # noqa: S110 (a page that never idles is judged by confirm_signed_in)
        pass
    _check(page)


def confirm_signed_in(api: VeoApi) -> None:
    """The first read after sign-in. A 401 here means the sign-in did not take."""
    try:
        api.get("/api/app/user/")
    except VeoRefused as refused:
        if refused.status != 401:
            raise
        raise CaptureError(
            "Veo did not keep the sign-in, so nothing was read. Check the email and "
            "password in Settings, then test again. Nothing was retried."
        ) from None


USER = APP + "/api/app/user/"


def signed_in_header(seen: Any) -> str:
    """The sign-in header Veo's own page sent on its last successful /api/app/user/
    read. Veo keeps the token in the page's storage, not a cookie (owner-approved
    check, 2026-11-13). Held in memory for one operation; never logged or saved."""
    for request in reversed(list(seen)):
        if urlsplit(request.url)._replace(query="", fragment="").geturl() != USER:
            continue
        response = request.response()
        if response is None or response.status != 200:
            continue
        value = request.all_headers().get("authorization")
        if value:
            return str(value)
    raise CaptureError(
        "Veo's sign-in has changed: its page did not read the account the way the app "
        "expects. Nothing was read or retried."
    )


def token_http(request: Any, authorization: str) -> Http:
    """GETs that carry Veo's sign-in header. The header never reaches a message."""

    def http(url: str) -> tuple[int, dict[str, str], Any]:
        response = request.get(
            url, headers={"Accept": "application/json", "Authorization": authorization}
        )
        body = None
        if response.status == 200:
            try:
                body = response.json()
            except Exception:
                raise CaptureError("Veo sent something the app could not read.") from None
        return response.status, dict(response.headers), body

    return http


@contextmanager
def session(loader: Callable[[], Any]) -> Iterator[VeoApi]:
    """A signed-in, ephemeral Veo session for one operation."""
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(channel="chrome", headless=True)
        try:
            context = browser.new_context()
            page = context.new_page()
            seen: list[Any] = []
            page.on("request", lambda r: seen.append(r) if r.url.startswith(USER) else None)
            page.goto(APP + "/", wait_until="domcontentloaded")
            page.wait_for_load_state("networkidle", timeout=30_000)
            # The context is new and empty, so it is never already signed in. Veo's
            # root can stay on app.veo.co while its script decides to hand over.
            credentials = loader()
            try:
                sign_in(page, credentials)
            finally:
                del credentials

            api = VeoApi(token_http(context.request, signed_in_header(seen)))
            confirm_signed_in(api)
            yield api
        finally:
            try:
                browser.close()
            except Exception:  # noqa: S110 (the owner may have closed it; never log browser errors)
                pass


# Spec 260: Veo's video files. Owner-approved check 2026-11-13: c.veocdn.com serves the
# full-match MP4 publicly (no cookie or header), answers Range with 206, ~900 MB at
# 1080p. The address is held in memory only and never reaches a message or a log.
CDN = "c.veocdn.com"
CHUNK = 8 * 1024 * 1024
Opener = Callable[[urllib.request.Request, float], Any]


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args: Any, **kwargs: Any) -> None:
        return None  # a redirect is answered as an error, never followed


_OPENER = urllib.request.build_opener(_NoRedirect)


def _open(request: urllib.request.Request, timeout: float) -> Any:
    return _OPENER.open(request, timeout=timeout)


def _video(url: str, suffixes: tuple[str, ...] = (".mp4",)) -> str:
    parts = urlsplit(url)
    if (
        parts.scheme != "https"
        or parts.hostname != CDN
        or parts.port is not None
        or parts.query
        or parts.fragment
        or not parts.path.lower().endswith(suffixes)
    ):
        raise CaptureError("The Veo connection only reads Veo's own match videos.")
    return url


def _fetch(
    url: str,
    headers: dict[str, str],
    opener: Opener | None,
    timeout: float,
    suffixes: tuple[str, ...] = (".mp4",),
) -> Any:
    # _video allows only https://c.veocdn.com/...mp4, so no file: or custom scheme.
    request = urllib.request.Request(  # noqa: S310
        _video(url, suffixes), headers=headers, method="GET"
    )
    try:
        return (opener or _open)(request, timeout)
    except urllib.error.HTTPError as error:
        raise VeoRefused(error.code) from None
    except (OSError, ValueError):
        raise CaptureError("Veo's video could not be reached. Nothing was retried.") from None


def media_range(
    url: str, start: int, end: int | None, opener: Opener | None = None
) -> tuple[int, int, bytes]:
    """One Range read of a Veo video, at most CHUNK bytes: (start, total size, bytes)."""
    last = start + CHUNK - 1 if end is None else min(end, start + CHUNK - 1)
    if start < 0 or last < start:
        raise CaptureError("That part of the video does not exist.")
    with _fetch(url, {"Range": f"bytes={start}-{last}"}, opener, 60) as response:
        found = re.fullmatch(
            r"bytes (\d+)-(\d+)/(\d+)", str(response.headers.get("Content-Range") or "")
        )
        if response.status != 206 or not found or int(found[1]) != start:
            raise CaptureError("Veo's video answered in a way the app does not expect.")
        body = response.read(CHUNK)
        if len(body) != int(found[2]) - start + 1:
            raise CaptureError("Veo's video sent an incomplete part. Nothing was retried.")
        return start, int(found[3]), body


def media_download(
    url: str, target: Path, progress: Callable[[int, int], None], opener: Opener | None = None
) -> int:
    """The whole video into `target` (the caller's .part file). Returns its size."""
    with _fetch(url, {}, opener, 120) as response:
        length = response.headers.get("Content-Length")
        if response.status != 200 or not str(length or "").isdigit():
            raise CaptureError("Veo's video answered in a way the app does not expect.")
        total, done = int(length), 0
        with target.open("wb") as out:
            while chunk := response.read(1 << 20):
                out.write(chunk)
                done += len(chunk)
                progress(done, total)
    if done != total:
        raise CaptureError("The Veo download was incomplete. Nothing was retried.")
    return total


IMAGE_LIMIT = 2_000_000


def media_image(url: str, opener: Opener | None = None) -> bytes:
    """One recording's thumbnail (a still image) from Veo's video host, at most 2 MB."""
    with _fetch(url, {}, opener, 30, (".jpg", ".jpeg", ".png", ".webp")) as response:
        kind = str(response.headers.get("Content-Type") or "")
        if response.status != 200 or not kind.startswith("image/"):
            raise CaptureError("Veo's thumbnail answered in a way the app does not expect.")
        data = response.read(IMAGE_LIMIT + 1)
    if len(data) > IMAGE_LIMIT:
        raise CaptureError("Veo's thumbnail was larger than expected; it was not kept.")
    return bytes(data)
