"""The only route from a user-supplied name to a filesystem path."""

from __future__ import annotations

import re
from pathlib import Path


class UnsafePath(ValueError):
    pass


def safe_join(root: Path, name: str) -> Path:
    """Resolve `name` under `root`, refusing anything that escapes it (incl. symlinks)."""
    if not name or name in {".", ".."} or Path(name).is_absolute():
        raise UnsafePath(f"not an acceptable file name: {name!r}")
    root_resolved = root.resolve()
    candidate = (root_resolved / name).resolve()
    if candidate == root_resolved or not candidate.is_relative_to(root_resolved):
        raise UnsafePath(f"path escapes its root: {name!r}")
    return candidate


_RESERVED = re.compile(r'[\\/:*?"<>|\x00-\x1f]+')


def sanitize_component(text: str) -> str:
    """Make one folder or file name component safe on macOS, Linux and Windows."""

    def _sep(m: re.Match[str]) -> str:
        before = text[m.start() - 1] if m.start() > 0 else " "
        after = text[m.end()] if m.end() < len(text) else " "
        return "-" if before.isalnum() and after.isalnum() else " - "

    cleaned = _RESERVED.sub(_sep, text)
    cleaned = re.sub(r"\s*-\s*(-\s*)+", " - ", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip(" .-")
    return cleaned or "untitled"
