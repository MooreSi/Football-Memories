"""Spec 250: the helper's Veo routes. Synthetic store and connection; no Veo."""

import logging
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.connectors.hudl_companion import create_companion

SECRET = "FAKE_VEO_SECRET_51c2"  # noqa: S105
APP = {"Origin": "http://127.0.0.1:8765"}


class FakeStore:
    label = "macOS Keychain"
    service = "Veo"

    def __init__(self) -> None:
        self.saved: list[tuple[str, str]] = []

    def save(self, credentials) -> None:  # noqa: ANN001
        self.saved.append((credentials.username, credentials.password.get_secret_value()))

    def configured(self) -> bool:
        return bool(self.saved)


class FakeConnection:
    def __init__(self) -> None:
        self.started: list[str] = []
        self.was_reset = False

    def status(self) -> dict[str, object]:
        return {"state": "idle", "message": "Not connected", "busy": False, "summary": None}

    def start(self, action: str) -> None:
        self.started.append(action)

    def reset(self) -> None:
        self.was_reset = True

    def library(self) -> list[dict[str, object]]:
        return [
            {
                "id": "veo-1",
                "title": "261108 Riverside U11 vs Northgate",
                "source": "veo",
                "moments": [],
            }
        ]

    def close(self) -> None:
        pass


@pytest.fixture
def client(tmp_path: Path):
    app = create_companion(tmp_path)
    app.state.veo_store = FakeStore()
    app.state.veo = FakeConnection()
    with TestClient(app, base_url="http://127.0.0.1:8766") as c:
        yield c, app


def test_status_reports_whether_an_account_is_saved(client) -> None:
    c, _ = client
    body = c.get("/veo/account", headers=APP).json()
    assert body["configured"] is False and body["state"] == "idle"
    assert body["secret_store"] == "macOS Keychain"  # noqa: S105 (a label)


def test_saving_puts_the_password_only_in_the_store(client, caplog) -> None:
    c, app = client
    caplog.set_level(logging.DEBUG)
    response = c.post(
        "/veo/credentials", headers=APP, json={"username": "veo@example.test", "password": SECRET}
    )
    assert response.status_code == 200 and SECRET not in response.text
    assert app.state.veo_store.saved == [("veo@example.test", SECRET)]
    assert app.state.veo.was_reset
    assert SECRET not in caplog.text
    assert c.get("/veo/account", headers=APP).json()["configured"] is True


def test_a_bad_save_does_not_echo_what_was_sent(client) -> None:
    c, app = client
    response = c.post("/veo/credentials", headers=APP, json={"username": "", "password": SECRET})
    assert response.status_code == 400 and SECRET not in response.text
    assert app.state.veo_store.saved == []


def test_test_and_refresh_start_and_nothing_else_is_accepted(client) -> None:
    c, app = client
    assert (
        c.post("/veo/action", headers=APP, json={"action": "test"}).status_code == 400
    )  # nothing saved yet
    assert app.state.veo.started == []
    c.post(
        "/veo/credentials", headers=APP, json={"username": "veo@example.test", "password": SECRET}
    )
    assert c.post("/veo/action", headers=APP, json={"action": "test"}).status_code == 202
    assert c.post("/veo/action", headers=APP, json={"action": "refresh"}).status_code == 202
    assert c.post("/veo/action", headers=APP, json={"action": "delete"}).status_code == 400
    assert app.state.veo.started == ["test", "refresh"]


def test_library_lists_cached_veo_matches(client) -> None:
    c, _ = client
    assert c.get("/veo/library", headers=APP).json()[0]["source"] == "veo"


def test_other_websites_cannot_use_the_veo_routes(client) -> None:
    c, app = client
    assert (
        c.post(
            "/veo/credentials",
            headers={"Origin": "https://evil.test"},
            json={"username": "a", "password": SECRET},
        ).status_code
        == 403
    )
    assert app.state.veo_store.saved == []
