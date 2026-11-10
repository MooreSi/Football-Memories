"""Player Hub, preferences and per-moment marks."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy import distinct, func, select
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_settings
from app.config import Settings
from app.models import Event, EventMark, Player, TagDefinition
from app.schemas import (
    FavouriteIn,
    MatchCountOut,
    PlayerListItem,
    PlayerMomentOut,
    PlayerMomentPage,
    PlayerPatch,
    PlayerProfileOut,
    PlayerTotals,
    Preferences,
    PrimaryPlayerIn,
    TagCount,
    TeammateOut,
    TeamSeasonOut,
)
from app.services import photos, players

router = APIRouter(prefix="/api")
Db = Annotated[Session, Depends(get_db)]
Cfg = Annotated[Settings, Depends(get_settings)]


def _404(exc: players.NotFound) -> HTTPException:
    return HTTPException(status.HTTP_404_NOT_FOUND, detail=f"{exc} not found")


@router.get("/preferences", response_model=Preferences)
def get_preferences(db: Db) -> Preferences:
    return Preferences(primary_player_id=players.get_primary_player_id(db))


@router.put("/preferences/primary-player", response_model=Preferences)
def put_primary_player(body: PrimaryPlayerIn, db: Db) -> Preferences:
    try:
        return Preferences(primary_player_id=players.set_primary_player(db, body.player_id))
    except players.NotFound as exc:
        raise _404(exc) from exc


@router.get("/players", response_model=list[PlayerListItem])
def list_players(db: Db) -> list[PlayerListItem]:
    return [
        PlayerListItem(
            id=r.player.id,
            display_name=r.player.display_name,
            shirt_number=r.player.shirt_number,
            position=r.player.position,
            moments=r.moments,
            matches=r.matches,
            photo_url=photos.photo_url(r.player),
        )
        for r in players.list_players(db)
    ]


def _profile_out(db: Session, player_id: int) -> PlayerProfileOut:
    p = players.profile(db, player_id)
    return PlayerProfileOut(
        id=p.player.id,
        display_name=p.player.display_name,
        shirt_number=p.player.shirt_number,
        position=p.player.position,
        club_name=p.player.club_name,
        card_style=p.player.card_style or "classic",
        is_primary=p.is_primary,
        photo_url=photos.photo_url(p.player),
        totals=PlayerTotals(
            matches=p.matches, moments=p.moments, unwatched=p.unwatched, favourites=p.favourites
        ),
        categories=[TagCount(name=n, count=c) for n, c in p.categories],
        teams=[
            TeamSeasonOut(
                team_name=t.team_name,
                season_label=t.season_label,
                age_group=t.age_group,
                matches=t.matches,
            )
            for t in p.teams
        ],
        per_match=[
            MatchCountOut(
                match_id=m.match_id, match_date=m.match_date, opponent=m.opponent, moments=m.moments
            )
            for m in p.per_match
        ],
        teammates=[
            TeammateOut(id=t.id, display_name=t.display_name, shared_moments=t.shared_moments)
            for t in p.teammates
        ],
        first_match_date=p.first_match_date,
        latest_match_date=p.latest_match_date,
    )


class TaggedPlayerIn(BaseModel):
    category: str = Field(min_length=1, max_length=200)


@router.get("/players/tagged-codes")
def tagged_codes(db: Db) -> list[dict[str, object]]:
    rows = db.execute(
        select(TagDefinition.name, func.count(Event.id), func.count(distinct(Event.match_id)))
        .join(Event, Event.tag_id == TagDefinition.id)
        .group_by(TagDefinition.name)
        .order_by(TagDefinition.name)
    ).all()
    return [{"name": name, "moments": count, "matches": matches} for name, count, matches in rows]


@router.post("/players/from-tag")
def choose_tagged_player(body: TaggedPlayerIn, db: Db) -> dict[str, int]:
    events = db.scalars(
        select(Event).join(TagDefinition).where(TagDefinition.name == body.category)
    ).all()
    if not events:
        raise HTTPException(400, "Select a code actually tagged in your videos.")
    player = db.scalars(select(Player).where(Player.display_name == body.category)).first()
    if player is None:
        player = Player(display_name=body.category)
        db.add(player)
        db.flush()
    for event in events:
        if player not in event.players:
            event.players.append(player)
    players.set_primary_player(db, player.id)
    return {"player_id": player.id}


@router.post("/players/from-hudl-tag")
def choose_hudl_tagged_player(body: TaggedPlayerIn, db: Db) -> dict[str, int]:
    """The owner picked this name from cached Hudl video tags (helper-side cache).

    Unlike /from-tag there may be no imported events yet; the player still gets a
    hub for photo and details, and any imported moments with that code are linked.
    """
    name = body.category.strip()
    if not name:
        raise HTTPException(400, "Select a tagged player name.")
    player = db.scalars(select(Player).where(Player.display_name == name)).first()
    if player is None:
        player = Player(display_name=name)
        db.add(player)
        db.flush()
    events = db.scalars(select(Event).join(TagDefinition).where(TagDefinition.name == name)).all()
    for event in events:
        if player not in event.players:
            event.players.append(player)
    players.set_primary_player(db, player.id)
    return {"player_id": player.id}


@router.get("/players/{player_id}", response_model=PlayerProfileOut)
def get_player(player_id: int, db: Db) -> PlayerProfileOut:
    try:
        return _profile_out(db, player_id)
    except players.NotFound as exc:
        raise _404(exc) from exc


@router.patch("/players/{player_id}", response_model=PlayerProfileOut)
def patch_player(player_id: int, body: PlayerPatch, db: Db) -> PlayerProfileOut:
    try:
        players.update_player(
            db,
            player_id,
            display_name=body.display_name,
            shirt_number=body.shirt_number,
            position=body.position,
            club_name=body.club_name,
            card_style=body.card_style,
            fields=set(body.model_fields_set),
        )
        return _profile_out(db, player_id)
    except players.NotFound as exc:
        raise _404(exc) from exc
    except players.NameTaken as exc:
        raise HTTPException(
            status.HTTP_409_CONFLICT, detail=f"another player is already called {exc}"
        ) from exc


def _moment_out(e: Event, marks: dict[int, EventMark]) -> PlayerMomentOut:
    media = players.full_match_media(e.match)
    mark = marks.get(e.id)
    return PlayerMomentOut(
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
        thumbnail_url=f"/api/media/{media.id}/thumbnail"
        if media and media.thumbnail_relpath
        else None,
        match_duration_s=media.duration_s if media else None,
    )


@router.get("/players/{player_id}/moments", response_model=PlayerMomentPage)
def player_moments(
    player_id: int,
    db: Db,
    category: str | None = Query(default=None, max_length=200),
    favourites: bool = False,
    unwatched: bool = False,
    limit: int = Query(default=200, ge=1, le=2000),
    offset: int = Query(default=0, ge=0),
) -> PlayerMomentPage:
    try:
        total, events = players.moments(
            db,
            player_id,
            category=category,
            favourites=favourites,
            unwatched=unwatched,
            limit=limit,
            offset=offset,
        )
    except players.NotFound as exc:
        raise _404(exc) from exc
    marks = players.marks_for(db, [e.id for e in events])
    return PlayerMomentPage(total=total, items=[_moment_out(e, marks) for e in events])


@router.put("/events/{event_id}/favourite")
def put_favourite(event_id: int, body: FavouriteIn, db: Db) -> dict[str, bool]:
    try:
        players.set_favourite(db, event_id, body.favourite)
    except players.NotFound as exc:
        raise _404(exc) from exc
    return {"favourite": body.favourite}


@router.post("/events/{event_id}/viewed")
def post_viewed(event_id: int, db: Db) -> dict[str, bool]:
    try:
        players.mark_viewed(db, event_id)
    except players.NotFound as exc:
        raise _404(exc) from exc
    return {"viewed": True}


@router.put("/players/{player_id}/photo", response_model=PlayerProfileOut)
def put_photo(player_id: int, file: UploadFile, db: Db, settings: Cfg) -> PlayerProfileOut:
    try:
        photos.save_photo(db, settings, player_id, file.file)
        return _profile_out(db, player_id)
    except players.NotFound as exc:
        raise _404(exc) from exc
    except photos.PhotoTooLarge as exc:
        raise HTTPException(status.HTTP_413_CONTENT_TOO_LARGE, detail=str(exc)) from exc
    except photos.InvalidPhoto as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.delete("/players/{player_id}/photo", response_model=PlayerProfileOut)
def delete_photo(player_id: int, db: Db, settings: Cfg) -> PlayerProfileOut:
    try:
        photos.remove_photo(db, settings, player_id)
        return _profile_out(db, player_id)
    except players.NotFound as exc:
        raise _404(exc) from exc


@router.get("/players/{player_id}/photo")
def get_photo(player_id: int, db: Db, settings: Cfg) -> FileResponse:
    player = db.get(Player, player_id)
    path = photos.photo_path(settings, player) if player else None
    if path is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="no photo")
    return FileResponse(
        path,
        media_type="image/jpeg",
        headers={"Cache-Control": "private, max-age=31536000, immutable"},
    )
