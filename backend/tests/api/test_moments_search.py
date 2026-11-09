"""Clip Explorer search across all matches (spec 050)."""

import shutil
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.config import Settings


@pytest.fixture
def archive(
    client: TestClient, settings: Settings, tiny_video: Path, other_tiny_video: Path
) -> dict:  # type: ignore[type-arg]
    """Two teams, two seasons.
    A: Riverside U12, 2026/27, 2026-10-18 vs Rovers: Save(Sam) 1s, Save(Sam,Alex) 2s, Goal(Alex) 3s
    B: Hilltop U11, 2027/28, 2027-09-05 vs City: GK Claim(Sam) 1s, Pass(Jo) 2s note "lovely pass"
    """
    shutil.copyfile(tiny_video, settings.import_root / "a.mp4")
    (settings.import_root / "a.tags.csv").write_text(
        "time,category,players\n0:01,Save,Sam\n0:02,Save,Sam; Alex\n0:03,Goal,Alex\n"
    )
    shutil.copyfile(other_tiny_video, settings.import_root / "b.mp4")
    (settings.import_root / "b.tags.csv").write_text(
        "time,category,players,note\n0:01,GK Claim,Sam,\n0:02,Pass,Jo,lovely pass\n"
    )
    a = client.post(
        "/api/imports",
        json={
            "filename": "a.mp4",
            "team_name": "Riverside U12",
            "season_label": "2026/27",
            "opponent": "Rovers",
            "match_date": "2026-10-18",
        },
    ).json()
    b = client.post(
        "/api/imports",
        json={
            "filename": "b.mp4",
            "team_name": "Hilltop U11",
            "season_label": "2027/28",
            "opponent": "City",
            "match_date": "2027-09-05",
        },
    ).json()
    players = {p["display_name"]: p["id"] for p in client.get("/api/players").json()}
    return {"a": a, "b": b, "players": players}


def _search(client: TestClient, **params: object) -> list[tuple[str, str, float]]:
    r = client.get("/api/moments", params=params)  # type: ignore[arg-type]
    assert r.status_code == 200, r.text
    return [(m["opponent"], m["category"], m["time_s"]) for m in r.json()["items"]]


def test_no_filters_returns_everything_newest_match_first(
    client: TestClient, archive: dict
) -> None:  # type: ignore[type-arg]
    assert _search(client) == [
        ("City", "GK Claim", 1.0),
        ("City", "Pass", 2.0),
        ("Rovers", "Save", 1.0),
        ("Rovers", "Save", 2.0),
        ("Rovers", "Goal", 3.0),
    ]


def test_oldest_first(client: TestClient, archive: dict) -> None:  # type: ignore[type-arg]
    assert _search(client, sort="oldest")[0] == ("Rovers", "Save", 1.0)


def test_filter_by_several_event_types(client: TestClient, archive: dict) -> None:  # type: ignore[type-arg]
    assert _search(client, category=["Save", "GK Claim"]) == [
        ("City", "GK Claim", 1.0),
        ("Rovers", "Save", 1.0),
        ("Rovers", "Save", 2.0),
    ]


def test_filter_matching_nothing_is_empty(client: TestClient, archive: dict) -> None:  # type: ignore[type-arg]
    assert _search(client, category="Penalty") == []


def test_players_any_versus_all(client: TestClient, archive: dict) -> None:  # type: ignore[type-arg]
    ids = [archive["players"]["Sam"], archive["players"]["Alex"]]
    assert len(_search(client, player_id=ids)) == 4
    assert _search(client, player_id=ids, player_mode="all") == [("Rovers", "Save", 2.0)]


def test_filter_by_team_season_and_match(client: TestClient, archive: dict) -> None:  # type: ignore[type-arg]
    team_b = archive["b"]["team_id"]
    assert [x[0] for x in _search(client, team_id=team_b)] == ["City", "City"]
    assert [x[0] for x in _search(client, season_id=archive["a"]["season_id"])] == ["Rovers"] * 3
    assert len(_search(client, match_id=[archive["a"]["id"], archive["b"]["id"]])) == 5


def test_date_range_is_inclusive(client: TestClient, archive: dict) -> None:  # type: ignore[type-arg]
    assert {x[0] for x in _search(client, date_from="2027-09-05")} == {"City"}
    assert {x[0] for x in _search(client, date_to="2026-10-18")} == {"Rovers"}
    assert _search(client, date_from="2026-10-19", date_to="2027-09-04") == []


def test_note_text_search(client: TestClient, archive: dict) -> None:  # type: ignore[type-arg]
    assert _search(client, q="LOVELY") == [("City", "Pass", 2.0)]


def test_favourites_and_unwatched(client: TestClient, archive: dict) -> None:  # type: ignore[type-arg]
    first = client.get("/api/moments").json()["items"][0]["event_id"]
    client.put(f"/api/events/{first}/favourite", json={"favourite": True})
    client.post(f"/api/events/{first}/viewed")
    assert [m["event_id"] for m in client.get("/api/moments?favourites=true").json()["items"]] == [
        first
    ]
    assert first not in [
        m["event_id"] for m in client.get("/api/moments?unwatched=true").json()["items"]
    ]


def test_pagination_reports_the_total(client: TestClient, archive: dict) -> None:  # type: ignore[type-arg]
    page = client.get("/api/moments?limit=2&offset=2").json()
    assert page["total"] == 5
    assert [m["category"] for m in page["items"]] == ["Save", "Save"]


def test_items_carry_what_a_clip_card_needs(client: TestClient, archive: dict) -> None:  # type: ignore[type-arg]
    m = client.get("/api/moments?category=Goal").json()["items"][0]
    assert m["thumbnail_url"] == f"/api/events/{m['event_id']}/thumbnail"
    assert m["stream_url"].startswith("/api/media/")
    assert (m["team_name"], m["season_label"], m["players"], m["offline"]) == (
        "Riverside U12",
        "2026/27",
        ["Alex"],
        True,
    )


def test_facets_list_filter_options_with_counts(client: TestClient, archive: dict) -> None:  # type: ignore[type-arg]
    f = client.get("/api/moments/facets").json()
    assert f["categories"][0] == {"id": None, "name": "Save", "count": 2}
    assert {p["name"]: p["count"] for p in f["players"]} == {"Sam": 3, "Alex": 2, "Jo": 1}
    assert {t["name"] for t in f["teams"]} == {"Riverside U12", "Hilltop U11"}
    assert [s["name"] for s in f["seasons"]] == ["2027/28", "2026/27"]
    assert len(f["matches"]) == 2


def test_moment_thumbnail_is_a_frame_made_once_and_cached(
    client: TestClient,
    archive: dict,
    settings: Settings,
    monkeypatch: pytest.MonkeyPatch,  # type: ignore[type-arg]
) -> None:
    m = client.get("/api/moments?category=Goal").json()["items"][0]
    r = client.get(m["thumbnail_url"])
    assert (r.status_code, r.headers["content-type"]) == (200, "image/jpeg")
    assert r.content[:3] == b"\xff\xd8\xff"
    import app.services.moments as moments_service

    def boom(*a: object, **k: object) -> None:
        raise AssertionError("ffmpeg must not run again for a cached thumbnail")

    monkeypatch.setattr(moments_service, "make_thumbnail", boom)
    assert client.get(m["thumbnail_url"]).content == r.content


def test_moment_thumbnail_when_the_match_file_is_missing_is_a_410(
    client: TestClient,
    archive: dict,
    settings: Settings,  # type: ignore[type-arg]
) -> None:
    for f in (settings.library_root / "Matches").rglob("*.mp4"):
        f.unlink()
    m = client.get("/api/moments").json()["items"][0]
    assert client.get(m["thumbnail_url"]).status_code == 410
    assert m["offline"] is True or m["offline"] is False  # listing still works
    assert client.get("/api/moments").json()["items"][0]["offline"] is False


def test_thumbnail_for_unknown_event_is_404(client: TestClient) -> None:
    assert client.get("/api/events/999/thumbnail").status_code == 404
