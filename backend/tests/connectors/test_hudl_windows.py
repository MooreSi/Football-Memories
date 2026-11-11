"""Owner decision 2026-11-11: the Hudl helper runs on Windows too. The password is
kept in Windows Credential Manager (the Keychain equivalent); folder choice and
delete-to-Recycle-Bin replace the macOS Finder and Trash."""

import json
import subprocess
from pathlib import Path
from unittest.mock import patch

import pytest

from app.connectors import hudl_downloads
from app.connectors.hudl_account import Credentials
from app.connectors.hudl_capture import CaptureError
from app.connectors.hudl_downloads import DownloadFolder
from app.connectors.hudl_keychain import Keychain, WindowsCredentialStore, secret_store

SECRET = "FAKE_WINDOWS_SECRET_7f3a"  # noqa: S105 (synthetic test value)


class FakeCredentialManager:
    """Stands in for advapi32 CredWriteW / CredReadW / CredDeleteW."""

    def __init__(self, fail: bool = False) -> None:
        self.vault: dict[str, tuple[str, bytes]] = {}
        self.fail = fail

    def write(self, target: str, user: str, blob: bytes) -> None:
        if self.fail:
            raise OSError(1312, "A specified logon session does not exist")
        self.vault[target] = (user, blob)

    def read(self, target: str) -> tuple[str, bytes] | None:
        if self.fail:
            raise OSError(1168, "Element not found")
        return self.vault.get(target)


def test_password_round_trips_through_credential_manager_only(tmp_path):
    api = FakeCredentialManager()
    store = WindowsCredentialStore(api)
    assert store.configured() is False
    store.save(Credentials("parent@example.test", SECRET))
    assert store.configured() is True
    loaded = store.load()
    assert loaded.username == "parent@example.test"
    assert loaded.password.get_secret_value() == SECRET
    [(target, (user, blob))] = api.vault.items()
    assert target == "FootballMemories/Hudl" and user == "parent@example.test"
    assert SECRET in blob.decode("utf-8")  # negative control: the check below can see it
    assert list(tmp_path.iterdir()) == []  # nothing written to disk
    assert SECRET not in repr(store) and SECRET not in repr(loaded)


def test_credential_manager_errors_never_echo_the_secret():
    store = WindowsCredentialStore(FakeCredentialManager(fail=True))
    with pytest.raises(CaptureError) as saved:
        store.save(Credentials("parent@example.test", SECRET))
    assert SECRET not in str(saved.value) and "Credential Manager" in str(saved.value)
    with pytest.raises(CaptureError) as loaded:
        store.load()
    assert SECRET not in str(loaded.value)
    assert store.configured() is False


def test_oversized_credentials_are_refused_without_echoing_them():
    store = WindowsCredentialStore(FakeCredentialManager())
    with pytest.raises(CaptureError) as error:
        store.save(Credentials("parent@example.test", SECRET + "x" * 3000))
    assert SECRET not in str(error.value)


def test_secret_store_matches_the_operating_system(tmp_path):
    with patch("app.connectors.hudl_keychain.platform.system", return_value="Darwin"):
        assert isinstance(secret_store(tmp_path), Keychain)
    with (
        patch("app.connectors.hudl_keychain.platform.system", return_value="Windows"),
        patch("app.connectors.hudl_keychain._Advapi32", FakeCredentialManager),
    ):
        store = secret_store(tmp_path)
        assert isinstance(store, WindowsCredentialStore)
        assert store.label == "Windows Credential Manager"
    assert Keychain(tmp_path).label == "macOS Keychain"


def test_windows_folder_picker_passes_the_path_outside_the_script(tmp_path):
    calls = []

    def run(command, **kwargs):
        calls.append((command, kwargs.get("env", {})))
        return subprocess.CompletedProcess(command, 0, f"{tmp_path}\r\n", "")

    with (
        patch("app.connectors.hudl_downloads.platform.system", return_value="Windows"),
        patch("app.connectors.hudl_downloads.subprocess.run", side_effect=run),
    ):
        assert hudl_downloads.choose_folder(Path("C:/Users/x/it's here")) == tmp_path
    [(command, env)] = calls
    assert command[0] == "powershell"
    assert "it's here" not in " ".join(command)  # no quoting or injection through the path
    assert env["FM_CURRENT_FOLDER"] == str(Path("C:/Users/x/it's here"))


def test_windows_delete_sends_only_that_file_to_the_recycle_bin(tmp_path):
    folder = tmp_path / "inbox"
    folder.mkdir()
    keep = folder / "keep.mp4"
    keep.write_bytes(b"keep")
    target = folder / "old.zip"
    target.write_bytes(b"old")
    calls = []

    def run(command, **kwargs):
        calls.append((command, kwargs.get("env", {})))
        Path(kwargs["env"]["FM_RECYCLE_PATH"]).unlink()  # what the Recycle Bin call does
        return subprocess.CompletedProcess(command, 0, "", "")

    downloads = DownloadFolder(folder, tmp_path / "downloads.json")
    with (
        patch("app.connectors.hudl_downloads.platform.system", return_value="Windows"),
        patch("app.connectors.hudl_downloads.subprocess.run", side_effect=run),
    ):
        assert downloads.trash_file("old.zip") == "old.zip"
    [(command, env)] = calls
    assert "SendToRecycleBin" in " ".join(command)
    assert "old.zip" not in " ".join(command)
    assert env["FM_RECYCLE_PATH"] == str(target)
    assert keep.read_bytes() == b"keep"


def test_windows_recycle_failure_keeps_the_file(tmp_path):
    folder = tmp_path / "inbox"
    folder.mkdir()
    (folder / "old.zip").write_bytes(b"old")
    downloads = DownloadFolder(folder, tmp_path / "downloads.json")
    with (
        patch("app.connectors.hudl_downloads.platform.system", return_value="Windows"),
        patch(
            "app.connectors.hudl_downloads.subprocess.run",
            return_value=subprocess.CompletedProcess([], 1, "", "denied"),
        ),
        pytest.raises(CaptureError, match="Nothing was deleted"),
    ):
        downloads.trash_file("old.zip")
    assert (folder / "old.zip").read_bytes() == b"old"


def test_helper_reports_which_secret_store_it_uses(tmp_path):
    from fastapi.testclient import TestClient

    from app.connectors.hudl_companion import create_companion

    app = create_companion(tmp_path / "inbox")
    app.state.keychain = WindowsCredentialStore(FakeCredentialManager())
    with TestClient(app, base_url="http://127.0.0.1:8766") as client:
        body = client.get("/account", headers={"Origin": "http://127.0.0.1:8765"}).json()
    assert body["secret_store"] == "Windows Credential Manager"  # noqa: S105 (a label)
    assert body["platform"] in {"mac", "windows"}
    assert json.dumps(body).find(SECRET) == -1
    app.state.account._executor.shutdown()
