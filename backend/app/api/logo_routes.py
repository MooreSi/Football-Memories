from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse

from app.api.deps import get_settings
from app.config import Settings
from app.services.team_logos import CREST_LIMIT, cached_crest, crest_type, save_crest

router = APIRouter(prefix="/api")


@router.get("/team-logo")
def team_logo(
    name: Annotated[str, Query(min_length=1, max_length=200)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> FileResponse:
    path = cached_crest(name, settings.library_root / "TeamLogos")
    if path is None:
        raise HTTPException(404, "No verified club crest found")
    with path.open("rb") as stream:
        kind = crest_type(stream.read(16)) or "image/png"
    return FileResponse(path, media_type=kind, headers={"Cache-Control": "public, max-age=86400"})


@router.post("/team-logo")
async def upload_team_logo(
    name: Annotated[str, Form(min_length=1, max_length=200)],
    file: Annotated[UploadFile, File()],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, str]:
    """Owner request 2026-11-13: a crest the owner supplies for a club."""
    data = await file.read(CREST_LIMIT + 1)
    try:
        save_crest(name, data, settings.library_root / "TeamLogos")
    except ValueError as error:
        raise HTTPException(400, str(error)) from None
    return {"saved": name}
