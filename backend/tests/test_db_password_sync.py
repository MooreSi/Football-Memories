"""The installer makes the database accept the password in this folder's .env.

Owner report (2026-11-12): a second ZIP download, unzipped to a new folder, got
a new random FM_DB_PASSWORD. Compose's project name is fixed
(`football-memories`), so the new folder reused the first install's database
volume, which Postgres had initialised with the old password. The backend's
`alembic upgrade head` failed to log in, the container restarted forever and
the installer stopped with "The app did not answer on port 8765".

Postgres trusts the local socket inside its own container, so the installer
sets the role's password to the .env value there before starting the backend.
These tests run the Mac script against a fake `docker` that records what it
was given; the real database step was reproduced separately (see the
connectors domain README).
"""

from __future__ import annotations

import os
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "mac" / "sync-db-password.sh"

FAKE_DOCKER = """#!/bin/bash
printf '%s\\n' "$*" >> "$FAKE_LOG/argv"
cat > "$FAKE_LOG/stdin"
exit "${FAKE_EXIT:-0}"
"""


def _run(folder: Path, env_text: str, exit_code: int = 0) -> subprocess.CompletedProcess[str]:
    (folder / ".env").write_text(env_text)
    bin_dir = folder / "bin"
    bin_dir.mkdir(exist_ok=True)
    docker = bin_dir / "docker"
    docker.write_text(FAKE_DOCKER)
    docker.chmod(0o755)
    env = {
        **os.environ,
        "PATH": f"{bin_dir}:{os.environ['PATH']}",
        "FAKE_LOG": str(folder),
        "FAKE_EXIT": str(exit_code),
    }
    return subprocess.run(
        ["/bin/bash", "-c", f'source "{SCRIPT}" && sync_db_password'],
        cwd=folder,
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )


def test_sets_the_role_password_through_the_containers_local_socket(tmp_path: Path) -> None:
    result = _run(tmp_path, "FM_DB_PASSWORD=abc123\nFM_DB_USER=memories\n")

    assert result.returncode == 0, result.stderr
    argv = (tmp_path / "argv").read_text()
    assert argv.startswith("compose exec -T db psql")
    assert "-h" not in argv.split(), "must use the local socket, not TCP"
    assert "ALTER ROLE \"memories\" WITH PASSWORD 'abc123';" in (tmp_path / "stdin").read_text()


def test_password_never_appears_in_the_command_line(tmp_path: Path) -> None:
    # Other processes can read argv (ps); stdin they cannot.
    _run(tmp_path, "FM_DB_PASSWORD=do-not-show-me\n")

    assert "do-not-show-me" not in (tmp_path / "argv").read_text()


def test_default_user_when_env_has_none(tmp_path: Path) -> None:
    _run(tmp_path, "FM_DB_PASSWORD=abc\n")

    assert "-U memories" in (tmp_path / "argv").read_text()
    assert 'ALTER ROLE "memories"' in (tmp_path / "stdin").read_text()


def test_quotes_in_values_cannot_break_out_of_the_statement(tmp_path: Path) -> None:
    _run(tmp_path, "FM_DB_PASSWORD=it's\nFM_DB_USER=we\"ird\n")

    assert (tmp_path / "stdin").read_text().strip() == (
        "ALTER ROLE \"we\"\"ird\" WITH PASSWORD 'it''s';"
    )


def test_failure_is_reported(tmp_path: Path) -> None:
    result = _run(tmp_path, "FM_DB_PASSWORD=abc\n", exit_code=1)

    assert result.returncode != 0


def test_no_password_is_an_error_not_an_empty_password(tmp_path: Path) -> None:
    result = _run(tmp_path, "FM_DB_USER=memories\n")

    assert result.returncode != 0
    assert not (tmp_path / "argv").exists()
