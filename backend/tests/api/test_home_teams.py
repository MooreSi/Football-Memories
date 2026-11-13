"""Owner request 2026-11-13: the owner's team name per source. Veo games are
mostly a grassroots club, Hudl the academy, so one "home club" named both wrong."""

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session, sessionmaker

from app.config import Settings
from app.main import create_app


def test_home_teams_start_unset(client: TestClient) -> None:
    assert client.get("/api/settings/home-teams").json() == {"hudl": None, "veo": None}


def test_each_source_keeps_its_own_name_across_a_restart(
    client: TestClient, settings: Settings, session_factory: sessionmaker[Session]
) -> None:
    assert client.put(
        "/api/settings/home-teams", json={"veo": "  Riverside   Juniors "}
    ).json() == {
        "hudl": None,
        "veo": "Riverside Juniors",
    }
    client.put("/api/settings/home-teams", json={"hudl": "Northgate Academy"})
    with TestClient(create_app(settings, session_factory=session_factory)) as again:
        assert again.get("/api/settings/home-teams").json() == {
            "hudl": "Northgate Academy",
            "veo": "Riverside Juniors",
        }


def test_an_empty_name_clears_it_and_a_long_one_is_refused(client: TestClient) -> None:
    client.put("/api/settings/home-teams", json={"veo": "Riverside"})
    assert client.put("/api/settings/home-teams", json={"veo": ""}).json()["veo"] is None
    assert client.put("/api/settings/home-teams", json={"veo": "x" * 101}).status_code == 422
    assert client.get("/api/settings/home-teams").json()["veo"] is None
