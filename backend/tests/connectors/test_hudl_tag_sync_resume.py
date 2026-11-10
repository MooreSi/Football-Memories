"""Owner report 2026-11-10: indexing kept stopping and seemed to restart at match 1."""

import time
from unittest.mock import MagicMock, patch

from app.connectors.hudl_browser import BrowserConnection, HudlBlocked, Observation
from app.connectors.hudl_capture import CaptureError
from app.connectors.hudl_metadata import MatchCache
from tests.connectors.test_hudl_capture import VIDEO
from tests.connectors.test_hudl_optional_tags import observation
from tests.connectors.test_hudl_stream_tag_cache import playback_payload


def connection_with(tmp_path, identities):
    catalogue = MagicMock()
    catalogue.items.return_value = [{"id": i, "title": i, "url": i} for i in identities]
    connection = BrowserConnection(MagicMock(), catalogue, tmp_path / "inbox")
    connection._page = MagicMock()
    connection._page.locator.return_value.first.evaluate.return_value = 4.0
    return connection


def tagged():
    observed = observation()
    observed.payloads = [playback_payload(start=1000, end=2000)]
    return observed


def test_unreadable_videos_are_recorded_and_skipped_without_stopping(tmp_path):
    connection = connection_with(tmp_path, ["ok-1", "clip-a", "clip-b", VIDEO])

    def observe(identity, need_tags):
        if identity.startswith("clip"):
            raise CaptureError("This match's playback or tags did not load.")
        return tagged()

    with patch.object(connection, "_observe", side_effect=observe):
        connection._sync_tags()
    assert connection.details.read(VIDEO)["tag_status"] == "synced"
    saved = connection.details.read("clip-a")
    assert saved["tag_status"] == "unavailable"
    assert "did not load" in saved["tag_error"]
    assert connection.status()["state"] == "ready"
    with patch.object(connection, "_observe", side_effect=AssertionError("retried")) as again:
        connection._sync_tags()
    again.assert_not_called()
    connection._executor.shutdown()


def test_unavailable_videos_are_retried_after_a_week(tmp_path):
    connection = connection_with(tmp_path, [VIDEO])
    connection.details.write(
        VIDEO,
        {"tag_status": "unavailable", "tag_error": "x", "checked_at": time.time() - 8 * 86400},
    )
    with patch.object(connection, "_observe", return_value=tagged()) as observe:
        connection._sync_tags()
    observe.assert_called_once()
    assert connection.details.read(VIDEO)["tag_status"] == "synced"
    connection._executor.shutdown()


def test_account_level_refusal_stops_at_once(tmp_path):
    connection = connection_with(tmp_path, ["a", "b", "c"])
    with patch.object(connection, "_observe", side_effect=HudlBlocked("rate limit")) as observe:
        connection._sync_tags()
    assert observe.call_count == 1
    assert connection.status()["state"] == "error"
    assert "tag_status" not in connection.details.read("a")
    connection._executor.shutdown()


def test_many_failures_in_a_row_still_stop(tmp_path):
    connection = connection_with(tmp_path, [f"m{i}" for i in range(9)])
    with patch.object(connection, "_observe", side_effect=CaptureError("did not load")) as observe:
        connection._sync_tags()
    assert observe.call_count == 5
    assert connection.status()["state"] == "error"
    connection._executor.shutdown()


def test_progress_counts_matches_already_indexed(tmp_path):
    connection = connection_with(tmp_path, ["done-1", "done-2", "new"])
    for identity in ["done-1", "done-2"]:
        connection.details.write(identity, {"tag_status": "none", "moments": []})
    messages = []
    original = connection.report

    def capture(state, message):
        messages.append(message)
        original(state, message)

    connection.report = capture
    with patch.object(connection, "_observe", return_value=tagged()):
        connection._sync_tags()
    assert any("3 of 3" in m or "2 of 3 already" in m for m in messages), messages
    assert not any("match 1 of" in m for m in messages)
    connection._executor.shutdown()


def test_blocked_responses_raise_the_account_level_error(tmp_path):
    observed = Observation("x")
    response = MagicMock(url="https://www.hudl.com/api/graphql/query", status=429)
    observed.response(response)
    assert observed.blocked


def test_cache_keeps_a_short_reason_and_check_time(tmp_path):
    cache = MatchCache(tmp_path)
    cache.write("m", {"tag_status": "unavailable", "tag_error": "y" * 900, "checked_at": 5.0})
    saved = cache.read("m")
    assert saved["tag_status"] == "unavailable"
    assert len(saved["tag_error"]) <= 300
    assert saved["checked_at"] == 5.0
