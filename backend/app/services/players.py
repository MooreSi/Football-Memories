"""Player Hub: primary player, profiles, cross-match moments, favourites, viewed.

Counts here are tag counts. They describe what was tagged, not how well anyone
played (brief section 11), and the UI labels them that way.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, date, datetime

from sqlalchemy import Select, and_, distinct, func, select
from sqlalchemy.orm import Session, aliased, selectinload

from app.models import (
    Event,
    EventMark,
    Match,
    MediaAsset,
    Player,
    Preference,
    Season,
    TagDefinition,
    Team,
    event_players,
)

PRIMARY_PLAYER = "primary_player_id"


class NotFound(LookupError):
    pass


class NameTaken(ValueError):
    pass


# ---------- preferences ----------


def get_primary_player_id(db: Session) -> int | None:
    pref = db.get(Preference, PRIMARY_PLAYER)
    if pref is None or pref.value is None:
        return None
    player_id = int(pref.value)
    return player_id if db.get(Player, player_id) is not None else None


def set_primary_player(db: Session, player_id: int | None) -> int | None:
    if player_id is not None and db.get(Player, player_id) is None:
        raise NotFound(f"player {player_id}")
    pref = db.get(Preference, PRIMARY_PLAYER)
    value = None if player_id is None else str(player_id)
    if pref is None:
        db.add(Preference(key=PRIMARY_PLAYER, value=value))
    else:
        pref.value = value
    db.commit()
    return player_id


# ---------- marks ----------


def _mark(db: Session, event_id: int) -> EventMark:
    if db.get(Event, event_id) is None:
        raise NotFound(f"event {event_id}")
    mark = db.get(EventMark, event_id)
    if mark is None:
        mark = EventMark(event_id=event_id, favourite=False)
        db.add(mark)
    return mark


def set_favourite(db: Session, event_id: int, favourite: bool) -> None:
    mark = _mark(db, event_id)
    mark.favourite = favourite
    mark.updated_at = datetime.now(UTC)
    db.commit()


def mark_viewed(db: Session, event_id: int) -> None:
    mark = _mark(db, event_id)
    if mark.viewed_at is None:
        mark.viewed_at = datetime.now(UTC)
    mark.updated_at = datetime.now(UTC)
    db.commit()


def marks_for(db: Session, event_ids: list[int]) -> dict[int, EventMark]:
    if not event_ids:
        return {}
    rows = db.scalars(select(EventMark).where(EventMark.event_id.in_(event_ids))).all()
    return {m.event_id: m for m in rows}


# ---------- players ----------


@dataclass(frozen=True)
class PlayerListRow:
    player: Player
    moments: int
    matches: int


def list_players(db: Session) -> list[PlayerListRow]:
    rows = db.execute(
        select(Player, func.count(distinct(Event.id)), func.count(distinct(Event.match_id)))
        .outerjoin(event_players, event_players.c.player_id == Player.id)
        .outerjoin(Event, Event.id == event_players.c.event_id)
        .group_by(Player.id)
        .order_by(func.count(distinct(Event.id)).desc(), Player.display_name)
    ).all()
    return [PlayerListRow(p, int(n), int(m)) for p, n, m in rows]


def get_player(db: Session, player_id: int) -> Player:
    player = db.get(Player, player_id)
    if player is None:
        raise NotFound(f"player {player_id}")
    return player


def update_player(
    db: Session,
    player_id: int,
    *,
    display_name: str | None,
    shirt_number: str | None,
    position: str | None,
    fields: set[str],
) -> Player:
    player = get_player(db, player_id)
    if "display_name" in fields and display_name is not None:
        name = display_name.strip()
        clash = db.scalars(
            select(Player).where(Player.display_name == name, Player.id != player_id)
        ).first()
        if clash is not None:
            raise NameTaken(name)
        player.display_name = name
    if "shirt_number" in fields:
        player.shirt_number = (shirt_number or "").strip() or None
    if "position" in fields:
        player.position = (position or "").strip() or None
    db.commit()
    return player


def _player_events(player_id: int) -> Select[tuple[int]]:
    return select(event_players.c.event_id).where(event_players.c.player_id == player_id)


@dataclass(frozen=True)
class TeamSeasonRow:
    team_name: str
    season_label: str
    age_group: str | None
    matches: int


@dataclass(frozen=True)
class MatchCount:
    match_id: int
    match_date: date
    opponent: str
    moments: int


@dataclass(frozen=True)
class Teammate:
    id: int
    display_name: str
    shared_moments: int


@dataclass(frozen=True)
class Profile:
    player: Player
    is_primary: bool
    matches: int
    moments: int
    unwatched: int
    favourites: int
    categories: list[tuple[str, int]]
    teams: list[TeamSeasonRow]
    per_match: list[MatchCount]
    teammates: list[Teammate]
    first_match_date: date | None
    latest_match_date: date | None


def profile(db: Session, player_id: int) -> Profile:
    player = get_player(db, player_id)
    mine = _player_events(player_id).subquery()
    events_q = select(Event).where(Event.id.in_(select(mine.c.event_id)))

    moments = db.scalar(select(func.count()).select_from(events_q.subquery())) or 0
    favourites = (
        db.scalar(
            select(func.count(EventMark.event_id)).where(
                EventMark.event_id.in_(select(mine.c.event_id)), EventMark.favourite.is_(True)
            )
        )
        or 0
    )
    viewed = (
        db.scalar(
            select(func.count(EventMark.event_id)).where(
                EventMark.event_id.in_(select(mine.c.event_id)), EventMark.viewed_at.is_not(None)
            )
        )
        or 0
    )

    categories = [
        (name, int(n))
        for name, n in db.execute(
            select(TagDefinition.name, func.count(Event.id))
            .join(Event, Event.tag_id == TagDefinition.id)
            .where(Event.id.in_(select(mine.c.event_id)))
            .group_by(TagDefinition.name)
            .order_by(func.count(Event.id).desc(), TagDefinition.name)
        ).all()
    ]

    per_match_rows = db.execute(
        select(Match.id, Match.match_date, Match.opponent, func.count(Event.id))
        .join(Event, Event.match_id == Match.id)
        .where(Event.id.in_(select(mine.c.event_id)))
        .group_by(Match.id, Match.match_date, Match.opponent)
        .order_by(Match.match_date, Match.id)
    ).all()
    per_match = [MatchCount(i, d, o, int(n)) for i, d, o, n in per_match_rows]

    team_rows = db.execute(
        select(Team.name, Season.label, Match.age_group, func.count(distinct(Match.id)))
        .join(Team, Team.id == Match.team_id)
        .join(Season, Season.id == Match.season_id)
        .where(Match.id.in_([m.match_id for m in per_match] or [-1]))
        .group_by(Team.name, Season.label, Match.age_group)
        .order_by(Season.label.desc(), Team.name)
    ).all()

    other = aliased(event_players)
    mate_rows = db.execute(
        select(Player.id, Player.display_name, func.count(distinct(other.c.event_id)))
        .join(other, other.c.player_id == Player.id)
        .where(and_(other.c.event_id.in_(select(mine.c.event_id)), Player.id != player_id))
        .group_by(Player.id, Player.display_name)
        .order_by(func.count(distinct(other.c.event_id)).desc(), Player.display_name)
    ).all()

    return Profile(
        player=player,
        is_primary=get_primary_player_id(db) == player_id,
        matches=len(per_match),
        moments=int(moments),
        unwatched=int(moments) - int(viewed),
        favourites=int(favourites),
        categories=categories,
        teams=[TeamSeasonRow(t, s, a, int(n)) for t, s, a, n in team_rows],
        per_match=per_match,
        teammates=[Teammate(i, n, int(c)) for i, n, c in mate_rows],
        first_match_date=per_match[0].match_date if per_match else None,
        latest_match_date=per_match[-1].match_date if per_match else None,
    )


def moments(
    db: Session,
    player_id: int,
    *,
    category: str | None,
    favourites: bool,
    unwatched: bool,
    limit: int,
    offset: int,
) -> tuple[int, list[Event]]:
    get_player(db, player_id)
    q = (
        select(Event)
        .join(Match, Match.id == Event.match_id)
        .join(TagDefinition, TagDefinition.id == Event.tag_id)
        .outerjoin(EventMark, EventMark.event_id == Event.id)
        .where(Event.id.in_(_player_events(player_id)))
    )
    if category:
        q = q.where(TagDefinition.name == category)
    if favourites:
        q = q.where(EventMark.favourite.is_(True))
    if unwatched:
        q = q.where(EventMark.viewed_at.is_(None))
    total = db.scalar(select(func.count()).select_from(q.subquery())) or 0
    rows = db.scalars(
        q.options(
            selectinload(Event.tag),
            selectinload(Event.players),
            selectinload(Event.match).selectinload(Match.team),
            selectinload(Event.match).selectinload(Match.season),
            selectinload(Event.match).selectinload(Match.media),
        )
        .order_by(Match.match_date.desc(), Match.id.desc(), Event.time_s)
        .offset(offset)
        .limit(limit)
    ).all()
    return int(total), list(rows)


def full_match_media(match: Match) -> MediaAsset | None:
    return next((m for m in match.media if m.kind == "full_match"), None)
