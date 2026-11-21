"""Allowlisted player-action labels; arbitrary Hudl labels never enter the cache."""

from __future__ import annotations

import html
import re
from typing import Any

_ALIASES = {
    "passes": ("Pass", "Passes", "Passing", "Pass completed", "Successful pass"),
    "assists": ("Assist", "Assists", "Assisting"),
    "keyPasses": ("Key pass", "Key passes", "Chance created", "Chances created"),
    "shots": ("On target", "Shot on target", "Shots on target"),
    "chances": ("Chance", "Chances"),
    "crosses": ("Cross", "Crosses", "Crossing"),
    "tackles": ("Tackle", "Tackles", "Tackling", "Tackle won"),
    "interceptions": ("Interception", "Interceptions", "Intercepting"),
    "blocks": ("Block", "Blocks", "Blocking", "Shot blocked"),
    "clearances": ("Clearance", "Clearances", "Clearing"),
    "regains": ("Regain", "Regains", "Recovery", "Ball recovery", "Ball won"),
    "offsides": ("Offside", "Offsides"),
    "defensive1v1": ("Def 1v1", "Defensive 1v1", "Defending 1v1", "Def 1 v 1"),
    "attacking1v1": ("Att 1v1", "Attacking 1v1", "Attack 1v1", "Att 1 v 1"),
    "fouls": ("Foul", "Fouls"),
    "foulsWon": ("Foul won", "Fouls won", "Fouled"),
    "foulsConceded": ("Foul conceded", "Fouls conceded", "Foul committed", "Fouls committed"),
    "successfulDribbles": ("Successful dribble", "Successful dribbles", "Dribble won"),
    "possessionLost": ("Possession lost", "Ball lost", "Dispossessed", "Turnover"),
}
SUPPORTED_ACTIONS = frozenset(_ALIASES)


def _key(value: str) -> str:
    return re.sub(r"[\s_-]+", " ", html.unescape(value)).strip().upper()


_LOOKUP = {_key(label): action for action, labels in _ALIASES.items() for label in labels}


def player_actions(tags: list[Any]) -> tuple[str, ...]:
    found: dict[str, None] = {}
    for tag in tags:
        if not isinstance(tag, dict) or tag.get("key") == "HUDL_CODE":
            continue
        values = tag.get("values", [])
        if not isinstance(values, list):
            continue
        for value in [tag.get("key"), *values]:
            if not isinstance(value, str):
                continue
            normalized = _key(value)
            group = re.fullmatch(r"INDIVIDUAL ACTION\s*[▶>:]\s*(.+)", normalized)
            label = group[1] if group else normalized
            if action := _LOOKUP.get(label):
                found[action] = None
    return tuple(found)
