"""Owner request 2026-11-10: record tag metadata for every match, never the video."""

from unittest.mock import MagicMock, patch

from app.connectors.hudl_browser import BrowserConnection
from app.connectors.hudl_capture import CaptureError
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


def test_sync_records_tags_for_uncached_matches_without_downloading(tmp_path):
    connection = connection_with(tmp_path, [VIDEO, "cached-match"])
    connection.details.write("cached-match", {"tag_status": "none", "moments": []})
    with (
        patch.object(connection, "_observe", return_value=tagged()) as observe,
        patch(
            "app.connectors.hudl_browser._account.capture_hls", side_effect=AssertionError("video")
        ),
        patch(
            "app.connectors.hudl_browser._account.save_capture", side_effect=AssertionError("video")
        ),
    ):
        connection._sync_tags()
    assert [c.args[0] for c in observe.call_args_list] == [VIDEO]
    saved = connection.details.read(VIDEO)
    assert saved["tag_status"] == "synced"
    assert saved["moments"][0]["category"] == "SAM EXAMPLE"
    assert connection.details.read("cached-match")["moments"] == []
    assert list(tmp_path.rglob("*.mp4")) == []
    assert connection.status()["stream_url"] is None
    connection._executor.shutdown()


def test_sync_pauses_between_matches(tmp_path):
    connection = connection_with(tmp_path, ["one", "two"])
    with patch.object(connection, "_observe", return_value=tagged()):
        connection._sync_tags()
    waits = [c.args[0] for c in connection._page.wait_for_timeout.call_args_list]
    assert waits and min(waits) >= 2000
    connection._executor.shutdown()


def test_sync_stops_after_repeated_failures_and_reports(tmp_path):
    # Owner report 2026-11-10: two failures was too strict (D-024); now five in a row.
    connection = connection_with(tmp_path, ["one", "two", "three", "four", "five", "six"])
    with patch.object(connection, "_observe", side_effect=CaptureError("did not load")) as observe:
        connection._sync_tags()
    assert observe.call_count == 5
    assert connection.status()["state"] == "error"
    connection._executor.shutdown()


def test_another_action_interrupts_sync_and_runs(tmp_path):
    connection = connection_with(tmp_path, ["one", "two", "three"])
    calls = []

    def observe(identity, need_tags):
        calls.append(identity)
        connection._cancel_sync.set()
        return tagged()

    with patch.object(connection, "_observe", side_effect=observe):
        connection._sync_tags()
    assert calls == ["one"]
    connection._executor.shutdown()


def test_start_accepts_user_action_while_only_syncing(tmp_path):
    connection = connection_with(tmp_path, [])
    connection._executor = MagicMock()
    connection.start("sync_tags")
    assert connection.status()["busy"] is True
    assert connection.status()["syncing"] is True
    connection.start("stream", VIDEO)
    assert connection._cancel_sync.is_set()
    assert connection._executor.submit.call_count == 2
    try:
        connection.start("download", VIDEO)
    except CaptureError:
        pass
    else:
        raise AssertionError("A second user action must not queue behind the first")
