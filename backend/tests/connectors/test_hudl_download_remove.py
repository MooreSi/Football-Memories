"""Owner request 2026-11-12: Downloaded > Delete moves one listed download to the Trash.

Only a file the Downloaded screen lists can be removed, it is moved (never copied
then deleted), nothing else in the folder changes and an existing Trash item is
never replaced. No Hudl requests; tmp folders only.
"""

import hashlib
import os
from pathlib import Path
from unittest.mock import MagicMock

from fastapi.testclient import TestClient

from app.connectors.hudl_companion import create_companion

ORIGIN = {"Origin": "http://127.0.0.1:8765"}


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _app(tmp_path: Path):
    app = create_companion(tmp_path / "inbox")
    app.state.downloads.trash = tmp_path / "Trash"
    app.state.downloads.trash.mkdir()
    root = app.state.downloads.folder
    (root / "reels").mkdir(parents=True)
    (root / "moments").mkdir()
    reel = root / "reels" / "Sam highlights (ab12).mp4"
    reel.write_bytes(b"reel bytes")
    other = root / "reels" / "Sam highlights (cd34).mp4"
    other.write_bytes(b"other reel")
    bundle = root / "moments" / "Stoke moments.zip"
    bundle.write_bytes(b"zip bytes")
    index = app.state.account.index
    index.record("reel", "m1", "261108 U11 v Stoke (A)", reel, root, [])
    index.record("reel", "m2", "261101 U11 v Leeds (H)", other, root, [])
    index.record("moments", "m1", "261108 U11 v Stoke (A)", bundle, root, [])
    return app, root, TestClient(app, base_url="http://127.0.0.1:8766")


def post(client: TestClient, file: str, headers: dict[str, str] = ORIGIN):
    return client.post("/downloads/remove", headers=headers, json={"file": file})


def test_remove_moves_only_that_listed_download_to_trash(tmp_path):
    app, root, client = _app(tmp_path)
    reel = root / "reels" / "Sam highlights (ab12).mp4"
    before = {p: digest(p) for p in root.rglob("*") if p.is_file() and p != reel}
    with client:
        response = post(client, "reels/Sam highlights (ab12).mp4")
        listed = [e["file"] for e in client.get("/downloads/index", headers=ORIGIN).json()]
    assert response.status_code == 200
    assert response.json()["trashed_as"] == "Sam highlights (ab12).mp4"
    assert not reel.exists()
    assert (tmp_path / "Trash" / "Sam highlights (ab12).mp4").read_bytes() == b"reel bytes"
    assert {p: digest(p) for p in before} == before  # every other file unchanged
    assert "reels/Sam highlights (ab12).mp4" not in listed
    assert "moments/Stoke moments.zip" in listed


def test_remove_never_replaces_an_existing_trash_item(tmp_path):
    app, root, client = _app(tmp_path)
    (tmp_path / "Trash" / "Stoke moments.zip").write_bytes(b"older")
    with client:
        response = post(client, "moments/Stoke moments.zip")
    assert response.status_code == 200
    assert response.json()["trashed_as"] == "Stoke moments (1).zip"
    assert (tmp_path / "Trash" / "Stoke moments.zip").read_bytes() == b"older"
    assert (tmp_path / "Trash" / "Stoke moments (1).zip").read_bytes() == b"zip bytes"


def test_remove_refuses_anything_the_downloaded_screen_does_not_list(tmp_path):
    app, root, client = _app(tmp_path)
    unlisted = root / "reels" / "not indexed.mp4"
    unlisted.write_bytes(b"x")
    outside = tmp_path / "outside.mp4"
    outside.write_bytes(b"outside")
    os.symlink(outside, root / "reels" / "link.mp4")
    app.state.account.index.record("reel", None, None, root / "reels" / "link.mp4", root, [])
    names = [
        "reels/not indexed.mp4",
        "reels/link.mp4",
        "../outside.mp4",
        "reels/../../outside.mp4",
        "/etc/passwd",
        "reels/missing.mp4",
    ]
    with client:
        results = [post(client, n).status_code for n in names]
    assert results == [400] * len(names)
    assert unlisted.read_bytes() == b"x"
    assert outside.read_bytes() == b"outside"
    assert list((tmp_path / "Trash").iterdir()) == []


def test_remove_waits_for_an_active_download_and_needs_the_app_origin(tmp_path):
    app, root, client = _app(tmp_path)
    with client:
        foreign = post(client, "moments/Stoke moments.zip", {"Origin": "https://evil.test"})
        app.state.account = MagicMock(index=app.state.account.index)
        app.state.account.status.return_value = {"busy": True, "syncing": False}
        busy = post(client, "moments/Stoke moments.zip")
    assert foreign.status_code == 403
    assert busy.status_code == 400
    assert (root / "moments" / "Stoke moments.zip").read_bytes() == b"zip bytes"
    assert list((tmp_path / "Trash").iterdir()) == []
