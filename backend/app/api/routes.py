"""REST API for the first vertical slice. OpenAPI at /api/docs."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_settings
from app.config import Settings
from app.connectors.registry import production_connectors
from app.models import Match, MediaAsset
from app.schemas import (
    ConnectorOut,
    EventOut,
    ImportIn,
    InboxFile,
    MatchDetail,
    MatchPage,
    MatchSummary,
    MediaOut,
    NamedItem,
    RecentMomentOut,
    StatsOut,
    TagCount,
)
from app.services import library, players
from app.services.importer import (
    VIDEO_EXTENSIONS,
    DuplicateMedia,
    ImportRequest,
    InvalidImport,
    import_match,
    sidecar_for,
)

router = APIRouter(prefix="/api")
Db = Annotated[Session, Depends(get_db)]
Cfg = Annotated[Settings, Depends(get_settings)]


def _summary(m: Match, media: MediaAsset | None, events: int, settings: Settings) -> MatchSummary:
    return MatchSummary(
        id=m.id,
        team_id=m.team_id,
        team_name=m.team.name,
        season_id=m.season_id,
        season_label=m.season.label,
        age_group=m.age_group,
        opponent=m.opponent,
        match_date=m.match_date,
        competition=m.competition,
        event_count=events,
        media_id=media.id if media else None,
        duration_s=media.duration_s if media else None,
        thumbnail_url=f"/api/media/{media.id}/thumbnail"
        if media and media.thumbnail_relpath
        else None,
        offline=bool(media and library.media_path(settings.archive_root, media).is_file()),
    )


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/connectors", response_model=list[ConnectorOut])
def connectors() -> list[ConnectorOut]:
    out = []
    for c in production_connectors():
        i = c.info()
        out.append(
            ConnectorOut(
                id=i.id,
                name=i.name,
                available=i.available,
                reason=i.reason,
                docs=i.docs,
                limitations=i.limitations,
                capabilities=i.capabilities.as_dict(),
            )
        )
    return out


@router.get("/imports/inbox", response_model=list[InboxFile])
def inbox(settings: Cfg) -> list[InboxFile]:
    root = settings.import_root
    if not root.is_dir():
        return []
    files = [
        p
        for p in sorted(root.iterdir())
        if p.is_file() and not p.is_symlink() and p.suffix.lower() in VIDEO_EXTENSIONS
    ]
    return [
        InboxFile(filename=p.name, size_bytes=p.stat().st_size, has_tags=sidecar_for(p).is_file())
        for p in files
    ]


@router.post("/imports", response_model=MatchSummary, status_code=status.HTTP_201_CREATED)
def create_import(body: ImportIn, db: Db, settings: Cfg) -> MatchSummary:
    try:
        match = import_match(db, settings, ImportRequest(**body.model_dump()))
    except InvalidImport as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except DuplicateMedia as exc:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail={"message": str(exc), "existing_match_id": exc.existing_match_id},
        ) from exc
    loaded = library.get_match(db, match.id)
    assert loaded is not None
    return _summary(loaded, library.primary_media(loaded), len(loaded.events), settings)


@router.get("/matches", response_model=MatchPage)
def matches(
    db: Db,
    settings: Cfg,
    q: str | None = Query(default=None, max_length=200),
    team_id: int | None = None,
    season_id: int | None = None,
    age_group: str | None = Query(default=None, max_length=40),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=24, ge=1, le=100),
) -> MatchPage:
    total, rows = library.list_matches(
        db,
        q=q,
        team_id=team_id,
        season_id=season_id,
        age_group=age_group,
        page=page,
        page_size=page_size,
    )
    return MatchPage(
        total=total,
        page=page,
        page_size=page_size,
        items=[_summary(r.match, r.media, r.event_count, settings) for r in rows],
    )


@router.get("/matches/{match_id}", response_model=MatchDetail)
def match_detail(match_id: int, db: Db, settings: Cfg) -> MatchDetail:
    m = library.get_match(db, match_id)
    if m is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="match not found")
    media = library.primary_media(m)
    summary = _summary(m, media, len(m.events), settings)
    marks = players.marks_for(db, [e.id for e in m.events])
    media_out = None
    if media is not None:
        media_out = MediaOut(
            id=media.id,
            stream_url=f"/api/media/{media.id}/stream",
            thumbnail_url=summary.thumbnail_url,
            available=library.media_path(settings.archive_root, media).is_file(),
            duration_s=media.duration_s,
            width=media.width,
            height=media.height,
            fps=media.fps,
            video_codec=media.video_codec,
            audio_codec=media.audio_codec,
            size_bytes=media.size_bytes,
            original_filename=media.original_filename,
        )
    return MatchDetail(
        **summary.model_dump(),
        media=media_out,
        events=[
            EventOut(
                id=e.id,
                time_s=e.time_s,
                duration_s=e.duration_s,
                category=e.tag.name,
                players=sorted(p.display_name for p in e.players),
                note=e.note,
                favourite=bool(marks.get(e.id) and marks[e.id].favourite),
                viewed=bool(marks.get(e.id) and marks[e.id].viewed_at),
            )
            for e in m.events
        ],
    )


def _media_or_404(db: Session, media_id: int) -> MediaAsset:
    media = db.get(MediaAsset, media_id)
    if media is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="media not found")
    return media


@router.get("/media/{media_id}/stream")
def stream(media_id: int, db: Db, settings: Cfg) -> FileResponse:
    media = _media_or_404(db, media_id)
    path = library.media_path(settings.archive_root, media)
    if not path.is_file():
        raise HTTPException(status.HTTP_410_GONE, detail="the local file is missing")
    return FileResponse(
        path, media_type="video/mp4" if path.suffix.lower() in {".mp4", ".m4v"} else None
    )


@router.get("/media/{media_id}/download")
def download_media(media_id: int, db: Db, settings: Cfg) -> FileResponse:
    media = _media_or_404(db, media_id)
    path = library.media_path(settings.archive_root, media)
    if not path.is_file():
        raise HTTPException(status.HTTP_410_GONE, detail="the local file is missing")
    return FileResponse(path, media_type="video/mp4", filename=media.original_filename)


@router.get("/media/{media_id}/thumbnail")
def thumbnail(media_id: int, db: Db, settings: Cfg) -> FileResponse:
    media = _media_or_404(db, media_id)
    if media.thumbnail_relpath is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="no thumbnail")
    path = settings.archive_root / media.thumbnail_relpath
    if not path.is_file():
        raise HTTPException(status.HTTP_410_GONE, detail="thumbnail file is missing")
    return FileResponse(path, media_type="image/jpeg")


@router.get("/teams", response_model=list[NamedItem])
def teams(db: Db) -> list[NamedItem]:
    return [NamedItem(id=t.id, name=t.name) for t in library.list_teams(db)]


@router.get("/seasons", response_model=list[NamedItem])
def seasons(db: Db) -> list[NamedItem]:
    return [NamedItem(id=s.id, name=s.label) for s in library.list_seasons(db)]


@router.get("/stats", response_model=StatsOut)
def stats(db: Db) -> StatsOut:
    st = library.stats(db)
    return StatsOut(
        matches=st.matches,
        moments=st.moments,
        footage_seconds=st.footage_seconds,
        teams=st.teams,
        players=st.players,
        top_tags=[TagCount(name=n, count=c) for n, c in st.top_tags],
        recent_moments=[
            RecentMomentOut(
                event_id=r.event.id,
                match_id=r.match.id,
                time_s=r.event.time_s,
                category=r.event.tag.name,
                players=sorted(p.display_name for p in r.event.players),
                team_name=r.match.team.name,
                opponent=r.match.opponent,
                match_date=r.match.match_date,
            )
            for r in st.recent
        ],
    )
