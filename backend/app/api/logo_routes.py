from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse

from app.api.deps import get_settings
from app.config import Settings
from app.services.team_logos import cached_crest

router = APIRouter(prefix="/api")


@router.get("/team-logo")
def team_logo(
    name: Annotated[str, Query(min_length=1, max_length=200)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> FileResponse:
    path = cached_crest(name, settings.library_root / "TeamLogos")
    if path is None:
        raise HTTPException(404, "No verified club crest found")
    return FileResponse(
        path, media_type="image/png", headers={"Cache-Control": "public, max-age=86400"}
    )
