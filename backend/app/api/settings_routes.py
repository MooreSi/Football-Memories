"""Settings (clip timing), storage health and score corrections (spec 210)."""

from __future__ import annotations

from dataclasses import asdict
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_settings
from app.config import Settings
from app.schemas import (
    AppSettingsOut,
    AppSettingsPatch,
    ArchiveSummaryOut,
    FolderHealthOut,
    HomeTeamsOut,
    HomeTeamsPatch,
    MissingFileOut,
    ScoreCorrectionIn,
    StorageHealthOut,
)
from app.services import app_settings, scores, storage

router = APIRouter(prefix="/api")
Db = Annotated[Session, Depends(get_db)]
Cfg = Annotated[Settings, Depends(get_settings)]


def _out(t: app_settings.ClipTiming) -> AppSettingsOut:
    return AppSettingsOut(clip_pre_s=t.pre_s, clip_post_s=t.post_s)


@router.get("/settings", response_model=AppSettingsOut)
def get_app_settings(db: Db) -> AppSettingsOut:
    return _out(app_settings.clip_timing(db))


@router.put("/settings", response_model=AppSettingsOut)
def put_app_settings(body: AppSettingsPatch, db: Db) -> AppSettingsOut:
    return _out(app_settings.update_clip_timing(db, body.clip_pre_s, body.clip_post_s))


@router.get("/settings/home-teams", response_model=HomeTeamsOut)
def get_home_teams(db: Db) -> HomeTeamsOut:
    return HomeTeamsOut(**app_settings.home_teams(db))


@router.put("/settings/home-teams", response_model=HomeTeamsOut)
def put_home_teams(body: HomeTeamsPatch, db: Db) -> HomeTeamsOut:
    return HomeTeamsOut(**app_settings.update_home_teams(db, body.model_dump()))


@router.get("/storage/health", response_model=StorageHealthOut)
def storage_health(db: Db, settings: Cfg) -> StorageHealthOut:
    folders = [
        storage.folder_health(settings.archive_root, "archive", needs_write=True),
        storage.folder_health(settings.import_root, "inbox", needs_write=False),
    ]
    summary = storage.archive_summary(db, settings)
    return StorageHealthOut(
        folders=[FolderHealthOut(**asdict(f)) for f in folders],
        archive=ArchiveSummaryOut(
            indexed_files=summary.indexed_files,
            indexed_bytes=summary.indexed_bytes,
            missing=[MissingFileOut(**asdict(m)) for m in summary.missing],
        ),
    )


@router.get("/scores")
def get_scores(db: Db) -> dict[str, dict[str, int]]:
    """Spec 210: the owner's corrected scores, by Hudl match id."""
    return scores.corrections(db)


@router.put("/scores")
def put_score(body: ScoreCorrectionIn, db: Db) -> dict[str, dict[str, int]]:
    scores.correct(db, body.match_id, body.ours, body.theirs)
    return scores.corrections(db)
