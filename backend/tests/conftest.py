"""Shared fixtures. Every test runs with the network blocked (golden rule 2),
inside temp directories, against a fresh database.

Database: SQLite in memory by default; set TEST_DATABASE_URL to a PostgreSQL
URL to run the same suite against Postgres (see TESTING.md).
"""

from __future__ import annotations

import os
import shutil
import socket
import subprocess
from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import Settings
from app.db import Base
from app.main import create_app

_LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1", None, ""}
_real_getaddrinfo = socket.getaddrinfo
_real_connect = socket.socket.connect


def _guarded_getaddrinfo(host, *args, **kwargs):  # type: ignore[no-untyped-def]
    if host not in _LOCAL_HOSTS:
        raise RuntimeError(f"network disabled in tests (lookup of {host!r})")
    return _real_getaddrinfo(host, *args, **kwargs)


def _guarded_connect(self, address):  # type: ignore[no-untyped-def]
    if self.family == socket.AF_UNIX:
        return _real_connect(self, address)
    host = address[0] if isinstance(address, tuple) else address
    if host not in _LOCAL_HOSTS:
        raise RuntimeError(f"network disabled in tests (connect to {host!r})")
    return _real_connect(self, address)


@pytest.fixture(autouse=True)
def _block_network(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(socket, "getaddrinfo", _guarded_getaddrinfo)
    monkeypatch.setattr(socket.socket, "connect", _guarded_connect)


@pytest.fixture
def settings(tmp_path: Path) -> Settings:
    archive = tmp_path / "archive"
    inbox = tmp_path / "inbox"
    archive.mkdir()
    inbox.mkdir()
    return Settings(
        archive_root=archive,
        import_root=inbox,
        database_url=os.environ.get("TEST_DATABASE_URL", "sqlite://"),
    )


@pytest.fixture
def engine(settings: Settings):  # type: ignore[no-untyped-def]
    if settings.database_url.startswith("sqlite"):
        eng = create_engine(
            settings.database_url,
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
    else:
        eng = create_engine(settings.database_url)
    Base.metadata.drop_all(eng)
    Base.metadata.create_all(eng)
    yield eng
    Base.metadata.drop_all(eng)
    eng.dispose()


@pytest.fixture
def session_factory(engine) -> sessionmaker[Session]:  # type: ignore[no-untyped-def]
    return sessionmaker(bind=engine, expire_on_commit=False)


@pytest.fixture
def db(session_factory: sessionmaker[Session]) -> Iterator[Session]:
    with session_factory() as s:
        yield s


@pytest.fixture
def client(settings: Settings, session_factory: sessionmaker[Session]) -> Iterator[TestClient]:
    app = create_app(settings, session_factory=session_factory)
    with TestClient(app) as c:
        yield c


def _make_media(path: Path, seconds: int, size: str = "320x240") -> Path:
    """Generate a tiny synthetic match video. Never real footage."""
    if shutil.which("ffmpeg") is None:
        pytest.fail("ffmpeg is required for the media tests (see DEVELOPMENT.md)")
    subprocess.run(
        [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-f",
            "lavfi",
            "-i",
            f"testsrc=size={size}:rate=25",
            "-f",
            "lavfi",
            "-i",
            "sine=frequency=440:sample_rate=48000",
            "-t",
            str(seconds),
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            "-shortest",
            str(path),
        ],
        check=True,
    )
    return path


@pytest.fixture(scope="session")
def tiny_video(tmp_path_factory: pytest.TempPathFactory) -> Path:
    return _make_media(tmp_path_factory.mktemp("media") / "tiny.mp4", seconds=4)


@pytest.fixture(scope="session")
def other_tiny_video(tmp_path_factory: pytest.TempPathFactory) -> Path:
    return _make_media(tmp_path_factory.mktemp("media2") / "other.mp4", seconds=3, size="160x120")


@pytest.fixture
def inbox_video(settings: Settings, tiny_video: Path) -> Path:
    target = settings.import_root / "U12 v Rovers 2026-10-18.mp4"
    shutil.copyfile(tiny_video, target)
    return target
