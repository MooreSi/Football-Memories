"""Spec 250: Veo recordings, details and highlights become the helper's library items."""

import json

import pytest

from app.connectors.veo._parse import (
    library_item,
    next_page,
    team_data,
    team_moments,
    team_totals,
)
from tests.connectors.veo_fixtures.synthetic import (
    ACTIVE_ID,
    EXPIRED_ID,
    detail,
    highlights,
    match_events,
    match_report,
    periods,
    recording,
    videos,
)


def test_an_active_match_becomes_a_library_item_with_its_highlights_as_moments() -> None:
    item = library_item(recording(), detail(), highlights(), periods(), videos())
    assert item["id"] == f"veo-{ACTIVE_ID}"
    assert item["source"] == "veo"
    assert item["title"] == "261108 Riverside U11 vs Northgate"
    assert item["season_label"] == "2026/27"
    assert item["age_group"] == "U11"
    assert item["duration_s"] == 3120.4
    assert item["available"] is True and item["video_height"] == 1080
    assert item["score"] == {"ours": 3, "theirs": 1}
    assert item["halves"] == [[51, 1476], [1600, 3050]]
    assert item["moments"] == [
        {"id": "h-1", "category": "SHOT ON GOAL", "time_s": 64.0, "duration_s": 25.0, "ai": True},
        {
            "id": "h-3",
            "category": "VEO CLIP",
            "time_s": 900.5,
            "duration_s": 12.0,
            "ai": False,
            "note": "Great press",
        },
        {"id": "h-2", "category": "GOAL", "time_s": 1420.0, "duration_s": 25.0, "ai": True},
    ]


def test_no_remote_media_address_is_kept() -> None:
    item = library_item(recording(), detail(), highlights(), periods(), videos())
    assert "veocdn" not in repr(item)  # thumbnails are fetched through the helper later
    assert "veocdn" in repr(highlights()) + repr(videos()) + repr(recording())  # negative control


def test_an_expired_match_keeps_its_details_but_has_no_video_or_moments() -> None:
    item = library_item(recording(EXPIRED_ID, expiration_status="expired"))
    assert item["available"] is False and item["moments"] == []
    assert item["expiration_status"] == "expired"
    assert item["title"] == "261108 Riverside U11 vs Northgate"


def test_a_title_that_already_starts_with_a_date_is_not_given_a_second_one() -> None:
    assert (
        library_item(recording(title="261108 Riverside v Northgate"))["title"]
        == "261108 Riverside v Northgate"
    )


def test_the_next_page_comes_from_the_link_header_only() -> None:
    link = '<https://app.veo.co/api/app/clubs/riverside/recordings/?filter=own&page=3>; rel="next"'
    assert next_page(link) == 3
    assert next_page('<https://app.veo.co/x/?page=2>; rel="prev"') is None
    assert next_page(None) is None


# Decision 009: Veo's team-sided events and key stats, kept as own v opponent.
@pytest.mark.parametrize(
    ("own", "opponent", "side"),
    [("home", "away", "home"), ("away", "home", "away"), ("own", "opponent", "home")],
)
def test_team_data_splits_events_and_stats_by_side(own: str, opponent: str, side: str) -> None:
    data = team_data(match_report(side), match_events(own, opponent))
    assert data["stats"] == {
        "goals": {"own": 3, "opponent": 1},
        "total_attempts": {"own": 9, "opponent": 4},
        "corners": {"own": 2, "opponent": 5},
        "fouls": {"own": 1, "opponent": 3},
        "free_kicks": {"own": 4, "opponent": 2},
    }
    assert data["events"][:3] == [
        {"type": "KICK OFF", "side": "own", "time_s": 51.0, "period": 1},
        {"type": "SHOT", "side": "own", "time_s": 120.0, "period": 1},
        {"type": "GOAL", "side": "own", "time_s": 125.0, "period": 1},
    ]
    assert [e["side"] for e in data["events"][3:]] == ["opponent"] * 3
    assert "veocdn" not in json.dumps(data)  # no remote address is kept


def test_team_data_copes_with_missing_parts() -> None:
    assert team_data(None, None) == {"stats": {}, "events": []}
    odd = {
        "events": [
            {"eventType": "FootballShot", "team": "?", "videoTimeMs": 5000},
            {"team": "home"},
        ]
    }
    assert team_data({"teams": {"own_side": "home"}}, odd)["events"] == [
        {"type": "SHOT", "side": None, "time_s": 5.0, "period": None}
    ]


# Owner request 2026-11-15: Veo labels the sides "Own" and "Opponent" (its web app's
# own spelling); the first real refresh kept no side for any event.
def test_team_data_reads_veos_own_and_opponent_labels() -> None:
    data = team_data(match_report(), match_events("Own", "Opponent"))
    assert [e["side"] for e in data["events"]] == ["own"] * 3 + ["opponent"] * 3


# Owner request 2026-11-15: each side's totals from Veo's events service, named, with
# the counts neither side had left out.
def test_team_totals_names_each_count_and_drops_ones_neither_side_had() -> None:
    own = [
        {"eventType": "MissedShots", "total": 8, "byPeriod": {"1": 8}},
        {"eventType": "FootballOutOfPlay", "total": 13, "byPeriod": {"1": 13}},
        {"eventType": "ShotsInsideBox", "total": 0, "byPeriod": {}},
        {"eventType": "FootballPenaltyKick", "total": 0, "byPeriod": {}},
    ]
    opponent = [
        {"eventType": "MissedShots", "total": 5, "byPeriod": {"1": 5}},
        {"eventType": "FootballPenaltyKick", "total": 1, "byPeriod": {"1": 1}},
        {"eventType": "ShotsInsideBox", "total": 0, "byPeriod": {}},
    ]
    assert team_totals(own, opponent) == {
        "missed_shots": {"own": 8, "opponent": 5},
        "out_of_play": {"own": 13, "opponent": 0},
        "penalty_kick": {"own": 0, "opponent": 1},
    }
    odd = [{"eventType": "MissedShots", "total": True}, {"total": 3}, "x"]
    assert team_totals(None, {"oops": 1}) == {}
    assert team_totals(odd, []) == {}


# Owner request 2026-11-15: Veo's team events as moments that can be played, ticked,
# downloaded or made into a reel, like Hudl's tags. Each starts 10 s before the event
# and lasts 15 s; the type names which side it was. Ball out of play and kick-offs
# are left out.
def test_team_moments_name_the_side_and_lead_into_the_event() -> None:
    data = {
        "events": [
            {"type": "CORNER KICK", "side": "own", "time_s": 400.5, "period": 1},
            {"type": "GOAL", "side": "opponent", "time_s": 5.0, "period": 1},
            {"type": "THROW IN", "side": "opponent", "time_s": 600.0, "period": 2},
            {"type": "OUT OF PLAY", "side": "own", "time_s": 610.0, "period": 2},
            {"type": "KICK OFF", "side": "own", "time_s": 51.0, "period": 1},
            {"type": "FOUL", "side": None, "time_s": 700.0, "period": 2},
        ]
    }
    assert team_moments(data) == [
        {
            "id": "t-opponent-goal-5000",
            "category": "OPPONENT GOAL",
            "side": "opponent",
            "time_s": 0.0,
            "duration_s": 15.0,
            "team": True,
        },
        {
            "id": "t-own-corner-kick-400500",
            "category": "OUR CORNER",
            "side": "own",
            "time_s": 390.5,
            "duration_s": 15.0,
            "team": True,
        },
        {
            "id": "t-opponent-throw-in-600000",
            "category": "OPPONENT THROW-IN",
            "side": "opponent",
            "time_s": 590.0,
            "duration_s": 15.0,
            "team": True,
        },
    ]
    assert team_moments(None) == [] and team_moments({"events": "x"}) == []
