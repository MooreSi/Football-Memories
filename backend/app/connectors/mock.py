"""Test-only connector. Never registered in the production API (brief section 28)."""

from __future__ import annotations

from app.connectors.base import Capabilities, ConnectorInfo


class MockConnector:
    def info(self) -> ConnectorInfo:
        return ConnectorInfo(
            id="mock",
            name="Mock (tests only)",
            available=True,
            capabilities=Capabilities(**{k: True for k in Capabilities().as_dict()}),
            reason="Synthetic data for automated tests.",
        )
