"""Owner choice 2026-11-10 (D-022): sign in with headless Chrome.

Headless reports itself honestly (no user-agent spoofing). A verification,
CAPTCHA or terms page, or any failed hidden sign-in, is never retried hidden:
the browser closes and the next attempt opens a visible window for the owner.
"""

from unittest.mock import MagicMock, patch

import pytest

from app.connectors.hudl_browser import BrowserConnection
from app.connectors.hudl_capture import CaptureError


def connection_for(tmp_path):
    return BrowserConnection(MagicMock(), MagicMock(), tmp_path / "inbox")


def login(connection, playwright, authenticate_effect=None):
    with (
        patch("app.connectors.hudl_browser.sync_playwright") as factory,
        patch("app.connectors.hudl_browser.authenticate", side_effect=authenticate_effect),
    ):
        factory.return_value.start.return_value = playwright
        connection._login()


def test_login_is_headless_without_disguising_the_browser(tmp_path):
    connection, playwright = connection_for(tmp_path), MagicMock()
    login(connection, playwright)
    options = playwright.chromium.launch.call_args.kwargs
    assert options == {"channel": "chrome", "headless": True}
    context_options = playwright.chromium.launch.return_value.new_context.call_args
    assert "user_agent" not in (context_options.kwargs if context_options else {})
    connection._executor.shutdown()


@pytest.mark.parametrize(
    "failure",
    [CaptureError("Hudl requires verification."), TimeoutError("login page never finished")],
)
def test_hidden_failure_closes_and_next_login_is_visible(tmp_path, failure):
    connection, playwright = connection_for(tmp_path), MagicMock()
    with pytest.raises(CaptureError, match="visible Hudl window"):
        login(connection, playwright, failure)
    playwright.chromium.launch.return_value.close.assert_called()
    assert connection._context is None
    login(connection, playwright)
    assert playwright.chromium.launch.call_args.kwargs == {"channel": "chrome", "headless": False}
    page = playwright.chromium.launch.return_value.new_context.return_value.new_page.return_value
    page.bring_to_front.assert_called()
    login(connection, playwright)
    assert playwright.chromium.launch.call_args.kwargs["headless"] is True
    connection._executor.shutdown()


def test_visible_login_still_stops_on_verification(tmp_path):
    connection, playwright = connection_for(tmp_path), MagicMock()
    connection._visible_next = True
    with pytest.raises(CaptureError, match="complete it there"):
        login(connection, playwright, CaptureError("Hudl requires verification."))
    playwright.chromium.launch.return_value.close.assert_not_called()
    connection._executor.shutdown()


def test_after_owner_verifies_in_the_visible_window_test_reuses_that_session(tmp_path):
    connection, playwright = connection_for(tmp_path), MagicMock()
    connection._visible_next = True
    with pytest.raises(CaptureError):
        login(connection, playwright, CaptureError("Hudl requires verification."))
    page = connection._page
    page.url = "https://www.hudl.com/home"
    login(connection, playwright, AssertionError("must not sign in again"))
    assert playwright.chromium.launch.call_count == 1
    assert connection._page is page
    connection._executor.shutdown()
