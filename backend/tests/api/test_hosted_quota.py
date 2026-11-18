"""Hosted gateway task 080 (owner decision 011): a hosted user's instance has a disk
limit, FM_QUOTA_BYTES. Uploads and imports past it are refused before anything is
written. Without a quota (the owner's own install) nothing changes (golden rule 5)."""

from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session, sessionmaker

from app.config import Settings
from app.main import create_app

URL = "/api/imports/upload"


def _client(settings: Settings, factory: sessionmaker[Session], quota: int) -> Iterator[TestClient]:
    limited = settings.model_copy(update={"quota_bytes": quota})
    with TestClient(create_app(limited, session_factory=factory)) as c:
        yield c


@pytest.fixture
def small_quota(settings: Settings, session_factory: sessionmaker[Session]) -> Iterator[TestClient]:
    yield from _client(settings, session_factory, 10_000)


def _leftovers(settings: Settings) -> list[Path]:
    folder = settings.import_root / "uploaded"
    return list(folder.iterdir()) if folder.exists() else []


def test_no_quota_is_the_default() -> None:
    assert Settings().quota_bytes is None


def test_an_upload_within_the_quota_is_saved(small_quota: TestClient, settings: Settings) -> None:
    r = small_quota.put(URL, params={"filename": "a.mp4"}, content=b"x" * 4000)
    assert r.status_code == 201, r.text
    assert (settings.import_root / "uploaded" / "a.mp4").stat().st_size == 4000


def test_an_upload_past_the_quota_is_refused_and_leaves_nothing(
    small_quota: TestClient, settings: Settings
) -> None:
    (settings.archive_root / "existing.bin").write_bytes(b"e" * 8000)
    r = small_quota.put(URL, params={"filename": "big.mp4"}, content=b"x" * 4000)
    assert r.status_code == 413
    assert "limit" in r.json()["detail"]
    assert _leftovers(settings) == []
    assert (settings.archive_root / "existing.bin").read_bytes() == b"e" * 8000


def test_the_same_upload_passes_without_a_quota(client: TestClient, settings: Settings) -> None:
    """Negative control: the refusal above comes from the quota, not the size."""
    (settings.archive_root / "existing.bin").write_bytes(b"e" * 8000)
    r = client.put(URL, params={"filename": "big.mp4"}, content=b"x" * 4000)
    assert r.status_code == 201


def test_an_import_past_the_quota_is_refused_before_copying(
    settings: Settings, session_factory: sessionmaker[Session], inbox_video: Path
) -> None:
    used = sum(p.stat().st_size for p in settings.import_root.rglob("*") if p.is_file())
    for c in _client(settings, session_factory, used + 10):
        r = c.post(
            "/api/imports",
            json={
                "filename": inbox_video.name,
                "team_name": "Riverside U12",
                "season_label": "2026/27",
                "opponent": "Rovers",
                "match_date": "2026-09-01",
            },
        )
        assert r.status_code == 413, r.text
    assert not any(p.is_file() for p in settings.archive_root.rglob("*"))
