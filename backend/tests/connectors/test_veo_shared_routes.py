"""Owner request 2026-11-20: the helper's shared Veo match link routes. The real
VeoConnection with its work held back, so nothing reaches Veo (or even a fake)."""

import json
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.connectors.hudl_companion import create_companion
from app.connectors.veo._connection import VeoConnection
from tests.connectors.test_veo_routes import APP, FakeStore

SLUG = "20261108-westfield-u11-aaaaaaaa"
LINK = f"https://app.veo.co/matches/{SLUG}/"


def never(*args: Any) -> Any:
    raise AssertionError("no Veo session in a route test")


@pytest.fixture
def helper(tmp_path: Path):
    app = create_companion(tmp_path / "out")
    app.state.veo_store = FakeStore()
    held: list[Any] = []
    app.state.veo = VeoConnection(
        never, tmp_path / "veo", session=never, public=never, run=held.append
    )
    with TestClient(app, base_url="http://127.0.0.1:8766") as client:
        yield client, app, held


def test_adding_a_link_saves_it_and_reads_it_with_no_account(helper) -> None:
    client, app, held = helper
    answer = client.post("/veo/shared", json={"url": LINK}, headers=APP)
    assert answer.status_code == 200, answer.text
    assert answer.json() == {"saved": True, "slug": SLUG, "reading": True}
    assert len(held) == 1 and app.state.veo.status()["message"] == "Reading shared Veo matches…"
    assert client.get("/veo/shared", headers=APP).json() == [
        {"slug": SLUG, "url": LINK, "title": None}
    ]
    assert client.get("/veo/account", headers=APP).json()["shared"] == 1


def test_no_link_can_be_added_while_veo_is_busy(helper) -> None:
    client, app, held = helper
    client.post("/veo/shared", json={"url": LINK}, headers=APP)  # now busy
    other = "https://app.veo.co/matches/20261101-other-match-bbbbbbbb/"
    answer = client.post("/veo/shared", json={"url": other}, headers=APP)
    assert answer.status_code == 400 and "finish" in answer.json()["detail"]
    assert len(held) == 1


def test_a_link_that_is_not_a_veo_match_is_refused_and_not_saved(helper) -> None:
    client, app, held = helper
    answer = client.post(
        "/veo/shared", json={"url": "https://evil.test/matches/x-y-z/"}, headers=APP
    )
    assert answer.status_code == 400 and "Veo match link" in answer.json()["detail"]
    assert client.get("/veo/shared", headers=APP).json() == [] and held == []


def test_the_list_names_each_match_once_it_is_read(helper, tmp_path: Path) -> None:
    client, app, _ = helper
    app.state.veo.add_shared(LINK)
    (tmp_path / "veo" / "library.json").write_text(
        json.dumps(
            {"matches": [{"id": "veo-s", "slug": SLUG, "shared": True, "title": "Westfield"}]}
        )
    )
    assert client.get("/veo/shared", headers=APP).json()[0]["title"] == "Westfield"


def test_deleting_a_link(helper) -> None:
    client, app, _ = helper
    app.state.veo.add_shared(LINK)
    deleted = client.post("/veo/shared/delete", json={"slug": SLUG}, headers=APP)
    assert deleted.json() == {"deleted": True}
    assert client.get("/veo/shared", headers=APP).json() == []
    assert client.post("/veo/shared/delete", json={"slug": SLUG}, headers=APP).status_code == 400


def test_refresh_with_no_account_reads_the_shared_links(helper) -> None:
    client, app, held = helper
    app.state.veo.add_shared(LINK)
    assert client.post("/veo/action", json={"action": "refresh"}, headers=APP).status_code == 202
    assert app.state.veo.status()["message"] == "Reading shared Veo matches…" and len(held) == 1


def test_refresh_with_no_account_and_no_links_still_asks_for_the_account(helper) -> None:
    client, _, held = helper
    answer = client.post("/veo/action", json={"action": "refresh"}, headers=APP)
    assert answer.status_code == 400 and "Veo email" in answer.json()["detail"] and held == []


def test_connect_still_needs_the_account(helper) -> None:
    client, app, held = helper
    app.state.veo.add_shared(LINK)
    assert client.post("/veo/action", json={"action": "test"}, headers=APP).status_code == 400
    assert held == []


def test_a_shared_match_plays_with_no_account(helper, tmp_path: Path) -> None:
    client, app, held = helper
    (tmp_path / "veo").mkdir(parents=True, exist_ok=True)
    (tmp_path / "veo" / "library.json").write_text(
        json.dumps(
            {
                "matches": [
                    {"id": "veo-s", "slug": SLUG, "shared": True, "available": True},
                    {"id": "veo-own", "slug": "own-match-x", "available": True},
                ]
            }
        )
    )
    watch = {"action": "watch", "match_id": "veo-s"}
    assert client.post("/veo/action", json=watch, headers=APP).status_code == 202
    assert len(held) == 1
    app.state.veo._busy = False
    own = {"action": "watch", "match_id": "veo-own"}
    assert client.post("/veo/action", json=own, headers=APP).status_code == 400  # account's


def test_other_websites_cannot_change_the_links(helper) -> None:
    client, app, _ = helper
    evil = {"Origin": "https://evil.test"}
    assert client.post("/veo/shared", json={"url": LINK}, headers=evil).status_code == 403
    app.state.veo.add_shared(LINK)
    assert client.post("/veo/shared/delete", json={"slug": SLUG}, headers=evil).status_code == 403
    assert client.get("/veo/shared", headers=APP).json()[0]["slug"] == SLUG
