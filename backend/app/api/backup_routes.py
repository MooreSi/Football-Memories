"""Backups, restore and archive integrity tools (spec 070)."""

from __future__ import annotations

from dataclasses import asdict
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_settings
from app.config import Settings
from app.schemas import (
    BackupOut,
    RebuildOut,
    RelinkOut,
    RestoreIn,
    RestoreOut,
    VerifyResultOut,
    VerifyStateOut,
)
from app.services import backups, integrity

router = APIRouter(prefix="/api")
Db = Annotated[Session, Depends(get_db)]
Cfg = Annotated[Settings, Depends(get_settings)]
MAX_UPLOAD = 200 * 1024 * 1024


def _info(settings: Settings, name: str) -> BackupOut:
    info = next(b for b in backups.list_backups(settings) if b.name == name)
    return BackupOut(**asdict(info))


def _bad(exc: Exception) -> HTTPException:
    return HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get("/backups", response_model=list[BackupOut])
def list_backups(settings: Cfg) -> list[BackupOut]:
    return [BackupOut(**asdict(b)) for b in backups.list_backups(settings)]


@router.post("/backups", response_model=BackupOut, status_code=status.HTTP_201_CREATED)
def create_backup(db: Db, settings: Cfg) -> BackupOut:
    return _info(settings, backups.create_backup(db, settings))


@router.post("/backups/upload", response_model=BackupOut, status_code=status.HTTP_201_CREATED)
def upload_backup(file: UploadFile, settings: Cfg) -> BackupOut:
    data = file.file.read(MAX_UPLOAD + 1)
    if len(data) > MAX_UPLOAD:
        raise HTTPException(status.HTTP_413_CONTENT_TOO_LARGE, detail="backup file is too large")
    try:
        name = backups.save_upload(settings, data)
    except backups.BackupError as exc:
        raise _bad(exc) from exc
    return _info(settings, name)


@router.get("/backups/{name}")
def download_backup(name: str, settings: Cfg) -> FileResponse:
    try:
        path = backups.backup_path(settings, name)
    except backups.BackupError as exc:
        raise _bad(exc) from exc
    except backups.BackupNotFound as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="backup not found") from exc
    return FileResponse(path, media_type="application/json", filename=f"football-memories-{name}")


@router.delete("/backups/{name}", status_code=status.HTTP_204_NO_CONTENT)
def delete_backup(name: str, settings: Cfg) -> Response:
    try:
        backups.delete_backup(settings, name)
    except backups.BackupError as exc:
        raise _bad(exc) from exc
    except backups.BackupNotFound as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="backup not found") from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/backups/{name}/restore", response_model=RestoreOut)
def restore_backup(name: str, body: RestoreIn, db: Db, settings: Cfg) -> RestoreOut:
    if body.confirm != "RESTORE":
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, detail='send {"confirm": "RESTORE"} to restore'
        )
    try:
        safety = backups.restore(db, settings, name)
    except backups.BackupError as exc:
        raise _bad(exc) from exc
    except backups.BackupNotFound as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="backup not found") from exc
    return RestoreOut(restored=name, safety_backup=safety)


def _verify_out() -> VerifyStateOut:
    s = integrity.verify_state()
    return VerifyStateOut(
        state=s.state,
        checked=s.checked,
        total=s.total,
        started_at=s.started_at,
        finished_at=s.finished_at,
        results=[VerifyResultOut(**asdict(r)) for r in s.results],
    )


@router.post("/storage/verify", response_model=VerifyStateOut)
def start_verify(request: Request, settings: Cfg, response: Response) -> VerifyStateOut:
    started = integrity.start_verify(request.app.state.session_factory, settings)
    response.status_code = status.HTTP_202_ACCEPTED if started else status.HTTP_200_OK
    return _verify_out()


@router.get("/storage/verify", response_model=VerifyStateOut)
def get_verify() -> VerifyStateOut:
    return _verify_out()


@router.post("/storage/relink", response_model=RelinkOut)
def relink(db: Db, settings: Cfg) -> RelinkOut:
    done, left = integrity.relink_missing(db, settings)
    return RelinkOut(relinked=done, still_missing=left)


@router.post("/storage/rebuild-thumbnails", response_model=RebuildOut)
def rebuild_thumbnails(db: Db, settings: Cfg) -> RebuildOut:
    done, failed = integrity.rebuild_thumbnails(db, settings)
    return RebuildOut(rebuilt=done, failed=failed)
