from pathlib import Path
from unittest.mock import MagicMock

from app.connectors import hudl_account
from app.connectors.hudl_account import Catalogue
from app.connectors.hudl_browser import BrowserConnection


def test_only_served_team_context_links_supply_team_ages():
    parse = getattr(hudl_account, "team_libraries", lambda links: [])
    links = [
        {"href": "https://www.hudl.com/ui/webnav/context/team/102", "text": "7. Riverside U11"},
        {"href": "https://www.hudl.com/ui/webnav/context/team/103", "text": "6. Riverside U12"},
        {"href": "https://evil.test/ui/webnav/context/team/104", "text": "U13"},
        {"href": "https://www.hudl.com/ui/webnav/context/team/105?token=fake", "text": "U14"},
        {"href": "https://www.hudl.com/watch/video/synthetic-a", "text": "U10"},
    ]
    assert parse(links) == [
        {"url": links[0]["href"], "age_group": "U11", "team_id": "102"},
        {"url": links[1]["href"], "age_group": "U12", "team_id": "103"},
    ]


def test_catalogue_preserves_only_valid_library_memberships_across_restarts(tmp_path: Path):
    catalogue = Catalogue(tmp_path)
    catalogue.replace(
        [
            {
                "url": "https://www.hudl.com/watch/video/synthetic-a",
                "title": "U10 vs Rovers",
                "age_groups": ["U11", "U12", "U11", "invalid"],
                "cookie": "FAKE_SECRET",
            },
        ]
    )
    item = Catalogue(tmp_path).items()[0]
    assert item.get("age_groups") == ["U11", "U12"]
    assert "FAKE_SECRET" not in catalogue.path.read_text()


def test_discovery_visits_all_served_team_libraries_and_classifies_by_membership(tmp_path: Path):
    catalogue = Catalogue(tmp_path / "cache")
    connection = BrowserConnection(MagicMock(), catalogue, tmp_path / "inbox")
    connection._context = MagicMock()
    initial = "https://app.hudl.com/watch/team/101/analyze"
    connection._libraries = {initial}
    connection._page = MagicMock(url=initial)
    contexts = [
        {"href": "https://www.hudl.com/ui/webnav/context/team/102", "text": "7. Riverside U11"},
        {"href": "https://www.hudl.com/ui/webnav/context/team/103", "text": "6. Riverside U12"},
    ]
    connection._links = MagicMock(return_value=contexts)

    def navigate(url, **kwargs):
        team = url.split("/")[-2] if url.endswith("analyze") else url.split("/")[-1]
        connection._page.url = f"https://app.hudl.com/watch/team/{team}/analyze"
        identity = f"synthetic-{team}"
        connection._observed_matches[identity] = {
            "id": identity,
            "title": "261108 U10 vs Rovers",
            "url": f"https://www.hudl.com/watch/video/{identity}",
        }

    connection._page.goto.side_effect = navigate
    connection._discover(refresh=True)
    items = {item["id"]: item for item in catalogue.items()}
    assert items.get("synthetic-102", {}).get("age_groups") == ["U11"]
    assert items.get("synthetic-103", {}).get("age_groups") == ["U12"]
    connection._executor.shutdown()


def test_team_selector_with_avatar_in_accessible_name_still_opens_dropdown(tmp_path: Path):
    connection = BrowserConnection(MagicMock(), Catalogue(tmp_path / "cache"), tmp_path / "inbox")
    connection._page = MagicMock()
    # Hudl's image adds "Team Avatar" before the visible numbered team name.
    connection._page.get_by_role.return_value.count.return_value = 0
    selected = [
        {"href": "https://app.hudl.com/watch/team/101/analyze##", "text": "8. Riverside U10"}
    ]
    opened = selected + [
        {"href": "https://www.hudl.com/ui/webnav/context/team/102", "text": "7. Riverside U11"}
    ]
    connection._links = MagicMock(side_effect=[selected, opened])
    assert connection._team_links() == opened
    connection._executor.shutdown()


def test_login_landing_page_enters_served_library_before_reading_team_selector(tmp_path: Path):
    catalogue = Catalogue(tmp_path / "cache")
    connection = BrowserConnection(MagicMock(), catalogue, tmp_path / "inbox")
    connection._context = MagicMock()
    connection._page = MagicMock(url="https://www.hudl.com/home")
    initial = "https://app.hudl.com/watch/team/101/analyze"
    connection._libraries = {initial}
    connection._page.locator.return_value.filter.return_value.count.return_value = 0
    home = [{"href": initial, "text": "Video"}]
    menu = [{"href": "https://www.hudl.com/ui/webnav/context/team/102", "text": "7. Riverside U11"}]
    connection._links = MagicMock(
        side_effect=lambda: home if connection._page.url.endswith("home") else menu
    )

    def navigate(url, **kwargs):
        team = "101" if url == initial else "102"
        connection._page.url = f"https://app.hudl.com/watch/team/{team}/analyze"
        identity = f"synthetic-{team}"
        connection._observed_matches[identity] = {
            "id": identity,
            "title": "Rovers game",
            "url": f"https://www.hudl.com/watch/video/{identity}",
        }

    connection._page.goto.side_effect = navigate
    connection._discover(refresh=True)
    items = {item["id"]: item for item in catalogue.items()}
    assert items.get("synthetic-102", {}).get("age_groups") == ["U11"]
    connection._executor.shutdown()


def test_hidden_team_links_without_labels_do_not_prevent_opening_selector(tmp_path: Path):
    connection = BrowserConnection(MagicMock(), Catalogue(tmp_path / "cache"), tmp_path / "inbox")
    connection._page = MagicMock(url="https://app.hudl.com/watch/team/101/analyze")
    selected = {"href": "https://app.hudl.com/watch/team/101/analyze##", "text": "8. Riverside U10"}
    hidden = {"href": "https://www.hudl.com/ui/webnav/context/team/102", "text": ""}
    visible = {**hidden, "text": "7. Riverside U11"}
    connection._links = MagicMock(side_effect=[[selected, hidden], [selected, visible]])
    assert connection._team_links() == [selected, visible]
    connection._executor.shutdown()


def test_selected_team_fragment_is_normalized_to_library_route():
    assert hudl_account.team_libraries(
        [
            {"href": "https://app.hudl.com/watch/team/101/analyze###", "text": "8. Riverside U10"},
        ]
    ) == [
        {"url": "https://app.hudl.com/watch/team/101/analyze", "team_id": "101", "age_group": "U10"}
    ]


def test_selected_library_fragment_navigation_reloads_fresh_video_metadata(tmp_path: Path):
    catalogue = Catalogue(tmp_path / "cache")
    connection = BrowserConnection(MagicMock(), catalogue, tmp_path / "inbox")
    connection._context = MagicMock()
    address = "https://app.hudl.com/watch/team/102/analyze"
    connection._page = MagicMock(url=address + "##")
    connection._page.locator.return_value.filter.return_value.count.return_value = 0
    connection._libraries = {address}
    connection._teams = {"102": {"url": address, "team_id": "102", "age_group": "U11"}}
    connection._links = MagicMock(return_value=[])
    connection._page.goto.side_effect = lambda url, **kwargs: setattr(connection._page, "url", url)

    def reload(**kwargs):
        connection._observed_matches["synthetic-fresh"] = {
            "id": "synthetic-fresh",
            "title": "Rovers game",
            "url": "https://www.hudl.com/watch/video/synthetic-fresh",
        }

    connection._page.reload.side_effect = reload
    connection._discover(refresh=True)
    assert catalogue.items()[0]["age_groups"] == ["U11"]
    connection._executor.shutdown()
