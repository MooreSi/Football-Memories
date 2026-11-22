"""Spec 250: the helper's Veo routes. Synthetic store and connection; no Veo."""

import logging
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.connectors.hudl_companion import create_companion

SECRET = "FAKE_VEO_SECRET_51c2"  # noqa: S105
APP = {"Origin": "http://127.0.0.1:8765"}


class FakeStore:
    label = "macOS Keychain"
    service = "Veo"

    def __init__(self) -> None:
        self.saved: list[tuple[str, str]] = []

    def save(self, credentials) -> None:  # noqa: ANN001
        self.saved.append((credentials.username, credentials.password.get_secret_value()))

    def configured(self) -> bool:
        return bool(self.saved)


class FakeConnection:
    def __init__(self) -> None:
        self.started: list[str] = []
        self.was_reset = False

    def status(self) -> dict[str, object]:
        return {"state": "idle", "message": "Not connected", "busy": False, "summary": None}

    def start(self, action: str) -> None:
        self.started.append(action)

    def reset(self) -> None:
        self.was_reset = True

    def shared_links(self) -> list[dict[str, str]]:  # owner request 2026-11-20
        return []

    def is_shared(self, identity: str | None) -> bool:
        return False

    def library(self) -> list[dict[str, object]]:
        return [
            {
                "id": "veo-1",
                "title": "261108 Riverside U11 vs Northgate",
                "source": "veo",
                "moments": [],
            }
        ]

    def close(self) -> None:
        pass


@pytest.fixture
def client(tmp_path: Path):
    app = create_companion(tmp_path)
    app.state.veo_store = FakeStore()
    app.state.veo = FakeConnection()
    with TestClient(app, base_url="http://127.0.0.1:8766") as c:
        yield c, app


def test_status_reports_whether_an_account_is_saved(client) -> None:
    c, _ = client
    body = c.get("/veo/account", headers=APP).json()
    assert body["configured"] is False and body["state"] == "idle"
    assert body["secret_store"] == "macOS Keychain"  # noqa: S105 (a label)


def test_saving_puts_the_password_only_in_the_store(client, caplog) -> None:
    c, app = client
    caplog.set_level(logging.DEBUG)
    response = c.post(
        "/veo/credentials", headers=APP, json={"username": "veo@example.test", "password": SECRET}
    )
    assert response.status_code == 200 and SECRET not in response.text
    assert app.state.veo_store.saved == [("veo@example.test", SECRET)]
    assert app.state.veo.was_reset
    assert SECRET not in caplog.text
    assert c.get("/veo/account", headers=APP).json()["configured"] is True


def test_a_bad_save_does_not_echo_what_was_sent(client) -> None:
    c, app = client
    response = c.post("/veo/credentials", headers=APP, json={"username": "", "password": SECRET})
    assert response.status_code == 400 and SECRET not in response.text
    assert app.state.veo_store.saved == []


def test_test_and_refresh_start_and_nothing_else_is_accepted(client) -> None:
    c, app = client
    assert (
        c.post("/veo/action", headers=APP, json={"action": "test"}).status_code == 400
    )  # nothing saved yet
    assert app.state.veo.started == []
    c.post(
        "/veo/credentials", headers=APP, json={"username": "veo@example.test", "password": SECRET}
    )
    assert c.post("/veo/action", headers=APP, json={"action": "test"}).status_code == 202
    assert c.post("/veo/action", headers=APP, json={"action": "refresh"}).status_code == 202
    assert c.post("/veo/action", headers=APP, json={"action": "delete"}).status_code == 400
    assert app.state.veo.started == ["test", "refresh"]


def test_library_lists_cached_veo_matches(client) -> None:
    c, _ = client
    assert c.get("/veo/library", headers=APP).json()[0]["source"] == "veo"


# Owner request 2026-11-15: each match lists its team events as moments too.
def test_library_lists_each_matchs_team_events_as_moments(client) -> None:
    c, app = client
    item = {
        "id": "veo-2",
        "title": "t",
        "source": "veo",
        "moments": [],
        "team_data": {
            "stats": {},
            "events": [{"type": "FOUL", "side": "opponent", "time_s": 30.0, "period": 1}],
        },
    }
    app.state.veo.library = lambda: [item]
    listed = c.get("/veo/library", headers=APP).json()[0]
    assert [m["category"] for m in listed["team_moments"]] == ["OPPONENT FOUL"]


def test_other_websites_cannot_use_the_veo_routes(client) -> None:
    c, app = client
    assert (
        c.post(
            "/veo/credentials",
            headers={"Origin": "https://evil.test"},
            json={"username": "a", "password": SECRET},
        ).status_code
        == 403
    )
    assert app.state.veo_store.saved == []


# Spec 260 tasks 2-3: watch/download actions and the stream route.


class PlaybackConnection(FakeConnection):
    def __init__(self) -> None:
        super().__init__()
        self.with_match: list[tuple[str, str | None]] = []

    def start(self, action: str, match_id: str | None = None) -> None:  # type: ignore[override]
        self.with_match.append((action, match_id))

    def stream(self, token: str, header: str | None) -> tuple[int, int, int, bytes]:
        if token != "tok":  # noqa: S105 (a synthetic stream id)
            from app.connectors.hudl_capture import CaptureError

            raise CaptureError("This stream has expired. Select Watch again.")
        return 10, 13, 100, b"abcd"


def playback_client(tmp_path: Path) -> tuple[TestClient, PlaybackConnection]:
    app = create_companion(tmp_path / "out")
    store = FakeStore()
    store.saved.append(("parent@example.test", SECRET))
    connection = PlaybackConnection()
    app.state.veo_store = store
    app.state.veo = connection
    return TestClient(app, base_url="http://127.0.0.1:8766"), connection


def test_watch_and_download_need_a_match(tmp_path: Path) -> None:
    client, connection = playback_client(tmp_path)
    assert client.post("/veo/action", json={"action": "watch"}, headers=APP).status_code >= 400
    assert (
        client.post(
            "/veo/action", json={"action": "watch", "match_id": "veo-a"}, headers=APP
        ).status_code
        == 202
    )
    assert (
        client.post(
            "/veo/action", json={"action": "download", "match_id": "veo-a"}, headers=APP
        ).status_code
        == 202
    )
    assert connection.with_match == [("watch", "veo-a"), ("download", "veo-a")]


def test_stream_answers_206_with_the_range_and_only_to_the_app(tmp_path: Path) -> None:
    client, _ = playback_client(tmp_path)
    answer = client.get("/veo/stream/tok", headers={**APP, "Range": "bytes=10-13"})
    assert answer.status_code == 206
    assert answer.content == b"abcd"
    assert answer.headers["content-range"] == "bytes 10-13/100"
    assert answer.headers["accept-ranges"] == "bytes"
    assert answer.headers["content-type"] == "video/mp4"
    assert client.get("/veo/stream/other", headers=APP).status_code >= 400
    assert client.get("/veo/stream/tok", headers={"Origin": "https://evil.test"}).status_code == 403


def test_an_app_update_waits_for_a_veo_download(tmp_path: Path) -> None:
    client, connection = playback_client(tmp_path)
    connection.status = lambda: {"state": "working", "busy": True}  # type: ignore[method-assign]
    applied: list[bool] = []
    client.app.state.updater.apply = lambda: applied.append(True)  # type: ignore[attr-defined]
    answer = client.post("/update/apply", json={}, headers=APP)
    assert answer.status_code >= 400 and "Veo" in answer.text
    assert applied == []


# Owner request 2026-11-13: highlight reels from a Veo match.


class ReelConnection(FakeConnection):
    def __init__(self) -> None:
        super().__init__()
        self.reels: list[tuple[str | None, str | None, dict[str, object] | None]] = []
        self.state: dict[str, object] = {
            "state": "idle",
            "message": "",
            "busy": False,
            "summary": None,
        }

    def start(
        self,
        action: str,
        match_id: str | None = None,
        name: str | None = None,  # type: ignore[override]
        reel: dict[str, object] | None = None,
    ) -> None:
        self.reels.append((match_id, name, reel))

    def status(self) -> dict[str, object]:
        return self.state


def test_reel_action_passes_the_highlights_and_card_ids(tmp_path: Path) -> None:
    app = create_companion(tmp_path / "out")
    store = FakeStore()
    store.saved.append(("parent@example.test", SECRET))
    app.state.veo_store, app.state.veo = store, ReelConnection()
    client = TestClient(app, base_url="http://127.0.0.1:8766")
    body = {
        "action": "reel",
        "match_id": "veo-a",
        "name": "Norton Lindsay v Town",
        "moment_ids": ["h1", "h2"],
        "opening_card": "c" * 24,
        "closing_card": "d" * 24,
        "match_label": "Norton Lindsay v Town",
    }
    assert client.post("/veo/action", json=body, headers=APP).status_code == 202
    match_id, name, reel = app.state.veo.reels[0]
    assert (match_id, name) == ("veo-a", "Norton Lindsay v Town")
    assert reel == {
        "moment_ids": ["h1", "h2"],
        "opening_card": "c" * 24,
        "match_card": None,
        "closing_card": "d" * 24,
        "match_label": "Norton Lindsay v Town",
    }
    assert (
        client.post("/veo/action", json={**body, "moment_ids": []}, headers=APP).status_code >= 400
    )


def test_a_finished_veo_reel_gets_a_save_link(tmp_path: Path) -> None:
    app = create_companion(tmp_path / "out")
    app.state.veo_store, app.state.veo = FakeStore(), ReelConnection()
    app.state.veo.state = {
        "state": "done",
        "busy": False,
        "message": "ready",
        "summary": None,
        "filename": "reels/Norton Lindsay v Town (ab12cd34).mp4",
    }
    client = TestClient(app, base_url="http://127.0.0.1:8766")
    status = client.get("/veo/account", headers=APP).json()
    assert status["download_url"].startswith(
        f"http://127.0.0.1:8766/files/{app.state.file_scope}/reels/"
    )
    app.state.veo.state = {
        **app.state.veo.state,
        "filename": "Norton Lindsay v Town 2026-11-08.mp4",
    }
    assert client.get("/veo/account", headers=APP).json().get("download_url") is None


def test_moments_action_passes_the_ticked_highlights_and_gets_a_save_link(tmp_path: Path) -> None:
    app = create_companion(tmp_path / "out")
    store = FakeStore()
    store.saved.append(("parent@example.test", SECRET))
    app.state.veo_store, app.state.veo = store, ReelConnection()
    client = TestClient(app, base_url="http://127.0.0.1:8766")
    body = {
        "action": "moments",
        "match_id": "veo-a",
        "name": "Norton Lindsay v Town",
        "moment_ids": ["h1", "h2"],
        "combined": False,
    }
    assert client.post("/veo/action", json=body, headers=APP).status_code == 202
    _, _, request = app.state.veo.reels[0]
    assert request is not None
    assert (request["moment_ids"], request["combined"]) == (["h1", "h2"], False)
    app.state.veo.state = {
        "state": "done",
        "busy": False,
        "message": "",
        "summary": None,
        "filename": "moments/Norton Lindsay v Town moments (ab12cd34).zip",
    }
    assert "/moments/" in client.get("/veo/account", headers=APP).json()["download_url"]


# Owner request 2026-11-15: the club's names and crest from Veo, for the app's crests.
class ClubConnection(FakeConnection):
    def __init__(self, crest: Path | None) -> None:
        super().__init__()
        self.path = crest

    def club(self) -> dict[str, object]:
        return {"names": ["Riverside FC", "Riverside"], "crest": self.path is not None}

    def crest(self) -> Path | None:
        return self.path


def test_club_names_and_crest_are_served_to_the_app_only(tmp_path: Path) -> None:
    crest = tmp_path / "crest.png"
    crest.write_bytes(b"\x89PNG\r\n\x1a\nsynthetic")
    app = create_companion(tmp_path / "out")
    app.state.veo = ClubConnection(crest)
    c = TestClient(app, base_url="http://127.0.0.1:8766")
    assert c.get("/veo/club", headers=APP).json() == {
        "names": ["Riverside FC", "Riverside"],
        "crest": True,
    }
    answer = c.get("/veo/crest", headers=APP)
    assert answer.status_code == 200 and answer.headers["content-type"] == "image/png"
    assert answer.content == crest.read_bytes()
    assert c.get("/veo/crest", headers={"Origin": "https://evil.test"}).status_code == 403
    app.state.veo = ClubConnection(None)
    assert c.get("/veo/crest", headers=APP).status_code == 404


# Owner request 2026-11-15: a team stats card after the highlights.
def test_reel_action_passes_the_team_stats_card(tmp_path: Path) -> None:
    app = create_companion(tmp_path / "out")
    store = FakeStore()
    store.saved.append(("parent@example.test", SECRET))
    app.state.veo_store, app.state.veo = store, ReelConnection()
    client = TestClient(app, base_url="http://127.0.0.1:8766")
    body = {"action": "reel", "match_id": "veo-a", "moment_ids": ["h1"], "stats_card": "s" * 24}
    assert client.post("/veo/action", json=body, headers=APP).status_code == 202
    assert app.state.veo.reels[0][2]["stats_card"] == "s" * 24


def test_automatic_refresh_reaches_worker_without_rereading_saved_matches(client, tmp_path) -> None:
    from tests.connectors.test_veo_connection import FakeApi, connection
    from tests.connectors.test_veo_resume import FIRST_SLUG, SECOND, TwoMatches, reads_of

    c, app = client
    connection(tmp_path, FakeApi()).start("refresh")
    api = TwoMatches()
    app.state.veo = connection(tmp_path, api)
    app.state.veo_configured = True
    response = c.post("/veo/action", headers=APP, json={"action": "refresh", "only_missing": True})
    assert response.status_code == 202
    assert app.state.veo.status()["state"] == "ready"
    assert reads_of(api, FIRST_SLUG) == 0
    assert reads_of(api, SECOND["slug"]) == 4
