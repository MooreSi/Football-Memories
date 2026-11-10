"""Synthetic modern playback metadata; no Hudl requests or real roster data."""

from unittest.mock import MagicMock, patch

import pytest

from app.connectors.hudl_browser import BrowserConnection
from app.connectors.hudl_capture import CaptureError, parse_moments
from app.connectors.hudl_metadata import MatchCache, optional_moments
from tests.connectors.test_hudl_capture import VIDEO, payload
from tests.connectors.test_hudl_optional_tags import MASTER_BODY, MEDIA, observation


def playback_payload(**kwargs):
    data = payload(synced=False, **kwargs)
    session = data["data"]["taggingSessions"]["items"][0]
    session["presentationViews"] = [
        {"id": "synthetic-view", "title": "Tags", "attributes": [], "subViews": []}
    ]
    return data


def test_native_playback_times_are_available_despite_legacy_sync_flag():
    data = playback_payload(start=1757898, end=1783921)
    moments, status = optional_moments([data, data], VIDEO, 6195.52)
    assert status == "synced"
    assert len(moments) == 1
    assert moments[0].time_s == 1757.898
    assert moments[0].duration_s == 26.023
    assert moments[0].category == "SAM EXAMPLE"
    assert (
        data["data"]["taggingSessions"]["items"][0]["taggingSessionMetadata"]["isSyncedToVideo"]
        is False
    )
    with pytest.raises(CaptureError, match="synced"):
        parse_moments([data], VIDEO, set())


def test_modern_playback_rejects_incomplete_metadata():
    data = playback_payload()
    data["data"]["taggingSessions"]["items"][0]["moments"]["totalCount"] = 2
    with pytest.raises(CaptureError, match="incomplete"):
        optional_moments([data], VIDEO, 8)


def test_modern_playback_rejects_invalid_timing():
    data = playback_payload(start=float("nan"))
    with pytest.raises(CaptureError, match="timing"):
        optional_moments([data], VIDEO, 8)


def test_modern_playback_rejects_access_errors():
    data = playback_payload()
    data["errors"] = [{"message": "synthetic denied"}]
    with pytest.raises(CaptureError, match="tag data"):
        optional_moments([data], VIDEO, 8)


def test_stream_caches_all_labels_and_ranges_without_a_video_download(tmp_path):
    connection = BrowserConnection(MagicMock(), MagicMock(), tmp_path / "inbox")
    connection._page = MagicMock()
    connection._page.locator.return_value.first.evaluate.return_value = 4.0
    observed = observation()
    observed.payloads = [playback_payload(start=1000, end=2000)]
    with (
        patch.object(connection, "_observe", return_value=observed),
        patch(
            "app.connectors.hudl_browser._account.fetch_media",
            side_effect=[MASTER_BODY.encode(), MEDIA],
        ),
        patch(
            "app.connectors.hudl_browser._account.capture_hls",
            side_effect=AssertionError("must not download"),
        ),
        patch(
            "app.connectors.hudl_browser._account.save_capture",
            side_effect=AssertionError("must not publish footage"),
        ),
    ):
        connection._prepare_stream(VIDEO)
    saved = MatchCache(connection.details.directory).read(VIDEO)
    assert saved["moments"] == [
        {
            "id": "synthetic-session:synthetic-stable-id",
            "time_s": 1.0,
            "duration_s": 1.0,
            "category": "SAM EXAMPLE",
        }
    ]
    assert saved["tag_status"] == "synced"
    assert connection.status()["stream_url"].startswith("http://127.0.0.1:8766/stream/")
    assert list(tmp_path.rglob("*.mp4")) == []
    assert list(tmp_path.rglob("*.csv")) == []
    connection._executor.shutdown()


def test_observation_waits_for_later_tag_responses_before_caching(tmp_path):
    connection = BrowserConnection(MagicMock(), MagicMock(), tmp_path / "inbox")
    connection._context = MagicMock()
    connection._page = MagicMock()
    connection._page.get_by_title.return_value.count.return_value = 0
    observed = observation()
    observed.payloads = []
    first = playback_payload(start=1000, end=2000)
    second = playback_payload(start=2000, end=3000)
    second["data"]["taggingSessions"]["items"][0]["moments"]["items"][0]["momentId"] = "second"
    ticks = iter(n / 2 for n in range(1000))
    arrivals = iter([[first], [first], [first, second]] + [[first, second]] * 100)

    def deliver(_):
        observed.payloads = next(arrivals)

    connection._page.wait_for_timeout.side_effect = deliver
    with (
        patch("app.connectors.hudl_browser._account.Observation", return_value=observed),
        patch(
            "app.connectors.hudl_browser._account.time.monotonic", side_effect=lambda: next(ticks)
        ),
    ):
        result = connection._observe(VIDEO, False)
    assert len(optional_moments(result.payloads, VIDEO, 4)[0]) == 2
    connection._executor.shutdown()
