"""What the desktop helper has downloaded, for the Downloaded screen and Library badges.

Spec 190 (owner request 2026-11-10). One small JSON file in the helper cache records
each completed download. Only entries whose file still exists inside the download
folder are reported, so a file removed in Finder simply disappears from the list.
Full-match captures made before the index existed are recognised by their
`hudl-<capture key>-highest-...` file name. Nothing here moves or deletes files.
"""

from __future__ import annotations

import json
import os
import re
import tempfile
import threading
import time
from pathlib import Path
from typing import Any

from app.connectors.hudl_metadata import capture_key

_CAPTURE = re.compile(r"hudl-([a-zA-Z0-9]+)-highest-[^/]*\.mp4")
KINDS = {"match", "moments", "reel"}


class DownloadIndex:
    def __init__(self, path: Path) -> None:
        self.path = path
        self._lock = threading.Lock()

    def _load(self) -> list[dict[str, Any]]:
        try:
            data = json.loads(self.path.read_text())
        except (OSError, ValueError):
            return []
        return [e for e in data if isinstance(e, dict)] if isinstance(data, list) else []

    def _save(self, entries: list[dict[str, Any]]) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        descriptor, temporary = tempfile.mkstemp(dir=self.path.parent, suffix=".tmp")
        try:
            with os.fdopen(descriptor, "w") as stream:
                json.dump(entries, stream)
            os.replace(temporary, self.path)
        finally:
            Path(temporary).unlink(missing_ok=True)

    def record(
        self,
        kind: str,
        match_id: str | None,
        title: str | None,
        file: Path,
        root: Path,
        moments: list[dict[str, Any]],
        *,
        combined: bool = False,
        matches: list[str] | None = None,
    ) -> None:
        if kind not in KINDS:
            raise ValueError(kind)
        try:
            relative = file.resolve().relative_to(root.resolve()).as_posix()
        except ValueError:
            return  # Never index anything outside the download folder.
        entry = {
            "kind": kind,
            "match_id": match_id,
            "matches": matches or ([match_id] if match_id else []),
            "title": title,
            "file": relative,
            "moment_count": len(moments),
            "codes": sorted({str(m.get("category", "")) for m in moments} - {""}),
            "combined": combined,
            "created": time.time(),
        }
        with self._lock:
            entries = [e for e in self._load() if e.get("file") != relative]
            entries.append(entry)
            self._save(entries)

    def entries(
        self, root: Path, catalogue: list[dict[str, Any]] | None = None
    ) -> list[dict[str, Any]]:
        base = root.resolve()
        found: list[dict[str, Any]] = []
        with self._lock:
            recorded = self._load()
        for entry in recorded:
            path = self._inside(base, str(entry.get("file", "")))
            if path is None:
                continue
            stat = path.stat()
            found.append({**entry, "size": stat.st_size, "modified": stat.st_mtime})
        known = {e["file"] for e in found}
        keys = {capture_key(str(item["id"])): item for item in catalogue or []}
        try:
            names = sorted(p.name for p in base.iterdir())
        except OSError:
            names = []
        for name in names:
            match = _CAPTURE.fullmatch(name)
            if not match or name in known or match.group(1) not in keys:
                continue
            path = self._inside(base, name)
            if path is None:
                continue
            item = keys[match.group(1)]
            stat = path.stat()
            found.append(
                {
                    "kind": "match",
                    "match_id": item["id"],
                    "matches": [item["id"]],
                    "title": item.get("title"),
                    "file": name,
                    "moment_count": 0,
                    "codes": [],
                    "combined": False,
                    "created": stat.st_mtime,
                    "size": stat.st_size,
                    "modified": stat.st_mtime,
                }
            )
        found.sort(key=lambda e: -float(e.get("created") or 0))
        return found

    def contains(self, root: Path, relative: str) -> bool:
        return any(e["file"] == relative for e in self.entries(root))

    @staticmethod
    def _inside(base: Path, relative: str) -> Path | None:
        if not relative or relative.startswith("/") or "\\" in relative:
            return None
        parts = relative.split("/")
        if any(p in {"", ".", ".."} or p.startswith(".") for p in parts) or len(parts) > 2:
            return None
        path = base.joinpath(*parts)
        if path.is_symlink() or not path.is_file():
            return None
        try:
            path.resolve().relative_to(base)
        except ValueError:
            return None
        return path
