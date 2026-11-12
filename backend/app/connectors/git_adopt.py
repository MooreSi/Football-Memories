"""Link a copy downloaded as a ZIP from GitHub to the repository, so it can update.

Owner report (2026-11-12): a Mac installed from GitHub's "Download ZIP" had no
`.git`, so Settings > Update and the installers could never update it.

`adopt` makes the folder a git checkout of the exact `main` commit the ZIP was
made from, and nothing else:

- It fetches `main` from GitHub, then looks for the commit whose files match the
  folder (newest first). Matching ignores line endings (git's own normalisation)
  and file modes (unzipping can drop the executable bit). Files the commit does
  not have, such as `.env`, `data/` or the owner's own files, do not matter.
- On a match it points `main` at that commit (`git reset` without `--hard`: the
  index only). No file in the folder is written, moved or deleted.
- With no match (files edited by hand) or no connection it removes the `.git` it
  was building and reports why. The copy is exactly as it was.

The normal fast-forward update (`git pull --ff-only`) then takes it to the latest
version. Standard library only, Python 3.9+, so the installers can run it with
the system Python before the app's own environment exists:

    python3 -I backend/app/connectors/git_adopt.py <app folder>
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from collections.abc import Callable
from pathlib import Path

REPO_URL = "https://github.com/MooreSi/Football-Memories.git"
BRANCH = "main"
# Present only while a link is being built; a `.git` holding it is unfinished.
MARKER = "football-memories-linking"

Runner = Callable[..., "subprocess.CompletedProcess[str]"]

REINSTALL = "To update it, download the latest version from GitHub and run the installer again."


class AdoptError(Exception):
    pass


def _run(command: list[str], cwd: Path | None = None) -> subprocess.CompletedProcess[str]:
    try:
        return subprocess.run(
            command, cwd=cwd, capture_output=True, text=True, timeout=600, check=False
        )
    except (OSError, subprocess.TimeoutExpired) as error:
        return subprocess.CompletedProcess(command, 1, "", str(error))


def needs_adoption(folder: Path) -> bool:
    gitdir = Path(folder) / ".git"
    return not gitdir.exists() or (gitdir / MARKER).exists()


def adopt(folder: Path, run: Runner = _run, remote: str = REPO_URL) -> str:
    """Return the commit this copy now sits on. Raises AdoptError, changing nothing."""
    folder = Path(folder).resolve()
    gitdir = folder / ".git"

    def git(*args: str) -> subprocess.CompletedProcess[str]:
        return run(["git", *args], cwd=folder)

    if not needs_adoption(folder):
        return str(git("rev-parse", "HEAD").stdout).strip()
    if gitdir.exists():
        # Only an unfinished link of ours carries the marker.
        shutil.rmtree(gitdir)
    try:
        gitdir.mkdir()
        (gitdir / MARKER).write_text("unfinished link to GitHub; safe to delete\n")
        commit = _link(git, remote)
    except BaseException:
        shutil.rmtree(gitdir, ignore_errors=True)
        raise
    (gitdir / MARKER).unlink()
    return commit


def _link(git: Callable[..., subprocess.CompletedProcess[str]], remote: str) -> str:
    def need(*args: str) -> str:
        done = git(*args)
        if done.returncode != 0:
            raise AdoptError(f"Could not set up updates (git {args[0]} failed). {REINSTALL}")
        return str(done.stdout)

    if git("--version").returncode != 0:
        raise AdoptError(f"git is not installed on this computer. {REINSTALL}")
    need("init", "-q")
    need("symbolic-ref", "HEAD", f"refs/heads/{BRANCH}")
    need("remote", "add", "origin", remote)
    if git("fetch", "--quiet", "--no-tags", "origin", BRANCH).returncode != 0:
        raise AdoptError(
            "Could not reach GitHub to set up updates. Check the internet connection and try again."
        )
    commits = need("rev-list", f"origin/{BRANCH}").split()
    nomode = ("-c", "core.fileMode=false")
    for commit in commits:
        # Index only (no -u: the folder is never written). --reset keeps the
        # cached hashes of unchanged files, so each file is read about once.
        need("read-tree", "--reset", commit)
        git(*nomode, "update-index", "-q", "--refresh")
        if need(*nomode, "diff-files", "--name-only").strip() == "":
            break
    else:
        raise AdoptError(
            "This copy has files that differ from every version on GitHub, so it "
            f"was left exactly as it is. {REINSTALL}"
        )
    need("reset", "-q", commit)
    need("branch", f"--set-upstream-to=origin/{BRANCH}", BRANCH)
    git("update-index", "-q", "--refresh")
    if git("diff", "--quiet").returncode != 0:
        # Only file modes differ (the match ignored them): stop git reporting them.
        need("config", "core.fileMode", "false")
    return commit


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Link a ZIP copy of the app to GitHub.")
    parser.add_argument("folder", type=Path)
    parser.add_argument("--remote", default=REPO_URL)
    args = parser.parse_args(argv)
    already = not needs_adoption(args.folder)
    try:
        commit = adopt(args.folder, remote=args.remote)
    except AdoptError as error:
        print(error)
        return 1
    if not already:
        print(f"Linked this copy to GitHub (version {commit[:7]}).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
