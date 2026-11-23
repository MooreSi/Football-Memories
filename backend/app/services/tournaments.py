"""Library-owned memberships and durable overrides; included in normal backups."""

from __future__ import annotations

import hashlib
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models import Event, Match, Player, Preference, event_players
from app.schemas import TournamentDetectionMatch, TournamentOut
from app.services.tournament_detection import DetectionGame, detect

PREFIX = "tournament:"
OVERRIDE = "tournament-override:"


def _rows(db: Session, *, lock: bool = False) -> list[Preference]:
    if lock and db.get_bind().dialect.name == "postgresql":
        # Existing row locks cannot serialize the first insert into an empty library.
        db.execute(select(func.pg_advisory_xact_lock(500_490)))
    query = select(Preference).where(Preference.key.startswith(PREFIX)).order_by(Preference.key)
    return list(db.scalars(query.with_for_update() if lock else query).all())


def listing(db: Session) -> list[TournamentOut]:
    return sorted(
        [TournamentOut.model_validate_json(row.value or "{}") for row in _rows(db)],
        key=lambda tournament: tournament.name.casefold(),
    )


def _put(db: Session, tournament: TournamentOut) -> None:
    key = PREFIX + tournament.id
    row = db.get(Preference, key)
    value = tournament.model_dump_json()
    if row:
        if row.value != value:
            row.value = value
    else:
        db.add(Preference(key=key, value=value))


def _protect(db: Session, match_key: str) -> None:
    key = OVERRIDE + hashlib.sha256(match_key.encode()).hexdigest()[:32]
    if db.get(Preference, key) is None:
        db.add(Preference(key=key, value=match_key))


def assign(db: Session, name: str, team: str, match_keys: list[str]) -> None:
    groups = [TournamentOut.model_validate_json(row.value or "{}") for row in _rows(db, lock=True)]
    target = next((g for g in groups if g.name.casefold() == name.casefold()), None)
    if target is None:
        identity = hashlib.sha256(name.casefold().encode()).hexdigest()[:32]
        target = TournamentOut(id=identity, name=name, entries={})
        groups.append(target)
    team = next((v for v in target.entries.values() if v.casefold() == team.casefold()), team)
    for key in match_keys:
        _protect(db, key)
        # A correction moves automatic membership, while independent manual groups survive.
        for group in groups:
            if key in group.automatic:
                group.automatic.pop(key)
                group.entries.pop(key, None)
        target.entries[key] = team
    for group in groups:
        _put(db, group)
    db.commit()


def remove(db: Session, identity: str, match_key: str) -> None:
    _rows(db, lock=True)
    row = db.get(Preference, PREFIX + identity, with_for_update=True)
    if row:
        tournament = TournamentOut.model_validate_json(row.value or "{}")
        if match_key in tournament.entries:
            tournament.entries.pop(match_key)
            tournament.automatic.pop(match_key, None)
            _protect(db, match_key)
            _put(db, tournament)
            db.commit()


def rename(db: Session, identity: str, name: str) -> None:
    groups = [TournamentOut.model_validate_json(row.value or "{}") for row in _rows(db, lock=True)]
    target = next((g for g in groups if g.id == identity), None)
    if target is None:
        raise LookupError("Tournament not found")
    if any(g.id != identity and g.name.casefold() == name.casefold() for g in groups):
        raise ValueError("Another tournament already uses that name")
    target.name = name
    target.name_corrected = True
    _put(db, target)
    db.commit()


def _imported(db: Session) -> list[DetectionGame]:
    matches = db.scalars(
        select(Match).options(selectinload(Match.team), selectinload(Match.media))
    ).all()
    players: dict[int, list[str]] = {}
    names = db.execute(
        select(Event.match_id, Player.display_name)
        .join(event_players, event_players.c.event_id == Event.id)
        .join(Player, Player.id == event_players.c.player_id)
        .distinct()
    )
    for match_id, name in names:
        players.setdefault(match_id, []).append(name)
    return [
        DetectionGame(
            key=f"local:{match.id}",
            title=Path(match.media[0].original_filename).stem
            if match.media
            else f"{match.team.name} v {match.opponent}",
            club=match.team.club or match.team.name,
            age_group=match.age_group or "",
            players=players.get(match.id, []),
            match_date=match.match_date,
            event_name=match.competition or "",
        )
        for match in matches
    ]


def automatic(db: Session, snapshot: list[TournamentDetectionMatch]) -> list[TournamentOut]:
    rows = _rows(db, lock=True)
    groups = {
        t.id: t for t in (TournamentOut.model_validate_json(row.value or "{}") for row in rows)
    }
    protected = {
        key for group in groups.values() for key in group.entries if key not in group.automatic
    }
    protected.update(
        value
        for value in db.scalars(select(Preference.value).where(Preference.key.startswith(OVERRIDE)))
        if value
    )
    known_clubs = {
        key for group in groups.values() for key, info in group.automatic.items() if info.club
    }
    # An earlier request may arrive after settings finished loading in another tab.
    # Unknown identity must never downgrade a placement already made with a known club.
    games = [
        DetectionGame(**game.model_dump())
        for game in snapshot
        if game.club.strip().casefold() not in {"", "home"} or game.key not in known_clubs
    ]
    games += _imported(db)
    inferred = detect(games, list(groups.values()))
    obsolete: set[str] = set()
    for prediction in inferred:
        eligible = {key for key in prediction.entries if key not in protected}
        if not eligible:
            continue
        target = groups.setdefault(
            prediction.id, TournamentOut(id=prediction.id, name=prediction.name, entries={})
        )
        for key in eligible:
            # Remove only obsolete automatic placement, never membership missing from a snapshot.
            for group in groups.values():
                if group.id != target.id and key in group.automatic:
                    group.automatic.pop(key)
                    group.entries.pop(key, None)
                    obsolete.add(group.id)
                    if group.name_corrected and not target.name_corrected:
                        target.name = group.name
                        target.name_corrected = True
            target.entries[key] = prediction.entries[key]
            target.automatic[key] = prediction.automatic[key]
    for group in groups.values():
        if group.id in obsolete and not group.entries:
            row = db.get(Preference, PREFIX + group.id)
            if row is not None:
                db.delete(row)
        else:
            _put(db, group)
    db.commit()
    return listing(db)
