from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session, sessionmaker

from app.api.moment_routes import router as moment_router
from app.api.player_routes import router as player_router
from app.api.routes import router
from app.api.settings_routes import router as settings_router
from app.config import Settings
from app.db import make_session_factory
from app.logging_setup import configure_logging


def create_app(
    settings: Settings | None = None,
    session_factory: sessionmaker[Session] | None = None,
) -> FastAPI:
    settings = settings or Settings()
    configure_logging(settings.log_level)
    app = FastAPI(
        title="Football Memories API",
        version="0.1.0",
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
    )
    app.state.settings = settings
    app.state.session_factory = session_factory or make_session_factory(settings.database_url)
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
    return app
