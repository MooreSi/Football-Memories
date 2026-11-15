"""Synthetic Veo API payloads, shaped like the owner's account on 2026-11-13 (field
names and types only; every value is made up). No real club, team or player."""

from typing import Any

ACTIVE_ID = "11111111-2222-3333-4444-555555555555"
EXPIRED_ID = "99999999-8888-7777-6666-555555555555"


def recording(identifier: str = ACTIVE_ID, **over: Any) -> dict[str, Any]:
    return {
        "identifier": identifier,
        "slug": f"20261108-riverside-u11-{identifier[:8]}",
        "title": "Riverside U11 vs Northgate",
        "created": "2026-11-08T12:10:00.000000Z",
        "start": "2026-11-08T11:02:57Z",
        "privacy": "public",
        "permissions": "member",
        "team": "Riverside U11",
        "thumbnail": "https://c.veocdn.com/synthetic/thumbnail.jpg",
        "url": f"/matches/20261108-riverside-u11-{identifier[:8]}/",
        "duration": 3120.4,
        "is_accessible": True,
        "expiration_status": "does-not-expire",
        **over,
    }


def detail(**over: Any) -> dict[str, Any]:
    return {
        "identifier": ACTIVE_ID,
        "title": "Riverside U11 vs Northgate",
        "start": "2026-11-08T11:02:57Z",
        "duration": 3120.4,
        "own_team_home_or_away": "home",
        "opponent_club_name": "Northgate",
        "info": {"age_group": None, "stats": {"score_aggregated": {"own": 3, "opponent": 1}}},
        **over,
    }


def highlights() -> list[dict[str, Any]]:
    return [
        {
            "id": "h-1",
            "start": 64.0,
            "duration": 25.0,
            "type": "shot_on_goal",
            "is_ai_generated": True,
            "tags": [
                {"name": "Shot on goal", "slug": "shot-on-goal", "origin": 9, "custom": False}
            ],
            "involved_players": [],
            "videos": [{"url": "https://c.veocdn.com/synthetic/clip.mp4"}],
        },
        {
            "id": "h-2",
            "start": 1420.0,
            "duration": 25.0,
            "type": "goal",
            "is_ai_generated": True,
            "tags": [{"name": "Goal", "slug": "goal", "origin": 1, "custom": False}],
            "involved_players": [],
            "videos": [],
        },
        {
            "id": "h-3",
            "start": 900.5,
            "duration": 12.0,
            "type": "custom",
            "is_ai_generated": False,
            "tags": [],
            "comment": "Great press",
            "involved_players": [],
            "videos": [],
        },
    ]


def periods() -> list[dict[str, Any]]:
    return [
        {"public_identifier": "p-1", "timeframe": [51, 1476], "own_side": "left", "duration": 1425},
        {
            "public_identifier": "p-2",
            "timeframe": [1600, 3050],
            "own_side": "right",
            "duration": 1450,
        },
    ]


def videos() -> list[dict[str, Any]]:
    return [
        {
            "availability": "available",
            "mime_type": "video/mp4",
            "width": 1920,
            "height": 1080,
            "render_type": "standard",
            "url": "https://c.veocdn.com/synthetic/match.mp4",
        }
    ]


# Owner-approved check 2026-11-14 (decision 009): the match report and the events
# service, field names and types as seen; every value is made up.
CREST = "https://assets.app.veo.co/synthetic/riverside-crest.png"


def team_stats(missed: int, out_of_play: int) -> list[dict[str, Any]]:
    """Veo's per-side totals (owner-approved check 2026-11-15: 17 types, these keys)."""

    def row(kind: str, total: int) -> dict[str, Any]:
        return {"eventType": kind, "total": total, "byPeriod": {"1": total} if total else {}}

    return [
        row("FootballGoal", 3),
        row("MissedShots", missed),
        row("FootballOutOfPlay", out_of_play),
        row("ShotsInsideBox", 0),
    ]


def match_report(own_side: str = "home") -> dict[str, Any]:
    def pair(own: int, opponent: int) -> dict[str, Any]:
        return {"full_time": {"own": own, "opponent": opponent}, "periods": []}

    return {
        "match": {"match_id": "m", "slug": "s", "title": "t", "kick_off": "k", "videos": []},
        "club": {"club_id": "c", "slug": "riverside", "name": "Riverside FC"},
        "teams": {
            "own_side": own_side,
            "home": {"name": "Riverside", "crest_url": CREST},
            "away": {"name": "Northgate", "crest_url": None},
        },
        "events": [],
        "overview": {
            "key_stats": {
                "goals": pair(3, 1),
                "total_attempts": pair(9, 4),
                "corners": pair(2, 5),
                "fouls": pair(1, 3),
                "free_kicks": pair(4, 2),
            }
        },
    }


def match_events(own: str = "home", opponent: str = "away") -> dict[str, Any]:
    def event(kind: str, team: str, seconds: int, period: int = 1) -> dict[str, Any]:
        return {
            "id": f"e-{kind}-{seconds}",
            "matchId": "m",
            "team": team,
            "eventType": kind,
            "videoTimeMs": seconds * 1000,
            "periodId": period,
            "periodTimeMs": seconds * 1000,
            "outcome": None,
            "x": None,
            "z": None,
            "attributes": [],
        }

    return {
        "events": [
            event("FootballKickOff", own, 51),
            event("FootballShot", own, 120),
            event("FootballGoal", own, 125),
            event("FootballCornerKick", opponent, 400),
            event("FootballShot", opponent, 410),
            event("FootballGoal", opponent, 1700, 2),
        ]
    }
