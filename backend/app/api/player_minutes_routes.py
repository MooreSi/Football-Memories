"""Confirmed playing time; involvement clips are never used as playing minutes."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field, StringConstraints
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.services import player_minutes

router = APIRouter(prefix="/api")
Db = Annotated[Session, Depends(get_db)]


class MinutesIn(BaseModel):
    match_id: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=300)]
    player: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
    minutes: Annotated[float, Field(strict=True, ge=0, le=600)] | None


@router.get("/player-minutes")
def get_minutes(
    db: Db, match_id: Annotated[str, Query(min_length=1, max_length=300)]
) -> dict[str, float]:
    return player_minutes.entries(db, match_id)


@router.put("/player-minutes")
def put_minutes(body: MinutesIn, db: Db) -> dict[str, float]:
    return player_minutes.save(db, body.match_id, body.player, body.minutes)
