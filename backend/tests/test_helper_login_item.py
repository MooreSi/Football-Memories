"""Owner request 2026-11-20: the Mac installer makes the desktop helper start at login.

The script is run for real against a temporary LaunchAgents folder and a fake
launchctl that records what it was asked, so nothing is loaded on this Mac.
"""

from __future__ import annotations

import plistlib
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "mac" / "helper-login-item.sh"
COMMAND = ROOT / "Install Football Memories.command"
LABEL = "com.footballmemories.helper"


def _run(tmp_path: Path, call: str, launchctl_exit: int = 0) -> subprocess.CompletedProcess[str]:
    fake = tmp_path / "launchctl"
    log = tmp_path / "launchctl.log"
    fake.write_text(f'#!/bin/bash\necho "$@" >> "{log}"\nexit {launchctl_exit}\n')
    fake.chmod(0o755)
    return subprocess.run(
        ["/bin/bash", "-c", f'source "{SCRIPT}" && {call}'],
        env={
            "PATH": "/usr/bin:/bin",
            "HOME": str(tmp_path),
            "FM_LAUNCH_AGENTS": str(tmp_path / "agents"),
            "FM_LAUNCHCTL": str(fake),
        },
        capture_output=True,
        text=True,
        check=False,
    )


def _plist(tmp_path: Path) -> dict:
    return plistlib.loads((tmp_path / "agents" / f"{LABEL}.plist").read_bytes())


def test_writes_a_login_item_that_runs_the_helper(tmp_path: Path) -> None:
    app = tmp_path / "Football Memories"
    result = _run(tmp_path, f'write_helper_login_item "{app}" "{app}/data/inbox"')
    assert result.returncode == 0, result.stderr
    item = _plist(tmp_path)
    assert item["Label"] == LABEL
    assert item["ProgramArguments"] == [
        f"{app}/backend/.venv/bin/python3",
        "-m",
        "app.connectors.hudl_companion",
        "--output",
        f"{app}/data/inbox",
    ]
    assert item["WorkingDirectory"] == f"{app}/backend"
    assert item["RunAtLoad"] is True
    assert "KeepAlive" not in item  # the updater restarts it in place; no second copy
    assert item["StandardOutPath"] == item["StandardErrorPath"] == f"{app}/data/helper.log"
    assert item["EnvironmentVariables"]["PATH"].startswith("/opt/homebrew/bin:")  # ffmpeg


def test_folder_names_with_xml_characters_stay_intact(tmp_path: Path) -> None:
    app = tmp_path / "Mum & Dad's <Football>"
    result = _run(tmp_path, f'write_helper_login_item "{app}" "{app}/data/inbox"')
    assert result.returncode == 0, result.stderr
    assert _plist(tmp_path)["WorkingDirectory"] == f"{app}/backend"


def test_a_moved_copy_replaces_the_old_login_item(tmp_path: Path) -> None:
    _run(tmp_path, 'write_helper_login_item "/old/place" "/old/place/data/inbox"')
    _run(tmp_path, 'write_helper_login_item "/new/place" "/new/place/data/inbox"')
    assert _plist(tmp_path)["WorkingDirectory"] == "/new/place/backend"
    assert [p.name for p in (tmp_path / "agents").iterdir()] == [f"{LABEL}.plist"]


def test_starting_loads_the_login_item_fresh_through_launchd(tmp_path: Path) -> None:
    _run(tmp_path, 'write_helper_login_item "/app" "/app/data/inbox"')
    result = _run(tmp_path, "start_helper_login_item")
    assert result.returncode == 0, result.stderr
    uid = subprocess.run(["id", "-u"], capture_output=True, text=True, check=True).stdout.strip()
    calls = (tmp_path / "launchctl.log").read_text().splitlines()
    plist = tmp_path / "agents" / f"{LABEL}.plist"
    assert calls == [f"bootout gui/{uid}/{LABEL}", f"bootstrap gui/{uid} {plist}"]


def test_a_launchd_refusal_is_reported_so_the_installer_can_fall_back(tmp_path: Path) -> None:
    _run(tmp_path, 'write_helper_login_item "/app" "/app/data/inbox"')
    assert _run(tmp_path, "start_helper_login_item", launchctl_exit=5).returncode != 0


def test_the_mac_installer_uses_the_login_item() -> None:
    text = COMMAND.read_text()
    assert "scripts/mac/helper-login-item.sh" in text
    assert "write_helper_login_item" in text and "start_helper_login_item" in text
