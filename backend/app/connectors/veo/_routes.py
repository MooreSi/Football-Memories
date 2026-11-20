"""The helper's /veo routes (spec 250). The app's origin checks in create_companion
apply to these too; the password only passes through to the secret store."""

from __future__ import annotations

from typing import Literal
from urllib.parse import quote

from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field, SecretStr

from app.connectors.hudl_account import Credentials
from app.connectors.hudl_capture import CaptureError

from ._parse import team_moments

router = APIRouter(prefix="/veo")


class VeoCredentials(BaseModel):
    username: str = Field(min_length=3, max_length=320)
    password: SecretStr = Field(min_length=1, max_length=1024)


class VeoAction(BaseModel):
    action: Literal[
        "test", "refresh", "shared", "watch", "download", "reel", "moments", "disconnect"
    ]
    match_id: str | None = Field(default=None, max_length=200)
    name: str | None = Field(default=None, max_length=200)
    # Owner request 2026-11-13: a highlight reel from one Veo match.
    moment_ids: list[str] = Field(default_factory=list, max_length=150)
    opening_card: str | None = Field(default=None, max_length=64)
    match_card: str | None = Field(default=None, max_length=64)
    closing_card: str | None = Field(default=None, max_length=64)
    stats_card: str | None = Field(default=None, max_length=64)  # owner request 2026-11-15
    match_label: str | None = Field(default=None, max_length=200)
    combined: bool = True  # moments: one video, else a ZIP of one file each


@router.get("/account")
def account(request: Request) -> dict[str, object]:
    state = request.app.state
    if getattr(state, "veo_configured", None) is None:
        state.veo_configured = state.veo_store.configured()
    status = state.veo.status()
    filename = status.get("filename")
    # A finished reel is listed in the download index, so /files serves it.
    link = (
        f"http://127.0.0.1:8766/files/{state.file_scope}/{quote(filename, safe='/')}"
        if isinstance(filename, str)
        and filename.startswith(("reels/", "moments/"))
        and status.get("state") == "done"
        else None
    )
    return {
        **status,
        "download_url": link,
        "configured": state.veo_configured,
        "shared": len(state.veo.shared_links()),
        "secret_store": getattr(state.veo_store, "label", "secret store"),
    }


@router.post("/credentials")
def save(body: VeoCredentials, request: Request) -> dict[str, bool]:
    state = request.app.state
    if state.veo.status().get("busy"):
        raise CaptureError("Wait for the Veo operation to finish before changing the account.")
    state.veo_store.save(Credentials(body.username, body.password.get_secret_value()))
    state.veo_configured = True
    state.veo.reset()
    return {"saved": True}


@router.post("/forget")
def forget(request: Request) -> dict[str, bool]:
    """Owner request 2026-11-20: forget the Veo account and its cached data; downloads and
    shared match links stay."""
    state = request.app.state
    state.veo.forget()
    state.veo_store.delete()
    state.veo_configured = False
    return {"forgotten": True}


@router.post("/action", status_code=202)
def action(body: VeoAction, request: Request) -> dict[str, bool]:
    state = request.app.state
    if not (state.veo_configured or state.veo_store.configured()):
        # Owner request 2026-11-20: shared match links need no account.
        if body.action == "refresh" and state.veo.shared_links():
            state.veo.start("shared")
            return {"accepted": True}
        if not (body.action == "shared" or state.veo.is_shared(body.match_id)):
            raise CaptureError("Save the Veo email and password first.")
    if body.action in {"reel", "moments"}:
        if not body.match_id or not body.moment_ids:
            raise CaptureError("Choose the Veo highlights for the reel first.")
        reel = {
            "moment_ids": body.moment_ids,
            "opening_card": body.opening_card,
            "match_card": body.match_card,
            "closing_card": body.closing_card,
            "match_label": body.match_label,
            **({"stats_card": body.stats_card} if body.stats_card else {}),
            **({"combined": body.combined} if body.action == "moments" else {}),
        }
        state.veo.start(body.action, body.match_id, name=body.name, reel=reel)
    elif body.action in {"watch", "download"}:
        if not body.match_id:
            raise CaptureError("Select a Veo match first.")
        if body.action == "download" and body.name:
            state.veo.start(body.action, body.match_id, name=body.name)
        else:
            state.veo.start(body.action, body.match_id)
    else:
        state.veo.start(body.action)
    return {"accepted": True}


class SharedLink(BaseModel):
    url: str = Field(min_length=10, max_length=500)


@router.get("/shared")
def shared_links(request: Request) -> list[dict[str, object]]:
    """Owner request 2026-11-20: the saved shared match links, named once read."""
    veo = request.app.state.veo
    titles = {i.get("slug"): i.get("title") for i in veo.library() if i.get("shared")}
    return [{**link, "title": titles.get(link["slug"])} for link in veo.shared_links()]


@router.post("/shared")
def add_shared(body: SharedLink, request: Request) -> dict[str, object]:
    """Save a shared match link and read it straight away, signed out."""
    veo = request.app.state.veo
    slug = veo.add_shared(body.url)
    veo.start("shared")
    return {"saved": True, "slug": slug, "reading": True}


class SharedSlug(BaseModel):
    slug: str = Field(min_length=3, max_length=151)


@router.post("/shared/delete")
def delete_shared(body: SharedSlug, request: Request) -> dict[str, bool]:
    """Forget a link and its match in the list. No request to Veo; downloads stay.
    A POST: the helper allows the page GET and POST only."""
    request.app.state.veo.remove_shared(body.slug)
    return {"deleted": True}


@router.get("/stream/{token}")
def stream(token: str, request: Request) -> Response:
    """Spec 260: one Range read of the match video for the browser's video element."""
    start, end, total, body = request.app.state.veo.stream(token, request.headers.get("range"))
    return Response(
        content=body,
        status_code=206,
        media_type="video/mp4",
        headers={
            "Content-Range": f"bytes {start}-{end}/{total}",
            "Accept-Ranges": "bytes",
            "Cache-Control": "no-store",
        },
    )


@router.get("/library")
def library(request: Request) -> list[dict[str, object]]:
    veo = request.app.state.veo
    poster = getattr(veo, "poster", lambda identity: None)
    return [
        {
            **item,
            "poster_url": f"http://127.0.0.1:8766/veo/match/{item['id']}/poster"
            if poster(str(item.get("id"))) is not None
            else None,
            # Owner request 2026-11-15: team events as moments, worked out from team_data.
            "team_moments": team_moments(item.get("team_data")),
        }
        for item in veo.library()
    ]


@router.get("/match/{identity}/poster")
def match_poster(identity: str, request: Request) -> FileResponse:
    path = request.app.state.veo.poster(identity)
    if path is None:
        raise HTTPException(404, "No poster saved for this match")
    return FileResponse(path, media_type="image/jpeg", headers={"Cache-Control": "max-age=3600"})


@router.get("/club")
def club(request: Request) -> dict[str, object]:
    """Owner request 2026-11-15: the club's names from Veo, and whether its crest is saved."""
    result: dict[str, object] = request.app.state.veo.club()
    return result


@router.get("/crest")
def crest(request: Request) -> FileResponse:
    path = request.app.state.veo.crest()
    if path is None:
        raise HTTPException(404, "No club crest saved from Veo")
    return FileResponse(path, media_type="image/png", headers={"Cache-Control": "no-cache"})
