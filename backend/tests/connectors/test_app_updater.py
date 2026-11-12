"""Spec 190: Settings > Update compares this checkout with GitHub main and
updates by fast-forward only, then rebuilds the Docker stack."""

from subprocess import CompletedProcess

import pytest
from fastapi.testclient import TestClient

from app.connectors.app_updater import Updater
from app.connectors.hudl_capture import CaptureError
from app.connectors.hudl_companion import create_companion

ORIGIN = {"Origin": "http://127.0.0.1:8765"}
OLD, NEW = "a" * 40, "b" * 40


class FakeGit:
    def __init__(self, behind=2, pull_ok=True):
        self.commands: list[list[str]] = []
        self.behind = behind
        self.pull_ok = pull_ok

    def __call__(self, command, cwd=None, env=None):
        self.commands.append(list(command))
        text = " ".join(command)
        if text.endswith("rev-parse HEAD"):
            return CompletedProcess(command, 0, OLD + "\n", "")
        if "rev-parse origin/main" in text:
            return CompletedProcess(command, 0, (NEW if self.behind else OLD) + "\n", "")
        if "rev-list --count" in text:
            return CompletedProcess(command, 0, f"{self.behind}\n", "")
        if "log -1" in text:
            return CompletedProcess(
                command, 0, "Add highlight reels\x1f2026-11-10T12:00:00+00:00\n", ""
            )
        if "pull" in text:
            return CompletedProcess(
                command, 0 if self.pull_ok else 1, "", "Not possible to fast-forward"
            )
        return CompletedProcess(command, 0, "", "")


@pytest.fixture
def repo(tmp_path):
    (tmp_path / ".git").mkdir()
    (tmp_path / "docker-compose.yml").write_text("services: {}\n")
    return tmp_path


def test_check_reports_how_far_behind_main(repo):
    git = FakeGit(behind=2)
    result = Updater(repo, run=git).check()
    assert result["current"] == OLD and result["latest"] == NEW
    assert result["update_available"] is True and result["behind"] == 2
    assert result["latest_message"] == "Add highlight reels"
    assert ["git", "fetch", "--quiet", "origin", "main"] in git.commands


def test_check_when_up_to_date(repo):
    result = Updater(repo, run=FakeGit(behind=0)).check()
    assert result["update_available"] is False


def test_apply_fast_forwards_and_rebuilds_without_ever_forcing(repo):
    git = FakeGit()
    updater = Updater(repo, run=git, restart=lambda: None)
    updater.apply_now()
    flat = [" ".join(c) for c in git.commands]
    assert any(c == "git pull --ff-only origin main" for c in flat)
    assert any(c.startswith("docker compose up -d --build") for c in flat)
    assert flat.index("git pull --ff-only origin main") < next(
        i for i, c in enumerate(flat) if c.startswith("docker compose")
    )
    # Negative control: nothing destructive is ever run.
    assert not any(w in c for c in flat for w in ("reset", "--force", "clean", "checkout"))
    assert updater.status()["state"] == "done"


def test_apply_stops_when_the_checkout_cannot_fast_forward(repo):
    git = FakeGit(pull_ok=False)
    updater = Updater(repo, run=git, restart=lambda: None)
    updater.apply_now()
    assert updater.status()["state"] == "error"
    assert not any(c[:2] == ["docker", "compose"] for c in git.commands)


def test_not_a_git_checkout_explains_how_to_update(tmp_path):
    with pytest.raises(CaptureError, match="installer"):
        Updater(tmp_path, run=FakeGit()).check()


def test_update_routes_are_local_only(tmp_path, repo, monkeypatch):
    app = create_companion(tmp_path / "inbox")
    app.state.updater = Updater(repo, run=FakeGit(), restart=lambda: None)
    with TestClient(app, base_url="http://127.0.0.1:8766") as client:
        assert client.get("/update/check", headers=ORIGIN).json()["update_available"] is True
        assert (
            client.get("/update/check", headers={"Origin": "https://evil.test"}).status_code == 403
        )
        assert client.post("/update/apply", json={}, headers=ORIGIN).status_code == 202
    app.state.account._executor.shutdown()


def test_zip_copy_is_linked_to_github_before_checking(tmp_path):
    # Owner report 2026-11-12: a ZIP install could never update.
    linked = []

    def adopt(folder, run):
        linked.append(folder)
        (folder / ".git").mkdir()
        return OLD

    result = Updater(tmp_path, run=FakeGit(behind=2), adopt=adopt).check()

    assert linked == [tmp_path]
    assert result["update_available"] is True


def test_zip_copy_that_cannot_be_linked_explains_why(tmp_path):
    from app.connectors.git_adopt import AdoptError

    def adopt(folder, run):
        raise AdoptError("This copy has been changed. Run the installer again.")

    with pytest.raises(CaptureError, match="has been changed"):
        Updater(tmp_path, run=FakeGit(), adopt=adopt).check()


# Owner request 2026-11-12: after Update now, restart everything and reload the page.


def test_version_reports_the_running_commit_without_contacting_github(repo):
    git = FakeGit()
    assert Updater(repo, run=git).version() == {"current": OLD}
    assert not any("fetch" in c for c in git.commands)


def test_version_route_is_local_only(tmp_path, repo):
    app = create_companion(tmp_path / "inbox")
    app.state.updater = Updater(repo, run=FakeGit(), restart=lambda: None)
    with TestClient(app, base_url="http://127.0.0.1:8766") as client:
        assert client.get("/update/version", headers=ORIGIN).json() == {"current": OLD}
        bad = client.get("/update/version", headers={"Origin": "https://evil.test"})
        assert bad.status_code == 403
    app.state.account._executor.shutdown()


def test_helper_restarts_in_place_on_mac(monkeypatch):
    from app.connectors import app_updater

    calls = []
    app_updater.restart_helper(
        os_name="posix",
        execv=lambda exe, args: calls.append(("execv", args)),
        popen=lambda *a, **k: calls.append(("popen", a)),
        exit_=lambda code: calls.append(("exit", code)),
    )
    assert [c[0] for c in calls] == ["execv"]
    assert calls[0][1][1:3] == ["-m", "app.connectors.hudl_companion"]


def test_helper_restarts_as_a_new_window_on_windows():
    # Windows has no in-place exec: os.execv starts a new process and the old one
    # exits, so the helper's console window would close with it. Start a fresh
    # helper in its own window, which waits for port 8766 to be free, then exit.
    from app.connectors import app_updater

    calls = []
    app_updater.restart_helper(
        os_name="nt",
        execv=lambda exe, args: calls.append(("execv", args)),
        popen=lambda args, **kw: calls.append(("popen", args, kw)),
        exit_=lambda code: calls.append(("exit", code)),
    )
    assert [c[0] for c in calls] == ["popen", "exit"]
    _, args, kw = calls[0]
    assert args[1:3] == ["-m", "app.connectors.hudl_companion"]
    assert kw["env"]["FM_HELPER_WAIT_FOR_PORT"] == "1"
    assert kw["creationflags"] & app_updater.CREATE_NEW_CONSOLE


def test_new_helper_waits_for_the_old_one_to_release_the_port():
    import socket
    import threading

    from app.connectors.app_updater import wait_for_free_port

    held = socket.socket()
    held.bind(("127.0.0.1", 0))
    held.listen()
    port = held.getsockname()[1]
    threading.Timer(0.4, held.close).start()

    assert wait_for_free_port(port, timeout_s=5) is True


def test_waiting_for_the_port_gives_up():
    import socket

    from app.connectors.app_updater import wait_for_free_port

    held = socket.socket()
    held.bind(("127.0.0.1", 0))
    held.listen()
    try:
        assert wait_for_free_port(held.getsockname()[1], timeout_s=0.3) is False
    finally:
        held.close()
