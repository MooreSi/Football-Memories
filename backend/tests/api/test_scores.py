"""Spec 210: the owner's score corrections for Hudl matches."""

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session, sessionmaker

from app.config import Settings
from app.main import create_app

HUDL_ID = "VmlkZW82YWYxZDRkNmNmNTg2N2MxYzczODkxNmY="


def test_no_corrections_at_first(client: TestClient) -> None:
    assert client.get("/api/scores").json() == {}


def test_a_correction_is_kept_across_a_restart(
    client: TestClient, settings: Settings, session_factory: sessionmaker[Session]
) -> None:
    put = client.put("/api/scores", json={"match_id": HUDL_ID, "ours": 4, "theirs": 3})
    assert put.status_code == 200
    with TestClient(create_app(settings, session_factory=session_factory)) as again:
        assert again.get("/api/scores").json() == {HUDL_ID: {"ours": 4, "theirs": 3}}


def test_correcting_again_replaces_the_score(client: TestClient) -> None:
    client.put("/api/scores", json={"match_id": HUDL_ID, "ours": 4, "theirs": 3})
    client.put("/api/scores", json={"match_id": HUDL_ID, "ours": 5, "theirs": 3})
    assert client.get("/api/scores").json() == {HUDL_ID: {"ours": 5, "theirs": 3}}


def test_clearing_returns_to_the_tagged_score(client: TestClient) -> None:
    client.put("/api/scores", json={"match_id": HUDL_ID, "ours": 4, "theirs": 3})
    other = "b3RoZXI="
    client.put("/api/scores", json={"match_id": other, "ours": 0, "theirs": 0})
    cleared = client.put("/api/scores", json={"match_id": HUDL_ID, "ours": None, "theirs": None})
    assert cleared.status_code == 200
    assert client.get("/api/scores").json() == {other: {"ours": 0, "theirs": 0}}


def test_scores_do_not_leak_into_other_preferences(client: TestClient) -> None:
    client.put("/api/scores", json={"match_id": HUDL_ID, "ours": 1, "theirs": 2})
    assert client.get("/api/preferences").json() == {"primary_player_id": None}


def test_invalid_corrections_are_rejected_and_nothing_changes(client: TestClient) -> None:
    for body in (
        {"match_id": HUDL_ID, "ours": -1, "theirs": 0},
        {"match_id": HUDL_ID, "ours": 100, "theirs": 0},
        {"match_id": HUDL_ID, "ours": 1, "theirs": None},
        {"match_id": "", "ours": 1, "theirs": 0},
        {"match_id": "x" * 71, "ours": 1, "theirs": 0},
    ):
        assert client.put("/api/scores", json=body).status_code == 422, body
    assert client.get("/api/scores").json() == {}
