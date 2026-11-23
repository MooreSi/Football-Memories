"""Local tournament metadata; never calls a footage source."""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas import TournamentBatchIn, TournamentOut
from app.services import tournaments

router = APIRouter(prefix="/api/tournaments")
Db = Annotated[Session, Depends(get_db)]


@router.get("")
def listing(db: Db) -> list[TournamentOut]:
    return tournaments.listing(db)


@router.put("")
def assign(body: TournamentBatchIn, db: Db) -> list[TournamentOut]:
    tournaments.assign(db, body.name, body.team, body.match_keys)
    return tournaments.listing(db)


@router.delete("/{identity}/matches/{match_key:path}")
def remove(identity: str, match_key: str, db: Db) -> list[TournamentOut]:
    tournaments.remove(db, identity, match_key)
    return tournaments.listing(db)
