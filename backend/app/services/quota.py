"""Hosted gateway task 080 (owner decision 011): a disk limit for a hosted user's instance.

FM_QUOTA_BYTES caps what the archive and import folders may hold together. It is unset on
the owner's own install, where nothing is limited (golden rule 5). The check runs before
any byte is written, so a refused upload or import leaves nothing behind.
"""

from __future__ import annotations

import os
from pathlib import Path

from app.config import Settings


class QuotaExceeded(ValueError):
    """Saving this would pass the instance's disk limit; nothing was written."""


def _size(root: Path) -> int:
    total = 0
    for folder, _dirs, files in os.walk(root, followlinks=False):
        for name in files:
            try:
                total += (Path(folder) / name).lstat().st_size
            except FileNotFoundError:
                continue
    return total


def used_bytes(settings: Settings) -> int:
    roots = {settings.archive_root, settings.import_root}
    return sum(_size(root) for root in roots if root.is_dir())


def message(settings: Settings) -> str:
    gb = (settings.quota_bytes or 0) / 1024**3
    return f"This would pass your storage limit of {gb:.0f} GB, so nothing was saved."


def check(settings: Settings, incoming: int, used: int | None = None) -> None:
    """Raise QuotaExceeded if `incoming` more bytes would pass the limit."""
    if settings.quota_bytes is None:
        return
    if (used_bytes(settings) if used is None else used) + incoming > settings.quota_bytes:
        raise QuotaExceeded(message(settings))
