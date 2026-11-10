"""Settings > Update (spec 190, owner request 2026-11-10).

The GitHub repository is private, so the check runs on this Mac with the owner's
own git credentials: fetch origin/main and compare it with the running checkout.
Applying an update is fast-forward only (`git pull --ff-only`); a checkout with
local commits or conflicting edits is left exactly as it is and reported. Then
the Docker stack is rebuilt with the new commit recorded, and the helper restarts
itself so its own code is current too. Nothing is reset, forced or deleted.
"""

from __future__ import annotations

import os
import subprocess
import sys
import threading
import time
from collections.abc import Callable
from pathlib import Path
from typing import Any

from app.connectors.hudl_capture import CaptureError

Runner = Callable[..., "subprocess.CompletedProcess[str]"]


def _run(
    command: list[str], cwd: Path | None = None, env: dict[str, str] | None = None
) -> subprocess.CompletedProcess[str]:
    try:
        return subprocess.run(
            command, cwd=cwd, env=env, capture_output=True, text=True, timeout=1800, check=False
        )
    except (OSError, subprocess.TimeoutExpired) as error:
        return subprocess.CompletedProcess(command, 1, "", str(error))


def _restart() -> None:
    """Start the helper again from the updated code, with the same arguments."""
    os.chdir(Path(__file__).resolve().parents[2])
    arguments = [sys.executable, "-m", "app.connectors.hudl_companion", *sys.argv[1:]]
    os.execv(sys.executable, arguments)  # noqa: S606 (fixed interpreter and module)


class Updater:
    CACHE_S = 600

    def __init__(
        self, repo: Path, run: Runner = _run, restart: Callable[[], None] = _restart
    ) -> None:
        self.repo = repo
        self.run = run
        self.restart = restart
        self._lock = threading.Lock()
        self._checked: tuple[float, dict[str, Any]] | None = None
        self._status: dict[str, Any] = {"state": "idle", "message": ""}

    def _git(self, *args: str) -> str:
        done = self.run(["git", *args], cwd=self.repo)
        if done.returncode != 0:
            raise CaptureError(
                "Could not reach GitHub. Check the internet connection and try again."
            )
        return str(done.stdout).strip()

    def _require_checkout(self) -> None:
        if not (self.repo / ".git").exists():
            raise CaptureError(
                "This copy was not installed from GitHub with git. Download the latest version "
                "and run the installer again to update."
            )

    def check(self, force: bool = False) -> dict[str, Any]:
        self._require_checkout()
        with self._lock:
            if not force and self._checked and time.monotonic() - self._checked[0] < self.CACHE_S:
                return self._checked[1]
        self._git("fetch", "--quiet", "origin", "main")
        current = self._git("rev-parse", "HEAD")
        latest = self._git("rev-parse", "origin/main")
        behind = int(self._git("rev-list", "--count", "HEAD..origin/main") or 0)
        message, _, date = self._git("log", "-1", "--format=%s%x1f%cI", "origin/main").partition(
            "\x1f"
        )
        result = {
            "current": current,
            "latest": latest,
            "behind": behind,
            "update_available": behind > 0 and current != latest,
            "latest_message": message,
            "latest_date": date or None,
            "checked_at": time.time(),
        }
        with self._lock:
            self._checked = (time.monotonic(), result)
        return result

    def status(self) -> dict[str, Any]:
        with self._lock:
            return dict(self._status)

    def _report(self, state: str, message: str) -> None:
        with self._lock:
            self._status = {"state": state, "message": message}

    def apply(self) -> None:
        self._require_checkout()
        with self._lock:
            if self._status["state"] == "working":
                raise CaptureError("An update is already running.")
            self._status = {"state": "working", "message": "Downloading the latest version…"}
        threading.Thread(target=self.apply_now, daemon=True).start()

    def apply_now(self) -> None:
        self._report("working", "Downloading the latest version…")
        pulled = self.run(["git", "pull", "--ff-only", "origin", "main"], cwd=self.repo)
        if pulled.returncode != 0:
            self._report(
                "error",
                "The update could not be applied automatically because this copy has local "
                "changes. Nothing was changed.",
            )
            return
        self._report("working", "Rebuilding the app (this can take a few minutes)…")
        built = self.run(["docker", "compose", "up", "-d", "--build"], cwd=self.repo)
        # The helper's own Python packages follow the lock file; a failure here is not fatal.
        self.run(["uv", "sync", "--frozen"], cwd=self.repo / "backend")
        if built.returncode != 0:
            self._report(
                "error",
                "The new version was downloaded but Docker could not rebuild it. "
                "Is Docker Desktop running?",
            )
            return
        with self._lock:
            self._checked = None
        self._report("done", "Updated. Reload the page in a moment.")
        self.restart()
