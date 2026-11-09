from __future__ import annotations

from app.connectors.base import Capabilities, ConnectorInfo

REASON = (
    "Background account sync is not connected. The desktop capture helper can save "
    "an authorized match and its Sportscode tags using your own browser sign-in; "
    "then import the captured files here. Hudl's Terms require permission for automated access."
)


class HudlConnector:
    """Server sync stays unavailable; desktop capture is a separate local workflow."""

    def info(self) -> ConnectorInfo:
        return ConnectorInfo(
            id="hudl",
            name="Hudl",
            available=False,
            capabilities=Capabilities(),
            reason=REASON,
            docs="HUDL_INTEGRATION.md",
            limitations=[
                "Each user needs permission for automated access and archiving their footage.",
                "The capture helper runs on your desktop with Chrome and ffmpeg, outside Docker.",
                "Player codes must be selected explicitly; labels are not guessed to be players.",
            ],
        )
