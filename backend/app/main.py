from __future__ import annotations

import asyncio
import contextlib
import logging
from collections.abc import AsyncIterator
from datetime import UTC, datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session, sessionmaker

from app.api.backup_routes import router as backup_router
from app.api.moment_routes import router as moment_router
from app.api.player_routes import router as player_router
from app.api.routes import router
from app.api.settings_routes import router as settings_router
from app.config import Settings
from app.db import make_session_factory
from app.logging_setup import configure_logging
from app.services import backups

log = logging.getLogger(__name__)
AUTO_BACKUP_CHECK_SECONDS = 3600


async def _auto_backup_loop(factory: sessionmaker[Session], settings: Settings) -> None:
    """Hourly check; makes a backup when none was made in the last 24 h."""
    while True:
        try:

            def run() -> str | None:
                with factory() as db:
                    return backups.run_auto_backup_if_due(db, settings, datetime.now(UTC))

            made = await asyncio.to_thread(run)
            if made:
                log.info("automatic backup written: %s", made)
        except Exception:
            log.exception("automatic backup failed")
        await asyncio.sleep(AUTO_BACKUP_CHECK_SECONDS)


def create_app(
    settings: Settings | None = None,
    session_factory: sessionmaker[Session] | None = None,
) -> FastAPI:
    settings = settings or Settings()
    configure_logging(settings.log_level)
    factory = session_factory or make_session_factory(settings.database_url)

    @contextlib.asynccontextmanager
    async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
        task = (
            asyncio.create_task(_auto_backup_loop(factory, settings))
            if settings.auto_backup
            else None
        )
        try:
            yield
        finally:
            if task:
                task.cancel()
                with contextlib.suppress(asyncio.CancelledError):
                    await task

    app = FastAPI(
        title="Football Memories API",
        version="0.1.0",
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
        lifespan=lifespan,
    )
    app.state.settings = settings
    app.state.session_factory = factory
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Content-Type", "Range"],
    )
    app.include_router(router)
    app.include_router(player_router)
    app.include_router(moment_router)
    app.include_router(settings_router)
    app.include_router(backup_router)
    return app
