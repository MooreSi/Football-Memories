"""Archive integrity (spec 070): verify hashes, find moved files, rebuild thumbnails.

None of this creates, changes, moves or deletes a video file. Relinking only
updates the stored path after the file's SHA-256 matches the one recorded at
import time.
"""

from __future__ import annotations

import threading
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Literal

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload, sessionmaker

from app.config import Settings
from app.models import MediaAsset
from app.services.importer import sha256_of
from app.services.media import MediaError, make_thumbnail

SKIP_DIRS = {"Backups", "Thumbnails", "Players"}


@dataclass
class VerifyResult:
    media_id: int
    match_id: int
    opponent: str
    result: Literal["ok", "changed", "missing"]


@dataclass
class VerifyState:
    state: Literal["idle", "running", "done"] = "idle"
    checked: int = 0
    total: int = 0
    started_at: datetime | None = None
    finished_at: datetime | None = None
    results: list[VerifyResult] = field(default_factory=list)


_lock = threading.Lock()
_state = VerifyState()


def verify_state() -> VerifyState:
    with _lock:
        return VerifyState(
            _state.state,
            _state.checked,
            _state.total,
            _state.started_at,
            _state.finished_at,
            list(_state.results),
        )


def start_verify(factory: sessionmaker[Session], settings: Settings) -> bool:
    """Start a background verification. Returns False if one is already running."""
    global _state
    with factory() as db:
        media = db.scalars(select(MediaAsset).options(selectinload(MediaAsset.match))).all()
        jobs = [
            (m.id, m.match_id, m.match.opponent, settings.archive_root / m.relative_path, m.sha256)
            for m in media
        ]
    with _lock:
        if _state.state == "running":
            return False
        _state = VerifyState(state="running", total=len(jobs), started_at=datetime.now(UTC))

    def work() -> None:
        for media_id, match_id, opponent, path, digest in jobs:
            if not path.is_file():
                result: Literal["ok", "changed", "missing"] = "missing"
            else:
                result = "ok" if sha256_of(path) == digest else "changed"
            with _lock:
                _state.results.append(VerifyResult(media_id, match_id, opponent, result))
                _state.checked += 1
        with _lock:
            _state.state = "done"
            _state.finished_at = datetime.now(UTC)

    threading.Thread(target=work, name="verify-archive", daemon=True).start()
    return True


def _candidate_files(settings: Settings) -> list[Path]:
    out = []
    for p in settings.archive_root.rglob("*"):
        rel = p.relative_to(settings.archive_root).parts
        if any(part in SKIP_DIRS for part in rel) or p.is_symlink() or not p.is_file():
            continue
        if p.name.endswith((".part", ".json")) or p.name.startswith("."):
            continue
        out.append(p)
    return out


def relink_missing(db: Session, settings: Settings) -> tuple[int, int]:
    """Point missing videos at files under the archive with the same size and SHA-256."""
    missing = [
        m
        for m in db.scalars(select(MediaAsset)).all()
        if not (settings.archive_root / m.relative_path).is_file()
    ]
    if not missing:
        return 0, 0
    by_size: dict[int, list[Path]] = {}
    for p in _candidate_files(settings):
        by_size.setdefault(p.stat().st_size, []).append(p)
    hashes: dict[Path, str] = {}
    relinked = 0
    for m in missing:
        for p in by_size.get(m.size_bytes, []):
            digest = hashes.setdefault(p, sha256_of(p))
            if digest == m.sha256:
                m.relative_path = p.relative_to(settings.archive_root).as_posix()
                relinked += 1
                break
    db.commit()
    return relinked, len(missing) - relinked


def rebuild_thumbnails(db: Session, settings: Settings) -> tuple[int, int]:
    rebuilt = failed = 0
    for m in db.scalars(select(MediaAsset)).all():
        video = settings.archive_root / m.relative_path
        thumb_rel = m.thumbnail_relpath
        if thumb_rel and (settings.archive_root / thumb_rel).is_file():
            continue
        if not video.is_file():
            failed += 1
            continue
        target = settings.library_root / "Thumbnails" / m.sha256[:2] / f"{m.sha256}.jpg"
        try:
            make_thumbnail(video, target, at_s=min(m.duration_s * 0.1, 60.0))
        except MediaError:
            failed += 1
            continue
        m.thumbnail_relpath = target.relative_to(settings.archive_root).as_posix()
        rebuilt += 1
    db.commit()
    return rebuilt, failed
