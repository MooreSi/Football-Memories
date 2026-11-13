"""Spec 250 / D-035: the Veo account has its own entry in the OS secret store,
separate from Hudl's, on macOS (Keychain) and Windows (Credential Manager)."""

from pathlib import Path
from unittest.mock import patch

from app.connectors.hudl_account import Credentials
from app.connectors.hudl_keychain import Keychain, WindowsCredentialStore, secret_store
from tests.connectors.test_hudl_windows import FakeCredentialManager

SECRET = "FAKE_VEO_SECRET_51c2"  # noqa: S105 (synthetic test value)


def test_windows_keeps_veo_and_hudl_apart() -> None:
    api = FakeCredentialManager()
    WindowsCredentialStore(api).save(Credentials("hudl@example.test", "FAKE_HUDL"))
    WindowsCredentialStore(api, service="Veo").save(Credentials("veo@example.test", SECRET))
    assert sorted(api.vault) == ["FootballMemories/Hudl", "FootballMemories/Veo"]
    assert WindowsCredentialStore(api, service="Veo").load().password.get_secret_value() == SECRET
    assert WindowsCredentialStore(api).load().username == "hudl@example.test"


def test_the_mac_keychain_item_is_named_for_the_service_and_the_secret_stays_on_stdin(
    tmp_path: Path,
) -> None:
    keychain = Keychain(tmp_path, service="Veo")
    with (
        patch.object(Keychain, "_executable", return_value=Path("/synthetic/keychain")),
        patch("app.connectors.hudl_keychain.subprocess.run") as execute,
    ):
        execute.return_value.returncode = 0
        keychain.save(Credentials("veo@example.test", SECRET))
        Keychain(tmp_path).configured()
    veo, hudl = execute.call_args_list
    assert veo.args[0] == ["/synthetic/keychain", "Veo", "save"]
    assert hudl.args[0] == ["/synthetic/keychain", "exists"]  # Hudl unchanged
    assert SECRET not in repr(veo.args) and SECRET.encode() in veo.kwargs["input"]


def test_errors_name_veo_and_never_echo_the_secret() -> None:
    store = WindowsCredentialStore(FakeCredentialManager(fail=True), service="Veo")
    try:
        store.save(Credentials("veo@example.test", SECRET))
    except Exception as error:  # noqa: BLE001
        assert "Veo" in str(error) and SECRET not in str(error)
    else:
        raise AssertionError("save should fail")


def test_secret_store_picks_the_service(tmp_path: Path) -> None:
    with patch("app.connectors.hudl_keychain.platform.system", return_value="Darwin"):
        assert secret_store(tmp_path, service="Veo").service == "Veo"
        assert secret_store(tmp_path).service == "Hudl"
