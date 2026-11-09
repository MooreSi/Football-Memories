"""Connector adapters (brief section 4). The UI renders only what a connector
reports it can do, so a capability must never be claimed without working code."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Protocol


@dataclass(frozen=True)
class Capabilities:
    list_teams: bool = False
    list_matches: bool = False
    retrieve_tags: bool = False
    play_video: bool = False
    download_full_video: bool = False
    download_clips: bool = False
    import_files: bool = False

    def as_dict(self) -> dict[str, bool]:
        return asdict(self)


@dataclass(frozen=True)
class ConnectorInfo:
    id: str
    name: str
    available: bool
    capabilities: Capabilities
    reason: str = ""
    docs: str = ""
    limitations: list[str] = field(default_factory=list)


class Connector(Protocol):
    def info(self) -> ConnectorInfo: ...
