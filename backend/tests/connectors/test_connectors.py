from app.connectors.base import Capabilities
from app.connectors.hudl import HudlConnector
from app.connectors.mock import MockConnector
from app.connectors.registry import production_connectors


def test_hudl_connector_claims_no_capability() -> None:
    assert HudlConnector().info().capabilities == Capabilities()


def test_mock_connector_claims_every_capability() -> None:
    """Negative control for the test above: Capabilities can be all-true."""
    assert all(MockConnector().info().capabilities.as_dict().values())


def test_production_registry_never_contains_the_mock() -> None:
    assert all(not isinstance(c, MockConnector) for c in production_connectors())
