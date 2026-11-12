"""Owner report 2026-11-12: "The batch stopped" gave no cause. An unexpected error now
names its type and where it happened, in the status and the helper log, but never its
message: Playwright and HTTP errors can carry signed Hudl URLs (golden rule 1)."""

import logging
import time
from unittest.mock import MagicMock, patch

from app.connectors.hudl_browser import BrowserConnection

SIGNED_URL = "https://video.hudl.com/x.m3u8?token=FAKE_SECRET"  # noqa: S105 - planted fake
MOMENTS = [{"id": "a", "category": "Goal", "time_s": 1, "duration_s": 1}]


def _run(tmp_path, error):
    catalogue = MagicMock()
    catalogue.find.side_effect = lambda i: {"id": i, "title": "260712 U11 v Cambridge (A)"}
    connection = BrowserConnection(MagicMock(), catalogue, tmp_path / "inbox")
    connection.details.write("m1", {"moments": MOMENTS, "tag_status": "synced"})

    def prepare(identity):
        raise error

    with patch.object(connection, "_prepare_stream", side_effect=prepare):
        connection.start_batch([{"match_id": "m1", "codes": ["Goal"]}], reel={"name": "R"})
        for _ in range(400):
            if not connection.status()["busy"]:
                break
            time.sleep(0.02)
    connection._executor.shutdown()
    return connection.status()


def test_an_unexpected_batch_error_names_its_type_and_place_but_not_its_message(tmp_path, caplog):
    error = RuntimeError(SIGNED_URL)
    assert "FAKE_SECRET" in str(error)  # negative control: the message does hold it
    with caplog.at_level(logging.WARNING):
        status = _run(tmp_path, error)
    assert status["state"] == "error"
    assert "RuntimeError" in status["message"]
    assert "Files already saved are kept" in status["message"]
    assert "RuntimeError" in caplog.text and "test_hudl_batch_errors.py" in caplog.text
    assert "FAKE_SECRET" not in status["message"]
    assert "FAKE_SECRET" not in caplog.text
    assert "token" not in caplog.text
