"""Explainable date/title/roster inference. No network or raw roster persistence."""

from __future__ import annotations

import hashlib
import re
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import date

from app.schemas import TournamentAutomaticInfo, TournamentOut

EVENT = re.compile(r"\b(?:cup|tournament|festival|trophy|futsal)\b", re.I)
AGE = re.compile(r"\b(?:u\s*\d{1,2}s?|under[ -]?\d{1,2})\b", re.I)
NUMBER = re.compile(r"\b(?:game|match)\s*#?\s*(\d+)\b", re.I)
SPLIT = re.compile(r"\s+v(?:s)?\.?\s+", re.I)
COLOURS = r"blue|white|red|yellow|green|black|orange|purple"


@dataclass
class DetectionGame:
    key: str
    title: str
    club: str
    age_group: str
    players: list[str] = field(default_factory=list)
    match_date: date | None = None
    event_name: str = ""


def _normal(text: str) -> str:
    return " ".join(text.casefold().split())


def _body(title: str) -> str:
    return re.sub(r"^(?:\d{6}|20\d{2}[-.]\d{2}[-.]\d{2})\s+", "", title.strip())


def _date(game: DetectionGame) -> date | None:
    if game.match_date:
        return game.match_date
    title = game.title.strip()
    short = re.match(r"^(\d{2})(\d{2})(\d{2})(?:\s|$)", title)
    long = re.match(r"^(20\d{2})[-.](\d{2})[-.](\d{2})(?:\s|$)", title)
    try:
        if short:
            return date(2000 + int(short[1]), int(short[2]), int(short[3]))
        if long:
            return date(int(long[1]), int(long[2]), int(long[3]))
    except ValueError:
        return None
    return None


def _club(game: DetectionGame) -> str:
    return " ".join(AGE.sub("", game.club).split()) or "Home"


def _home_title(game: DetectionGame) -> str:
    sides = SPLIT.split(_body(game.title), maxsplit=1)
    club = re.compile(rf"\b{re.escape(_club(game))}\b", re.I)
    if len(sides) == 2 and not club.search(sides[0]) and club.search(sides[1]):
        return sides[1]
    return sides[0]


def _team_hint(game: DetectionGame) -> str | None:
    # Only the home-side title prefix supplies a colour: an opponent's colour is not ours.
    prefix = _home_title(game)
    club = re.escape(_club(game))
    found = re.search(
        rf"(?:\bu\s*\d{{1,2}}s?|\b{club}|\bteam|\bsquad)\s+({COLOURS}|[AB])\b", prefix, re.I
    )
    if not found:
        return None
    label = found[1].upper() if len(found[1]) == 1 else found[1].title()
    return f"{_club(game)} {label}"


def _event(game: DetectionGame) -> str:
    if EVENT.search(game.event_name):
        return game.event_name.strip()[:120]
    # Named events usually precede the fixture or sit in their own suffix segment.
    body = _body(game.title)
    segments = re.split(r"\s+[|–-]\s+|[()]", body)
    candidates = [re.split(r"[()]", _home_title(game))[0], *segments[1:]]
    for candidate in candidates:
        if not EVENT.search(candidate):
            continue
        candidate = AGE.sub("", candidate)
        candidate = re.sub(re.escape(_club(game)), "", candidate, flags=re.I)
        candidate = NUMBER.sub("", candidate)
        if _team_hint(game):
            candidate = re.sub(rf"^\s*(?:{COLOURS}|[AB])\b", "", candidate, flags=re.I)
        candidate = " ".join(candidate.strip(" -|:").split())
        if candidate and len(candidate.split()) <= 12:
            return candidate[:120]
    return ""


def _fixture(game: DetectionGame) -> str:
    body = re.sub(r"\([^)]*\)", "", _body(game.title))
    body = re.sub(
        r"\b(?:1st|2nd|first|second)\s+half\b|\b(?:half|part|period|quarter)\s*\d+\b",
        "",
        body,
        flags=re.I,
    )
    return _normal(NUMBER.sub("", body))


def _roster(game: DetectionGame) -> frozenset[str]:
    return frozenset(_normal(player) for player in game.players if player.strip())


def _similar(a: frozenset[str], b: frozenset[str]) -> bool:
    return min(len(a), len(b)) >= 4 and len(a & b) >= 3 and len(a & b) / len(a | b) >= 0.6


def _squads(
    games: list[DetectionGame], previous: TournamentOut | None
) -> dict[str, tuple[str, str, bool]]:
    old = previous.entries if previous else {}
    manual = {k: v for k, v in old.items() if previous and k not in previous.automatic}
    hints = {game.key: manual.get(game.key) or _team_hint(game) for game in games}
    rosters = {game.key: _roster(game) for game in games}
    frequencies = Counter(rosters.values())
    clusters: list[list[DetectionGame]] = []
    ambiguous: set[str] = set()
    # Repeated, compact rosters anchor first; broad bridge tags cannot join cohorts by chaining.
    ordered = sorted(
        games, key=lambda game: (-frequencies[rosters[game.key]], len(rosters[game.key]), game.key)
    )
    for game in ordered:
        roster = rosters[game.key]
        if len(roster) < 4:
            continue
        eligible = []
        overlaps = []
        for index, cluster in enumerate(clusters):
            labels = {hints[g.key] for g in cluster if hints[g.key]}
            if hints[game.key] and labels and hints[game.key] not in labels:
                continue
            if any(len(roster & rosters[g.key]) >= 3 for g in cluster):
                overlaps.append(index)
            if all(_similar(roster, rosters[g.key]) for g in cluster):
                eligible.append(index)
        if len(overlaps) > 1 or len(eligible) > 1 or (overlaps and not eligible):
            ambiguous.add(game.key)
        elif eligible:
            clusters[eligible[0]].append(game)
        else:
            clusters.append([game])
    result: dict[str, tuple[str, str, bool]] = {}
    used: set[str] = {hint for hint in hints.values() if hint}
    reserved = set(old.values()) - {"Team unassigned"}
    for cluster in clusters:
        named = next((hints[g.key] for g in cluster if hints[g.key]), None)
        prior = Counter(
            old[g.key] for g in cluster if old.get(g.key) and old[g.key] != "Team unassigned"
        )
        stable = next((name for name, _ in prior.most_common() if name not in used), None)
        if named:
            team = named
        elif stable:
            team = stable
        else:
            number = 1
            while f"{_club(cluster[0])} · Squad {number}" in used | reserved:
                number += 1
            team = f"{_club(cluster[0])} · Squad {number}"
        used.add(team)
        for game in cluster:
            result[game.key] = (
                team,
                "Overlapping player tags; provisional squad label."
                if not named
                else "Player tags match a named entered team.",
                False,
            )
    for game in games:
        if hints[game.key]:
            result[game.key] = (
                hints[game.key] or "",
                "Entered team named in the home-side title or saved correction.",
                True,
            )
        elif game.key in ambiguous:
            result[game.key] = (
                "Team unassigned",
                "Player overlap is ambiguous between squads; please correct.",
                False,
            )
        elif game.key not in result:
            result[game.key] = (
                "Team unassigned",
                "Insufficient player tags to identify the entered team.",
                False,
            )
    return result


def detect(
    games: list[DetectionGame], existing: list[TournamentOut] | None = None
) -> list[TournamentOut]:
    prior = {t.id: t for t in existing or []}
    scopes: dict[tuple[str, str, str], list[DetectionGame]] = defaultdict(list)
    # A source-qualified identity can occur only once, irrespective of payload order.
    for game in {g.key: g for g in games}.values():
        day = _date(game)
        if day is None:
            continue
        age = AGE.search(_body(game.title))
        age_label = age[0].replace(" ", "").upper() if age else game.age_group or "Age unknown"
        club = _normal(_club(game))
        if club == "home":
            club += f" ({game.key.split(':')[0]})"
        scopes[(day.isoformat(), club, _normal(age_label))].append(game)
    out = []
    for scope, scoped in sorted(scopes.items()):
        event_names = {_normal(_event(g)): _event(g) for g in scoped if _event(g)}
        partitions: dict[str, list[DetectionGame]] = defaultdict(list)
        for game in scoped:
            event = _normal(_event(game))
            if not event and len(event_names) == 1 and NUMBER.search(game.title):
                event = next(iter(event_names))
            partitions[event].append(game)
        for event, members in sorted(partitions.items()):
            numbers = {match[1] for g in members if (match := NUMBER.search(g.title))}
            fixtures = {_fixture(g) for g in members}
            if not event and len(numbers) < 2 and len(fixtures) < 2:
                continue
            identity = hashlib.sha256("|".join((*scope, event)).encode()).hexdigest()[:32]
            old = prior.get(identity)
            name = (
                old.name
                if old
                else (
                    f"{event_names.get(event, 'Match day')} · {scope[0]} · "
                    f"{_club(members[0])} · {members[0].age_group or 'Age unknown'}"
                )
            )
            tournament = TournamentOut(id=identity, name=name[:160], entries={})
            squads = _squads(members, old)
            basis = (
                "Named tournament and match date."
                if event
                else (
                    "Same date, club and age; numbered games or multiple fixtures "
                    "suggest a tournament."
                )
            )
            for game in members:
                team, reason, explicit = squads[game.key]
                tournament.entries[game.key] = team
                tournament.automatic[game.key] = TournamentAutomaticInfo(
                    club=game.club.strip() if _club(game) != "Home" else "",
                    confidence="high" if event and explicit else "review",
                    reason=f"{basis} {reason}",
                )
            out.append(tournament)
    return out
