"""Settings and storage health (spec 060)."""

import os
import shutil
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session, sessionmaker

from app.config import Settings
from app.main import create_app


def test_clip_timing_defaults_are_unchanged(client: TestClient) -> None:
    assert client.get("/api/settings").json() == {"clip_pre_s": 8.0, "clip_post_s": 5.0}


def test_clip_timing_persists_across_a_restart(
    client: TestClient, settings: Settings, session_factory: sessionmaker[Session]
) -> None:
    assert client.put("/api/settings", json={"clip_pre_s": 12, "clip_post_s": 3}).status_code == 200
    with TestClient(create_app(settings, session_factory=session_factory)) as again:
        assert again.get("/api/settings").json() == {"clip_pre_s": 12.0, "clip_post_s": 3.0}


def test_partial_update_keeps_the_other_value(client: TestClient) -> None:
    client.put("/api/settings", json={"clip_pre_s": 4})
    assert client.get("/api/settings").json() == {"clip_pre_s": 4.0, "clip_post_s": 5.0}


@pytest.mark.parametrize("body", [{"clip_pre_s": -1}, {"clip_post_s": 61}, {"clip_pre_s": "soon"}])
def test_out_of_range_timing_is_rejected_and_nothing_changes(
    client: TestClient, body: dict
) -> None:  # type: ignore[type-arg]
    assert client.put("/api/settings", json=body).status_code == 422
    assert client.get("/api/settings").json() == {"clip_pre_s": 8.0, "clip_post_s": 5.0}


def test_playlist_total_time_uses_the_saved_timing(
    client: TestClient, settings: Settings, tiny_video: Path
) -> None:
    shutil.copyfile(tiny_video, settings.import_root / "a.mp4")
    (settings.import_root / "a.tags.csv").write_text("time,category\n0:01,Save\n0:02,Goal\n")
    client.post(
        "/api/imports",
        json={
            "filename": "a.mp4",
            "team_name": "T",
            "season_label": "2026/27",
            "opponent": "O",
            "match_date": "2026-10-18",
        },
    )
    ids = [m["event_id"] for m in client.get("/api/moments").json()["items"]]
    client.post("/api/playlists", json={"name": "P", "event_ids": ids})
    assert client.get("/api/playlists").json()[0]["total_seconds"] == 2 * (8 + 5)
    client.put("/api/settings", json={"clip_pre_s": 2, "clip_post_s": 1})
    assert client.get("/api/playlists").json()[0]["total_seconds"] == 2 * (2 + 1)


GIB = 1024**3


@pytest.fixture(autouse=True)
def _plenty_of_disk(monkeypatch: pytest.MonkeyPatch) -> None:
    """Health tests must not depend on how full the machine running them is."""
    import app.services.storage as storage_mod

    usage = SimpleNamespace(total=1000 * GIB, used=500 * GIB, free=500 * GIB)
    monkeypatch.setattr(storage_mod.shutil, "disk_usage", lambda _p: usage)


def _folders(client: TestClient) -> dict:  # type: ignore[type-arg]
    r = client.get("/api/storage/health")
    assert r.status_code == 200, r.text
    return {f["role"]: f for f in r.json()["folders"]}


def test_health_is_ok_for_two_good_folders(client: TestClient, settings: Settings) -> None:
    f = _folders(client)
    archive, inbox = f["archive"], f["inbox"]
    assert (archive["status"], archive["exists"], archive["writable"]) == ("ok", True, True)
    assert archive["free_bytes"] > 0 and archive["total_bytes"] >= archive["free_bytes"]
    assert (inbox["status"], inbox["readable"]) == ("ok", True)
    leftovers = [p.name for p in settings.archive_root.iterdir() if p.name.startswith(".fm-probe")]
    assert leftovers == []


def test_a_missing_import_folder_is_an_error_with_a_message(
    client: TestClient, settings: Settings
) -> None:
    shutil.rmtree(settings.import_root)
    inbox = _folders(client)["inbox"]
    assert (inbox["status"], inbox["exists"]) == ("error", False)
    assert "does not exist" in inbox["messages"][0]


@pytest.mark.skipif(hasattr(os, "geteuid") and os.geteuid() == 0, reason="root can write anywhere")
def test_a_read_only_archive_is_an_error(client: TestClient, settings: Settings) -> None:
    settings.archive_root.chmod(0o555)
    try:
        archive = _folders(client)["archive"]
    finally:
        settings.archive_root.chmod(0o755)
    assert (archive["status"], archive["writable"]) == ("error", False)
    assert any("cannot write" in m for m in archive["messages"])


def test_a_read_only_inbox_is_fine_because_it_is_only_read(
    client: TestClient, settings: Settings
) -> None:
    settings.import_root.chmod(0o555)
    try:
        inbox = _folders(client)["inbox"]
    finally:
        settings.import_root.chmod(0o755)
    assert inbox["status"] == "ok"


def test_missing_media_files_are_listed_with_their_match(
    client: TestClient, settings: Settings, tiny_video: Path
) -> None:
    shutil.copyfile(tiny_video, settings.import_root / "a.mp4")
    m = client.post(
        "/api/imports",
        json={
            "filename": "a.mp4",
            "team_name": "T",
            "season_label": "2026/27",
            "opponent": "Rovers",
            "match_date": "2026-10-18",
        },
    ).json()
    health = client.get("/api/storage/health").json()["archive"]
    assert (health["indexed_files"], health["missing"]) == (1, [])
    assert health["indexed_bytes"] == tiny_video.stat().st_size
    for f in (settings.library_root / "Matches").rglob("*.mp4"):
        f.unlink()
    missing = client.get("/api/storage/health").json()["archive"]["missing"]
    assert [(x["match_id"], x["opponent"]) for x in missing] == [(m["id"], "Rovers")]


def test_low_free_space_on_the_archive_is_a_warning(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    import app.services.storage as storage_mod

    nearly_full = SimpleNamespace(total=926 * GIB, used=903 * GIB, free=23 * GIB)
    monkeypatch.setattr(storage_mod.shutil, "disk_usage", lambda _p: nearly_full)
    archive = _folders(client)["archive"]
    assert archive["status"] == "warning"
    assert "23.0 GB free" in archive["messages"][0]
