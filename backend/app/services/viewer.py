"""Spec 230: the owner's own state about Hudl footage, kept in `preferences`.

- `note:<hash>`  a note and drawing on one tagged moment
- `watch:<hash>` how far into a match the owner has watched
- `alerts_seen`  the library as it was when the owner last read the alerts

Preferences are in every backup and need no schema change. Hudl ids are hashed
into the key (moment ids are longer than a key allows); the raw id is kept in the
value.
"""

from __future__ import annotations

import hashlib
import json
import time
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Preference

NOTE, WATCH, ALERTS = "note:", "watch:", "alerts_seen"
KEEP_WATCHING = 50


def _key(prefix: str, identity: str) -> str:
    return prefix + hashlib.sha256(identity.encode()).hexdigest()[:40]


def _rows(db: Session, prefix: str) -> list[dict[str, Any]]:
    out = []
    for row in db.scalars(select(Preference).where(Preference.key.startswith(prefix))).all():
        try:
            value = json.loads(row.value or "")
        except ValueError:
            continue
        if isinstance(value, dict):
            out.append(value)
    return out


def _put(db: Session, key: str, value: dict[str, Any] | None) -> None:
    row = db.get(Preference, key)
    if value is None:
        if row is not None:
            db.delete(row)
    elif row is None:
        db.add(Preference(key=key, value=json.dumps(value)))
    else:
        row.value = json.dumps(value)


def notes(db: Session, match_id: str | None = None) -> list[dict[str, Any]]:
    rows = [n for n in _rows(db, NOTE) if match_id is None or n.get("match_id") == match_id]
    return sorted(rows, key=lambda n: (str(n.get("match_id")), float(n.get("time_s") or 0)))


def save_note(db: Session, note: dict[str, Any]) -> None:
    """Store the note, or remove it when it has no text and no drawing."""
    text = str(note.get("text") or "").strip()
    shapes = list(note.get("shapes") or [])
    value = (
        None
        if not text and not shapes
        else {**note, "text": text, "shapes": shapes, "updated_at": time.time()}
    )
    _put(db, _key(NOTE, note["moment_id"]), value)
    db.commit()


def watching(db: Session) -> list[dict[str, Any]]:
    return sorted(_rows(db, WATCH), key=lambda w: w.get("updated_ns") or 0, reverse=True)


def save_watching(db: Session, match_id: str, position_s: float, duration_s: float) -> None:
    now = time.time_ns()
    _put(
        db,
        _key(WATCH, match_id),
        {
            "match_id": match_id,
            "position_s": position_s,
            "duration_s": duration_s,
            "updated_at": now / 1e9,
            "updated_ns": now,
        },
    )
    db.flush()
    for old in watching(db)[KEEP_WATCHING:]:
        _put(db, _key(WATCH, str(old["match_id"])), None)
    db.commit()


def alerts_seen(db: Session) -> dict[str, Any] | None:
    row = db.get(Preference, ALERTS)
    try:
        value = json.loads(row.value or "") if row else None
    except ValueError:
        return None
    return value if isinstance(value, dict) else None


def save_alerts_seen(db: Session, seen: dict[str, Any]) -> None:
    _put(db, ALERTS, seen)
    db.commit()
