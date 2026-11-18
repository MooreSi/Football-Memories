"""Owner request 2026-11-14: a video added on the Import page.

It is saved in the import folder's `uploaded/` subfolder (the rest of the import
folder stays read-only to the app), written to a hidden `.part` file first and then
published under a name no file has yet: an existing file is never replaced
(golden rule 4). The importer then copies it into the library as it does any other
import-folder file; the upload itself is kept.
"""

from __future__ import annotations

import contextlib
import os
import secrets
from collections.abc import AsyncIterator
from pathlib import Path

from app.config import Settings
from app.services import quota
from app.services.importer import VIDEO_EXTENSIONS
from app.services.paths import sanitize_component
from app.services.publish import publish_new

FOLDER = "uploaded"
MAX_BYTES = 50 * 1024**3  # 50 GB, well above a 90-minute 4K match


class UploadRefused(ValueError):
    """The upload is not acceptable; nothing was kept."""


def upload_folder(settings: Settings) -> Path:
    return settings.import_root / FOLDER


def _clean_name(filename: str) -> str:
    if not filename or "/" in filename or "\\" in filename or filename in {".", ".."}:
        raise UploadRefused("Choose a video file.")
    name = sanitize_component(filename)
    if Path(name).suffix.lower() not in VIDEO_EXTENSIONS or not Path(name).stem:
        raise UploadRefused("Only video files can be imported (.mp4, .mov, .mkv and similar).")
    return name


def _free_target(folder: Path, name: str, part: Path) -> Path:
    stem, suffix = Path(name).stem, Path(name).suffix
    for number in range(1, 1000):
        target = folder / (name if number == 1 else f"{stem} ({number}){suffix}")
        try:
            publish_new(part, target)
        except FileExistsError:
            continue
        return target
    raise UploadRefused("Too many files with that name in the import folder.")


async def save_upload(settings: Settings, filename: str, chunks: AsyncIterator[bytes]) -> Path:
    """Write the streamed video into uploaded/ and return where it landed."""
    name = _clean_name(filename)
    folder = upload_folder(settings)
    try:
        folder.mkdir(parents=True, exist_ok=True)
    except OSError as error:
        raise UploadRefused(
            "The import folder cannot be written to, so the video was not saved. "
            "Copy it into the import folder instead."
        ) from error
    used = quota.used_bytes(settings) if settings.quota_bytes is not None else 0
    part = folder / f".{secrets.token_hex(8)}.part"
    size = 0
    try:
        with part.open("xb") as out:
            async for chunk in chunks:
                size += len(chunk)
                if size > MAX_BYTES:
                    raise UploadRefused("That video is larger than 50 GB; it was not saved.")
                quota.check(settings, size, used)
                out.write(chunk)
            out.flush()
            os.fsync(out.fileno())
        if size == 0:
            raise UploadRefused("The video was empty; nothing was saved.")
        return _free_target(folder, name, part)
    finally:
        # Only our own hidden .part is ever removed. After a hard-link publish it is a
        # second name for the saved file; after a move it no longer exists.
        with contextlib.suppress(FileNotFoundError):
            part.unlink()
