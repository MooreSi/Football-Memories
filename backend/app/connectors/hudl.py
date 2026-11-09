from __future__ import annotations

from app.connectors.base import Capabilities, ConnectorInfo

REASON = (
    "Hudl does not offer a public API for team video, and Hudl's Terms of Service "
    "(section 3.2) prohibit automated access such as bots and scrapers. This connector stays "
    "disabled until Hudl provides an official integration or written permission."
)


class HudlConnector:
    """Deliberately reports no capabilities. See HUDL_INTEGRATION.md before changing this."""

    def info(self) -> ConnectorInfo:
        return ConnectorInfo(
            id="hudl",
            name="Hudl",
            available=False,
            capabilities=Capabilities(),
            reason=REASON,
            docs="HUDL_INTEGRATION.md",
            limitations=[
                "Use Hudl's own download/export, then import the file here.",
            ],
        )
