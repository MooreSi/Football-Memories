"""Player Hub API (spec docs/todo/football-memories/040-player-hub.md)."""

import shutil
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session, sessionmaker

from app.config import Settings
from app.main import create_app


@pytest.fixture
def two_matches(client: TestClient, settings: Settings, tiny_video: Path, other_tiny_video: Path):  # type: ignore[no-untyped-def]
    """Match A (2026/27, U12): Sam 2 saves, 1 shared with Alex; Alex 1 goal.
    Match B (2027/28, U13, newer): Sam 1 claim."""
    a = settings.import_root / "a.mp4"
    shutil.copyfile(tiny_video, a)
    a.with_suffix(".tags.csv").write_text(
        "time,category,players\n0:01,Save,Sam\n0:02,Save,Sam; Alex\n0:03,Goal,Alex\n"
    )
    b = settings.import_root / "b.mp4"
    shutil.copyfile(other_tiny_video, b)
    b.with_suffix(".tags.csv").write_text("time,category,players\n0:01,GK Claim,Sam\n")
    base = {"team_name": "Riverside", "opponent": "Rovers"}
    ma = client.post(
        "/api/imports",
        json={
            **base,
            "filename": "a.mp4",
            "season_label": "2026/27",
            "age_group": "U12",
            "match_date": "2026-10-18",
        },
    ).json()
    mb = client.post(
        "/api/imports",
        json={
            **base,
            "filename": "b.mp4",
            "season_label": "2027/28",
            "age_group": "U13",
            "opponent": "City",
            "match_date": "2027-09-05",
        },
    ).json()
    players = {p["display_name"]: p["id"] for p in client.get("/api/players").json()}
    return {"a": ma["id"], "b": mb["id"], "sam": players["Sam"], "alex": players["Alex"]}


def _moments(client: TestClient, player_id: int, **params: str) -> list[dict]:  # type: ignore[type-arg]
    r = client.get(f"/api/players/{player_id}/moments", params=params)
    assert r.status_code == 200, r.text
    return r.json()["items"]  # type: ignore[no-any-return]


def test_players_list_has_moment_and_match_counts(client: TestClient, two_matches: dict) -> None:  # type: ignore[type-arg]
    by_name = {p["display_name"]: p for p in client.get("/api/players").json()}
    assert (by_name["Sam"]["moments"], by_name["Sam"]["matches"]) == (3, 2)
    assert (by_name["Alex"]["moments"], by_name["Alex"]["matches"]) == (2, 1)


def test_primary_player_is_unset_on_a_new_archive(client: TestClient) -> None:
    assert client.get("/api/preferences").json() == {"primary_player_id": None}


def test_primary_player_survives_an_app_restart(
    client: TestClient,
    two_matches: dict,
    settings: Settings,  # type: ignore[type-arg]
    session_factory: sessionmaker[Session],
) -> None:
    r = client.put("/api/preferences/primary-player", json={"player_id": two_matches["sam"]})
    assert r.status_code == 200
    with TestClient(create_app(settings, session_factory=session_factory)) as restarted:
        assert restarted.get("/api/preferences").json() == {"primary_player_id": two_matches["sam"]}


def test_setting_an_unknown_primary_player_is_a_404_and_changes_nothing(
    client: TestClient,
    two_matches: dict,  # type: ignore[type-arg]
) -> None:
    client.put("/api/preferences/primary-player", json={"player_id": two_matches["sam"]})
    assert client.put("/api/preferences/primary-player", json={"player_id": 999}).status_code == 404
    assert client.get("/api/preferences").json() == {"primary_player_id": two_matches["sam"]}


def test_primary_player_can_be_cleared(client: TestClient, two_matches: dict) -> None:  # type: ignore[type-arg]
    client.put("/api/preferences/primary-player", json={"player_id": two_matches["sam"]})
    client.put("/api/preferences/primary-player", json={"player_id": None})
    assert client.get("/api/preferences").json() == {"primary_player_id": None}


def test_profile_totals_and_categories(client: TestClient, two_matches: dict) -> None:  # type: ignore[type-arg]
    p = client.get(f"/api/players/{two_matches['sam']}").json()
    assert p["totals"] == {"matches": 2, "moments": 3, "unwatched": 3, "favourites": 0}
    assert p["categories"] == [{"name": "Save", "count": 2}, {"name": "GK Claim", "count": 1}]
    assert (p["first_match_date"], p["latest_match_date"]) == ("2026-10-18", "2027-09-05")


def test_profile_keeps_team_history_across_age_groups(
    client: TestClient, two_matches: dict
) -> None:  # type: ignore[type-arg]
    teams = client.get(f"/api/players/{two_matches['sam']}").json()["teams"]
    assert [(t["team_name"], t["season_label"], t["age_group"], t["matches"]) for t in teams] == [
        ("Riverside", "2027/28", "U13", 1),
        ("Riverside", "2026/27", "U12", 1),
    ]


def test_profile_per_match_series_is_chronological(client: TestClient, two_matches: dict) -> None:  # type: ignore[type-arg]
    series = client.get(f"/api/players/{two_matches['sam']}").json()["per_match"]
    assert [(s["opponent"], s["moments"]) for s in series] == [("Rovers", 2), ("City", 1)]


def test_teammates_are_co_tagged_players_with_shared_counts(
    client: TestClient, two_matches: dict
) -> None:  # type: ignore[type-arg]
    mates = client.get(f"/api/players/{two_matches['sam']}").json()["teammates"]
    assert mates == [{"id": two_matches["alex"], "display_name": "Alex", "shared_moments": 1}]


def test_unknown_player_is_a_404(client: TestClient) -> None:
    assert client.get("/api/players/999").status_code == 404


def test_edit_profile_name_shirt_and_position(client: TestClient, two_matches: dict) -> None:  # type: ignore[type-arg]
    r = client.patch(
        f"/api/players/{two_matches['sam']}",
        json={"display_name": "Sam M", "shirt_number": "1", "position": "GK"},
    )
    assert r.status_code == 200
    p = client.get(f"/api/players/{two_matches['sam']}").json()
    assert (p["display_name"], p["shirt_number"], p["position"]) == ("Sam M", "1", "GK")


def test_renaming_to_an_existing_player_name_is_a_409(
    client: TestClient, two_matches: dict
) -> None:  # type: ignore[type-arg]
    r = client.patch(f"/api/players/{two_matches['sam']}", json={"display_name": "Alex"})
    assert r.status_code == 409


def test_moments_span_matches_newest_match_first(client: TestClient, two_matches: dict) -> None:  # type: ignore[type-arg]
    items = _moments(client, two_matches["sam"])
    assert [(m["opponent"], m["category"], m["time_s"]) for m in items] == [
        ("City", "GK Claim", 1.0),
        ("Rovers", "Save", 1.0),
        ("Rovers", "Save", 2.0),
    ]
    first = items[0]
    assert first["stream_url"].startswith("/api/media/") and first["season_label"] == "2027/28"


def test_moments_filter_by_category(client: TestClient, two_matches: dict) -> None:  # type: ignore[type-arg]
    assert [m["category"] for m in _moments(client, two_matches["sam"], category="Save")] == [
        "Save",
        "Save",
    ]
    assert _moments(client, two_matches["sam"], category="Goal") == []


def test_favourite_is_idempotent_and_visible_everywhere(
    client: TestClient, two_matches: dict
) -> None:  # type: ignore[type-arg]
    event_id = _moments(client, two_matches["sam"], category="Save")[0]["event_id"]
    for _ in range(2):
        assert (
            client.put(f"/api/events/{event_id}/favourite", json={"favourite": True}).status_code
            == 200
        )
    favs = _moments(client, two_matches["sam"], favourites="true")
    assert [m["event_id"] for m in favs] == [event_id]
    detail = client.get(f"/api/matches/{two_matches['a']}").json()
    assert [e["id"] for e in detail["events"] if e["favourite"]] == [event_id]
    assert client.get(f"/api/players/{two_matches['sam']}").json()["totals"]["favourites"] == 1


def test_unfavourite_clears_it(client: TestClient, two_matches: dict) -> None:  # type: ignore[type-arg]
    event_id = _moments(client, two_matches["sam"])[0]["event_id"]
    client.put(f"/api/events/{event_id}/favourite", json={"favourite": True})
    client.put(f"/api/events/{event_id}/favourite", json={"favourite": False})
    assert _moments(client, two_matches["sam"], favourites="true") == []


def test_viewed_reduces_unwatched_and_filters(client: TestClient, two_matches: dict) -> None:  # type: ignore[type-arg]
    event_id = _moments(client, two_matches["sam"])[0]["event_id"]
    assert client.post(f"/api/events/{event_id}/viewed").status_code == 200
    assert client.get(f"/api/players/{two_matches['sam']}").json()["totals"]["unwatched"] == 2
    assert event_id not in [
        m["event_id"] for m in _moments(client, two_matches["sam"], unwatched="true")
    ]
    assert [
        e["viewed"] for e in client.get(f"/api/matches/{two_matches['b']}").json()["events"]
    ] == [True]


def test_marking_an_unknown_event_is_a_404(client: TestClient) -> None:
    assert client.post("/api/events/999/viewed").status_code == 404
    assert client.put("/api/events/999/favourite", json={"favourite": True}).status_code == 404
