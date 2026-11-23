"""Local tournament metadata; never calls a footage source."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas import TournamentBatchIn, TournamentDetectionIn, TournamentOut, TournamentRenameIn
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


@router.post("/detect")
def automatic(body: TournamentDetectionIn, db: Db) -> list[TournamentOut]:
    return tournaments.automatic(db, body.matches)


@router.patch("/{identity}")
def rename(identity: str, body: TournamentRenameIn, db: Db) -> list[TournamentOut]:
    try:
        tournaments.rename(db, identity, body.name)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return tournaments.listing(db)
