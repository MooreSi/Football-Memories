"""Backup and restore of the whole index (spec 070, brief section 22).

A backup is one JSON file with every database row. Video and photo files are
not inside it: they already live in the archive folder, and restore never
touches them. Restore replaces all rows in ONE transaction, refuses a backup
made for a different schema, and always writes a pre-restore backup first.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from typing import Any

from sqlalchemy import Boolean, Date, DateTime, Integer, select, text
from sqlalchemy.orm import Session

from app.config import Settings
from app.db import Base
from app.services.paths import UnsafePath, safe_join

FORMAT = "football-memories-backup"
FORMAT_VERSION = 1
KEEP_AUTO = 14
AUTO_EVERY = timedelta(hours=24)
KINDS = ("backup", "auto", "pre-restore", "uploaded")
NAME_RE = re.compile(r"^(backup|auto|pre-restore|uploaded)-(\d{8}-\d{6})(-\d+)?\.json$")
KIND_LABEL = {
    "backup": "manual",
    "auto": "auto",
    "pre-restore": "pre-restore",
    "uploaded": "uploaded",
}


class BackupError(ValueError):
    pass


class BackupNotFound(LookupError):
    pass


def schema_fingerprint() -> str:
    parts = sorted(
        f"{t.name}.{c.name}:{type(c.type).__name__}"
        for t in Base.metadata.sorted_tables
        for c in t.columns
    )
    return hashlib.sha256("\n".join(parts).encode()).hexdigest()[:16]


def backups_dir(settings: Settings) -> Path:
    return settings.library_root / "Backups"


def _path_for(settings: Settings, name: str) -> Path:
    if not NAME_RE.match(name):
        raise BackupError(f"not a backup name: {name!r}")
    try:
        return safe_join(backups_dir(settings), name)
    except UnsafePath as exc:
        raise BackupError(str(exc)) from exc


def _json_value(v: Any) -> Any:
    if isinstance(v, datetime | date):
        return v.isoformat()
    return v


def _from_json(col: Any, v: Any) -> Any:
    if v is None:
        return None
    if isinstance(col.type, DateTime):
        return datetime.fromisoformat(v)
    if isinstance(col.type, Date):
        return date.fromisoformat(v)
    if isinstance(col.type, Boolean):
        return bool(v)
    return v


def _dump(db: Session) -> dict[str, list[dict[str, Any]]]:
    out: dict[str, list[dict[str, Any]]] = {}
    for t in Base.metadata.sorted_tables:
        rows = db.execute(select(t).order_by(*t.primary_key.columns)).mappings().all()
        out[t.name] = [{k: _json_value(v) for k, v in r.items()} for r in rows]
    return out


def _unique_name(settings: Settings, prefix: str, when: datetime) -> str:
    stamp = when.astimezone(UTC).strftime("%Y%m%d-%H%M%S")
    name, n = f"{prefix}-{stamp}.json", 2
    while (backups_dir(settings) / name).exists():
        name = f"{prefix}-{stamp}-{n}.json"
        n += 1
    return name


def _write_atomic(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    part = path.with_name(path.name + ".part")
    with part.open("wb") as fh:
        fh.write(data)
        fh.flush()
        os.fsync(fh.fileno())
    part.replace(path)


def create_backup(
    db: Session, settings: Settings, prefix: str = "backup", when: datetime | None = None
) -> str:
    when = when or datetime.now(UTC)
    tables = _dump(db)
    doc = {
        "format": FORMAT,
        "format_version": FORMAT_VERSION,
        "schema": schema_fingerprint(),
        "created_at": when.isoformat(),
        "kind": KIND_LABEL[prefix],
        "counts": {
            "matches": len(tables.get("matches", [])),
            "moments": len(tables.get("events", [])),
        },
        "tables": tables,
    }
    name = _unique_name(settings, prefix, when)
    _write_atomic(backups_dir(settings) / name, json.dumps(doc, separators=(",", ":")).encode())
    return name


@dataclass(frozen=True)
class BackupInfo:
    name: str
    kind: str
    created_at: datetime
    size_bytes: int
    matches: int
    moments: int


def _read(path: Path) -> dict[str, Any]:
    try:
        doc = json.loads(path.read_bytes())
    except (OSError, ValueError) as exc:
        raise BackupError("this file is not a readable backup") from exc
    if not isinstance(doc, dict) or doc.get("format") != FORMAT:
        raise BackupError("this file is not a Football Memories backup")
    if doc.get("format_version") != FORMAT_VERSION or not isinstance(doc.get("tables"), dict):
        raise BackupError("this backup was made by a different version of the app")
    return doc


def list_backups(settings: Settings) -> list[BackupInfo]:
    folder = backups_dir(settings)
    if not folder.is_dir():
        return []
    out = []
    for p in folder.iterdir():
        m = NAME_RE.match(p.name)
        if not m or not p.is_file():
            continue
        try:
            doc = _read(p)
        except BackupError:
            continue
        counts = doc.get("counts", {})
        out.append(
            BackupInfo(
                name=p.name,
                kind=KIND_LABEL[m.group(1)],
                created_at=datetime.fromisoformat(doc["created_at"]),
                size_bytes=p.stat().st_size,
                matches=int(counts.get("matches", 0)),
                moments=int(counts.get("moments", 0)),
            )
        )
    return sorted(out, key=lambda b: (b.created_at, b.name), reverse=True)


def backup_path(settings: Settings, name: str) -> Path:
    path = _path_for(settings, name)
    if not path.is_file():
        raise BackupNotFound(name)
    return path


def delete_backup(settings: Settings, name: str) -> None:
    backup_path(settings, name).unlink()


def save_upload(settings: Settings, data: bytes, when: datetime | None = None) -> str:
    tmp = backups_dir(settings) / f".upload-{os.getpid()}-{id(data)}.tmp"
    tmp.parent.mkdir(parents=True, exist_ok=True)
    try:
        tmp.write_bytes(data)
        _read(tmp)
    finally:
        tmp.unlink(missing_ok=True)
    name = _unique_name(settings, "uploaded", when or datetime.now(UTC))
    _write_atomic(backups_dir(settings) / name, data)
    return name


def _reset_sequences(db: Session) -> None:
    if db.get_bind().dialect.name != "postgresql":
        return
    for t in Base.metadata.sorted_tables:
        pk = list(t.primary_key.columns)
        if len(pk) == 1 and pk[0].name == "id" and isinstance(pk[0].type, Integer):
            db.execute(
                text(
                    f"SELECT setval(pg_get_serial_sequence('{t.name}', 'id'), "  # noqa: S608 - names from metadata
                    f"COALESCE((SELECT MAX(id) FROM {t.name}), 1), "
                    f"(SELECT MAX(id) FROM {t.name}) IS NOT NULL)"
                )
            )


def _check_compatible(tables: dict[str, list[dict[str, Any]]]) -> None:
    """Older backups restore (newer tables start empty, newer columns take their defaults).
    A backup that knows tables or columns this version does not is refused."""
    known = Base.metadata.tables
    newer = "this backup was made by a newer version of the app; update the app, then restore it"
    for tname, rows in tables.items():
        if tname not in known:
            raise BackupError(newer)
        columns = set(known[tname].columns.keys())
        for row in rows:
            if not isinstance(row, dict) or not set(row) <= columns:
                raise BackupError(newer)


def restore(db: Session, settings: Settings, name: str) -> str:
    """Replace every row with the backup's. Returns the safety backup's name."""
    doc = _read(backup_path(settings, name))
    tables: dict[str, list[dict[str, Any]]] = doc["tables"]
    _check_compatible(tables)
    safety = create_backup(db, settings, prefix="pre-restore")
    try:
        for t in reversed(Base.metadata.sorted_tables):
            db.execute(t.delete())
        for t in Base.metadata.sorted_tables:
            # Only the columns the backup has: newer columns fall back to their defaults.
            rows = [
                {c.name: _from_json(c, r[c.name]) for c in t.columns if c.name in r}
                for r in tables.get(t.name, [])
            ]
            if rows:
                db.execute(t.insert(), rows)
        _reset_sequences(db)
        db.commit()
    except Exception as exc:
        db.rollback()
        raise BackupError(
            f"restore failed and nothing was changed: {exc.__class__.__name__}"
        ) from exc
    return safety


def run_auto_backup_if_due(db: Session, settings: Settings, now: datetime) -> str | None:
    autos = [b for b in list_backups(settings) if b.kind == "auto"]
    if autos and now - max(b.created_at for b in autos) < AUTO_EVERY:
        return None
    name = create_backup(db, settings, prefix="auto", when=now)
    keep = sorted(
        (b for b in list_backups(settings) if b.kind == "auto"),
        key=lambda b: b.created_at,
        reverse=True,
    )
    for old in keep[KEEP_AUTO:]:
        (backups_dir(settings) / old.name).unlink(missing_ok=True)  # only app-made auto backups
    return name
