"""Import a match file from the inbox into the archive and index it.

Order matters, and protects golden rule 4:
1. validate everything that can fail cheaply (name, sidecar, probe, duplicate)
2. copy to a .part file, verify the checksum, rename into place (never overwrite)
3. write the database rows; if that fails, remove only the file we just created
The inbox original is never moved, modified or deleted.
"""

from __future__ import annotations

import hashlib
import logging
import os
import shutil
from dataclasses import dataclass
from datetime import date
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import Settings
from app.models import Event, Match, MediaAsset, Player, Season, TagDefinition, Team, TeamSeason
from app.services.media import MediaError, make_thumbnail, probe
from app.services.paths import UnsafePath, safe_join, sanitize_component
from app.services.sidecar import SidecarError, SidecarRow, parse_sidecar

log = logging.getLogger(__name__)

SOURCE = "local_import"
VIDEO_EXTENSIONS = {".mp4", ".mov", ".m4v", ".mkv", ".avi", ".mts", ".m2ts", ".webm"}


class InvalidImport(ValueError):
    pass


class DuplicateMedia(Exception):
    def __init__(self, existing_match_id: int) -> None:
        super().__init__(f"this footage is already in the archive (match {existing_match_id})")
        self.existing_match_id = existing_match_id


@dataclass(frozen=True)
class ImportRequest:
    filename: str
    team_name: str
    season_label: str
    opponent: str
    match_date: date
    age_group: str | None = None
    competition: str | None = None


def sidecar_for(video: Path) -> Path:
    return video.with_suffix(".tags.csv")


def sha256_of(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def _free_target(directory: Path, filename: str) -> Path:
    stem, suffix = Path(filename).stem, Path(filename).suffix
    candidate = directory / filename
    n = 2
    while candidate.exists() or candidate.with_name(candidate.name + ".part").exists():
        candidate = directory / f"{stem} ({n}){suffix}"
        n += 1
    return candidate


def _get_or_create_team(db: Session, name: str) -> Team:
    team = db.scalars(select(Team).where(Team.name == name)).first()
    if team is None:
        team = Team(name=name)
        db.add(team)
        db.flush()
    return team


def _get_or_create_season(db: Session, label: str) -> Season:
    season = db.scalars(select(Season).where(Season.label == label)).first()
    if season is None:
        season = Season(label=label)
        db.add(season)
        db.flush()
    return season


def _get_or_create_player(db: Session, name: str) -> Player:
    player = db.scalars(select(Player).where(Player.display_name == name)).first()
    if player is None:
        player = Player(display_name=name)
        db.add(player)
        db.flush()
    return player


def _get_or_create_tag(db: Session, name: str) -> TagDefinition:
    tag = db.scalars(
        select(TagDefinition).where(TagDefinition.source == SOURCE, TagDefinition.name == name)
    ).first()
    if tag is None:
        tag = TagDefinition(name=name, source=SOURCE)
        db.add(tag)
        db.flush()
    return tag


def _event_identity(row: SidecarRow, seen: dict[str, int]) -> str:
    base = hashlib.sha1(  # noqa: S324 - identity, not security
        f"{row.time_s:.3f}|{row.category}|{'|'.join(sorted(row.players))}".encode()
    ).hexdigest()
    seen[base] = seen.get(base, 0) + 1
    return base if seen[base] == 1 else f"{base}#{seen[base]}"


def import_match(db: Session, settings: Settings, req: ImportRequest) -> Match:
    # 1. validate
    try:
        source = safe_join(settings.import_root, req.filename)
    except UnsafePath as exc:
        raise InvalidImport(str(exc)) from exc
    if not source.is_file():
        raise InvalidImport(f"no such file in the import folder: {req.filename}")
    if source.suffix.lower() not in VIDEO_EXTENSIONS:
        raise InvalidImport(f"not a supported video file type: {source.suffix}")
    for label, value in (
        ("team", req.team_name),
        ("season", req.season_label),
        ("opponent", req.opponent),
    ):
        if not value.strip():
            raise InvalidImport(f"{label} is required")

    rows: list[SidecarRow] = []
    sidecar = sidecar_for(source)
    if sidecar.is_file():
        try:
            rows = parse_sidecar(sidecar)
        except SidecarError as exc:
            raise InvalidImport(str(exc)) from exc

    try:
        info = probe(source)
    except MediaError as exc:
        raise InvalidImport(str(exc)) from exc

    digest = sha256_of(source)
    existing = db.scalars(select(MediaAsset).where(MediaAsset.sha256 == digest)).first()
    if existing is not None:
        raise DuplicateMedia(existing.match_id)

    # 2. copy, verify, rename
    match_dir = (
        settings.library_root
        / "Matches"
        / sanitize_component(req.season_label)
        / sanitize_component(req.team_name)
        / sanitize_component(f"{req.match_date.isoformat()} vs {req.opponent}")
    )
    match_dir.mkdir(parents=True, exist_ok=True)
    final = _free_target(match_dir, sanitize_component(source.name))
    part = final.with_name(final.name + ".part")
    created: list[Path] = []
    try:
        shutil.copyfile(source, part)
        if sha256_of(part) != digest:
            raise InvalidImport("copy verification failed: checksum mismatch")
        os.replace(part, final)
        created.append(final)

        thumb_rel: str | None = None
        thumb = settings.library_root / "Thumbnails" / digest[:2] / f"{digest}.jpg"
        try:
            make_thumbnail(final, thumb, at_s=min(info.duration_s * 0.1, 60.0))
            created.append(thumb)
            thumb_rel = thumb.relative_to(settings.archive_root).as_posix()
        except MediaError:
            log.warning("thumbnail extraction failed for %s", final.name)

        # 3. index
        team = _get_or_create_team(db, req.team_name.strip())
        season = _get_or_create_season(db, req.season_label.strip())
        link = db.get(TeamSeason, (team.id, season.id))
        if link is None:
            db.add(TeamSeason(team_id=team.id, season_id=season.id, age_group=req.age_group))
        match = Match(
            team_id=team.id,
            season_id=season.id,
            age_group=req.age_group,
            opponent=req.opponent.strip(),
            match_date=req.match_date,
            competition=req.competition,
            source=SOURCE,
            source_match_id=digest,
        )
        db.add(match)
        db.flush()
        db.add(
            MediaAsset(
                match_id=match.id,
                kind="full_match",
                relative_path=final.relative_to(settings.archive_root).as_posix(),
                original_filename=source.name,
                sha256=digest,
                size_bytes=info.size_bytes,
                duration_s=info.duration_s,
                width=info.width,
                height=info.height,
                fps=info.fps,
                video_codec=info.video_codec,
                audio_codec=info.audio_codec,
                bitrate=info.bitrate,
                container=info.container,
                thumbnail_relpath=thumb_rel,
            )
        )
        seen: dict[str, int] = {}
        for row in rows:
            event = Event(
                match_id=match.id,
                tag_id=_get_or_create_tag(db, row.category).id,
                time_s=row.time_s,
                duration_s=row.duration_s,
                note=row.note,
                source=SOURCE,
                source_event_id=_event_identity(row, seen),
            )
            event.players = [_get_or_create_player(db, name) for name in row.players]
            db.add(event)
        db.commit()
        log.info("imported match %s (%d events)", match.id, len(rows))
        return match
    except BaseException:
        db.rollback()
        part.unlink(missing_ok=True)
        for path in created:  # only files this call created; never the user's
            path.unlink(missing_ok=True)
        raise
