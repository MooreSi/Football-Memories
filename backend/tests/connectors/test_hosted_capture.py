"""Hosted gateway phase 2, task 020 (owner sign-off 2026-11-19): the helper runs in each
user's own capture container. There it is always headless with Playwright's own Chromium,
never opens a visible window (there is no screen and no owner to complete a check), and
offers none of the desktop-only routes. Any Hudl or Veo check stops with a message."""

import base64
import contextlib
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.connectors.browser_launch import launch
from app.connectors.hudl_browser import BrowserConnection
from app.connectors.hudl_capture import CaptureError

ORIGIN = {"Origin": "http://127.0.0.1:8765"}


@pytest.fixture
def hosted(monkeypatch: pytest.MonkeyPatch) -> None:
    import app.connectors.hudl_keychain as store

    monkeypatch.setattr(store, "_CAPTURE_KEY", None)
    monkeypatch.setenv("FM_HOSTED", "1")
    monkeypatch.setenv("FM_CAPTURE_KEY", base64.b64encode(b"k" * 32).decode())


def test_hosted_launch_is_headless_chromium(hosted: None) -> None:
    playwright = MagicMock()
    launch(playwright, visible=False)
    assert playwright.chromium.launch.call_args.kwargs == {"headless": True}


def test_hosted_never_opens_a_window(hosted: None) -> None:
    playwright = MagicMock()
    with pytest.raises(CaptureError, match="own browser"):
        launch(playwright, visible=True)
    playwright.chromium.launch.assert_not_called()


def test_the_owner_install_keeps_chrome_and_its_visible_window(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Negative control: on the owner's computer nothing changes."""
    monkeypatch.delenv("FM_HOSTED", raising=False)
    playwright = MagicMock()
    launch(playwright, visible=True)
    assert playwright.chromium.launch.call_args.kwargs == {"channel": "chrome", "headless": False}


def test_a_hosted_sign_in_failure_stops_and_never_plans_a_visible_retry(
    tmp_path: Path, hosted: None
) -> None:
    connection = BrowserConnection(MagicMock(), MagicMock(), tmp_path / "inbox")
    playwright = MagicMock()
    with (
        patch("app.connectors.hudl_browser._account.sync_playwright") as factory,
        patch(
            "app.connectors.hudl_browser._account.authenticate", side_effect=CaptureError("verify")
        ),
    ):
        factory.return_value.start.return_value = playwright
        with pytest.raises(CaptureError, match="your own browser"):
            connection._login()
        assert connection._visible_next is False
        playwright.chromium.launch.return_value.close.assert_called()
        with pytest.raises(CaptureError, match="your own browser"):
            connection._login()
    assert all(
        call.kwargs == {"headless": True} for call in playwright.chromium.launch.call_args_list
    )
    connection._executor.shutdown()


def test_veo_sessions_launch_through_the_same_rule(hosted: None) -> None:
    from app.connectors.veo import _client

    with patch.object(_client, "sync_playwright") as factory, patch.object(_client, "sign_in"):
        playwright = factory.return_value.__enter__.return_value
        # The fake session may fail after launch; only how the browser was opened matters.
        with contextlib.suppress(Exception), _client.session(lambda: MagicMock()):
            pass
    assert playwright.chromium.launch.call_args.kwargs == {"headless": True}


@pytest.fixture
def companion(tmp_path: Path, hosted: None):  # type: ignore[no-untyped-def]
    from app.connectors.hudl_companion import create_companion

    with TestClient(create_companion(tmp_path / "inbox"), base_url="http://127.0.0.1:8766") as c:
        yield c


@pytest.mark.parametrize(
    "method,path",
    [
        ("GET", "/update/check"),
        ("GET", "/update/version"),
        ("POST", "/update/apply"),
        ("GET", "/network"),
        ("POST", "/downloads/folder"),
        ("POST", "/capture"),
    ],
)
def test_desktop_only_routes_are_gone(companion: TestClient, method: str, path: str) -> None:
    headers = {**ORIGIN, "Content-Type": "application/json"}
    assert companion.request(method, path, headers=headers, content=b"{}").status_code == 404


def test_desktop_routes_still_exist_on_the_owner_install(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Negative control."""
    from app.connectors.hudl_companion import create_companion

    monkeypatch.delenv("FM_HOSTED", raising=False)
    with TestClient(create_companion(tmp_path / "inbox"), base_url="http://127.0.0.1:8766") as c:
        c.app.state.lan_address = lambda: {"address": None}
        assert c.get("/network", headers=ORIGIN).status_code == 200


def test_a_full_library_starts_no_download(
    tmp_path: Path, hosted: None, monkeypatch: pytest.MonkeyPatch
) -> None:
    from app.connectors.hudl_companion import create_companion

    monkeypatch.setenv("FM_QUOTA_BYTES", "1000")
    inbox = tmp_path / "inbox"
    inbox.mkdir()
    (inbox / "big.mp4").write_bytes(b"x" * 2000)
    with TestClient(create_companion(inbox), base_url="http://127.0.0.1:8766") as c:
        for path in ("/account/action", "/account/batch", "/veo/action"):
            r = c.post(path, headers=ORIGIN, json={"action": "download", "match_id": "m"})
            assert r.status_code == 409, path
            assert "storage limit" in r.json()["detail"]


def test_the_hosted_store_is_the_sealed_one(companion: TestClient) -> None:
    from app.connectors.hudl_keychain import SealedFileStore

    assert isinstance(companion.app.state.keychain, SealedFileStore)
    assert isinstance(companion.app.state.veo_store, SealedFileStore)


def test_a_hosted_browser_goes_through_the_egress_proxy(
    hosted: None, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Phase 2, task 030: the capture container's only way out is its filtering proxy."""
    monkeypatch.setenv("FM_EGRESS_PROXY", "http://egress:3128")
    playwright = MagicMock()
    launch(playwright, visible=False)
    assert playwright.chromium.launch.call_args.kwargs == {
        "headless": True,
        "proxy": {"server": "http://egress:3128"},
    }
