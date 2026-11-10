"""Private metadata and image cache; signed source addresses never go to disk."""

from __future__ import annotations

import hashlib
import json
import math
import os
import re
import tempfile
from datetime import date
from pathlib import Path
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from app.connectors.hudl_capture import Moment


def age_group(title: str) -> str:
    match = re.search(r"\bU(?:nder\s*)?(\d{1,2})(?:s)?(?:\s*/\s*U?(\d{1,2}))?\b", title, re.I)
    if not match:
        return "Unclassified"
    return f"U{int(match[1])}" + (f"/U{int(match[2])}" if match[2] else "")


def season_label(title: str) -> str:
    prefix = re.match(r"^(\d{2})(\d{2})(\d{2})(?:\s|$)", title.strip())
    if not prefix:
        return "Unclassified"
    try:
        played = date(2000 + int(prefix[1]), int(prefix[2]), int(prefix[3]))
    except ValueError:
        return "Unclassified"
    start = played.year if played.month >= 7 else played.year - 1
    return f"{start}/{(start + 1) % 100:02d}"


def capture_key(identity: str) -> str:
    return hashlib.sha256(identity.encode()).hexdigest()[:16]


def optional_moments(
    payloads: list[dict[str, Any]], identity: str, duration: float
) -> tuple[list[Moment], str]:
    """Do not claim unverified tag times; keep the video independent of tag sync."""
    from app.connectors.hudl_capture import UnsyncedTags, clip_tag_padding, parse_moments

    try:
        moments = parse_moments(clip_tag_padding(payloads, identity, duration), identity, set())
    except UnsyncedTags:
        return [], "unsynced"
    return moments, "synced" if moments else "none"


class MatchCache:
    def __init__(self, directory: Path) -> None:
        self.directory = directory

    def path(self, identity: str, suffix: str = ".json") -> Path:
        return self.directory / (hashlib.sha256(identity.encode()).hexdigest() + suffix)

    def write(self, identity: str, details: dict[str, Any]) -> None:
        clean: dict[str, Any] = {"moments": []}
        for item in details.get("moments", []):
            if not isinstance(item, dict):
                continue
            start, length = item.get("time_s"), item.get("duration_s")
            if (
                isinstance(start, (int, float))
                and isinstance(length, (int, float))
                and math.isfinite(start)
                and math.isfinite(length)
                and start >= 0
                and length >= 0
                and isinstance(item.get("id"), str)
                and isinstance(item.get("category"), str)
            ):
                clean["moments"].append(
                    {
                        "id": item["id"][:300],
                        "time_s": start,
                        "duration_s": length,
                        "category": item["category"][:200],
                    }
                )
        if details.get("tag_status") in {"unsynced", "synced", "none"}:
            clean["tag_status"] = details["tag_status"]
        for key in ("duration_s", "quality_height"):
            value = details.get(key)
            if isinstance(value, (int, float)) and math.isfinite(value) and value > 0:
                clean[key] = value
        self.directory.mkdir(parents=True, exist_ok=True, mode=0o700)
        fd, name = tempfile.mkstemp(dir=self.directory)
        try:
            with os.fdopen(fd, "w") as stream:
                json.dump(clean, stream)
            os.replace(name, self.path(identity))
        finally:
            Path(name).unlink(missing_ok=True)

    def read(self, identity: str) -> dict[str, Any]:
        try:
            data = json.loads(self.path(identity).read_text())
            return data if isinstance(data, dict) else {}
        except (OSError, ValueError):
            return {}

    def image(self, identity: str, content: bytes) -> None:
        if len(content) > 5_000_000 or not content.startswith(
            (b"\xff\xd8\xff", b"\x89PNG\r\n\x1a\n", b"RIFF")
        ):
            return
        self.directory.mkdir(parents=True, exist_ok=True, mode=0o700)
        try:
            fd = os.open(self.path(identity, ".image"), os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        except FileExistsError:
            return
        with os.fdopen(fd, "wb") as stream:
            stream.write(content)
