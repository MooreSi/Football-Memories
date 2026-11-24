"""Bounded local analysis derivatives from the same authorised Veo source flow."""

from __future__ import annotations

import hashlib
import json
import re
import secrets
from pathlib import Path
from typing import TYPE_CHECKING, Any

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse

from app.connectors.hudl_capture import CaptureError
from app.services.media import probe
from app.services.publish import publish_new

from ._reels import _cut, _match_source

if TYPE_CHECKING:
    from ._connection import VeoConnection

router = APIRouter()


def export_sample(connection: VeoConnection, identity: str, window: dict[str, Any]) -> None:
    item = connection._match(identity) or {}
    start, duration = float(window["start_s"]), float(window["duration_s"])
    if not 0 <= start or not 0 < duration <= 600.1:
        raise CaptureError("Choose an analysis window of at most ten minutes.")
    total = item.get("duration_s")
    if isinstance(total, (int, float)) and start + duration > total + 0.1:
        raise CaptureError("The analysis window extends past this match.")
    ticket = secrets.token_hex(16)
    output = connection.directory / "analysis" / ticket
    output.mkdir(parents=True, exist_ok=False)
    partial = output / "sample.part.mp4"
    connection._report(message="Preparing the selected analysis window…", analysis_ticket=None)
    with _match_source(connection, identity, connection._folder()) as (address, relay):
        _cut(address, start, duration, partial)
        if relay is not None and relay.failure is not None:
            raise CaptureError("Veo's video could not be read. Nothing was retried.")
    info = probe(partial)
    if info.video_codec != "h264" or abs(info.duration_s - duration) > 0.1:
        raise CaptureError("The analysis clip was incomplete; its partial file was kept.")
    target = output / "sample.mp4"
    publish_new(partial, target)
    with target.open("rb") as stream:
        checksum = hashlib.file_digest(stream, "sha256").hexdigest()
    metadata = {
        "match_id": identity,
        "title": item.get("title") or "Veo match",
        "duration_s": info.duration_s,
        "source_offset_s": start,
        "sha256": checksum,
        "size_bytes": target.stat().st_size,
        "tags": {
            "moments": item.get("moments") or [],
            "team_data": {"events": (item.get("team_data") or {}).get("events", [])},
        },
    }
    with (output / "info.json").open("x") as f:
        json.dump(metadata, f, allow_nan=False)
    connection._report(
        state="done",
        progress=None,
        match_id=identity,
        analysis_ticket=ticket,
        message="Analysis window ready for Video Lab.",
    )


def _folder(request: Request, ticket: str) -> Path:
    if not re.fullmatch(r"[a-f0-9]{32}", ticket):
        raise HTTPException(404, "Analysis clip unavailable.")
    connection: VeoConnection = request.app.state.veo
    base = connection.directory / "analysis"
    folder = base / ticket
    if base.is_symlink() or folder.is_symlink() or not (folder / "info.json").is_file():
        raise HTTPException(404, "Analysis clip unavailable.")
    return folder


@router.get("/analysis/{ticket}/info")
def sample_info(ticket: str, request: Request) -> Any:
    path = _folder(request, ticket) / "info.json"
    if path.is_symlink():
        raise HTTPException(404, "Analysis clip unavailable.")
    return json.loads(path.read_text())


@router.get("/analysis/{ticket}/video")
def sample_video(ticket: str, request: Request) -> FileResponse:
    path = _folder(request, ticket) / "sample.mp4"
    if path.is_symlink() or not path.is_file():
        raise HTTPException(404, "Analysis clip unavailable.")
    return FileResponse(path, media_type="video/mp4")
