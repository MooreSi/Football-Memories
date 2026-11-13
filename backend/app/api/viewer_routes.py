"""Spec 230: clip notes, continue watching and the alerts snapshot."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas import AlertsSeenIn, MomentNoteIn, WatchingIn
from app.services import viewer

router = APIRouter(prefix="/api")
Db = Annotated[Session, Depends(get_db)]


@router.get("/notes")
def get_notes(db: Db, match_id: str | None = None) -> list[dict[str, Any]]:
    return viewer.notes(db, match_id)


@router.put("/notes")
def put_note(body: MomentNoteIn, db: Db) -> list[dict[str, Any]]:
    viewer.save_note(db, body.model_dump())
    return viewer.notes(db, body.match_id)


@router.get("/watching")
def get_watching(db: Db) -> list[dict[str, Any]]:
    return [{k: v for k, v in w.items() if k != "updated_ns"} for w in viewer.watching(db)]


@router.put("/watching")
def put_watching(body: WatchingIn, db: Db) -> dict[str, bool]:
    viewer.save_watching(db, body.match_id, body.position_s, body.duration_s)
    return {"ok": True}


@router.get("/alerts/seen")
def get_alerts_seen(db: Db) -> dict[str, Any] | None:
    return viewer.alerts_seen(db)


@router.put("/alerts/seen")
def put_alerts_seen(body: AlertsSeenIn, db: Db) -> dict[str, Any] | None:
    viewer.save_alerts_seen(db, body.model_dump())
    return viewer.alerts_seen(db)
