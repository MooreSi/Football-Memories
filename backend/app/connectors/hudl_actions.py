"""Allowlisted player-action labels; arbitrary Hudl labels never enter the cache."""

from __future__ import annotations

import html
import re
from typing import Any

_ALIASES = {
    "penaltiesSaved": ("Penalty saved", "Penalties saved", "Penalty stopped", "Penalties stopped"),
    "penaltiesScored": ("Penalty scored", "Penalties scored"),
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
    # Spec 830: the coach's other Individual action labels (census, 27 Nov 2026).
    "dribbling": ("Dribbling & RWTB", "Dribbling and RWTB"),
    "defensiveActions": ("Defensive action", "Defensive actions"),
    "receiving": ("Receiving",),
    "ballProtection": ("Ball protection and turning", "Ball protection & turning"),
    "finishing": ("Finishing",),
}
SUPPORTED_ACTIONS = frozenset(_ALIASES)


def _key(value: str) -> str:
    return re.sub(r"[\s_-]+", " ", html.unescape(value)).strip().upper()


_LOOKUP = {_key(label): action for action, labels in _ALIASES.items() for label in labels}


def _action(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    normalized = _key(value)
    group = re.fullmatch(r"INDIVIDUAL ACTION\s*[▶>:]\s*(.+)", normalized)
    return _LOOKUP.get(group[1] if group else normalized)


def player_actions(tags: list[Any]) -> tuple[str, ...]:
    """One entry per label occurrence (spec 830): a label repeated on one clip counts each time.

    A tag's matching values each count; its key counts only when no value matched, so a key and
    a value naming the same action are one action. Grouped by action in first-seen order."""
    found: list[str] = []
    for tag in tags:
        if not isinstance(tag, dict) or tag.get("key") == "HUDL_CODE":
            continue
        values = tag.get("values", [])
        if not isinstance(values, list):
            continue
        matched = [action for value in values if (action := _action(value))]
        if not matched and (action := _action(tag.get("key"))):
            matched = [action]
        found.extend(matched)
    order = list(dict.fromkeys(found))
    return tuple(sorted(found, key=order.index))


# Spec 820: a census of tag labels per match, to learn whether Hudl's tags carry outcomes
# (pass completed / unsuccessful) without keeping raw tags. Only short, plain labels are
# counted: free text, URLs, tokens and long identifiers fail `safe_label` and leave nothing
# but their group name. Player codes are dropped by the caller.
LABEL_CENSUS_LIMIT = 300
_SAFE = re.compile(r"[A-Z0-9 &'+()]+")
_ARROW = re.compile(r"\s*[▶>]\s*")


def safe_label(value: str) -> bool:
    return (
        0 < len(value) <= 40
        and _SAFE.fullmatch(value) is not None
        and all(len(word) <= 20 for word in value.split())
    )


def census_label(group: str, value: str | None = None) -> str | None:
    """`GROUP ▶ VALUE` when both are safe, `GROUP` when only the group is, else None."""
    head = _key(group)
    if not safe_label(head):
        return None
    if value is None:
        return head
    tail = _key(value)
    return f"{head} ▶ {tail}" if safe_label(tail) else None


def label_key(value: str) -> str:
    return _key(value)


def label_parts(label: str) -> list[str]:
    return [_key(part) for part in _ARROW.split(label, maxsplit=1)]


def tag_labels(tags: list[Any], codes: set[str]) -> list[str]:
    """Census labels of one moment's tags; values equal to a code (player names) are dropped."""
    found: list[str] = []
    for tag in tags:
        if not isinstance(tag, dict) or not isinstance(tag.get("key"), str):
            continue
        key, values = tag["key"], tag.get("values", [])
        if key == "HUDL_CODE" or not isinstance(values, list):
            continue
        strings = [v for v in values if isinstance(v, str)]
        if key == "HUDL_LABEL":
            for value in strings:
                parts = label_parts(value)
                if len(parts) == 2 and parts[1] not in codes and (full := census_label(*parts)):
                    found.append(full)
                elif group := census_label(parts[0]):
                    found.append(group)
            continue
        if group := census_label(key):
            found.append(group)
            found.extend(
                label
                for value in strings
                if _key(value) not in codes and (label := census_label(key, value))
            )
    return found


def clean_label_counts(counts: Any) -> dict[str, int]:
    """What the cache may keep: safe labels with positive integer counts, largest first."""
    if not isinstance(counts, dict):
        return {}
    kept = [
        (label, count)
        for label, count in counts.items()
        if isinstance(label, str)
        and type(count) is int
        and count > 0
        and len(parts := label.split(" ▶ ")) <= 2
        and all(safe_label(part) for part in parts)
    ]
    kept.sort(key=lambda pair: (-pair[1], pair[0]))
    return dict(kept[:LABEL_CENSUS_LIMIT])
