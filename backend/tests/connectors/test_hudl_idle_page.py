"""The hidden Hudl browser is parked on a blank page between operations (owner report
2026-11-19: a hosted capture container sat at 150% CPU and 1.5 GB holding the last match
page open, until the renderer was killed and Refresh failed). A crashed page counts as no
session, so the user's next Refresh signs in once, exactly as it does with no session.
Offline: MagicMock pages only, nothing reaches Hudl."""

import contextlib
from pathlib import Path
from unittest.mock import MagicMock, patch

from app.connectors.hudl_account import Catalogue
from app.connectors.hudl_browser import BrowserConnection

BLANK = "about:blank"


def _connection(tmp_path: Path) -> BrowserConnection:
    connection = BrowserConnection(MagicMock(), Catalogue(tmp_path / "cache"), tmp_path / "inbox")
    connection._context = MagicMock()
    connection._page = MagicMock(url="https://www.hudl.com/watch/video/synthetic-a")
    connection._libraries = {"https://app.hudl.com/watch/team/123/analyze"}
    return connection


def _goto_targets(connection: BrowserConnection) -> list[str]:
    return [call.args[0] for call in connection._page.goto.call_args_list]


def test_a_finished_operation_leaves_the_page_blank_and_keeps_the_session(tmp_path: Path):
    connection = _connection(tmp_path)
    page = connection._page
    with patch.object(connection, "_discover"), patch.object(connection, "_queue_sync"):
        connection._perform("refresh", None)
    assert _goto_targets(connection) == [BLANK]
    assert connection._page is page and connection._context is not None
    connection._executor.shutdown()


def test_a_failed_operation_also_leaves_the_page_blank(tmp_path: Path):
    connection = _connection(tmp_path)
    with patch.object(connection, "_discover", side_effect=RuntimeError("renderer gone")):
        connection._perform("refresh", None)
    assert _goto_targets(connection) == [BLANK]
    assert connection._state["state"] == "error"
    connection._executor.shutdown()


def test_a_visible_verification_window_is_never_navigated_away(tmp_path: Path):
    """Negative control: on the owner's Mac the visible window holds Hudl's own check."""
    connection = _connection(tmp_path)
    connection._visible_session = True
    with patch.object(connection, "_discover"), patch.object(connection, "_queue_sync"):
        connection._perform("refresh", None)
    assert BLANK not in _goto_targets(connection)
    connection._executor.shutdown()


def test_a_crashed_page_makes_refresh_sign_in_once(tmp_path: Path):
    connection = _connection(tmp_path)
    connection._on_page_crash(connection._page)
    # The MagicMock library yields no matches, so discovery stops; only the sign-in matters.
    with patch.object(connection, "_login") as login, contextlib.suppress(Exception):
        connection._discover(refresh=True)
    login.assert_called_once()
    connection._executor.shutdown()


def test_a_healthy_page_refreshes_without_signing_in(tmp_path: Path):
    """Negative control for the crash rule: a live session is reused, as before."""
    connection = _connection(tmp_path)
    with patch.object(connection, "_login") as login, contextlib.suppress(Exception):
        connection._discover(refresh=True)
    login.assert_not_called()
    connection._executor.shutdown()


def test_a_crashed_page_is_reported_as_no_session(tmp_path: Path):
    connection = _connection(tmp_path)
    assert connection.status()["session_active"] is True
    connection._on_page_crash(connection._page)
    assert connection.status()["session_active"] is False
    connection._executor.shutdown()


def test_the_generic_error_points_to_refresh_not_a_hidden_test_button(tmp_path: Path):
    connection = _connection(tmp_path)
    with patch.object(connection, "_discover", side_effect=RuntimeError("renderer gone")):
        connection._perform("refresh", None)
    message = connection._state["message"]
    assert "Refresh" in message and "Test again" not in message
    assert "renderer gone" not in message
    connection._executor.shutdown()


# Owner report 2026-11-19, second round: the capture container hit its memory limit and the
# kernel killed Chromium itself, not just a tab. No "crash" event fires for that, so every
# Refresh reused the dead browser and failed with the same generic error.


def _dead_browser(connection: BrowserConnection) -> None:
    connection._browser = MagicMock()
    connection._browser.is_connected.return_value = False


def test_a_dead_browser_makes_refresh_sign_in_once(tmp_path: Path):
    connection = _connection(tmp_path)
    _dead_browser(connection)
    with patch.object(connection, "_login") as login, contextlib.suppress(Exception):
        connection._discover(refresh=True)
    login.assert_called_once()
    connection._executor.shutdown()


def test_a_live_browser_refreshes_without_signing_in(tmp_path: Path):
    """Negative control for the dead-browser rule."""
    connection = _connection(tmp_path)
    connection._browser = MagicMock()
    connection._browser.is_connected.return_value = True
    with patch.object(connection, "_login") as login, contextlib.suppress(Exception):
        connection._discover(refresh=True)
    login.assert_not_called()
    connection._executor.shutdown()


def test_a_dead_browser_is_reported_as_no_session(tmp_path: Path):
    connection = _connection(tmp_path)
    _dead_browser(connection)
    assert connection.status()["session_active"] is False
    connection._executor.shutdown()


def test_a_dead_browser_makes_a_match_page_sign_in_once(tmp_path: Path):
    connection = _connection(tmp_path)
    match = {"id": "synthetic-a", "url": "https://www.hudl.com/watch/video/synthetic-a"}
    _dead_browser(connection)
    with (
        patch.object(connection.catalogue, "find", return_value=match),
        # Stop right after signing in: only the sign-in matters, not the page's polling.
        patch.object(connection, "_login", side_effect=RuntimeError("stop here")) as login,
        contextlib.suppress(RuntimeError),
    ):
        connection._observe("synthetic-a", False)
    login.assert_called_once()
    connection._executor.shutdown()


def test_the_generic_error_names_its_cause_in_the_log_never_its_message(tmp_path: Path, caplog):
    connection = _connection(tmp_path)
    planted = "https://vod.hudl.com/signed?Signature=planted-secret"
    with patch.object(connection, "_discover", side_effect=RuntimeError(planted)):
        connection._perform("refresh", None)
    logged = caplog.text
    assert "RuntimeError" in logged
    assert "planted-secret" not in logged
    assert "planted-secret" not in connection._state["message"]
    connection._executor.shutdown()
