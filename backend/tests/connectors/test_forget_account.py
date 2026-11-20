"""Owner request 2026-11-20: Disconnect on Hudl or Veo forgets the account: the saved
login leaves the secret store, and the account's cached match list, tags, posters and club
crest are removed. Downloaded matches, reels and moments, the download index and the
download folder setting are kept. Fakes only; nothing reaches Hudl or Veo."""

from __future__ import annotations

import base64
import json
from pathlib import Path
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.connectors.hudl_account import Credentials
from app.connectors.hudl_companion import create_companion
from app.connectors.hudl_keychain import Keychain, SealedFileStore, WindowsCredentialStore
from app.connectors.hudl_metadata import capture_key
from tests.connectors.test_hudl_windows import FakeCredentialManager

APP = {"Origin": "http://127.0.0.1:8765"}
SECRET = "FAKE_FORGET_SECRET_41aa"  # noqa: S105 (synthetic)


# --- each secret store can delete its saved login -------------------------------------


@pytest.mark.parametrize("code", [0, 3])  # 3: nothing saved, which is already forgotten
def test_the_mac_keychain_deletes_only_this_services_item(tmp_path: Path, code: int) -> None:
    with (
        patch.object(Keychain, "_executable", return_value=Path("/synthetic/keychain")),
        patch("app.connectors.hudl_keychain.subprocess.run") as execute,
    ):
        execute.return_value.returncode = code
        Keychain(tmp_path, service="Veo").delete()
        Keychain(tmp_path).delete()
    assert [c.args[0] for c in execute.call_args_list] == [
        ["/synthetic/keychain", "Veo", "delete"],
        ["/synthetic/keychain", "delete"],
    ]


def test_the_keychain_bridge_knows_delete() -> None:
    source = (Path(__file__).parents[2] / "app/connectors/hudl_keychain.swift").read_text()
    assert 'operation == "delete"' in source and "SecItemDelete(query" in source


class DeletingCredentialManager(FakeCredentialManager):
    def delete(self, target: str) -> None:
        self.vault.pop(target, None)


def test_windows_credential_manager_deletes_only_this_service() -> None:
    api = DeletingCredentialManager()
    WindowsCredentialStore(api, service="Hudl").save(Credentials("h@example.test", SECRET))
    WindowsCredentialStore(api, service="Veo").save(Credentials("v@example.test", SECRET))
    WindowsCredentialStore(api, service="Veo").delete()
    assert list(api.vault) == ["FootballMemories/Hudl"]
    WindowsCredentialStore(api, service="Veo").delete()  # nothing left: still fine


def test_the_hosted_sealed_store_deletes_its_file(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    import app.connectors.hudl_keychain as store

    monkeypatch.setattr(store, "_CAPTURE_KEY", None)
    monkeypatch.setenv("FM_CAPTURE_KEY", base64.b64encode(b"k" * 32).decode())
    sealed = SealedFileStore(tmp_path, service="Veo")
    sealed.save(Credentials("v@example.test", SECRET))
    sealed.delete()
    assert not sealed.configured() and not list(tmp_path.iterdir())
    sealed.delete()


# --- the helper's forget routes ---------------------------------------------------------


class FakeStore:
    label = "macOS Keychain"

    def __init__(self) -> None:
        self.saved = True
        self.deleted = 0

    def configured(self) -> bool:
        return self.saved

    def load(self) -> Credentials:
        return Credentials("x@example.test", SECRET)

    def delete(self) -> None:
        self.deleted += 1
        self.saved = False


def _write(path: Path, data: bytes | str = b"x") -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data.encode() if isinstance(data, str) else data)
    return path


@pytest.fixture
def helper(tmp_path: Path):
    inbox = tmp_path / "data" / "inbox"
    inbox.mkdir(parents=True)
    app = create_companion(inbox)
    app.state.keychain = FakeStore()
    app.state.veo_store = FakeStore()
    with TestClient(app, base_url="http://127.0.0.1:8766") as client:
        yield client, app, tmp_path / "data"


def test_forgetting_hudl_removes_its_login_list_and_tags_and_keeps_downloads(helper) -> None:
    client, app, data = helper
    hudl = data / ".hudl-account"
    match_list = _write(hudl / "matches.json", '[{"id": "a", "title": "t"}]')
    tags = _write(hudl / "details" / "abc.json", "{}")
    poster = _write(hudl / "details" / "abc.poster")
    kept = [
        _write(hudl / "downloads-index.json", "[]"),
        _write(hudl / "downloads.json", "{}"),
        _write(hudl / "media-library.json", "{}"),
        _write(hudl / "reel-cards" / "c.webm"),
        _write(data / "inbox" / "261115 U10 v Cardiff.mp4", b"footage"),
    ]
    answer = client.post("/account/forget", json={}, headers=APP)
    assert answer.status_code == 200, answer.text
    assert app.state.keychain.deleted == 1
    assert not match_list.exists() and not tags.exists() and not poster.exists()
    assert all(p.exists() for p in kept)
    assert (data / "inbox" / "261115 U10 v Cardiff.mp4").read_bytes() == b"footage"
    status = client.get("/account", headers=APP).json()
    assert status["configured"] is False and status["state"] == "idle"
    assert client.get("/library", headers=APP).json() == []


def test_forgetting_veo_keeps_shared_matches_and_downloads(helper) -> None:
    client, app, data = helper
    veo = data / ".veo-account"
    own, shared = "veo-own", "veo-shared"
    _write(
        veo / "library.json",
        json.dumps(
            {
                "matches": [
                    {"id": own, "slug": "own-x", "title": "NL vs A"},
                    {"id": shared, "slug": "shared-x", "title": "B vs C", "shared": True},
                ]
            }
        ),
    )
    own_poster = _write(veo / "posters" / f"{capture_key(own)}.jpg")
    shared_poster = _write(veo / "posters" / f"{capture_key(shared)}.jpg")
    crest, club = _write(veo / "crest.png"), _write(veo / "club.json", "{}")
    links = _write(veo / "shared.json", '{"links": [{"slug": "shared-x"}]}')
    download = _write(data / "inbox" / "NL vs A 2026-11-15.mp4", b"footage")
    answer = client.post("/veo/forget", json={}, headers=APP)
    assert answer.status_code == 200, answer.text
    assert app.state.veo_store.deleted == 1
    assert [m["id"] for m in app.state.veo.library()] == [shared]
    assert not own_poster.exists() and shared_poster.exists()
    assert not crest.exists() and not club.exists()
    assert links.exists() and download.read_bytes() == b"footage"
    assert client.get("/veo/account", headers=APP).json()["configured"] is False


def test_veo_is_not_forgotten_mid_operation(helper) -> None:
    client, app, data = helper
    app.state.veo._busy = True
    assert client.post("/veo/forget", json={}, headers=APP).status_code == 400
    assert app.state.veo_store.deleted == 0


def test_hudl_is_not_forgotten_mid_operation(helper) -> None:
    client, app, data = helper
    app.state.account._pending = 1
    assert client.post("/account/forget", json={}, headers=APP).status_code == 400
    assert app.state.keychain.deleted == 0
    app.state.account._pending = 0


def test_other_websites_cannot_forget_an_account(helper) -> None:
    client, app, _ = helper
    evil = {"Origin": "https://evil.test"}
    assert client.post("/account/forget", json={}, headers=evil).status_code == 403
    assert client.post("/veo/forget", json={}, headers=evil).status_code == 403
    assert app.state.keychain.deleted == app.state.veo_store.deleted == 0
