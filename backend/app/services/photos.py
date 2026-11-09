"""Player profile photos.

Every upload is decoded and re-encoded by ffmpeg into a 512x512 JPEG. That
validates it really is an image, and it drops all embedded metadata (EXIF GPS
location, device, timestamps): these are photos of children (brief section 21).
The client's file name is never used. Only files this module created are ever
deleted (on replace or remove).
"""

from __future__ import annotations

import hashlib
import json
import subprocess
import uuid
from pathlib import Path
from typing import BinaryIO

from sqlalchemy.orm import Session

from app.config import Settings
from app.models import Player
from app.services.players import NotFound

MAX_BYTES = 10 * 1024 * 1024
SIZE = 512
IMAGE_CODECS = {"mjpeg", "png", "webp", "bmp", "tiff"}


class InvalidPhoto(ValueError):
    pass


class PhotoTooLarge(ValueError):
    pass


def _players_dir(settings: Settings) -> Path:
    return settings.library_root / "Players"


def photo_url(player: Player) -> str | None:
    if not player.photo_relpath:
        return None
    version = Path(player.photo_relpath).stem.removeprefix("photo-")
    return f"/api/players/{player.id}/photo?v={version}"


def photo_path(settings: Settings, player: Player) -> Path | None:
    if not player.photo_relpath:
        return None
    path = settings.archive_root / player.photo_relpath
    return path if path.is_file() else None


def _probe_is_still_image(path: Path) -> None:
    proc = subprocess.run(
        ["ffprobe", "-v", "error", "-print_format", "json", "-show_streams", str(path)],
        capture_output=True,
        text=True,
        timeout=30,
        check=False,
    )
    if proc.returncode != 0:
        raise InvalidPhoto("this file is not a picture")
    streams = json.loads(proc.stdout or "{}").get("streams", [])
    if len(streams) != 1 or streams[0].get("codec_name") not in IMAGE_CODECS:
        raise InvalidPhoto("use a JPEG, PNG or WebP picture")


def _reencode(src: Path, dest: Path) -> None:
    proc = subprocess.run(
        [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-i",
            str(src),
            "-vf",
            f"crop='min(iw,ih)':'min(iw,ih)',scale={SIZE}:{SIZE}",
            "-frames:v",
            "1",
            "-map_metadata",
            "-1",
            "-q:v",
            "3",
            "-f",
            "image2",
            "-c:v",
            "mjpeg",
            str(dest),
        ],
        capture_output=True,
        timeout=60,
        check=False,
    )
    if proc.returncode != 0 or not dest.is_file():
        dest.unlink(missing_ok=True)
        raise InvalidPhoto("this picture could not be read")


def save_photo(db: Session, settings: Settings, player_id: int, upload: BinaryIO) -> Player:
    player = db.get(Player, player_id)
    if player is None:
        raise NotFound(f"player {player_id}")

    incoming = _players_dir(settings) / ".incoming"
    incoming.mkdir(parents=True, exist_ok=True)
    token = uuid.uuid4().hex
    raw = incoming / f"{token}.upload"
    encoded = incoming / f"{token}.part.jpg"
    try:
        written = 0
        with raw.open("wb") as out:
            while chunk := upload.read(1024 * 1024):
                written += len(chunk)
                if written > MAX_BYTES:
                    raise PhotoTooLarge("photos must be 10 MB or smaller")
                out.write(chunk)
        _probe_is_still_image(raw)
        _reencode(raw, encoded)

        digest = hashlib.sha256(encoded.read_bytes()).hexdigest()[:16]
        target_dir = _players_dir(settings) / str(player.id)
        target_dir.mkdir(parents=True, exist_ok=True)
        final = target_dir / f"photo-{digest}.jpg"
        encoded.replace(final)

        old = photo_path(settings, player)
        player.photo_relpath = final.relative_to(settings.archive_root).as_posix()
        db.commit()
        if old is not None and old != final:
            old.unlink(missing_ok=True)
        return player
    finally:
        raw.unlink(missing_ok=True)
        encoded.unlink(missing_ok=True)
        if incoming.is_dir() and not any(incoming.iterdir()):
            incoming.rmdir()


def remove_photo(db: Session, settings: Settings, player_id: int) -> Player:
    player = db.get(Player, player_id)
    if player is None:
        raise NotFound(f"player {player_id}")
    old = photo_path(settings, player)
    player.photo_relpath = None
    db.commit()
    if old is not None:
        old.unlink(missing_ok=True)
    return player
