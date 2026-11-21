"""Confirmed playing time is local, backed up and isolated per player and match."""

import pytest
from fastapi.testclient import TestClient

from app.main import create_app


def test_minutes_survive_restart_and_merge_players_without_overwriting_others(
    client, settings, session_factory
):
    client.put(
        "/api/player-minutes", json={"match_id": "a", "player": "Sam Example", "minutes": 42.5}
    )
    client.put("/api/player-minutes", json={"match_id": "a", "player": "Ali Demo", "minutes": 0})
    client.put(
        "/api/player-minutes", json={"match_id": "b", "player": "Sam Example", "minutes": 20}
    )
    with TestClient(create_app(settings, session_factory=session_factory)) as again:
        assert again.get("/api/player-minutes", params={"match_id": "a"}).json() == {
            "SAM EXAMPLE": 42.5,
            "ALI DEMO": 0,
        }
        assert again.get("/api/player-minutes", params={"match_id": "b"}).json() == {
            "SAM EXAMPLE": 20
        }


def test_clearing_minutes_removes_only_that_player(client):
    client.put(
        "/api/player-minutes", json={"match_id": "a", "player": "Sam Example", "minutes": 40}
    )
    client.put("/api/player-minutes", json={"match_id": "a", "player": "Ali Demo", "minutes": 30})
    cleared = client.put(
        "/api/player-minutes", json={"match_id": "a", "player": "sam  example", "minutes": None}
    )
    assert cleared.status_code == 200
    assert cleared.json() == {"ALI DEMO": 30}


@pytest.mark.parametrize("minutes", [-1, 601, True, "forty"])
def test_invalid_minutes_do_not_write_anything(client, minutes):
    response = client.put(
        "/api/player-minutes", json={"match_id": "a", "player": "Sam Example", "minutes": minutes}
    )
    assert response.status_code == 422
    assert client.get("/api/player-minutes", params={"match_id": "a"}).json() == {}
