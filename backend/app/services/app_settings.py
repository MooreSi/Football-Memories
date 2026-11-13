"""User-adjustable settings, stored in `preferences`. Defaults never change
silently (golden rule 5): clip timing stays 8 s before / 5 s after a tag."""

from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.models import Preference

DEFAULT_PRE_S = 8.0
DEFAULT_POST_S = 5.0
PRE_KEY = "clip_pre_s"
POST_KEY = "clip_post_s"


@dataclass(frozen=True)
class ClipTiming:
    pre_s: float
    post_s: float


def _get_float(db: Session, key: str, default: float) -> float:
    pref = db.get(Preference, key)
    if pref is None or pref.value is None:
        return default
    try:
        return float(pref.value)
    except ValueError:
        return default


def _set(db: Session, key: str, value: float) -> None:
    pref = db.get(Preference, key)
    if pref is None:
        db.add(Preference(key=key, value=str(value)))
    else:
        pref.value = str(value)


def clip_timing(db: Session) -> ClipTiming:
    return ClipTiming(
        pre_s=_get_float(db, PRE_KEY, DEFAULT_PRE_S),
        post_s=_get_float(db, POST_KEY, DEFAULT_POST_S),
    )


def update_clip_timing(db: Session, pre_s: float | None, post_s: float | None) -> ClipTiming:
    if pre_s is not None:
        _set(db, PRE_KEY, pre_s)
    if post_s is not None:
        _set(db, POST_KEY, post_s)
    db.commit()
    return clip_timing(db)


HOME_TEAM_KEYS = {"hudl": "home_team_hudl", "veo": "home_team_veo"}


def home_teams(db: Session) -> dict[str, str | None]:
    found: dict[str, str | None] = {}
    for source, key in HOME_TEAM_KEYS.items():
        pref = db.get(Preference, key)
        found[source] = pref.value if pref is not None and pref.value else None
    return found


def update_home_teams(db: Session, names: dict[str, str | None]) -> dict[str, str | None]:
    for source, value in names.items():
        if source not in HOME_TEAM_KEYS or value is None:
            continue
        cleaned = " ".join(value.split()) or None
        key = HOME_TEAM_KEYS[source]
        pref = db.get(Preference, key)
        if pref is None:
            db.add(Preference(key=key, value=cleaned))
        else:
            pref.value = cleaned
    db.commit()
    return home_teams(db)
