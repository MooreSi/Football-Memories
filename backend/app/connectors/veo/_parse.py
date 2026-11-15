"""Veo JSON -> the helper's library items. Pure; no networking, no remote media URLs."""

from __future__ import annotations

import re
from typing import Any
from urllib.parse import parse_qs, urlsplit

from app.connectors.hudl_metadata import age_group, capture_key, season_label

ACTIVE = {"does-not-expire", "does-not-expire-soon", "expires-soon"}


def _date_prefix(start: object) -> str:
    found = re.match(r"^(\d{2})(\d{2})-(\d{2})-(\d{2})", str(start or ""))
    return f"{found[2]}{found[3]}{found[4]}" if found else ""


def _title(recording: dict[str, Any]) -> str:
    title = " ".join(str(recording.get("title") or "Untitled Veo recording").split())[:300]
    if re.match(r"^\d{6}(\s|$)", title):
        return title
    prefix = _date_prefix(recording.get("start") or recording.get("created"))
    return f"{prefix} {title}" if prefix else title


def _number(value: object) -> float | None:
    return float(value) if isinstance(value, int | float) and not isinstance(value, bool) else None


def moment(highlight: dict[str, Any]) -> dict[str, Any] | None:
    start, length = _number(highlight.get("start")), _number(highlight.get("duration"))
    if start is None or not isinstance(highlight.get("id"), str):
        return None
    tags = [t.get("name") for t in highlight.get("tags") or [] if isinstance(t, dict)]
    name = next((t for t in tags if isinstance(t, str) and t.strip()), None)
    item: dict[str, Any] = {
        "id": highlight["id"],
        "category": " ".join((name or "Veo clip").upper().split()),
        "time_s": start,
        "duration_s": length or 0.0,
        "ai": bool(highlight.get("is_ai_generated")),
    }
    comment = highlight.get("comment")
    if isinstance(comment, str) and comment.strip():
        item["note"] = comment.strip()[:500]
    return item


def best_video(videos: list[dict[str, Any]] | None) -> dict[str, Any] | None:
    """The match video the app plays: Veo's standard render when listed, else the first
    available one. (Which render types Veo lists is not yet confirmed: domain README.)"""
    available = [v for v in videos or [] if v.get("availability") == "available"]
    standard = [v for v in available if v.get("render_type") == "standard"]
    chosen = standard or available
    return chosen[0] if chosen else None


def library_item(
    recording: dict[str, Any],
    detail: dict[str, Any] | None = None,
    highlights: list[dict[str, Any]] | None = None,
    periods: list[dict[str, Any]] | None = None,
    videos: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """One Veo match in the shape the app's Hudl library uses, plus Veo fields."""
    identity = f"veo-{recording['identifier']}"
    title = _title({**recording, **(detail or {})})
    status = str(recording.get("expiration_status") or "")
    video = best_video(videos)
    available = bool(recording.get("is_accessible")) and status in ACTIVE and video is not None
    stats = ((detail or {}).get("info") or {}).get("stats") or {}
    score = stats.get("score_aggregated") if isinstance(stats, dict) else None
    group = age_group(f"{recording.get('team') or ''} {title}")
    moments = [m for m in (moment(h) for h in highlights or []) if m] if available else []
    return {
        "id": identity,
        "source": "veo",
        "slug": recording.get("slug"),
        "title": title,
        "url": f"https://app.veo.co{recording.get('url') or ''}",
        "team": recording.get("team") or None,
        "age_group": group,
        "age_groups": [] if group == "Unclassified" else [group],
        "season_label": season_label(title),
        "capture_key": capture_key(identity),
        "duration_s": _number((detail or {}).get("duration"))
        or _number(recording.get("duration"))
        or 0.0,
        "expiration_status": status or None,
        "available": available,
        "video_height": video.get("height") if video else None,
        "home_or_away": (detail or {}).get("own_team_home_or_away") or None,
        "score": (
            {"ours": score["own"], "theirs": score["opponent"]}
            if isinstance(score, dict)
            and isinstance(score.get("own"), int)
            and isinstance(score.get("opponent"), int)
            else None
        ),
        "halves": [p["timeframe"] for p in periods or [] if isinstance(p.get("timeframe"), list)],
        "tag_status": "synced" if available else "unsynced",
        "moments": sorted(moments, key=lambda m: m["time_s"]),
    }


STATS = ("goals", "total_attempts", "corners", "fouls", "free_kicks")


def _side(team: object, own_side: object) -> str | None:
    # Veo's events service writes "Own" and "Opponent" (owner report 2026-11-15).
    team = team.lower() if isinstance(team, str) else team
    if team in ("own", "opponent"):
        return str(team)
    if team in ("home", "away") and own_side in ("home", "away"):
        return "own" if team == own_side else "opponent"
    return None


def _event_name(kind: str) -> str:
    words = re.findall(r"[A-Z][a-z]*|[a-z]+|\d+", kind.removeprefix("Football"))
    return " ".join(words).upper()[:40] or "EVENT"


def team_data(report: Any, events: Any) -> dict[str, Any]:
    """Decision 009: Veo's match report key stats and its events service, as own v
    opponent. Counts, types, sides and times only; no names, ids or addresses."""
    report = report if isinstance(report, dict) else {}
    own_side = (report.get("teams") or {}).get("own_side")
    key_stats = (report.get("overview") or {}).get("key_stats") or {}
    stats: dict[str, Any] = {}
    for name in STATS:
        full = (key_stats.get(name) or {}).get("full_time") if isinstance(key_stats, dict) else None
        if isinstance(full, dict) and all(
            isinstance(full.get(k), int) for k in ("own", "opponent")
        ):
            stats[name] = {"own": full["own"], "opponent": full["opponent"]}
    found = (events or {}).get("events") if isinstance(events, dict) else None
    items: list[dict[str, Any]] = []
    for event in found or []:
        if not isinstance(event, dict) or not isinstance(event.get("eventType"), str):
            continue
        millis = _number(event.get("videoTimeMs"))
        if millis is None:
            continue
        period = event.get("periodId")
        items.append(
            {
                "type": _event_name(event["eventType"]),
                "side": _side(event.get("team"), own_side),
                "time_s": millis / 1000,
                "period": period if isinstance(period, int) else None,
            }
        )
    return {"stats": stats, "events": sorted(items, key=lambda e: e["time_s"])}


def _snake(kind: str) -> str:
    words = re.findall(r"[A-Z][a-z]*|[a-z]+|\d+", kind.removeprefix("Football"))
    return "_".join(words).lower()[:40]


def _totals(rows: Any) -> dict[str, int]:
    found: dict[str, int] = {}
    for row in rows if isinstance(rows, list) else []:
        if not isinstance(row, dict) or not isinstance(row.get("eventType"), str):
            continue
        total = row.get("total")
        if isinstance(total, int) and not isinstance(total, bool) and _snake(row["eventType"]):
            found[_snake(row["eventType"])] = total
    return found


def team_totals(own: Any, opponent: Any) -> dict[str, dict[str, int]]:
    """Owner request 2026-11-15: each side's totals from Veo's events service, by
    snake_case name; a count neither side had is left out."""
    ours, theirs = _totals(own), _totals(opponent)
    return {
        name: {"own": ours.get(name, 0), "opponent": theirs.get(name, 0)}
        for name in dict.fromkeys([*ours, *theirs])
        if ours.get(name, 0) or theirs.get(name, 0)
    }


# Owner request 2026-11-15: Veo's team events as moments, like Hudl tags. Ball out of
# play and kick-offs are left out (not moments anyone picks).
TEAM_MOMENTS = {
    "GOAL": "GOAL",
    "SHOT": "SHOT",
    "CORNER KICK": "CORNER",
    "FOUL": "FOUL",
    "FREE KICK": "FREE KICK",
    "PENALTY KICK": "PENALTY",
    "THROW IN": "THROW-IN",
    "GOAL KICK": "GOAL KICK",
}
TEAM_LEAD_S = 10.0
TEAM_LENGTH_S = 15.0


def team_moments(data: Any) -> list[dict[str, Any]]:
    """The team events kept at Refresh as moments: from 10 s before the event, 15 s
    long, named by side ("OUR CORNER", "OPPONENT GOAL"), with an id stable across
    refreshes."""
    events = data.get("events") if isinstance(data, dict) else None
    found: list[dict[str, Any]] = []
    for event in events if isinstance(events, list) else []:
        if not isinstance(event, dict):
            continue
        kind, side, at = event.get("type"), event.get("side"), _number(event.get("time_s"))
        if kind not in TEAM_MOMENTS or side not in ("own", "opponent") or at is None:
            continue
        slug = str(kind).lower().replace(" ", "-")
        found.append(
            {
                "id": f"t-{side}-{slug}-{round(at * 1000)}",
                "category": f"{'OUR' if side == 'own' else 'OPPONENT'} {TEAM_MOMENTS[kind]}",
                "side": side,
                "time_s": max(0.0, at - TEAM_LEAD_S),
                "duration_s": TEAM_LENGTH_S,
                "team": True,
            }
        )
    return sorted(found, key=lambda m: m["time_s"])


def next_page(link: str | None) -> int | None:
    """The page number of Veo's rel="next" link, or None on the last page."""
    for part in (link or "").split(","):
        found = re.match(r'\s*<([^>]+)>\s*;\s*rel="next"', part)
        if found:
            page = parse_qs(urlsplit(found[1]).query).get("page", [""])[0]
            return int(page) if page.isdigit() else None
    return None
