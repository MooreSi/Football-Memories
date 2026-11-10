"""Secret types and metadata-only match catalogue. No authenticated networking here."""

from __future__ import annotations

import json
import os
import re
import tempfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any
from urllib.parse import urljoin, urlsplit

from pydantic import SecretStr

from app.connectors.hudl_browser import match_id
from app.connectors.hudl_capture import CaptureError


@dataclass(repr=False)
class Credentials:
    username: str = field(repr=False)
    password: SecretStr = field(repr=False)

    def __init__(self, username: str, password: str) -> None:
        self.username = username.strip()
        self.password = SecretStr(password)

    def __repr__(self) -> str:
        return "Credentials(<redacted>)"


def extract_matches(links: list[dict[str, str]]) -> list[dict[str, str]]:
    matches: dict[str, dict[str, str]] = {}
    for link in links:
        url = urljoin("https://www.hudl.com", link.get("href", ""))
        parsed = urlsplit(url)
        if parsed.netloc == "app.hudl.com":
            url = parsed._replace(netloc="www.hudl.com").geturl()
        try:
            identity = match_id(url)
        except (CaptureError, ValueError):
            continue
        title = " ".join(link.get("text", "").split())[:300]
        if not title:
            continue
        matches.setdefault(
            identity,
            {
                "id": identity,
                "title": title,
                "url": f"https://www.hudl.com/watch/video/{identity}",
            },
        )
    return list(matches.values())


def team_libraries(links: list[dict[str, str]]) -> list[dict[str, str]]:
    """Read only team routes supplied by Hudl's normal navigation selector."""
    from app.connectors.hudl_metadata import age_group

    teams: dict[str, dict[str, str]] = {}
    for link in links:
        url = link.get("href", "")
        context = re.fullmatch(r"https://www\.hudl\.com/ui/webnav/context/team/([0-9]+)/?", url)
        library = re.fullmatch(
            r"https://(?:app|www)\.hudl\.com/watch/team/([0-9]+)/analyze/?#*", url
        )
        found = context or library
        group = age_group(link.get("text", ""))
        if found and re.fullmatch(r"U[0-9]{1,2}", group):
            teams[found.group(1)] = {
                "url": url.split("#", 1)[0],
                "age_group": group,
                "team_id": found.group(1),
            }
    return list(teams.values())


def clean_catalogue(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    clean: dict[str, dict[str, Any]] = {}
    for item in items:
        for match in extract_matches(
            [{"href": item.get("url", ""), "text": item.get("title", "")}]
        ):
            saved = clean.setdefault(match["id"], dict(match))
            groups = item.get("age_groups")
            if isinstance(groups, list):
                valid = [
                    g for g in groups if isinstance(g, str) and re.fullmatch(r"U[0-9]{1,2}", g)
                ]
                saved["age_groups"] = sorted(
                    set(saved.get("age_groups", []) + valid), key=lambda g: int(g[1:])
                )
    return list(clean.values())


class Catalogue:
    def __init__(self, directory: Path) -> None:
        self.directory = directory
        self.path = directory / "matches.json"

    def replace(self, items: list[dict[str, Any]]) -> None:
        clean = clean_catalogue(items)
        self.directory.mkdir(parents=True, exist_ok=True, mode=0o700)
        descriptor, temporary = tempfile.mkstemp(dir=self.directory, suffix=".tmp")
        try:
            with os.fdopen(descriptor, "w") as stream:
                json.dump(clean, stream)
            os.replace(temporary, self.path)
        finally:
            Path(temporary).unlink(missing_ok=True)

    def items(self) -> list[dict[str, Any]]:
        try:
            data = json.loads(self.path.read_text())
            if not isinstance(data, list):
                return []
            return clean_catalogue([i for i in data if isinstance(i, dict)])
        except (OSError, ValueError):
            return []

    def find(self, identity: str) -> dict[str, Any]:
        for item in self.items():
            if item["id"] == identity:
                return item
        raise CaptureError("Refresh matches and select an available match first.")


def library_matches(payload: dict[str, Any]) -> list[dict[str, str]]:
    data = payload.get("data") or {}
    library = data.get("library") or {} if isinstance(data, dict) else {}
    if not isinstance(library, dict):
        return []
    links = []
    for edge in library.get("edges", []):
        node = edge.get("node") or {} if isinstance(edge, dict) else {}
        if (
            node.get("__typename") == "VideoItem"
            and not node.get("deletedAt")
            and isinstance(node.get("id"), str)
            and isinstance(node.get("title"), str)
        ):
            links.append(
                {"href": f"https://www.hudl.com/watch/video/{node['id']}", "text": node["title"]}
            )
    return extract_matches(links)
