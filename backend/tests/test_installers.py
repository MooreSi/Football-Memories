"""The installers' settings step: a fresh copy must always end with a usable .env.

Regression (2026-11-11): `.gitignore` had `.env.*`, which also ignored
`.env.example`. A fresh clone or ZIP had no template, `cp` failed silently, no
.env was written and `docker compose` stopped with "required variable
FM_DB_PASSWORD is missing a value".
"""

from __future__ import annotations

import re
import shutil
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
ENSURE_ENV = ROOT / "scripts" / "mac" / "ensure-env.sh"


def _git(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True, check=False)


def _password(env: Path) -> str:
    values = re.findall(r"^FM_DB_PASSWORD=(.*)$", env.read_text(), flags=re.MULTILINE)
    assert len(values) == 1, values
    return values[0]


def _run(folder: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["/bin/bash", "-c", f'source "{ENSURE_ENV}" && ensure_env'],
        cwd=folder,
        capture_output=True,
        text=True,
        check=False,
    )


@pytest.mark.skipif(not (ROOT / ".git").exists(), reason="needs the git checkout")
def test_env_template_is_published_with_the_repo() -> None:
    assert _git("check-ignore", "-q", ".env.example").returncode == 1
    assert _git("ls-files", "--error-unmatch", ".env.example").returncode == 0


def test_template_holds_no_real_password() -> None:
    assert _password(ROOT / ".env.example") == "change-me"


def test_fresh_copy_gets_env_from_template_with_random_password(tmp_path: Path) -> None:
    shutil.copy(ROOT / ".env.example", tmp_path / ".env.example")

    result = _run(tmp_path)

    assert result.returncode == 0, result.stderr
    password = _password(tmp_path / ".env")
    assert re.fullmatch(r"[0-9a-f]{48}", password)
    assert "FM_BIND=0.0.0.0" in (tmp_path / ".env").read_text()


def test_copy_without_template_still_gets_a_password(tmp_path: Path) -> None:
    result = _run(tmp_path)

    assert result.returncode == 0, result.stderr
    assert re.fullmatch(r"[0-9a-f]{48}", _password(tmp_path / ".env"))


@pytest.mark.parametrize("line", ["FM_DB_PASSWORD=\n", "", "FM_DB_PASSWORD=   \n"])
def test_existing_env_with_no_password_is_repaired_and_kept(tmp_path: Path, line: str) -> None:
    (tmp_path / ".env").write_text(f"FM_PORT=9000\n{line}FM_BIND=127.0.0.1\n")

    result = _run(tmp_path)

    assert result.returncode == 0, result.stderr
    text = (tmp_path / ".env").read_text()
    assert "FM_PORT=9000\n" in text and "FM_BIND=127.0.0.1\n" in text
    assert re.fullmatch(r"[0-9a-f]{48}", _password(tmp_path / ".env"))


def test_existing_password_is_never_changed(tmp_path: Path) -> None:
    # The database volume was initialised with this password; changing it
    # would lock the app out of its own library.
    original = "FM_DB_PASSWORD=change-me\nFM_PORT=8765\n"
    (tmp_path / ".env").write_text(original)

    result = _run(tmp_path)

    assert result.returncode == 0, result.stderr
    assert (tmp_path / ".env").read_text() == original
