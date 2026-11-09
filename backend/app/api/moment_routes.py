"""Clip Explorer: cross-match moment search, facets, moment thumbnails, playlists."""

from __future__ import annotations

from datetime import date
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_settings
from app.config import Settings
from app.models import Event, EventMark
from app.schemas import (
    FacetOut,
    FacetsOut,
    MomentOut,
    MomentPage,
    PlaylistDetail,
    PlaylistIn,
    PlaylistPatch,
    PlaylistSummary,
)
from app.services import moments, players, playlists

router = APIRouter(prefix="/api")
Db = Annotated[Session, Depends(get_db)]
Cfg = Annotated[Settings, Depends(get_settings)]


def moment_out(e: Event, marks: dict[int, EventMark], settings: Settings) -> MomentOut:
    media = players.full_match_media(e.match)
    mark = marks.get(e.id)
    return MomentOut(
        event_id=e.id,
        match_id=e.match_id,
        time_s=e.time_s,
        duration_s=e.duration_s,
        category=e.tag.name,
        players=sorted(p.display_name for p in e.players),
        note=e.note,
        favourite=bool(mark and mark.favourite),
        viewed=bool(mark and mark.viewed_at),
        team_name=e.match.team.name,
        opponent=e.match.opponent,
        match_date=e.match.match_date,
        season_label=e.match.season.label,
        age_group=e.match.age_group,
        media_id=media.id if media else None,
        stream_url=f"/api/media/{media.id}/stream" if media else None,
        thumbnail_url=f"/api/events/{e.id}/thumbnail" if media else None,
        match_duration_s=media.duration_s if media else None,
        offline=moments.media_available(settings, media),
    )


def _outs(db: Session, settings: Settings, events: list[Event]) -> list[MomentOut]:
    marks = players.marks_for(db, [e.id for e in events])
    return [moment_out(e, marks, settings) for e in events]


@router.get("/moments", response_model=MomentPage)
def search_moments(
    db: Db,
    settings: Cfg,
    team_id: Annotated[list[int], Query()] = [],  # noqa: B006 - FastAPI query lists
    season_id: Annotated[list[int], Query()] = [],  # noqa: B006
    match_id: Annotated[list[int], Query()] = [],  # noqa: B006
    player_id: Annotated[list[int], Query()] = [],  # noqa: B006
    category: Annotated[list[str], Query()] = [],  # noqa: B006
    player_mode: Literal["any", "all"] = "any",
    date_from: date | None = None,
    date_to: date | None = None,
    favourites: bool = False,
    unwatched: bool = False,
    q: Annotated[str | None, Query(max_length=200)] = None,
    sort: Literal["newest", "oldest"] = "newest",
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> MomentPage:
    total, events = moments.search(
        db,
        moments.MomentQuery(
            team_ids=team_id,
            season_ids=season_id,
            match_ids=match_id,
            player_ids=player_id,
            player_mode=player_mode,
            categories=category,
            date_from=date_from,
            date_to=date_to,
            favourites=favourites,
            unwatched=unwatched,
            q=q,
            sort=sort,
            limit=limit,
            offset=offset,
        ),
    )
    return MomentPage(total=total, items=_outs(db, settings, events))


@router.get("/moments/facets", response_model=FacetsOut)
def moment_facets(db: Db) -> FacetsOut:
    f = moments.facets(db)

    def conv(items: list[moments.Facet]) -> list[FacetOut]:
        return [FacetOut(id=x.id, name=x.name, count=x.count) for x in items]

    return FacetsOut(
        categories=conv(f.categories),
        players=conv(f.players),
        teams=conv(f.teams),
        seasons=conv(f.seasons),
        matches=conv(f.matches),
    )


@router.get("/events/{event_id}/thumbnail")
def event_thumbnail(event_id: int, db: Db, settings: Cfg) -> FileResponse:
    try:
        path = moments.event_thumbnail(db, settings, event_id)
    except players.NotFound as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="moment not found") from exc
    except moments.MediaMissing as exc:
        raise HTTPException(status.HTTP_410_GONE, detail=str(exc)) from exc
    return FileResponse(
        path, media_type="image/jpeg", headers={"Cache-Control": "private, max-age=86400"}
    )


def _playlist_or_404(exc: players.NotFound) -> HTTPException:
    return HTTPException(status.HTTP_404_NOT_FOUND, detail="playlist not found")


@router.get("/playlists", response_model=list[PlaylistSummary])
def list_playlists(db: Db) -> list[PlaylistSummary]:
    return [
        PlaylistSummary(
            id=p.id, name=p.name, item_count=n, total_seconds=s, updated_at=p.updated_at
        )
        for p, n, s in playlists.summaries(db)
    ]


@router.post("/playlists", response_model=PlaylistDetail, status_code=status.HTTP_201_CREATED)
def create_playlist(body: PlaylistIn, db: Db, settings: Cfg) -> PlaylistDetail:
    try:
        pl = playlists.create(db, body.name, body.event_ids)
    except playlists.InvalidPlaylist as exc:
        db.rollback()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return PlaylistDetail(
        id=pl.id, name=pl.name, items=_outs(db, settings, playlists.items(db, pl.id))
    )


@router.get("/playlists/{playlist_id}", response_model=PlaylistDetail)
def get_playlist(playlist_id: int, db: Db, settings: Cfg) -> PlaylistDetail:
    try:
        pl = playlists.get(db, playlist_id)
        return PlaylistDetail(
            id=pl.id, name=pl.name, items=_outs(db, settings, playlists.items(db, pl.id))
        )
    except players.NotFound as exc:
        raise _playlist_or_404(exc) from exc


@router.put("/playlists/{playlist_id}", response_model=PlaylistDetail)
def update_playlist(playlist_id: int, body: PlaylistPatch, db: Db, settings: Cfg) -> PlaylistDetail:
    try:
        pl = playlists.update(db, playlist_id, body.name, body.event_ids)
    except players.NotFound as exc:
        raise _playlist_or_404(exc) from exc
    except playlists.InvalidPlaylist as exc:
        db.rollback()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return PlaylistDetail(
        id=pl.id, name=pl.name, items=_outs(db, settings, playlists.items(db, pl.id))
    )


@router.delete("/playlists/{playlist_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_playlist(playlist_id: int, db: Db) -> Response:
    try:
        playlists.delete(db, playlist_id)
    except players.NotFound as exc:
        raise _playlist_or_404(exc) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)
