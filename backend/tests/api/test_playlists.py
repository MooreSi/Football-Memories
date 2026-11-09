"""Saved playlists (spec 050). A playlist is an ordered list of moments."""

import shutil
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.config import Settings


@pytest.fixture
def moments(client: TestClient, settings: Settings, tiny_video: Path) -> list[int]:
    shutil.copyfile(tiny_video, settings.import_root / "a.mp4")
    (settings.import_root / "a.tags.csv").write_text(
        "time,category,players\n0:01,Save,Sam\n0:02,Goal,Sam\n0:03,Pass,Sam\n"
    )
    client.post(
        "/api/imports",
        json={
            "filename": "a.mp4",
            "team_name": "Riverside",
            "season_label": "2026/27",
            "opponent": "Rovers",
            "match_date": "2026-10-18",
        },
    )
    return [m["event_id"] for m in client.get("/api/moments?sort=oldest").json()["items"]]


def _create(client: TestClient, name: str, ids: list[int]) -> dict:  # type: ignore[type-arg]
    r = client.post("/api/playlists", json={"name": name, "event_ids": ids})
    assert r.status_code == 201, r.text
    return r.json()  # type: ignore[no-any-return]


def test_create_keeps_the_given_order(client: TestClient, moments: list[int]) -> None:
    order = [moments[2], moments[0]]
    pl = _create(client, "Best saves", order)
    detail = client.get(f"/api/playlists/{pl['id']}").json()
    assert detail["name"] == "Best saves"
    assert [m["event_id"] for m in detail["items"]] == order


def test_list_shows_counts_and_total_clip_time(client: TestClient, moments: list[int]) -> None:
    _create(client, "All", moments)
    [pl] = client.get("/api/playlists").json()
    assert (pl["name"], pl["item_count"]) == ("All", 3)
    assert pl["total_seconds"] > 0


def test_reorder_and_rename(client: TestClient, moments: list[int]) -> None:
    pl = _create(client, "Draft", moments)
    r = client.put(
        f"/api/playlists/{pl['id']}", json={"name": "Final", "event_ids": list(reversed(moments))}
    )
    assert r.status_code == 200
    detail = client.get(f"/api/playlists/{pl['id']}").json()
    assert (detail["name"], [m["event_id"] for m in detail["items"]]) == (
        "Final",
        list(reversed(moments)),
    )


def test_rename_only_keeps_items(client: TestClient, moments: list[int]) -> None:
    pl = _create(client, "Draft", moments)
    client.put(f"/api/playlists/{pl['id']}", json={"name": "Renamed"})
    assert len(client.get(f"/api/playlists/{pl['id']}").json()["items"]) == 3


def test_unknown_moment_is_a_400_and_nothing_is_saved(
    client: TestClient, moments: list[int]
) -> None:
    r = client.post("/api/playlists", json={"name": "Bad", "event_ids": [moments[0], 999]})
    assert r.status_code == 400
    assert client.get("/api/playlists").json() == []


def test_duplicate_moments_in_one_playlist_are_refused(
    client: TestClient, moments: list[int]
) -> None:
    r = client.post("/api/playlists", json={"name": "Dup", "event_ids": [moments[0], moments[0]]})
    assert r.status_code == 400


def test_empty_name_is_rejected(client: TestClient, moments: list[int]) -> None:
    assert client.post("/api/playlists", json={"name": "  ", "event_ids": []}).status_code == 400


def test_delete_removes_the_list_but_never_the_moments(
    client: TestClient, moments: list[int]
) -> None:
    pl = _create(client, "Temp", moments)
    assert client.delete(f"/api/playlists/{pl['id']}").status_code == 204
    assert client.get(f"/api/playlists/{pl['id']}").status_code == 404
    assert len(client.get("/api/moments").json()["items"]) == 3


def test_unknown_playlist_is_404(client: TestClient) -> None:
    assert client.get("/api/playlists/9").status_code == 404
    assert client.put("/api/playlists/9", json={"name": "x"}).status_code == 404
