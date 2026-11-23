"""Automatic groups are local, persistent, explainable and owner-correctable."""

from datetime import date

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Match, Season, Team

PLAYERS = ["Pat Example", "Alex Demo", "Chris Sample", "Robin Test"]
CATALOG = {
    "matches": [
        {
            "key": "hudl:a",
            "title": "261122 U11 v Rovers (Game 1)",
            "club": "Riverside",
            "age_group": "U11",
            "players": PLAYERS,
        },
        {
            "key": "hudl:b",
            "title": "261122 U11 v Rovers (Game 2)",
            "club": "Riverside",
            "age_group": "U11",
            "players": PLAYERS,
        },
    ]
}


def test_detection_persists_and_identical_catalog_is_idempotent(client: TestClient) -> None:
    response = client.post("/api/tournaments/detect", json=CATALOG)
    assert response.status_code == 200
    groups = response.json()
    assert len(groups) == 1
    assert groups[0]["entries"] == {
        "hudl:a": "Riverside · Squad 1",
        "hudl:b": "Riverside · Squad 1",
    }
    assert groups[0]["automatic"]["hudl:a"]["confidence"] == "review"
    assert client.get("/api/tournaments").json() == groups
    assert client.post("/api/tournaments/detect", json=CATALOG).json() == groups
    # An incomplete snapshot must not erase already saved assignments.
    assert (
        client.post("/api/tournaments/detect", json={"matches": CATALOG["matches"][:1]}).json()
        == groups
    )


def test_correcting_automatic_squad_is_locked_and_seeds_comparable_rosters(
    client: TestClient,
) -> None:
    group = client.post("/api/tournaments/detect", json=CATALOG).json()[0]
    client.put(
        "/api/tournaments",
        json={"name": group["name"], "team": "Riverside Blue", "match_keys": ["hudl:a"]},
    )
    groups = client.post("/api/tournaments/detect", json=CATALOG).json()
    assert len(groups) == 1
    assert groups[0]["entries"] == {"hudl:a": "Riverside Blue", "hudl:b": "Riverside Blue"}
    assert "hudl:a" not in groups[0]["automatic"]
    assert "hudl:b" in groups[0]["automatic"]


def test_moving_to_correct_tournament_removes_old_automatic_membership(client: TestClient) -> None:
    client.post("/api/tournaments/detect", json=CATALOG)
    client.put(
        "/api/tournaments", json={"name": "Correct Cup", "team": "Blue", "match_keys": ["hudl:a"]}
    )
    groups = client.post("/api/tournaments/detect", json=CATALOG).json()
    manual = next(g for g in groups if g["name"] == "Correct Cup")
    automatic = next(g for g in groups if g["name"] != "Correct Cup")
    assert manual["entries"] == {"hudl:a": "Blue"}
    assert "hudl:a" not in automatic["entries"]
    assert "hudl:b" in automatic["entries"]


def test_removal_is_remembered_across_future_detection(client: TestClient) -> None:
    group = client.post("/api/tournaments/detect", json=CATALOG).json()[0]
    client.delete(f"/api/tournaments/{group['id']}/matches/hudl:a")
    groups = client.post("/api/tournaments/detect", json=CATALOG).json()
    assert groups[0]["entries"] == {"hudl:b": "Riverside · Squad 1"}
    assert "hudl:a" not in groups[0]["automatic"]


def test_existing_manual_groups_are_never_replaced(client: TestClient) -> None:
    manual = client.put(
        "/api/tournaments",
        json={"name": "Owner Cup", "team": "White", "match_keys": ["hudl:a", "hudl:b"]},
    ).json()
    assert client.post("/api/tournaments/detect", json=CATALOG).json() == manual


def test_rename_keeps_automatic_identity_and_is_not_undone(client: TestClient) -> None:
    group = client.post("/api/tournaments/detect", json=CATALOG).json()[0]
    renamed = client.patch(f"/api/tournaments/{group['id']}", json={"name": "Real Tournament Name"})
    assert renamed.status_code == 200
    again = client.post("/api/tournaments/detect", json=CATALOG).json()[0]
    assert again["id"] == group["id"]
    assert again["name"] == "Real Tournament Name"
    assert again["entries"] == group["entries"]


def test_detection_includes_imported_metadata_without_frontend_pagination(
    client: TestClient, db: Session
) -> None:
    team = Team(name="Riverside U11")
    season = Season(label="2026/27")
    db.add_all([team, season])
    db.flush()
    match = Match(
        team_id=team.id,
        season_id=season.id,
        age_group="U11",
        opponent="Town",
        match_date=date(2026, 11, 22),
        competition="Winter Cup",
        source="local",
    )
    db.add(match)
    db.commit()
    groups = client.post("/api/tournaments/detect", json={"matches": []}).json()
    assert len(groups) == 1
    assert groups[0]["entries"] == {f"local:{match.id}": "Team unassigned"}
    assert groups[0]["name"].startswith("Winter Cup")


def test_invalid_payload_and_conflicting_rename_change_nothing(client: TestClient) -> None:
    groups = client.post("/api/tournaments/detect", json=CATALOG).json()
    assert (
        client.post(
            "/api/tournaments/detect", json={"matches": [{"key": "local:7", "title": "x"}]}
        ).status_code
        == 422
    )
    assert (
        client.patch(f"/api/tournaments/{groups[0]['id']}", json={"name": " "}).status_code == 422
    )
    assert client.get("/api/tournaments").json() == groups


def test_a_rename_cannot_merge_or_overwrite_another_tournament(client: TestClient) -> None:
    group = client.post("/api/tournaments/detect", json=CATALOG).json()[0]
    client.put(
        "/api/tournaments",
        json={"name": "Existing Cup", "team": "White", "match_keys": ["veo:other"]},
    )
    before = client.get("/api/tournaments").json()
    assert (
        client.patch(f"/api/tournaments/{group['id']}", json={"name": "existing cup"}).status_code
        == 409
    )
    assert client.patch("/api/tournaments/missing", json={"name": "New Cup"}).status_code == 404
    assert client.get("/api/tournaments").json() == before


def test_detection_records_no_raw_roster_in_preferences(client: TestClient, db: Session) -> None:
    from sqlalchemy import select

    from app.models import Preference

    client.post("/api/tournaments/detect", json=CATALOG)
    values = " ".join(value or "" for value in db.scalars(select(Preference.value)))
    assert "Riverside" in values
    assert "Pat Example" not in values
    assert "Alex Demo" not in values
    assert '"players"' not in values


def test_refined_home_club_moves_auto_entries_without_leaving_empty_duplicate_groups(
    client: TestClient,
) -> None:
    unknown = {"matches": [{**match, "club": ""} for match in CATALOG["matches"]]}
    first = client.post("/api/tournaments/detect", json=unknown).json()[0]
    client.patch(f"/api/tournaments/{first['id']}", json={"name": "Owner Tournament Name"})
    refined = client.post("/api/tournaments/detect", json=CATALOG).json()
    assert len(refined) == 1
    assert refined[0]["name"] == "Owner Tournament Name"
    assert set(refined[0]["entries"]) == {"hudl:a", "hudl:b"}


def test_late_unknown_club_snapshot_cannot_split_a_corrected_tournament(client: TestClient) -> None:
    first = client.post("/api/tournaments/detect", json=CATALOG).json()[0]
    client.put(
        "/api/tournaments",
        json={"name": first["name"], "team": "Riverside Blue", "match_keys": ["hudl:a"]},
    )
    known = client.post("/api/tournaments/detect", json=CATALOG).json()
    unknown = {"matches": [{**match, "club": ""} for match in CATALOG["matches"]]}
    late = client.post("/api/tournaments/detect", json=unknown).json()
    assert late == known
