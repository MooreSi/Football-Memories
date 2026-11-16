"""Spec 270: the owner's goals and keepers for each match.

Who scored and who kept goal come from neither Hudl nor Veo; the browser guesses
from the tags and the owner confirms. Only the owner's entries are kept here, in
`preferences` as `goals:<match id>` = JSON, so they are in every backup and need no
schema change (as spec 210 keeps scores).
"""

from __future__ import annotations

import json
from typing import Any

from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Preference
from app.schemas import GoalsEntry

PREFIX = "goals:"


def entries(db: Session) -> dict[str, dict[str, Any]]:
    rows = db.scalars(select(Preference).where(Preference.key.startswith(PREFIX))).all()
    out: dict[str, dict[str, Any]] = {}
    for row in rows:
        try:
            entry = GoalsEntry.model_validate_json(row.value or "")
        except ValidationError:
            continue  # an unreadable row is skipped, never shown half-read
        out[row.key[len(PREFIX) :]] = entry.model_dump()
    return out


def save(db: Session, match_id: str, entry: GoalsEntry | None) -> None:
    """Replace the match's entry, or with None remove it."""
    key = PREFIX + match_id
    row = db.get(Preference, key)
    if entry is None:
        if row is not None:
            db.delete(row)
    else:
        value = json.dumps(entry.model_dump(), separators=(",", ":"))
        if row is None:
            db.add(Preference(key=key, value=value))
        else:
            row.value = value
    db.commit()
