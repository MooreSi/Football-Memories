from __future__ import annotations

from app.connectors.base import Capabilities, ConnectorInfo


class LocalImportConnector:
    """Imports match files the owner obtained legitimately, with optional tag sidecars."""

    def info(self) -> ConnectorInfo:
        return ConnectorInfo(
            id="local_import",
            name="Import from folder",
            available=True,
            capabilities=Capabilities(retrieve_tags=True, play_video=True, import_files=True),
            reason="Import match files you downloaded through Hudl's own features.",
            docs="HUDL_INTEGRATION.md",
            limitations=[
                "Does not discover new matches by itself: files are added to the import folder.",
                "Tags arrive only through a sidecar CSV (<video name>.tags.csv).",
            ],
        )
