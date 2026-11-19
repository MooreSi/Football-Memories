"""One place that decides how a browser is opened (hosted gateway phase 2, task 020).

On the owner's computer: Google Chrome, headless or visible as the caller asks (D-022).
In a hosted library's capture container: always headless, Playwright's own Chromium, and
never a visible window: there is no screen, and a Hudl or Veo check is the user's to
complete in their own browser."""

from __future__ import annotations

import os
from typing import Any

from app.connectors.hudl_capture import CaptureError

HOSTED_CHECK = (
    "Hudl or Veo asked for a check this library cannot show. Sign in once in your own browser "
    "and complete it there, then try again."
)


def hosted() -> bool:
    return os.environ.get("FM_HOSTED") == "1"


def launch(playwright: Any, *, visible: bool) -> Any:
    if hosted():
        if visible:
            raise CaptureError(
                "This needs a visible browser window, which a hosted library does not have. "
                "Use your saved account instead; if Hudl asks for a check, complete it in your "
                "own browser."
            )
        proxy = os.environ.get("FM_EGRESS_PROXY")
        if proxy:
            # Phase 2, task 030: the capture container's only way out is its filtering proxy.
            return playwright.chromium.launch(headless=True, proxy={"server": proxy})
        return playwright.chromium.launch(headless=True)
    return playwright.chromium.launch(channel="chrome", headless=not visible)
