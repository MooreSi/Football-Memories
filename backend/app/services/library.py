"""Read-side queries for the match library."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.models import Event, Match, MediaAsset, Season, Team


@dataclass(frozen=True)
class MatchRow:
    match: Match
    media: MediaAsset | None
    event_count: int


def list_matches(
    db: Session,
    *,
    q: str | None,
    team_id: int | None,
    season_id: int | None,
    page: int,
    page_size: int,
) -> tuple[int, list[MatchRow]]:
    filters = []
    if q:
        like = f"%{q.lower()}%"
        filters.append(
            or_(
                func.lower(Match.opponent).like(like),
                func.lower(Team.name).like(like),
                func.lower(func.coalesce(Match.competition, "")).like(like),
            )
        )
    if team_id is not None:
        filters.append(Match.team_id == team_id)
    if season_id is not None:
        filters.append(Match.season_id == season_id)

    base = select(Match).join(Team, Team.id == Match.team_id).where(*filters)
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    matches = db.scalars(
        base.options(
            selectinload(Match.team), selectinload(Match.season), selectinload(Match.media)
        )
        .order_by(Match.match_date.desc(), Match.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    counts: dict[int, int] = {}
    if matches:
        for match_id, n in db.execute(
            select(Event.match_id, func.count(Event.id))
            .where(Event.match_id.in_([m.id for m in matches]))
            .group_by(Event.match_id)
        ):
            counts[match_id] = n
    return total, [MatchRow(m, _primary_media(m), counts.get(m.id, 0)) for m in matches]


def get_match(db: Session, match_id: int) -> Match | None:
    return db.scalars(
        select(Match)
        .where(Match.id == match_id)
        .options(
            selectinload(Match.team),
            selectinload(Match.season),
            selectinload(Match.media),
            selectinload(Match.events).selectinload(Event.tag),
            selectinload(Match.events).selectinload(Event.players),
        )
    ).first()


def _primary_media(match: Match) -> MediaAsset | None:
    return next((m for m in match.media if m.kind == "full_match"), None)


primary_media = _primary_media


def media_path(archive_root: Path, media: MediaAsset) -> Path:
    return archive_root / media.relative_path


def list_teams(db: Session) -> list[Team]:
    return list(db.scalars(select(Team).order_by(Team.name)).all())


def list_seasons(db: Session) -> list[Season]:
    return list(db.scalars(select(Season).order_by(Season.label.desc())).all())
