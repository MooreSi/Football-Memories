"""The shared crest service for hosted libraries (owner decision 2026-11-19).

One small service in the gateway's stack, run from the hosted backend image:

    python -m app.crest_service      (listens on port 8200 of its container)

It looks each club's crest up once, with the same paced lookup the owner's install uses
(`team_logos.cached_crest`), through its crest-only filter, and keeps it in FM_CREST_DIR
for every family. It answers one question, GET /crest?name=..., and nothing else: no
upload, no listing, no docs. Families' own uploads never reach it.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Annotated

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse

from app.services import team_logos


def create_app() -> FastAPI:
    if os.environ.get("FM_CREST_SERVICE"):
        raise RuntimeError("The crest service must look crests up itself, not ask itself.")
    directory = Path(os.environ.get("FM_CREST_DIR", "/crests"))
    app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)

    @app.get("/crest")
    def crest(name: Annotated[str, Query(min_length=1, max_length=200)]) -> FileResponse:
        path = team_logos.cached_crest(name, directory)
        if path is None and not team_logos.settled(name):
            # Owner report 2026-11-20: a source was waiting; this is not "no crest".
            raise HTTPException(503, "Crest sources are busy; ask again later")
        if path is None:
            raise HTTPException(404, "No verified club crest found")
        return FileResponse(path, media_type="image/png")

    return app


if __name__ == "__main__":
    import uvicorn

    # Inside its own container only: the gateway stack publishes no port for it, and its
    # networks are the families' private crest networks and its filter's.
    uvicorn.run(create_app(), host="0.0.0.0", port=8200, log_level="warning")  # noqa: S104
