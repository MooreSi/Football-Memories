"""Storage health (brief sections 13 and 22).

The archive check writes one tiny probe file and deletes it at once; nothing
else is ever created, changed or removed. The import folder is only read by the
app (it is mounted read-only in Docker), so it is never written to here.
"""

from __future__ import annotations

import os
import shutil
import uuid
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path
from typing import Literal

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.config import Settings
from app.models import MediaAsset

GIB = 1024**3
LOW_FREE_BYTES = 5 * GIB
LOW_FREE_RATIO = 0.05

Status = Literal["ok", "warning", "error"]


@dataclass
class FolderHealth:
    role: str
    path: str
    exists: bool
    readable: bool
    writable: bool
    free_bytes: int | None
    total_bytes: int | None
    status: Status
    messages: list[str] = field(default_factory=list)


def _probe_write(path: Path) -> bool:
    probe = path / f".fm-probe-{uuid.uuid4().hex}"
    try:
        fd = os.open(probe, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
        os.write(fd, b"ok")
        os.close(fd)
        return True
    except OSError:
        return False
    finally:
        probe.unlink(missing_ok=True)


def folder_health(path: Path, role: str, *, needs_write: bool) -> FolderHealth:
    label = "archive folder" if role == "archive" else "import folder"
    h = FolderHealth(
        role=role,
        path=str(path),
        exists=path.is_dir(),
        readable=False,
        writable=False,
        free_bytes=None,
        total_bytes=None,
        status="ok",
    )
    if not h.exists:
        h.status = "error"
        h.messages.append(
            f"The {label} {path} does not exist. Create it or fix the folder setting."
        )
        return h
    try:
        next(iter(os.scandir(path)), None)
        h.readable = True
    except OSError:
        h.status = "error"
        h.messages.append(f"The app cannot read the {label}. Check its permissions.")
    h.writable = _probe_write(path) if needs_write else os.access(path, os.W_OK)
    if needs_write and not h.writable:
        h.status = "error"
        h.messages.append(f"The app cannot write to the {label}, so it cannot save matches.")
    usage = shutil.disk_usage(path)
    h.free_bytes, h.total_bytes = usage.free, usage.total
    if (
        h.status == "ok"
        and needs_write
        and (usage.free < LOW_FREE_BYTES or usage.free < usage.total * LOW_FREE_RATIO)
    ):
        h.status = "warning"
        h.messages.append(
            f"Only {usage.free / GIB:.1f} GB free ({usage.free / usage.total:.0%} of the disk). "
            "Full matches can need several GB each."
        )
    if h.status == "ok":
        h.messages.append("Everything looks fine.")
    return h


@dataclass(frozen=True)
class MissingFile:
    media_id: int
    match_id: int
    opponent: str
    match_date: date
    relative_path: str


@dataclass(frozen=True)
class ArchiveSummary:
    indexed_files: int
    indexed_bytes: int
    missing: list[MissingFile]


def archive_summary(db: Session, settings: Settings) -> ArchiveSummary:
    media = db.scalars(select(MediaAsset).options(selectinload(MediaAsset.match))).all()
    missing = [
        MissingFile(m.id, m.match_id, m.match.opponent, m.match.match_date, m.relative_path)
        for m in media
        if not (settings.archive_root / m.relative_path).is_file()
    ]
    return ArchiveSummary(
        indexed_files=len(media),
        indexed_bytes=sum(m.size_bytes for m in media),
        missing=missing,
    )
