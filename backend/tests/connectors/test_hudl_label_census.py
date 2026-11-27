"""Label census (spec 820): counts of tag labels per match, synthetic payloads only.

Answers whether Hudl's tags carry pass outcomes without keeping raw tags. Free text, URLs,
tokens and player codes must never enter the counts or the cache file."""

import copy
from unittest.mock import MagicMock, patch

from app.connectors.hudl_browser import BrowserConnection
from app.connectors.hudl_capture import label_census
from app.connectors.hudl_metadata import MatchCache
from tests.connectors.test_hudl_capture import VIDEO, payload
from tests.connectors.test_hudl_optional_tags import observation
from tests.connectors.test_hudl_stream_tag_cache import playback_payload

PLANTED_NOTE = "https://example.invalid/clip?token=FAKE_SECRET_123"


def items(data):
    return data["data"]["taggingSessions"]["items"][0]["moments"]["items"]


def with_tags(data, *tag_lists):
    """One moment per tag list, each coded SAM EXAMPLE, plus the given tags."""
    base = items(data)[0]
    items(data)[:] = []
    for index, tags in enumerate(tag_lists):
        moment = copy.deepcopy(base)
        moment["momentId"] = f"m{index}"
        moment["tags"] = [{"key": "HUDL_CODE", "values": ["SAM EXAMPLE"]}, *tags]
        items(data).append(moment)
    return data


def test_counts_individual_action_values_and_label_groups_across_moments():
    data = with_tags(
        payload(),
        [{"key": "Individual action", "values": ["Passing", "Unsuccessful"]}],
        [{"key": "Individual action", "values": ["Passing"]}],
        [{"key": "HUDL_LABEL", "values": ["PASS ▶ Successful", "pass  ▶ successful"]}],
    )
    assert label_census([data], VIDEO) == {
        "INDIVIDUAL ACTION": 2,
        "INDIVIDUAL ACTION ▶ PASSING": 2,
        "INDIVIDUAL ACTION ▶ UNSUCCESSFUL": 1,
        "PASS ▶ SUCCESSFUL": 2,
    }


def test_free_text_urls_tokens_and_player_codes_never_enter_the_counts():
    data = with_tags(
        payload(),
        [
            {"key": "Private note", "values": [PLANTED_NOTE]},
            {"key": "Player", "values": ["Sam  Example"]},
            {"key": "HUDL_LABEL", "values": ["NOTE ▶ " + "x" * 60]},
            {"key": "Ref", "values": ["ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"]},
        ],
    )
    counts = label_census([data], VIDEO)
    text = repr(counts)
    assert "FAKE_SECRET" not in text
    assert "SAM EXAMPLE" not in text
    assert "XXXXXXXX" not in text
    assert "ABCDEFGHIJ" not in text
    # Group names alone are kept: they say a kind of tag exists, never its free text.
    assert counts == {"PRIVATE NOTE": 1, "PLAYER": 1, "NOTE": 1, "REF": 1}
    # Negative control: the planted values really were in the payload.
    assert "FAKE_SECRET" in repr(data) and "Sam  Example" in repr(data)


def test_only_this_videos_sessions_are_counted():
    other = with_tags(payload(), [{"key": "Individual action", "values": ["Passing"]}])
    other["data"]["taggingSessions"]["items"][0]["videoId"] = "another-video"
    assert label_census([other], VIDEO) == {}


def test_cache_keeps_safe_counts_and_drops_anything_else(tmp_path):
    cache = MatchCache(tmp_path)
    counts = {f"LABEL {i}": 1 for i in range(400)}
    counts.update({"PASS ▶ SUCCESSFUL": 3, PLANTED_NOTE: 1, "BAD": "3", "ZERO": 0})
    cache.write("synthetic", {"moments": [], "label_counts": counts})
    saved = cache.read("synthetic")["label_counts"]
    assert saved["PASS ▶ SUCCESSFUL"] == 3
    assert len(saved) == 300
    assert "BAD" not in saved and "ZERO" not in saved
    assert "FAKE_SECRET" not in next(tmp_path.glob("*.json")).read_text()


def test_tag_indexing_records_the_census_with_the_moments(tmp_path):
    catalogue = MagicMock()
    catalogue.items.return_value = [{"id": VIDEO, "title": VIDEO, "url": VIDEO}]
    connection = BrowserConnection(MagicMock(), catalogue, tmp_path / "inbox")
    connection._page = MagicMock()
    connection._page.locator.return_value.first.evaluate.return_value = 4.0
    observed = observation()
    observed.payloads = [
        with_tags(
            playback_payload(start=1000, end=2000),
            [
                {"key": "Individual action", "values": ["Passing", "Unsuccessful"]},
                {"key": "Private note", "values": [PLANTED_NOTE]},
            ],
        )
    ]
    with patch.object(connection, "_observe", return_value=observed):
        connection._sync_tags()
    saved = connection.details.read(VIDEO)
    assert saved["tag_status"] == "synced"
    assert saved["label_counts"] == {
        "INDIVIDUAL ACTION": 1,
        "INDIVIDUAL ACTION ▶ PASSING": 1,
        "INDIVIDUAL ACTION ▶ UNSUCCESSFUL": 1,
        "PRIVATE NOTE": 1,
    }
    assert "FAKE_SECRET" not in connection.details.path(VIDEO).read_text()
    connection._executor.shutdown()
