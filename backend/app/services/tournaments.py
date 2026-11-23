"""Library-owned tournament membership; included in normal preference backups."""

from __future__ import annotations

import hashlib
import json

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Preference
from app.schemas import TournamentOut

PREFIX = "tournament:"


def listing(db: Session) -> list[TournamentOut]:
    rows = db.scalars(select(Preference).where(Preference.key.startswith(PREFIX))).all()
    return sorted(
        [TournamentOut.model_validate_json(row.value or "{}") for row in rows],
        key=lambda tournament: tournament.name.casefold(),
    )


def assign(db: Session, name: str, team: str, match_keys: list[str]) -> None:
    identity = hashlib.sha256(name.casefold().encode()).hexdigest()[:32]
    key = PREFIX + identity
    row = db.get(Preference, key, with_for_update=True)
    tournament = (
        TournamentOut.model_validate_json(row.value or "{}")
        if row
        else TournamentOut(id=identity, name=name, entries={})
    )
    # Keep the spelling of an existing entry so Blue / blue do not split stats.
    team = next((v for v in tournament.entries.values() if v.casefold() == team.casefold()), team)
    tournament.entries.update(dict.fromkeys(match_keys, team))
    value = tournament.model_dump_json()
    if row:
        row.value = value
    else:
        db.add(Preference(key=key, value=value))
    db.commit()


def remove(db: Session, identity: str, match_key: str) -> None:
    row = db.get(Preference, PREFIX + identity, with_for_update=True)
    if row:
        data = json.loads(row.value or "{}")
        data["entries"].pop(match_key, None)
        row.value = json.dumps(data)
        db.commit()
