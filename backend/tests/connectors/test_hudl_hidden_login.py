"""Owner request 2026-11-10: sign in without showing a browser window.

Uses the same real Chrome (no headless fingerprint, no spoofing), minimized
straight away. A verification, CAPTCHA or terms page is never automated: the window is
moved on screen for the owner and the operation stops.
"""

from unittest.mock import MagicMock, patch

import pytest

from app.connectors.hudl_browser import BrowserConnection
from app.connectors.hudl_capture import CaptureError


def launched(tmp_path, authenticate_effect=None):
    playwright = MagicMock()
    browser = playwright.chromium.launch.return_value
    page = browser.new_context.return_value.new_page.return_value
    connection = BrowserConnection(MagicMock(), MagicMock(), tmp_path / "inbox")
    with (
        patch("app.connectors.hudl_browser.sync_playwright") as factory,
        patch("app.connectors.hudl_browser.authenticate", side_effect=authenticate_effect),
    ):
        factory.return_value.start.return_value = playwright
        try:
            connection._login()
        finally:
            connection._executor.shutdown()
    return playwright, browser, page


def test_login_minimizes_the_window_before_visiting_hudl(tmp_path):
    playwright, browser, page = launched(tmp_path)
    options = playwright.chromium.launch.call_args.kwargs
    assert options["channel"] == "chrome"
    assert options["headless"] is False
    session = browser.new_context.return_value.new_cdp_session.return_value
    bounds = [c for c in session.send.call_args_list if c.args[0] == "Browser.setWindowBounds"]
    assert bounds[0].args[1]["bounds"] == {"windowState": "minimized"}
    page.bring_to_front.assert_not_called()


def test_revealing_restores_the_window(tmp_path):
    connection = BrowserConnection(MagicMock(), MagicMock(), tmp_path / "inbox")
    connection._page = MagicMock()
    connection._context = MagicMock()
    session = connection._context.new_cdp_session.return_value
    session.send.side_effect = lambda method, params=None: (
        {"windowId": 7} if method.endswith("getWindowForTarget") else {}
    )
    connection._reveal()
    bounds = [c for c in session.send.call_args_list if c.args[0] == "Browser.setWindowBounds"]
    assert bounds and bounds[0].args[1]["windowId"] == 7
    assert bounds[0].args[1]["bounds"] == {"windowState": "normal"}
    connection._page.bring_to_front.assert_called_once()
    connection._executor.shutdown()


def test_login_reveals_on_verification(tmp_path):
    connection = BrowserConnection(MagicMock(), MagicMock(), tmp_path / "inbox")
    with (
        patch("app.connectors.hudl_browser.sync_playwright"),
        patch(
            "app.connectors.hudl_browser.authenticate",
            side_effect=CaptureError("Hudl requires verification."),
        ),
        patch.object(connection, "_reveal") as reveal,
        pytest.raises(CaptureError),
    ):
        connection._login()
    reveal.assert_called_once()
    connection._executor.shutdown()
