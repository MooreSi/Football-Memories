"""Backup and restore (spec 070). Restore is the most destructive operation in the app."""

import json
import shutil
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from app.config import Settings
from app.db import Base
from app.services import backups


@pytest.fixture
def populated(client: TestClient, settings: Settings, tiny_video: Path) -> dict:  # type: ignore[type-arg]
    shutil.copyfile(tiny_video, settings.import_root / "a.mp4")
    (settings.import_root / "a.tags.csv").write_text(
        "time,category,players,note\n0:01,Save,Sam,low dive\n0:02,Goal,Sam; Alex,\n"
    )
    m = client.post(
        "/api/imports",
        json={
            "filename": "a.mp4",
            "team_name": "Riverside",
            "season_label": "2026/27",
            "age_group": "U12",
            "opponent": "Rovers",
            "match_date": "2026-10-18",
        },
    ).json()
    sam = next(p["id"] for p in client.get("/api/players").json() if p["display_name"] == "Sam")
    ids = [x["event_id"] for x in client.get("/api/moments?sort=oldest").json()["items"]]
    client.put(f"/api/events/{ids[0]}/favourite", json={"favourite": True})
    client.post(f"/api/events/{ids[1]}/viewed")
    client.put("/api/preferences/primary-player", json={"player_id": sam})
    client.put("/api/settings", json={"clip_pre_s": 11})
    client.patch(f"/api/players/{sam}", json={"shirt_number": "1", "position": "GK"})
    client.post("/api/playlists", json={"name": "Best", "event_ids": list(reversed(ids))})
    return {"match": m, "sam": sam, "events": ids}


def _snapshot(factory: sessionmaker[Session]) -> dict[str, list[tuple]]:  # type: ignore[type-arg]
    out = {}
    with factory() as s:
        for t in Base.metadata.sorted_tables:
            rows = s.execute(select(t).order_by(*t.primary_key.columns)).all()
            out[t.name] = [tuple(r) for r in rows]
    return out


def _make(client: TestClient) -> str:
    r = client.post("/api/backups")
    assert r.status_code == 201, r.text
    return r.json()["name"]  # type: ignore[no-any-return]


def _restore(client: TestClient, name: str, confirm: str = "RESTORE"):  # type: ignore[no-untyped-def]
    return client.post(f"/api/backups/{name}/restore", json={"confirm": confirm})


def test_backup_is_written_into_the_archive_and_listed(
    client: TestClient,
    populated: dict,
    settings: Settings,  # type: ignore[type-arg]
) -> None:
    name = _make(client)
    assert (settings.library_root / "Backups" / name).is_file()
    assert list((settings.library_root / "Backups").glob("*.part")) == []
    [b] = client.get("/api/backups").json()
    assert (b["name"], b["kind"], b["matches"], b["moments"]) == (name, "manual", 1, 2)


def test_round_trip_restores_every_row_exactly(
    client: TestClient,
    populated: dict,
    session_factory: sessionmaker[Session],  # type: ignore[type-arg]
) -> None:
    before = _snapshot(session_factory)
    name = _make(client)
    # change everything that matters
    client.delete(f"/api/playlists/{client.get('/api/playlists').json()[0]['id']}")
    client.put("/api/settings", json={"clip_pre_s": 2})
    client.put("/api/preferences/primary-player", json={"player_id": None})
    assert _restore(client, name).status_code == 200
    assert _snapshot(session_factory) == before


def test_restore_never_touches_video_or_photo_files(
    client: TestClient,
    populated: dict,
    settings: Settings,  # type: ignore[type-arg]
) -> None:
    files_before = sorted(
        p for p in settings.library_root.rglob("*") if p.is_file() and "Backups" not in p.parts
    )
    name = _make(client)
    _restore(client, name)
    files_after = sorted(
        p for p in settings.library_root.rglob("*") if p.is_file() and "Backups" not in p.parts
    )
    assert files_after == files_before


def test_restore_without_confirmation_is_refused_and_changes_nothing(
    client: TestClient,
    populated: dict,
    session_factory: sessionmaker[Session],  # type: ignore[type-arg]
) -> None:
    name = _make(client)
    client.put("/api/settings", json={"clip_pre_s": 3})
    before = _snapshot(session_factory)
    assert _restore(client, name, confirm="yes").status_code == 400
    assert _snapshot(session_factory) == before


def test_restore_first_saves_a_pre_restore_backup_that_can_undo_it(
    client: TestClient,
    populated: dict,
    session_factory: sessionmaker[Session],  # type: ignore[type-arg]
) -> None:
    old = _make(client)
    client.put("/api/settings", json={"clip_pre_s": 20})
    newer_state = _snapshot(session_factory)
    r = _restore(client, old)
    undo = r.json()["safety_backup"]
    assert undo.startswith("pre-restore-")
    assert client.get("/api/settings").json()["clip_pre_s"] == 11
    assert _restore(client, undo).status_code == 200
    assert _snapshot(session_factory) == newer_state


def test_a_failing_restore_leaves_the_database_unchanged(
    client: TestClient,
    populated: dict,
    settings: Settings,
    session_factory: sessionmaker[Session],  # type: ignore[type-arg]
) -> None:
    name = _make(client)
    path = settings.library_root / "Backups" / name
    doc = json.loads(path.read_text())
    doc["tables"]["events"].append(dict(doc["tables"]["events"][0]))  # duplicate primary key
    path.write_text(json.dumps(doc))
    client.put("/api/settings", json={"clip_pre_s": 4})
    before = _snapshot(session_factory)
    r = _restore(client, name)
    assert r.status_code == 400
    assert _snapshot(session_factory) == before


def test_an_older_backup_without_newer_tables_and_columns_still_restores(
    client: TestClient,
    populated: dict,
    settings: Settings,
    session_factory: sessionmaker[Session],  # type: ignore[type-arg]
) -> None:
    """Long-term preservation: a backup from before a feature existed must stay restorable."""
    before = _snapshot(session_factory)
    name = _make(client)
    path = settings.library_root / "Backups" / name
    doc = json.loads(path.read_text())
    doc["schema"] = "made-by-an-older-version"
    for newer_table in ("reels", "reel_items"):
        doc["tables"].pop(newer_table, None)
    for row in doc["tables"]["players"]:
        row.pop("photo_relpath")  # a column added after the backup was made
    path.write_text(json.dumps(doc))
    client.put("/api/settings", json={"clip_pre_s": 9})
    assert _restore(client, name).status_code == 200
    assert _snapshot(session_factory) == before


def test_a_backup_from_a_newer_version_is_refused_and_changes_nothing(
    client: TestClient,
    populated: dict,
    settings: Settings,
    session_factory: sessionmaker[Session],  # type: ignore[type-arg]
) -> None:
    name = _make(client)
    path = settings.library_root / "Backups" / name
    doc = json.loads(path.read_text())
    doc["tables"]["matches"][0]["weather"] = "rain"  # a column this version does not know
    path.write_text(json.dumps(doc))
    before = _snapshot(session_factory)
    r = _restore(client, name)
    assert r.status_code == 400
    assert "newer version" in r.json()["detail"]
    assert _snapshot(session_factory) == before


def test_new_rows_after_a_restore_get_fresh_ids(
    client: TestClient,
    populated: dict,
    settings: Settings,
    other_tiny_video: Path,  # type: ignore[type-arg]
) -> None:
    name = _make(client)
    _restore(client, name)
    r = client.post("/api/playlists", json={"name": "After", "event_ids": populated["events"][:1]})
    assert r.status_code == 201
    shutil.copyfile(other_tiny_video, settings.import_root / "b.mp4")
    r = client.post(
        "/api/imports",
        json={
            "filename": "b.mp4",
            "team_name": "Riverside",
            "season_label": "2026/27",
            "opponent": "City",
            "match_date": "2026-11-01",
        },
    )
    assert r.status_code == 201, r.text


@pytest.mark.parametrize("bad", ["../x.json", "x.txt", "..", "a/b.json"])
def test_odd_backup_names_are_rejected(client: TestClient, bad: str) -> None:
    assert client.post(f"/api/backups/{bad}/restore", json={"confirm": "RESTORE"}).status_code in {
        400,
        404,
    }
    assert client.get(f"/api/backups/{bad}").status_code in {400, 404}


def test_download_is_the_backup_file(client: TestClient, populated: dict) -> None:  # type: ignore[type-arg]
    name = _make(client)
    r = client.get(f"/api/backups/{name}")
    assert r.status_code == 200
    assert "attachment" in r.headers["content-disposition"]
    assert json.loads(r.content)["format"] == backups.FORMAT


def test_upload_a_valid_backup_then_restore_it(
    client: TestClient,
    populated: dict,
    session_factory: sessionmaker[Session],  # type: ignore[type-arg]
) -> None:
    before = _snapshot(session_factory)
    data = client.get(f"/api/backups/{_make(client)}").content
    client.put("/api/settings", json={"clip_pre_s": 30})
    r = client.post(
        "/api/backups/upload", files={"file": ("from-old-mac.json", data, "application/json")}
    )
    assert r.status_code == 201, r.text
    assert r.json()["kind"] == "uploaded"
    _restore(client, r.json()["name"])
    assert _snapshot(session_factory) == before


@pytest.mark.parametrize("payload", [b"not json", b'{"format": "something"}', b"[]"])
def test_upload_of_an_invalid_file_is_refused_and_nothing_saved(
    client: TestClient, settings: Settings, payload: bytes
) -> None:
    r = client.post("/api/backups/upload", files={"file": ("x.json", payload, "application/json")})
    assert r.status_code == 400
    assert client.get("/api/backups").json() == []


def test_delete_a_backup(client: TestClient, populated: dict, settings: Settings) -> None:  # type: ignore[type-arg]
    name = _make(client)
    assert client.delete(f"/api/backups/{name}").status_code == 204
    assert not (settings.library_root / "Backups" / name).exists()


def test_automatic_backup_runs_when_none_in_the_last_day_and_not_otherwise(
    client: TestClient,
    populated: dict,
    settings: Settings,
    session_factory: sessionmaker[Session],  # type: ignore[type-arg]
) -> None:
    now = datetime(2026, 11, 9, 12, 0, tzinfo=UTC)
    with session_factory() as db:
        assert backups.run_auto_backup_if_due(db, settings, now) is not None
        assert backups.run_auto_backup_if_due(db, settings, now + timedelta(hours=23)) is None
        assert backups.run_auto_backup_if_due(db, settings, now + timedelta(hours=25)) is not None
    kinds = [b["kind"] for b in client.get("/api/backups").json()]
    assert kinds == ["auto", "auto"]


def test_retention_prunes_only_old_automatic_backups(
    client: TestClient,
    populated: dict,
    settings: Settings,
    session_factory: sessionmaker[Session],  # type: ignore[type-arg]
) -> None:
    manual = _make(client)
    start = datetime(2026, 1, 1, tzinfo=UTC)
    with session_factory() as db:
        for d in range(20):
            backups.run_auto_backup_if_due(db, settings, start + timedelta(days=d))
    listed = client.get("/api/backups").json()
    assert sum(b["kind"] == "auto" for b in listed) == backups.KEEP_AUTO == 14
    assert manual in [b["name"] for b in listed]
    newest_auto = max(b["name"] for b in listed if b["kind"] == "auto")
    assert newest_auto.startswith("auto-20260120")


def test_starting_the_app_makes_the_daily_automatic_backup(
    settings: Settings, session_factory: sessionmaker[Session]
) -> None:
    import time

    from app.main import create_app

    with TestClient(
        create_app(
            settings.model_copy(update={"auto_backup": True}), session_factory=session_factory
        )
    ) as c:
        for _ in range(100):
            if c.get("/api/backups").json():
                break
            time.sleep(0.02)
        assert [b["kind"] for b in c.get("/api/backups").json()] == ["auto"]
