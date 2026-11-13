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
    video = next((v for v in videos or [] if v.get("availability") == "available"), None)
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


def next_page(link: str | None) -> int | None:
    """The page number of Veo's rel="next" link, or None on the last page."""
    for part in (link or "").split(","):
        found = re.match(r'\s*<([^>]+)>\s*;\s*rel="next"', part)
        if found:
            page = parse_qs(urlsplit(found[1]).query).get("page", [""])[0]
            return int(page) if page.isdigit() else None
    return None
