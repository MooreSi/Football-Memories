from __future__ import annotations

from app.connectors.base import Connector
from app.connectors.hudl import HudlConnector
from app.connectors.local_import import LocalImportConnector


def production_connectors() -> list[Connector]:
    return [LocalImportConnector(), HudlConnector()]
