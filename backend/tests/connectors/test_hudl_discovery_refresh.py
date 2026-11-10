from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from app.connectors.hudl_account import Catalogue
from app.connectors.hudl_browser import BrowserConnection
from app.connectors.hudl_capture import CaptureError


def test_refresh_on_match_page_rediscovers_library_and_preserves_cache_on_failure(tmp_path: Path):
    catalogue = Catalogue(tmp_path / "cache")
    catalogue.replace(
        [{"title": "U10 vs Rovers", "url": "https://www.hudl.com/watch/video/synthetic-a"}]
    )
    before = catalogue.path.read_bytes()
    connection = BrowserConnection(MagicMock(), catalogue, tmp_path / "inbox")
    connection._context = MagicMock()
    connection._page = MagicMock(
        url="https://www.hudl.com/watch/video/synthetic-a/explore/sportscode"
    )
    connection._links = MagicMock(
        return_value=[
            {
                "href": "https://www.hudl.com/watch/video/synthetic-a/explore/sportscode",
                "text": "Tags",
            }
        ]
    )
    connection._page.get_by_role.return_value.count.return_value = 0
    with patch.object(connection, "_login", side_effect=CaptureError("Library unavailable")):
        with pytest.raises(CaptureError, match="Library unavailable"):
            connection._discover(refresh=True)
    assert catalogue.path.read_bytes() == before
    connection._executor.shutdown()


def test_redirect_back_to_playback_never_replaces_cache_with_navigation(tmp_path: Path):
    catalogue = Catalogue(tmp_path / "cache")
    catalogue.replace(
        [{"title": "U10 vs Rovers", "url": "https://www.hudl.com/watch/video/synthetic-a"}]
    )
    before = catalogue.path.read_bytes()
    connection = BrowserConnection(MagicMock(), catalogue, tmp_path / "inbox")
    connection._context = MagicMock()
    connection._libraries = {"https://app.hudl.com/watch/team/123/analyze"}
    connection._page = MagicMock(
        url="https://www.hudl.com/watch/video/synthetic-a/explore/sportscode"
    )
    connection._links = MagicMock(
        return_value=[
            {
                "href": "https://www.hudl.com/watch/video/synthetic-a/explore/sportscode",
                "text": "Tags",
            }
        ]
    )
    with pytest.raises(CaptureError, match="no match links"):
        connection._discover(refresh=True)
    assert catalogue.path.read_bytes() == before
    connection._executor.shutdown()


def test_refresh_returns_to_previously_served_library_url(tmp_path: Path):
    catalogue = Catalogue(tmp_path / "cache")
    connection = BrowserConnection(MagicMock(), catalogue, tmp_path / "inbox")
    connection._context = MagicMock()
    address = "https://app.hudl.com/watch/team/123/analyze"
    connection._libraries = {address}
    connection._page = MagicMock(
        url="https://www.hudl.com/watch/video/synthetic-a/explore/sportscode"
    )
    connection._links = MagicMock(return_value=[])

    def navigate(url, **kwargs):
        connection._page.url = url
        connection._observed_matches["synthetic-a"] = {
            "id": "synthetic-a",
            "title": "U10 vs Rovers",
            "url": "https://www.hudl.com/watch/video/synthetic-a",
        }

    connection._page.goto.side_effect = navigate
    connection._discover(refresh=True)
    assert catalogue.items()[0]["title"] == "U10 vs Rovers"
    connection._page.goto.assert_called_once_with(address, wait_until="domcontentloaded")
    connection._executor.shutdown()


def test_playback_links_are_not_mixed_into_a_successful_library_refresh(tmp_path: Path):
    catalogue = Catalogue(tmp_path / "cache")
    connection = BrowserConnection(MagicMock(), catalogue, tmp_path / "inbox")
    connection._context = MagicMock()
    address = "https://app.hudl.com/watch/team/123/analyze"
    connection._libraries = {address}
    playback = "https://www.hudl.com/watch/video/synthetic-a/explore/sportscode"
    connection._page = MagicMock(url=playback)
    connection._links = MagicMock(
        side_effect=lambda: (
            [{"href": playback, "text": "Tags"}]
            if connection._page.url == playback
            else [{"href": "https://www.hudl.com/watch/video/synthetic-b", "text": "U10 v City"}]
        )
    )

    def navigate(url, **kwargs):
        connection._page.url = url

    connection._page.goto.side_effect = navigate
    connection._discover(refresh=True)
    assert [item["title"] for item in catalogue.items()] == ["U10 v City"]
    connection._executor.shutdown()
