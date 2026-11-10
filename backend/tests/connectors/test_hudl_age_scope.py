from unittest.mock import patch

from tests.connectors.test_hudl_tag_sync import connection_with, tagged


def test_indexing_only_visits_selected_age_memberships(tmp_path):
    c = connection_with(tmp_path, ["u10", "u11", "shared"])
    c.catalogue.items.return_value = [
        {"id": "u10", "age_groups": ["U10"], "age_group": "U10"},
        {"id": "u11", "age_groups": ["U11"], "age_group": "U10"},
        {"id": "shared", "age_groups": ["U11", "U12"], "age_group": "U12"},
    ]
    c._tag_age = "U11"
    with patch.object(c, "_observe", return_value=tagged()) as observe:
        c._sync_tags()
    assert [call.args[0] for call in observe.call_args_list] == ["u11", "shared"]
    assert c.details.read("u10") == {}
    c._executor.shutdown()


def test_empty_scope_does_not_scan_the_entire_account(tmp_path):
    c = connection_with(tmp_path, ["one", "two"])
    c._tag_age = ""
    with patch.object(c, "_observe", return_value=tagged()) as observe:
        c._sync_tags()
    observe.assert_not_called()
    c._executor.shutdown()


def test_metadata_index_uses_playlist_duration_before_video_metadata_is_ready(tmp_path):
    from tests.connectors.test_hudl_capture import VIDEO
    from tests.connectors.test_hudl_optional_tags import MEDIA

    c = connection_with(tmp_path, [VIDEO])
    c._page.locator.return_value.first.evaluate.return_value = float("nan")
    observed = tagged()
    observed.manifests["https://video.hudl.com/child.m3u8"] = MEDIA.decode()
    with patch.object(c, "_observe", return_value=observed):
        assert c._cache_tags(VIDEO) == 1
    assert c.details.read(VIDEO)["duration_s"] == 4.0
    c._executor.shutdown()


def test_full_capture_also_uses_manifest_when_player_duration_is_not_ready(tmp_path, tiny_video):
    from tests.connectors.test_hudl_capture import VIDEO
    from tests.connectors.test_hudl_optional_tags import MEDIA

    c = connection_with(tmp_path, [VIDEO])
    c._page.locator.return_value.first.evaluate.return_value = float("nan")
    observed = tagged()
    observed.manifests["https://video.hudl.com/child.m3u8"] = MEDIA.decode()
    with (
        patch.object(c, "_observe", return_value=observed),
        patch("app.connectors.hudl_browser._account.capture_hls", return_value=(tiny_video, 4.0)),
    ):
        result = c._download(VIDEO)
    assert result.is_file()
    assert c.details.read(VIDEO)["duration_s"] == 4.0
    c._executor.shutdown()
