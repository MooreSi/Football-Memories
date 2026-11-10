from pathlib import Path
from unittest.mock import patch

import pytest

from app.connectors.hudl_account import Catalogue, Credentials, extract_matches
from app.connectors.hudl_capture import CaptureError
from app.connectors.hudl_keychain import Keychain


def test_credentials_repr_never_exposes_secret() -> None:
    secret = "FAKE_SECRET_42"  # noqa: S105 (synthetic leak detector)
    credentials = Credentials("parent@example.test", secret)
    assert secret in credentials.password.get_secret_value()
    assert secret not in repr(credentials)
    assert "parent@example.test" not in repr(credentials)


def test_match_catalogue_accepts_only_served_hudl_match_links() -> None:
    links = [
        {"href": "/watch/video/synthetic-a", "text": "Team A vs Team B"},
        {"href": "https://www.hudl.com/watch/video/synthetic-a", "text": "duplicate"},
        {"href": "https://evil.test/watch/video/synthetic-b", "text": "bad"},
        {"href": "/watch/video/synthetic-c?token=FAKE_SECRET", "text": "bad"},
    ]
    assert extract_matches(links) == [
        {
            "id": "synthetic-a",
            "title": "Team A vs Team B",
            "url": "https://www.hudl.com/watch/video/synthetic-a",
        }
    ]


def test_catalogue_cache_excludes_extra_response_fields(tmp_path: Path) -> None:
    catalogue = Catalogue(tmp_path)
    catalogue.replace(
        [
            {
                "id": "synthetic-a",
                "title": "Team A vs B",
                "url": "https://www.hudl.com/watch/video/synthetic-a",
                "cookie": "FAKE_SECRET",
            }
        ]
    )
    assert "FAKE_SECRET" not in next(tmp_path.glob("*.json")).read_text()
    assert Catalogue(tmp_path).items()[0]["title"] == "Team A vs B"


def test_keychain_sends_password_on_stdin_never_argv(tmp_path: Path) -> None:
    keychain = Keychain(tmp_path)
    with (
        patch.object(keychain, "_executable", return_value=Path("/synthetic/keychain")),
        patch("app.connectors.hudl_keychain.subprocess.run") as execute,
    ):
        execute.return_value.returncode = 0
        keychain.save(Credentials("parent@example.test", "FAKE_SECRET"))
    args, kwargs = execute.call_args
    assert "FAKE_SECRET" not in repr(args)
    assert b"FAKE_SECRET" in kwargs["input"]
    assert kwargs["capture_output"] is True


def test_keychain_errors_do_not_echo_secret(tmp_path: Path) -> None:
    keychain = Keychain(tmp_path)
    with (
        patch.object(keychain, "_executable", return_value=Path("/synthetic/keychain")),
        patch(
            "app.connectors.hudl_keychain.subprocess.run", side_effect=RuntimeError("FAKE_SECRET")
        ),
        pytest.raises(CaptureError, match="Keychain") as error,
    ):
        keychain.save(Credentials("parent@example.test", "FAKE_SECRET"))
    assert "FAKE_SECRET" not in str(error.value)


def test_authentication_stops_at_visible_verification_without_submitting() -> None:
    from unittest.mock import MagicMock

    from app.connectors.hudl_browser import authenticate

    page = MagicMock()
    page.locator.return_value.count.return_value = 1
    page.locator.return_value.first.is_visible.return_value = True
    with pytest.raises(CaptureError, match="verification"):
        authenticate(page, Credentials("parent@example.test", "FAKE_SECRET"))
    page.get_by_role.assert_not_called()


def test_stream_rejects_expired_resource_scope_before_fetch(tmp_path: Path) -> None:
    from unittest.mock import MagicMock

    from app.connectors.hudl_browser import BrowserConnection

    connection = BrowserConnection(MagicMock(), MagicMock(), tmp_path)
    connection._stream_id = "current-stream"
    connection._assets = {"0": "https://video.hudl.com/synthetic?token=FAKE_SECRET"}
    with patch("app.connectors.hudl_browser._account.fetch_media") as fetch:
        with pytest.raises(CaptureError, match="expired") as error:
            connection._resource("previous-stream", "0")
        fetch.assert_not_called()
    assert "FAKE_SECRET" not in str(error.value)
    connection._executor.shutdown()


def test_library_response_reads_only_video_item_identity_and_title() -> None:
    from app.connectors.hudl_account import library_matches

    payload = {
        "data": {
            "library": {
                "edges": [
                    {
                        "node": {
                            "__typename": "VideoItem",
                            "id": "synthetic-a",
                            "title": "Team A vs B",
                            "playbackUrl": "https://video.hudl.com/master?token=FAKE_SECRET",
                        }
                    },
                    {
                        "node": {
                            "__typename": "PlaylistItem",
                            "id": "playlist-a",
                            "title": "Playlist",
                        }
                    },
                ]
            }
        }
    }
    assert library_matches(payload) == [
        {
            "id": "synthetic-a",
            "title": "Team A vs B",
            "url": "https://www.hudl.com/watch/video/synthetic-a",
        }
    ]


def test_prepared_stream_playlist_contains_only_local_opaque_resources(tmp_path: Path) -> None:
    from unittest.mock import MagicMock

    from app.connectors.hudl_browser import BrowserConnection

    connection = BrowserConnection(MagicMock(), MagicMock(), tmp_path)
    observation = MagicMock()
    observation.master.return_value = "https://video.hudl.com/master.m3u8?token=FAKE_SECRET"
    master = b"#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=100,RESOLUTION=960x540\nchild.m3u8\n"
    media = b"#EXTM3U\n#EXT-X-TARGETDURATION:4\n#EXTINF:4,\npart.ts\n#EXT-X-ENDLIST\n"
    with (
        patch.object(connection, "_observe", return_value=observation),
        patch("app.connectors.hudl_browser._account.fetch_media", side_effect=[master, media]),
    ):
        connection._prepare_stream("synthetic-a")
    playlist, kind = connection._resource(connection._stream_id, "playlist.m3u8")
    assert kind == "application/vnd.apple.mpegurl"
    assert b"/stream/" in playlist
    assert b"hudl.com" not in playlist
    assert b"FAKE_SECRET" not in playlist
    assert connection.status()["stream_url"].startswith("http://127.0.0.1:8766/stream/")
    connection._executor.shutdown()


def test_app_host_match_links_use_canonical_watch_url() -> None:
    assert extract_matches(
        [{"href": "https://app.hudl.com/watch/video/synthetic-a", "text": "Team A vs B"}]
    ) == [
        {
            "id": "synthetic-a",
            "title": "Team A vs B",
            "url": "https://www.hudl.com/watch/video/synthetic-a",
        }
    ]


def test_empty_prefetch_is_not_playback_evidence() -> None:
    from unittest.mock import Mock

    from app.connectors.hudl_browser import Observation

    observation = Observation("synthetic")
    response = Mock(url="https://video.hudl.com/prefetch.m3u8", status=200)
    response.text.return_value = ""
    observation.response(response)
    assert observation.manifests == {}
