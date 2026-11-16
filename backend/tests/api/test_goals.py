"""Spec 270: the owner's goals and keepers for a match (scorers, keepers, saves)."""

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session, sessionmaker

from app.config import Settings
from app.main import create_app

HUDL_ID = "VmlkZW82YWYxZDRkNmNmNTg2N2MxYzczODkxNmY="
VEO_ID = "6f1c2a9e-0000-4000-8000-000000000001"

ENTRY = {
    "scorers": {"g1": "Sam Example", "a1": "Alex Demo"},
    "added": [{"id": "a1", "side": "ours"}],
    "removed": ["g9"],
    "keepers": [{"name": "Chris Keeper", "saves": 4}, {"name": "Jo Second", "saves": None}],
    "beaten": {"g2": "Chris Keeper"},
}


def test_no_entries_at_first(client: TestClient) -> None:
    assert client.get("/api/goals").json() == {}


def test_an_entry_is_kept_across_a_restart(
    client: TestClient, settings: Settings, session_factory: sessionmaker[Session]
) -> None:
    put = client.put("/api/goals", json={"match_id": HUDL_ID, "entry": ENTRY})
    assert put.status_code == 200
    assert put.json() == {HUDL_ID: ENTRY}
    with TestClient(create_app(settings, session_factory=session_factory)) as again:
        assert again.get("/api/goals").json() == {HUDL_ID: ENTRY}


def test_saving_again_replaces_the_entry_and_matches_stay_apart(client: TestClient) -> None:
    client.put("/api/goals", json={"match_id": HUDL_ID, "entry": ENTRY})
    other = {**ENTRY, "scorers": {"t-own-goal-61000": "Sam Example"}, "added": [], "removed": []}
    client.put("/api/goals", json={"match_id": VEO_ID, "entry": other})
    smaller = {**ENTRY, "scorers": {}}
    client.put("/api/goals", json={"match_id": HUDL_ID, "entry": smaller})
    assert client.get("/api/goals").json() == {HUDL_ID: smaller, VEO_ID: other}


def test_clearing_removes_only_that_match(client: TestClient) -> None:
    client.put("/api/goals", json={"match_id": HUDL_ID, "entry": ENTRY})
    client.put("/api/goals", json={"match_id": VEO_ID, "entry": ENTRY})
    cleared = client.put("/api/goals", json={"match_id": HUDL_ID, "entry": None})
    assert cleared.status_code == 200
    assert client.get("/api/goals").json() == {VEO_ID: ENTRY}


def test_goals_do_not_touch_scores_or_other_preferences(client: TestClient) -> None:
    client.put("/api/scores", json={"match_id": HUDL_ID, "ours": 1, "theirs": 2})
    client.put("/api/goals", json={"match_id": HUDL_ID, "entry": ENTRY})
    assert client.get("/api/scores").json() == {HUDL_ID: {"ours": 1, "theirs": 2}}
    assert client.get("/api/preferences").json() == {"primary_player_id": None}


def test_missing_lists_default_to_empty(client: TestClient) -> None:
    put = client.put("/api/goals", json={"match_id": HUDL_ID, "entry": {"scorers": {"g1": "Sam"}}})
    assert put.json()[HUDL_ID] == {
        "scorers": {"g1": "Sam"},
        "added": [],
        "removed": [],
        "keepers": [],
        "beaten": {},
    }


def test_invalid_entries_are_rejected_and_nothing_changes(client: TestClient) -> None:
    for body in (
        {"match_id": "", "entry": ENTRY},
        {"match_id": "x" * 71, "entry": ENTRY},
        {"match_id": HUDL_ID, "entry": {**ENTRY, "added": [{"id": "a1", "side": "both"}]}},
        {"match_id": HUDL_ID, "entry": {**ENTRY, "keepers": [{"name": "Chris", "saves": -1}]}},
        {"match_id": HUDL_ID, "entry": {**ENTRY, "keepers": [{"name": "Chris", "saves": 1000}]}},
        {"match_id": HUDL_ID, "entry": {**ENTRY, "keepers": [{"name": "", "saves": 1}]}},
        {"match_id": HUDL_ID, "entry": {**ENTRY, "scorers": {"g1": "x" * 81}}},
        {"match_id": HUDL_ID, "entry": {**ENTRY, "scorers": {f"g{i}": "Sam" for i in range(101)}}},
    ):
        assert client.put("/api/goals", json=body).status_code == 422, body
    assert client.get("/api/goals").json() == {}
