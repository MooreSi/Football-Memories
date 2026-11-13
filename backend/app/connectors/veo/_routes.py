"""The helper's /veo routes (spec 250). The app's origin checks in create_companion
apply to these too; the password only passes through to the secret store."""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Request, Response
from pydantic import BaseModel, Field, SecretStr

from app.connectors.hudl_account import Credentials
from app.connectors.hudl_capture import CaptureError

router = APIRouter(prefix="/veo")


class VeoCredentials(BaseModel):
    username: str = Field(min_length=3, max_length=320)
    password: SecretStr = Field(min_length=1, max_length=1024)


class VeoAction(BaseModel):
    action: Literal["test", "refresh", "watch", "download"]
    match_id: str | None = Field(default=None, max_length=200)


@router.get("/account")
def account(request: Request) -> dict[str, object]:
    state = request.app.state
    if getattr(state, "veo_configured", None) is None:
        state.veo_configured = state.veo_store.configured()
    return {
        **state.veo.status(),
        "configured": state.veo_configured,
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


@router.post("/action", status_code=202)
def action(body: VeoAction, request: Request) -> dict[str, bool]:
    state = request.app.state
    if not (state.veo_configured or state.veo_store.configured()):
        raise CaptureError("Save the Veo email and password first.")
    if body.action in {"watch", "download"}:
        if not body.match_id:
            raise CaptureError("Select a Veo match first.")
        state.veo.start(body.action, body.match_id)
    else:
        state.veo.start(body.action)
    return {"accepted": True}


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
    items: list[dict[str, object]] = request.app.state.veo.library()
    return items
