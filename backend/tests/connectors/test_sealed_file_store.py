"""Hosted gateway phase 2, task 010 (owner sign-off 2026-11-19): a hosted user's Hudl and Veo
passwords are saved in their own capture container, sealed with AES-256-GCM under a key
unique to that user. Never in plain text, never in logs, never handed to the browser."""

import base64
import logging
import os
from pathlib import Path

import pytest

from app.connectors.hudl_account import Credentials
from app.connectors.hudl_capture import CaptureError
from app.connectors.hudl_keychain import SealedFileStore, secret_store

SECRET = "FAKE_HUDL_SECRET_9d41"  # noqa: S105 (synthetic test value)
KEY = base64.b64encode(b"k" * 32).decode()


@pytest.fixture(autouse=True)
def _fresh_process(monkeypatch: pytest.MonkeyPatch) -> None:
    """Each test starts like a new capture process: no key taken yet."""
    import app.connectors.hudl_keychain as store

    monkeypatch.setattr(store, "_CAPTURE_KEY", None)


@pytest.fixture
def keyed(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("FM_CAPTURE_KEY", KEY)


def test_save_and_load_round_trip_and_the_file_is_sealed(tmp_path: Path, keyed: None) -> None:
    store = SealedFileStore(tmp_path)
    assert not store.configured()
    store.save(Credentials("parent@example.test", SECRET))
    assert store.configured()
    loaded = store.load()
    assert (loaded.username, loaded.password.get_secret_value()) == ("parent@example.test", SECRET)
    sealed = (tmp_path / "Hudl.sealed").read_bytes()
    assert SECRET.encode() not in sealed and b"parent@example.test" not in sealed
    assert ((tmp_path / "Hudl.sealed").stat().st_mode & 0o777) == 0o600


def test_hudl_and_veo_are_kept_apart(tmp_path: Path, keyed: None) -> None:
    SealedFileStore(tmp_path).save(Credentials("hudl@example.test", "FAKE_A"))
    SealedFileStore(tmp_path, service="Veo").save(Credentials("veo@example.test", SECRET))
    assert SealedFileStore(tmp_path, service="Veo").load().username == "veo@example.test"
    assert SealedFileStore(tmp_path).load().username == "hudl@example.test"


def test_a_wrong_key_fails_closed(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("FM_CAPTURE_KEY", KEY)
    SealedFileStore(tmp_path).save(Credentials("parent@example.test", SECRET))
    monkeypatch.setenv("FM_CAPTURE_KEY", base64.b64encode(b"x" * 32).decode())
    with pytest.raises(CaptureError) as caught:
        SealedFileStore(tmp_path).load()
    assert SECRET not in str(caught.value)


@pytest.mark.parametrize("value", [None, "", "not-base64!", base64.b64encode(b"short").decode()])
def test_a_missing_or_bad_key_is_a_clear_error_never_plain_text(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, value: str | None
) -> None:
    if value is None:
        monkeypatch.delenv("FM_CAPTURE_KEY", raising=False)
    else:
        monkeypatch.setenv("FM_CAPTURE_KEY", value)
    with pytest.raises(CaptureError):
        SealedFileStore(tmp_path).save(Credentials("parent@example.test", SECRET))
    assert not list(tmp_path.iterdir())


def test_the_key_is_taken_out_of_the_environment(tmp_path: Path, keyed: None) -> None:
    """The browser inherits this process's environment; the key must not travel with it."""
    store = SealedFileStore(tmp_path)
    assert "FM_CAPTURE_KEY" not in os.environ
    store.save(Credentials("parent@example.test", SECRET))
    assert SealedFileStore(tmp_path).load().password.get_secret_value() == SECRET


def test_nothing_secret_in_repr_errors_or_logs(
    tmp_path: Path, keyed: None, caplog: pytest.LogCaptureFixture
) -> None:
    caplog.set_level(logging.DEBUG)
    store = SealedFileStore(tmp_path)
    store.save(Credentials("parent@example.test", SECRET))
    store.load()
    assert SECRET not in repr(store) and KEY not in repr(store)
    assert SECRET not in caplog.text and KEY not in caplog.text


def test_hosted_capture_selects_the_sealed_store(
    tmp_path: Path, keyed: None, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("FM_HOSTED", "1")
    assert isinstance(secret_store(tmp_path, service="Veo"), SealedFileStore)


def test_the_owner_install_keeps_its_os_store(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Negative control: without FM_HOSTED the Mac/Windows store is chosen as before."""
    monkeypatch.delenv("FM_HOSTED", raising=False)
    assert not isinstance(secret_store(tmp_path), SealedFileStore)
