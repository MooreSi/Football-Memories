"""Settings > Update (spec 190, owner request 2026-11-10).

The check runs in the desktop helper on this computer: fetch origin/main from
GitHub and compare it with the running checkout. A copy downloaded as a ZIP is
first linked to GitHub by `git_adopt` (owner report 2026-11-12), which changes
no file; if it cannot be linked the reason is reported.
Applying an update is fast-forward only (`git pull --ff-only`); a checkout with
local commits or conflicting edits is left exactly as it is and reported. Then
the Docker stack is rebuilt with the new commit recorded, and the helper restarts
itself so its own code is current too. Nothing is reset, forced or deleted.
"""

from __future__ import annotations

import os
import socket
import subprocess
import sys
import threading
import time
from collections.abc import Callable
from pathlib import Path
from typing import Any

from app.connectors.git_adopt import AdoptError, adopt, needs_adoption
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


# subprocess.CREATE_NEW_CONSOLE exists only on Windows; same value.
CREATE_NEW_CONSOLE = 0x00000010


def restart_helper(
    os_name: str = os.name,
    execv: Callable[[str, list[str]], object] = os.execv,
    popen: Callable[..., object] = subprocess.Popen,
    exit_: Callable[[int], object] = os._exit,
) -> None:
    """Start the helper again from the updated code, with the same arguments.

    Mac: replace this process in place (same PID, same log redirection; Python's
    listening socket is close-on-exec, so port 8766 is free for the new code).
    Windows has no in-place exec: os.execv starts a new process and ends this one,
    which closes the helper's console window. So start a fresh helper in its own
    window, told to wait until this process has released port 8766, then exit.
    """
    backend = Path(__file__).resolve().parents[2]
    os.chdir(backend)
    arguments = [sys.executable, "-m", "app.connectors.hudl_companion", *sys.argv[1:]]
    if os_name == "nt":
        popen(
            arguments,
            cwd=backend,
            env={**os.environ, "FM_HELPER_WAIT_FOR_PORT": "1"},
            creationflags=CREATE_NEW_CONSOLE,
        )
        exit_(0)
        return
    execv(sys.executable, arguments)


def wait_for_free_port(port: int, timeout_s: float = 60) -> bool:
    """True once nothing listens on 127.0.0.1:port (the old helper has exited)."""
    deadline = time.monotonic() + timeout_s
    while True:
        probe = socket.socket()
        try:
            probe.bind(("127.0.0.1", port))
            return True
        except OSError:
            if time.monotonic() >= deadline:
                return False
            time.sleep(0.2)
        finally:
            probe.close()


def _restart() -> None:
    restart_helper()


class Updater:
    CACHE_S = 600

    def __init__(
        self,
        repo: Path,
        run: Runner = _run,
        restart: Callable[[], None] = _restart,
        adopt: Callable[..., str] = adopt,
    ) -> None:
        self.repo = repo
        self.run = run
        self.restart = restart
        self.adopt = adopt
        self._lock = threading.Lock()
        self._adopting = threading.Lock()
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
        if not needs_adoption(self.repo):
            return
        with self._adopting:
            try:
                self.adopt(self.repo, run=self.run)
            except AdoptError as error:
                raise CaptureError(str(error)) from error

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

    def version(self) -> dict[str, str]:
        """The commit this copy runs, read locally (no GitHub fetch). The page polls
        it during an update to see when the restarted helper runs the new code."""
        self._require_checkout()
        return {"current": self._git("rev-parse", "HEAD")}

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
        self._report("done", "Updated. Restarting the app…")
        self.restart()
