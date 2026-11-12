"""Spec 210: the owner's score corrections for Hudl matches.

The score itself comes from the match's goal tags in the browser; this only
keeps the owner's corrections. They live in `preferences` as
`score:<hudl match id>` = `ours-theirs`, so they are in every backup and need
no schema change (a schema change would stop older backups restoring).
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Preference

PREFIX = "score:"


def corrections(db: Session) -> dict[str, dict[str, int]]:
    rows = db.scalars(select(Preference).where(Preference.key.startswith(PREFIX))).all()
    out: dict[str, dict[str, int]] = {}
    for row in rows:
        ours, sep, theirs = (row.value or "").partition("-")
        if sep and ours.isdigit() and theirs.isdigit():
            out[row.key[len(PREFIX) :]] = {"ours": int(ours), "theirs": int(theirs)}
    return out


def correct(db: Session, match_id: str, ours: int | None, theirs: int | None) -> None:
    """Set the corrected score, or with both None go back to the tagged score."""
    key = PREFIX + match_id
    row = db.get(Preference, key)
    if ours is None or theirs is None:
        if row is not None:
            db.delete(row)
    elif row is None:
        db.add(Preference(key=key, value=f"{ours}-{theirs}"))
    else:
        row.value = f"{ours}-{theirs}"
    db.commit()
