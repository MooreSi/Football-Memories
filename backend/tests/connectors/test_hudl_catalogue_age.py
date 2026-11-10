"""The app decides when to look for new Hudl matches from the catalogue's age."""

import os
from pathlib import Path

from fastapi.testclient import TestClient

from app.connectors.hudl_companion import create_companion

ORIGIN = {"Origin": "http://127.0.0.1:8765"}


def test_status_reports_when_the_match_list_was_last_read(tmp_path: Path) -> None:
    inbox = tmp_path / "data" / "inbox"
    inbox.mkdir(parents=True)
    app = create_companion(inbox)
    with TestClient(app, base_url="http://127.0.0.1:8766") as client:
        assert client.get("/account", headers=ORIGIN).json()["catalogue_checked_at"] is None
        app.state.catalogue.replace([])
        os.utime(app.state.catalogue.path, (1_700_000_000, 1_700_000_000))
        assert (
            client.get("/account", headers=ORIGIN).json()["catalogue_checked_at"] == 1_700_000_000
        )
