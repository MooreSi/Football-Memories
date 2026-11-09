"""Saved playlists: ordered lists of moments. Never delete moments or files."""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models import Event, Playlist, PlaylistItem
from app.services.moments import moment_load_options
from app.services.players import NotFound

PRE_S = 8.0
POST_S = 5.0


class InvalidPlaylist(ValueError):
    pass


def _validate(db: Session, name: str | None, event_ids: list[int] | None) -> None:
    if name is not None and not name.strip():
        raise InvalidPlaylist("a playlist needs a name")
    if event_ids is None:
        return
    if len(set(event_ids)) != len(event_ids):
        raise InvalidPlaylist("a moment can only appear once in a playlist")
    found = set(db.scalars(select(Event.id).where(Event.id.in_(event_ids))).all())
    missing = [i for i in event_ids if i not in found]
    if missing:
        raise InvalidPlaylist(f"unknown moments: {missing}")


def _set_items(playlist: Playlist, event_ids: list[int]) -> None:
    playlist.items.clear()
    for pos, event_id in enumerate(event_ids):
        playlist.items.append(PlaylistItem(event_id=event_id, position=pos))


def create(db: Session, name: str, event_ids: list[int]) -> Playlist:
    _validate(db, name, event_ids)
    playlist = Playlist(name=name.strip())
    db.add(playlist)
    db.flush()
    _set_items(playlist, event_ids)
    db.commit()
    return playlist


def update(
    db: Session, playlist_id: int, name: str | None, event_ids: list[int] | None
) -> Playlist:
    playlist = get(db, playlist_id)
    _validate(db, name, event_ids)
    if name is not None:
        playlist.name = name.strip()
    if event_ids is not None:
        _set_items(playlist, [])
        db.flush()  # free the (playlist, event) unique keys before re-adding
        _set_items(playlist, event_ids)
    playlist.updated_at = datetime.now(UTC)
    db.commit()
    return playlist


def delete(db: Session, playlist_id: int) -> None:
    db.delete(get(db, playlist_id))
    db.commit()


def get(db: Session, playlist_id: int) -> Playlist:
    playlist = db.get(Playlist, playlist_id)
    if playlist is None:
        raise NotFound(f"playlist {playlist_id}")
    return playlist


def items(db: Session, playlist_id: int) -> list[Event]:
    get(db, playlist_id)
    rows = db.scalars(
        select(PlaylistItem)
        .where(PlaylistItem.playlist_id == playlist_id)
        .options(*[selectinload(PlaylistItem.event).options(o) for o in moment_load_options()])
        .order_by(PlaylistItem.position)
    ).all()
    return [r.event for r in rows]


def summaries(db: Session) -> list[tuple[Playlist, int, float]]:
    rows = db.execute(
        select(
            Playlist,
            func.count(PlaylistItem.id),
            func.coalesce(func.sum(Event.duration_s + PRE_S + POST_S), 0.0),
        )
        .outerjoin(PlaylistItem, PlaylistItem.playlist_id == Playlist.id)
        .outerjoin(Event, Event.id == PlaylistItem.event_id)
        .group_by(Playlist.id)
        .order_by(Playlist.updated_at.desc(), Playlist.id.desc())
    ).all()
    return [(p, int(n), float(s)) for p, n, s in rows]
