"""Owner-confirmed minutes per match/player, stored in the backed-up preferences."""

from __future__ import annotations

import hashlib
import json
import math

from sqlalchemy.orm import Session

from app.models import Preference


def _key(match_id: str) -> str:
    return "player-minutes:" + hashlib.sha256(match_id.encode()).hexdigest()


def entries(db: Session, match_id: str) -> dict[str, float]:
    row = db.get(Preference, _key(match_id))
    try:
        data = json.loads(row.value or "{}") if row else {}
    except ValueError:
        return {}
    if not isinstance(data, dict):
        return {}
    return {
        name: float(value)
        for name, value in data.items()
        if isinstance(name, str)
        and type(value) in (int, float)
        and math.isfinite(value)
        and 0 <= value <= 600
    }


def save(db: Session, match_id: str, player: str, minutes: float | None) -> dict[str, float]:
    values = entries(db, match_id)
    name = " ".join(player.split()).upper()
    if minutes is None:
        values.pop(name, None)
    else:
        values[name] = minutes
    row = db.get(Preference, _key(match_id))
    encoded = json.dumps(values, separators=(",", ":"))
    if row is None:
        db.add(Preference(key=_key(match_id), value=encoded))
    else:
        row.value = encoded
    db.commit()
    return values
