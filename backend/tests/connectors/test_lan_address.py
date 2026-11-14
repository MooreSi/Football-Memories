"""Owner request 2026-11-14: Connections shows the address phones and tablets on the
home network use. The helper runs on the computer itself, so it can see it."""

import subprocess
from pathlib import Path

from fastapi.testclient import TestClient

from app.connectors.hudl_companion import create_companion
from app.connectors.lan_address import lan_address

APP = {"Origin": "http://127.0.0.1:8765"}


def fake_run(answers: dict[str, str]):  # noqa: ANN201
    def run(args: list[str], **_: object) -> subprocess.CompletedProcess[str]:
        out = answers.get(" ".join(args))
        return subprocess.CompletedProcess(args, 0 if out else 1, out or "", "")

    return run


def test_a_mac_gives_its_bonjour_name_and_wifi_address() -> None:
    run = fake_run(
        {"scutil --get LocalHostName": "MacMini\n", "ipconfig getifaddr en0": "192.168.0.53\n"}
    )
    assert lan_address("darwin", run=run, probe=lambda: None) == {
        "host": "MacMini.local",
        "ip": "192.168.0.53",
    }


def test_a_mac_on_a_cable_uses_the_second_interface() -> None:
    run = fake_run({"ipconfig getifaddr en1": "10.0.0.7\n"})
    assert lan_address("darwin", run=run, probe=lambda: None) == {"host": None, "ip": "10.0.0.7"}


def test_other_computers_use_the_routing_probe_and_only_private_addresses() -> None:
    assert lan_address("win32", run=fake_run({}), probe=lambda: "192.168.1.20") == {
        "host": None,
        "ip": "192.168.1.20",
    }
    assert lan_address("win32", run=fake_run({}), probe=lambda: "8.8.8.8")["ip"] is None
    assert lan_address("win32", run=fake_run({}), probe=lambda: "127.0.0.1")["ip"] is None
    assert (
        lan_address(
            "darwin", run=fake_run({"ipconfig getifaddr en0": "not an ip"}), probe=lambda: None
        )["ip"]
        is None
    )


def test_a_failing_lookup_is_simply_unknown() -> None:
    def broken(*_: object, **__: object) -> None:
        raise OSError("no scutil")

    def probe() -> str:
        raise OSError("no network")

    assert lan_address("darwin", run=broken, probe=probe) == {"host": None, "ip": None}


def test_the_helper_answers_the_app_with_the_address(tmp_path: Path) -> None:
    app = create_companion(tmp_path)
    app.state.lan_address = lambda: {"host": "MacMini.local", "ip": "192.168.0.53"}
    with TestClient(app, base_url="http://127.0.0.1:8766") as client:
        assert client.get("/network", headers=APP).json() == {
            "host": "MacMini.local",
            "ip": "192.168.0.53",
        }
        assert client.get("/network", headers={"Origin": "https://evil.test"}).status_code == 403
