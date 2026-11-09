"""Archive integrity: verify, find moved files, rebuild thumbnails (spec 070)."""

import shutil
import time
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.config import Settings


@pytest.fixture
def match(client: TestClient, settings: Settings, tiny_video: Path) -> dict:  # type: ignore[type-arg]
    shutil.copyfile(tiny_video, settings.import_root / "a.mp4")
    return client.post(
        "/api/imports",
        json={
            "filename": "a.mp4",
            "team_name": "T",
            "season_label": "2026/27",
            "opponent": "Rovers",
            "match_date": "2026-10-18",
        },
    ).json()


def _video(settings: Settings) -> Path:
    [f] = list((settings.library_root / "Matches").rglob("*.mp4"))
    return f


def _verify(client: TestClient) -> dict:  # type: ignore[type-arg]
    assert client.post("/api/storage/verify").status_code in {200, 202}
    for _ in range(200):
        state = client.get("/api/storage/verify").json()
        if state["state"] == "done":
            return state  # type: ignore[no-any-return]
        time.sleep(0.02)
    raise AssertionError("verify did not finish")


def test_verify_reports_an_intact_file_as_ok(
    client: TestClient, match: dict, settings: Settings
) -> None:  # type: ignore[type-arg]
    state = _verify(client)
    assert (state["checked"], state["total"]) == (1, 1)
    assert [r["result"] for r in state["results"]] == ["ok"]


def test_verify_detects_a_changed_file(client: TestClient, match: dict, settings: Settings) -> None:  # type: ignore[type-arg]
    f = _video(settings)
    data = bytearray(f.read_bytes())
    data[len(data) // 2] ^= 0xFF
    f.write_bytes(bytes(data))
    assert [r["result"] for r in _verify(client)["results"]] == ["changed"]


def test_verify_detects_a_missing_file(client: TestClient, match: dict, settings: Settings) -> None:  # type: ignore[type-arg]
    _video(settings).unlink()
    assert [r["result"] for r in _verify(client)["results"]] == ["missing"]


def test_find_moved_files_repoints_a_moved_video_by_its_hash(
    client: TestClient,
    match: dict,
    settings: Settings,  # type: ignore[type-arg]
) -> None:
    f = _video(settings)
    moved = settings.archive_root / "Old drive" / "renamed.mp4"
    moved.parent.mkdir()
    f.rename(moved)
    r = client.post("/api/storage/relink").json()
    assert r == {"relinked": 1, "still_missing": 0}
    detail = client.get(f"/api/matches/{match['id']}").json()
    assert detail["media"]["available"] is True
    assert (
        client.get(detail["media"]["stream_url"], headers={"Range": "bytes=0-9"}).status_code == 206
    )
    assert moved.is_file()  # never moved or copied by the app


def test_find_moved_files_ignores_a_same_size_file_with_different_content(
    client: TestClient,
    match: dict,
    settings: Settings,  # type: ignore[type-arg]
) -> None:
    f = _video(settings)
    impostor = settings.archive_root / "other.mp4"
    data = bytearray(f.read_bytes())
    data[100] ^= 0xFF
    impostor.write_bytes(bytes(data))
    f.unlink()
    assert client.post("/api/storage/relink").json() == {"relinked": 0, "still_missing": 1}


def test_rebuild_recreates_a_deleted_match_thumbnail(
    client: TestClient,
    match: dict,
    settings: Settings,  # type: ignore[type-arg]
) -> None:
    [thumb] = list((settings.library_root / "Thumbnails").rglob("*.jpg"))
    thumb.unlink()
    assert client.post("/api/storage/rebuild-thumbnails").json() == {"rebuilt": 1, "failed": 0}
    assert thumb.read_bytes()[:3] == b"\xff\xd8\xff"
