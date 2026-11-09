"""Clip Explorer: search tagged moments across every match (spec 050)."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from pathlib import Path
from typing import Literal

from sqlalchemy import Select, distinct, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.config import Settings
from app.models import (
    Event,
    EventMark,
    Match,
    MediaAsset,
    Player,
    Season,
    TagDefinition,
    Team,
    event_players,
)
from app.services.media import MediaError, make_thumbnail
from app.services.players import NotFound, full_match_media


class MediaMissing(FileNotFoundError):
    pass


@dataclass
class MomentQuery:
    team_ids: list[int] = field(default_factory=list)
    season_ids: list[int] = field(default_factory=list)
    match_ids: list[int] = field(default_factory=list)
    player_ids: list[int] = field(default_factory=list)
    player_mode: Literal["any", "all"] = "any"
    categories: list[str] = field(default_factory=list)
    date_from: date | None = None
    date_to: date | None = None
    favourites: bool = False
    unwatched: bool = False
    q: str | None = None
    sort: Literal["newest", "oldest"] = "newest"
    limit: int = 100
    offset: int = 0


def _filtered(mq: MomentQuery) -> Select[Event]:
    q = (
        select(Event)
        .join(Match, Match.id == Event.match_id)
        .join(TagDefinition, TagDefinition.id == Event.tag_id)
        .outerjoin(EventMark, EventMark.event_id == Event.id)
    )
    if mq.team_ids:
        q = q.where(Match.team_id.in_(mq.team_ids))
    if mq.season_ids:
        q = q.where(Match.season_id.in_(mq.season_ids))
    if mq.match_ids:
        q = q.where(Match.id.in_(mq.match_ids))
    if mq.categories:
        q = q.where(TagDefinition.name.in_(mq.categories))
    if mq.date_from:
        q = q.where(Match.match_date >= mq.date_from)
    if mq.date_to:
        q = q.where(Match.match_date <= mq.date_to)
    if mq.favourites:
        q = q.where(EventMark.favourite.is_(True))
    if mq.unwatched:
        q = q.where(EventMark.viewed_at.is_(None))
    if mq.q:
        like = f"%{mq.q.lower()}%"
        q = q.where(or_(func.lower(Event.note).like(like), func.lower(Match.opponent).like(like)))
    if mq.player_ids:
        tagged = (
            select(event_players.c.event_id)
            .where(event_players.c.player_id.in_(mq.player_ids))
            .group_by(event_players.c.event_id)
        )
        if mq.player_mode == "all":
            tagged = tagged.having(
                func.count(distinct(event_players.c.player_id)) == len(set(mq.player_ids))
            )
        q = q.where(Event.id.in_(tagged))
    return q


def search(db: Session, mq: MomentQuery) -> tuple[int, list[Event]]:
    q = _filtered(mq)
    total = db.scalar(select(func.count()).select_from(q.subquery())) or 0
    order = (
        (Match.match_date.desc(), Match.id.desc(), Event.time_s)
        if mq.sort == "newest"
        else (Match.match_date, Match.id, Event.time_s)
    )
    rows = db.scalars(
        q.options(*moment_load_options()).order_by(*order).offset(mq.offset).limit(mq.limit)
    ).all()
    return int(total), list(rows)


def moment_load_options() -> list:  # type: ignore[type-arg]
    return [
        selectinload(Event.tag),
        selectinload(Event.players),
        selectinload(Event.match).selectinload(Match.team),
        selectinload(Event.match).selectinload(Match.season),
        selectinload(Event.match).selectinload(Match.media),
    ]


@dataclass(frozen=True)
class Facet:
    id: int | None
    name: str
    count: int


@dataclass(frozen=True)
class Facets:
    categories: list[Facet]
    players: list[Facet]
    teams: list[Facet]
    seasons: list[Facet]
    matches: list[Facet]


def facets(db: Session) -> Facets:
    cats = db.execute(
        select(TagDefinition.name, func.count(Event.id))
        .join(Event, Event.tag_id == TagDefinition.id)
        .group_by(TagDefinition.name)
        .order_by(func.count(Event.id).desc(), TagDefinition.name)
    ).all()
    players = db.execute(
        select(Player.id, Player.display_name, func.count(event_players.c.event_id))
        .join(event_players, event_players.c.player_id == Player.id)
        .group_by(Player.id, Player.display_name)
        .order_by(func.count(event_players.c.event_id).desc(), Player.display_name)
    ).all()
    teams = db.execute(
        select(Team.id, Team.name, func.count(Event.id))
        .join(Match, Match.team_id == Team.id)
        .outerjoin(Event, Event.match_id == Match.id)
        .group_by(Team.id, Team.name)
        .order_by(Team.name)
    ).all()
    seasons = db.execute(
        select(Season.id, Season.label, func.count(Event.id))
        .join(Match, Match.season_id == Season.id)
        .outerjoin(Event, Event.match_id == Match.id)
        .group_by(Season.id, Season.label)
        .order_by(Season.label.desc())
    ).all()
    matches = db.execute(
        select(Match.id, Match.match_date, Match.opponent, func.count(Event.id))
        .outerjoin(Event, Event.match_id == Match.id)
        .group_by(Match.id, Match.match_date, Match.opponent)
        .order_by(Match.match_date.desc(), Match.id.desc())
    ).all()
    return Facets(
        categories=[Facet(None, n, int(c)) for n, c in cats],
        players=[Facet(i, n, int(c)) for i, n, c in players],
        teams=[Facet(i, n, int(c)) for i, n, c in teams],
        seasons=[Facet(i, n, int(c)) for i, n, c in seasons],
        matches=[Facet(i, f"{d.isoformat()} vs {o}", int(c)) for i, d, o, c in matches],
    )


def media_available(settings: Settings, media: MediaAsset | None) -> bool:
    return bool(media and (settings.archive_root / media.relative_path).is_file())


def event_thumbnail(db: Session, settings: Settings, event_id: int) -> Path:
    """A frame at the moment itself, extracted once and cached."""
    event = db.get(Event, event_id)
    if event is None:
        raise NotFound(f"event {event_id}")
    media = full_match_media(event.match)
    if media is None:
        raise MediaMissing("no video for this match")
    cached = (
        settings.library_root / "Thumbnails" / "moments" / f"{media.sha256[:16]}-{event.id}.jpg"
    )
    if cached.is_file():
        return cached
    source = settings.archive_root / media.relative_path
    if not source.is_file():
        raise MediaMissing("the match video file is missing")
    at = min(max(event.time_s, 0.0), max(media.duration_s - 0.1, 0.0))
    try:
        make_thumbnail(source, cached, at_s=at, width=480)
    except MediaError as exc:
        raise MediaMissing(str(exc)) from exc
    return cached
