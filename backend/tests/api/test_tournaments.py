"""Tournament membership persists without source account or footage changes."""

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session, sessionmaker

from app.config import Settings
from app.main import create_app


def test_tournament_batch_survives_restart(
    client: TestClient, settings: Settings, session_factory: sessionmaker[Session]
) -> None:
    response = client.put(
        "/api/tournaments",
        json={
            "name": "Winter Cup 2026",
            "team": "Villa Blue",
            "match_keys": ["hudl:game-one", "veo:game-one"],
        },
    )
    assert response.status_code == 200
    tournament = response.json()[0]
    assert tournament["name"] == "Winter Cup 2026"
    assert tournament["entries"] == {
        "hudl:game-one": "Villa Blue",
        "veo:game-one": "Villa Blue",
    }
    with TestClient(create_app(settings, session_factory=session_factory)) as again:
        assert again.get("/api/tournaments").json() == [tournament]


def test_reassign_and_remove_only_changes_chosen_membership(client: TestClient) -> None:
    first = client.put(
        "/api/tournaments",
        json={
            "name": "Winter Cup",
            "team": "Blue",
            "match_keys": ["hudl:one", "hudl:two"],
        },
    ).json()[0]
    client.put(
        "/api/tournaments",
        json={
            "name": "Other Cup",
            "team": "Blue",
            "match_keys": ["hudl:one"],
        },
    )
    client.put(
        "/api/tournaments",
        json={
            "name": " winter cup ",
            "team": "White",
            "match_keys": ["hudl:one"],
        },
    )
    removed = client.delete(f"/api/tournaments/{first['id']}/matches/hudl:two")
    assert removed.status_code == 200
    groups = {t["name"]: t["entries"] for t in client.get("/api/tournaments").json()}
    assert groups == {"Winter Cup": {"hudl:one": "White"}, "Other Cup": {"hudl:one": "Blue"}}


def test_invalid_tournament_batch_is_atomic(client: TestClient) -> None:
    response = client.put(
        "/api/tournaments",
        json={
            "name": "Cup",
            "team": "Blue",
            "match_keys": ["hudl:valid", "unknown:bad"],
        },
    )
    assert response.status_code == 422
    assert client.get("/api/tournaments").json() == []


def test_blank_names_and_empty_selection_rejected(client: TestClient) -> None:
    assert (
        client.put(
            "/api/tournaments",
            json={
                "name": "  ",
                "team": "Blue",
                "match_keys": ["local:1"],
            },
        ).status_code
        == 422
    )
    assert (
        client.put(
            "/api/tournaments",
            json={
                "name": "Cup",
                "team": " ",
                "match_keys": ["local:1"],
            },
        ).status_code
        == 422
    )
    assert (
        client.put(
            "/api/tournaments",
            json={
                "name": "Cup",
                "team": "Blue",
                "match_keys": [],
            },
        ).status_code
        == 422
    )
    assert client.get("/api/tournaments").json() == []
