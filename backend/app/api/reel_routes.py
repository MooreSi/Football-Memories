"""Highlight reels (spec 080)."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_settings
from app.api.moment_routes import moment_out
from app.config import Settings
from app.models import Reel
from app.schemas import ReelDetail, ReelIn, ReelItemOut, ReelPatch, ReelSummary
from app.services import players, reels

router = APIRouter(prefix="/api")
Db = Annotated[Session, Depends(get_db)]
Cfg = Annotated[Settings, Depends(get_settings)]


def _summary(
    db: Session, settings: Settings, reel: Reel
) -> tuple[ReelSummary, list[reels.ClipPlan]]:
    clips = reels.plan(db, settings, reel)
    has_video = bool(
        reel.output_relpath and (settings.archive_root / reel.output_relpath).is_file()
    )
    first = clips[0].event.id if clips else None
    return ReelSummary(
        id=reel.id,
        name=reel.name,
        status=reel.status,
        progress=reel.progress,
        error=reel.error,
        item_count=len(clips),
        planned_seconds=round(sum(c.end_s - c.start_s for c in clips), 3),
        output_relpath=reel.output_relpath,
        output_bytes=reel.output_bytes,
        output_duration_s=reel.output_duration_s,
        output_width=reel.output_width,
        output_height=reel.output_height,
        video_url=f"/api/reels/{reel.id}/video" if has_video else None,
        thumbnail_url=f"/api/events/{first}/thumbnail" if first else None,
        updated_at=reel.updated_at,
        rendered_at=reel.rendered_at,
    ), clips


def _detail(db: Session, settings: Settings, reel_id: int) -> ReelDetail:
    reel = reels.get(db, reel_id)
    summary, clips = _summary(db, settings, reel)
    marks = players.marks_for(db, [c.event.id for c in clips])
    return ReelDetail(
        **summary.model_dump(),
        has_opening_card=reels.card_path(settings, reel.id, "opening").is_file(),
        has_closing_card=reels.card_path(settings, reel.id, "closing").is_file(),
        items=[
            ReelItemOut(
                id=c.item.id,
                position=c.item.position,
                pre_s=c.item.pre_s,
                post_s=c.item.post_s,
                start_s=round(c.start_s, 3),
                end_s=round(c.end_s, 3),
                moment=moment_out(c.event, marks, settings),
            )
            for c in clips
        ],
    )


def _items(body_items: list) -> list[tuple[int, float | None, float | None]]:  # type: ignore[type-arg]
    return [(i.event_id, i.pre_s, i.post_s) for i in body_items]


def _errors(exc: Exception) -> HTTPException:
    if isinstance(exc, players.NotFound):
        return HTTPException(status.HTTP_404_NOT_FOUND, detail="reel not found")
    if isinstance(exc, reels.ReelBusy):
        return HTTPException(status.HTTP_409_CONFLICT, detail=str(exc))
    return HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc))


HANDLED = (players.NotFound, reels.ReelBusy, reels.ReelInvalid)


@router.get("/reels", response_model=list[ReelSummary])
def list_reels(db: Db, settings: Cfg) -> list[ReelSummary]:
    from sqlalchemy import select

    ids = db.scalars(select(Reel.id).order_by(Reel.updated_at.desc(), Reel.id.desc())).all()
    return [_summary(db, settings, reels.get(db, i))[0] for i in ids]


@router.post("/reels", response_model=ReelDetail, status_code=status.HTTP_201_CREATED)
def create_reel(body: ReelIn, db: Db, settings: Cfg) -> ReelDetail:
    try:
        reel = reels.create(db, body.name, _items(body.items))
    except HANDLED as exc:
        db.rollback()
        raise _errors(exc) from exc
    return _detail(db, settings, reel.id)


@router.get("/reels/{reel_id}", response_model=ReelDetail)
def get_reel(reel_id: int, db: Db, settings: Cfg) -> ReelDetail:
    try:
        return _detail(db, settings, reel_id)
    except HANDLED as exc:
        raise _errors(exc) from exc


@router.put("/reels/{reel_id}", response_model=ReelDetail)
def update_reel(reel_id: int, body: ReelPatch, db: Db, settings: Cfg) -> ReelDetail:
    try:
        reels.update(db, reel_id, body.name, _items(body.items) if body.items is not None else None)
    except HANDLED as exc:
        db.rollback()
        raise _errors(exc) from exc
    return _detail(db, settings, reel_id)


@router.post(
    "/reels/{reel_id}/render", response_model=ReelDetail, status_code=status.HTTP_202_ACCEPTED
)
def render_reel(reel_id: int, db: Db, settings: Cfg) -> ReelDetail:
    try:
        reels.queue_render(db, reel_id)
    except HANDLED as exc:
        raise _errors(exc) from exc
    return _detail(db, settings, reel_id)


@router.put("/reels/{reel_id}/cards/{kind}", response_model=ReelDetail)
def put_card(reel_id: int, kind: str, file: UploadFile, db: Db, settings: Cfg) -> ReelDetail:
    try:
        reels.save_card(db, settings, reel_id, kind, file.file)
    except HANDLED as exc:
        raise _errors(exc) from exc
    return _detail(db, settings, reel_id)


@router.delete("/reels/{reel_id}/cards/{kind}", response_model=ReelDetail)
def delete_card(reel_id: int, kind: str, db: Db, settings: Cfg) -> ReelDetail:
    try:
        reels.remove_card(db, settings, reel_id, kind)
    except HANDLED as exc:
        raise _errors(exc) from exc
    return _detail(db, settings, reel_id)


@router.get("/reels/{reel_id}/video")
def reel_video(reel_id: int, db: Db, settings: Cfg, download: bool = False) -> FileResponse:
    reel = db.get(Reel, reel_id)
    path = settings.archive_root / reel.output_relpath if reel and reel.output_relpath else None
    if path is None or not path.is_file():
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="this reel has not been rendered")
    if download:
        return FileResponse(path, media_type="video/mp4", filename=path.name)
    return FileResponse(path, media_type="video/mp4")


@router.delete("/reels/{reel_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_reel(reel_id: int, db: Db, settings: Cfg) -> Response:
    try:
        reels.delete(db, settings, reel_id)
    except HANDLED as exc:
        raise _errors(exc) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)
