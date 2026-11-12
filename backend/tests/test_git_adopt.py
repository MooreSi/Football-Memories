"""A copy downloaded as a ZIP from GitHub must be able to update itself.

Owner report (2026-11-12): a Mac installed from GitHub's "Download ZIP" showed
"This copy was not installed from GitHub with git" in Settings > Update and
could never update. `git_adopt` makes such a folder a git checkout of the exact
commit the ZIP was made from, without changing any file in it, so the normal
fast-forward update then works.

These tests use real git against a local repository standing in for GitHub;
nothing here touches the network.
"""

from __future__ import annotations

import hashlib
import os
import subprocess
import sys
import zipfile
from pathlib import Path

import pytest

from app.connectors import git_adopt
from app.connectors.git_adopt import AdoptError, adopt

MODULE = Path(git_adopt.__file__)


def git(cwd: Path, *args: str) -> str:
    done = subprocess.run(["git", *args], cwd=cwd, capture_output=True, text=True, check=False)
    assert done.returncode == 0, done.stderr
    return done.stdout.strip()


@pytest.fixture
def github(tmp_path: Path) -> Path:
    """A stand-in for GitHub: a repo whose main has three commits."""
    origin = tmp_path / "origin"
    origin.mkdir()
    git(origin, "init", "-q")
    git(origin, "symbolic-ref", "HEAD", "refs/heads/main")
    git(origin, "config", "user.email", "test@example.invalid")
    git(origin, "config", "user.name", "Test")
    (origin / ".gitattributes").write_text("*.bat text eol=crlf\n")
    (origin / ".gitignore").write_text("data/\n.env\n.venv/\n")
    (origin / "README.md").write_text("version 1\n")
    (origin / "Install.bat").write_text("@echo off\necho one\n")
    installer = origin / "Install.command"
    installer.write_text("#!/bin/bash\necho one\n")
    installer.chmod(0o755)
    git(origin, "add", "-A")
    git(origin, "commit", "-q", "-m", "First")
    (origin / "README.md").write_text("version 2\n")
    (origin / "gone.txt").write_text("deleted later\n")
    git(origin, "add", "-A")
    git(origin, "commit", "-q", "-m", "Second")
    (origin / "README.md").write_text("version 3\n")
    (origin / "gone.txt").unlink()
    (origin / "new.txt").write_text("added\n")
    git(origin, "add", "-A")
    git(origin, "commit", "-q", "-m", "Third")
    return origin


def download_zip(github: Path, commit: str, into: Path, keep_modes: bool = True) -> Path:
    """What GitHub's Download ZIP plus unzipping gives the owner."""
    archive = into.parent / f"{into.name}.zip"
    git(github, "archive", "--format=zip", "--prefix=copy/", "-o", str(archive), commit)
    with zipfile.ZipFile(archive) as bundle:
        for member in bundle.infolist():
            target = into / member.filename.removeprefix("copy/")
            if member.is_dir():
                target.mkdir(parents=True, exist_ok=True)
                continue
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(bundle.read(member))
            mode = (member.external_attr >> 16) & 0o777
            if keep_modes and mode:
                target.chmod(mode)
    return into


def snapshot(folder: Path) -> dict[str, str]:
    return {
        str(path.relative_to(folder)): hashlib.sha256(path.read_bytes()).hexdigest()
        for path in folder.rglob("*")
        if path.is_file() and ".git" not in path.relative_to(folder).parts
    }


def commit_of(github: Path, ref: str) -> str:
    return git(github, "rev-parse", ref)


def test_zip_of_an_older_commit_becomes_a_clean_checkout_that_can_fast_forward(
    github: Path, tmp_path: Path
) -> None:
    older = commit_of(github, "main~1")
    copy = download_zip(github, older, tmp_path / "copy")
    before = snapshot(copy)

    matched = adopt(copy, remote=str(github))

    assert matched == older
    assert snapshot(copy) == before, "adopting must not change any file"
    assert git(copy, "rev-parse", "HEAD") == older
    assert git(copy, "status", "--porcelain") == ""
    assert git(copy, "rev-parse", "--abbrev-ref", "HEAD") == "main"
    git(copy, "pull", "--ff-only", "-q", "origin", "main")
    assert (copy / "README.md").read_text() == "version 3\n"
    assert not (copy / "gone.txt").exists()


def test_zip_of_the_latest_commit_is_up_to_date(github: Path, tmp_path: Path) -> None:
    copy = download_zip(github, "main", tmp_path / "copy")

    assert adopt(copy, remote=str(github)) == commit_of(github, "main")
    assert git(copy, "rev-list", "--count", "HEAD..origin/main") == "0"


def test_owner_data_and_settings_are_kept_and_do_not_block_matching(
    github: Path, tmp_path: Path
) -> None:
    copy = download_zip(github, commit_of(github, "main~1"), tmp_path / "copy")
    (copy / "data").mkdir()
    (copy / "data" / "match.mp4").write_bytes(b"footage")
    (copy / ".env").write_text("FM_DB_PASSWORD=secret\n")
    (copy / "notes.txt").write_text("the owner's own file\n")
    before = snapshot(copy)

    adopt(copy, remote=str(github))

    assert snapshot(copy) == before
    assert git(copy, "status", "--porcelain") == "?? notes.txt"


def test_lost_file_modes_from_unzipping_still_match(github: Path, tmp_path: Path) -> None:
    copy = download_zip(github, "main", tmp_path / "copy", keep_modes=False)

    adopt(copy, remote=str(github))

    assert git(copy, "status", "--porcelain") == ""


def test_edited_copy_is_left_alone_with_a_clear_message(github: Path, tmp_path: Path) -> None:
    copy = download_zip(github, "main", tmp_path / "copy")
    (copy / "README.md").write_text("changed by hand\n")
    before = snapshot(copy)

    with pytest.raises(AdoptError, match="installer"):
        adopt(copy, remote=str(github))

    assert snapshot(copy) == before
    assert not (copy / ".git").exists(), "a failed attempt must not leave a half checkout"


def test_existing_checkout_is_not_touched(github: Path, tmp_path: Path) -> None:
    clone = tmp_path / "clone"
    git(tmp_path, "clone", "-q", str(github), str(clone))
    head = git(clone, "rev-parse", "HEAD")
    config = (clone / ".git" / "config").read_text()

    assert adopt(clone, remote="https://example.invalid/never-used.git") == head
    assert (clone / ".git" / "config").read_text() == config


def test_interrupted_attempt_is_redone(github: Path, tmp_path: Path) -> None:
    copy = download_zip(github, "main", tmp_path / "copy")
    (copy / ".git").mkdir()
    (copy / ".git" / git_adopt.MARKER).write_text("")

    assert git_adopt.needs_adoption(copy)
    adopt(copy, remote=str(github))

    assert not git_adopt.needs_adoption(copy)
    assert git(copy, "status", "--porcelain") == ""


def test_no_connection_leaves_the_copy_as_it_was(github: Path, tmp_path: Path) -> None:
    copy = download_zip(github, "main", tmp_path / "copy")
    before = snapshot(copy)

    with pytest.raises(AdoptError, match="GitHub"):
        adopt(copy, remote=str(tmp_path / "no-such-repo"))

    assert snapshot(copy) == before
    assert not (copy / ".git").exists()


def test_command_line_used_by_the_installers(github: Path, tmp_path: Path) -> None:
    copy = download_zip(github, commit_of(github, "main~1"), tmp_path / "copy")
    env = {**os.environ, "PYTHONPATH": ""}

    done = subprocess.run(
        [sys.executable, "-I", str(MODULE), str(copy), "--remote", str(github)],
        capture_output=True,
        text=True,
        check=False,
        env=env,
    )

    assert done.returncode == 0, done.stderr
    assert "Linked this copy to GitHub" in done.stdout
    assert git(copy, "status", "--porcelain") == ""

    edited = download_zip(github, "main", tmp_path / "edited")
    (edited / "README.md").write_text("changed\n")
    failed = subprocess.run(
        [sys.executable, "-I", str(MODULE), str(edited), "--remote", str(github)],
        capture_output=True,
        text=True,
        check=False,
        env=env,
    )
    assert failed.returncode == 1
    assert "installer" in failed.stdout
