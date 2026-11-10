"""Download folder choice and Trash-only deletion. No Hudl requests; tmp folders only."""

import hashlib
import os
from pathlib import Path
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app.connectors.hudl_companion import create_companion

ORIGIN = {"Origin": "http://127.0.0.1:8765"}


def client_for(tmp_path: Path):
    inbox = tmp_path / "data" / "inbox"
    inbox.mkdir(parents=True)
    app = create_companion(inbox)
    app.state.downloads.trash = tmp_path / "Trash"
    app.state.downloads.trash.mkdir()
    return app, inbox, TestClient(app, base_url="http://127.0.0.1:8766")


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def test_default_folder_is_unchanged_and_lists_downloaded_files(tmp_path):
    app, inbox, client = client_for(tmp_path)
    (inbox / "hudl-abc-highest-720p-1.mp4").write_bytes(b"video")
    (inbox / ".hidden").write_bytes(b"x")
    with client:
        data = client.get("/downloads", headers=ORIGIN).json()
    assert data["folder"] == str(inbox.resolve())
    assert data["is_default"] is True
    assert [f["name"] for f in data["files"]] == ["hudl-abc-highest-720p-1.mp4"]
    assert data["files"][0]["size"] == 5


def test_chosen_folder_is_used_for_new_downloads_and_survives_restart(tmp_path):
    app, inbox, client = client_for(tmp_path)
    chosen = tmp_path / "External"
    chosen.mkdir()
    with client, patch("app.connectors.hudl_downloads.choose_folder", return_value=chosen):
        response = client.post("/downloads/folder", headers=ORIGIN, json={"action": "choose"})
    assert response.status_code == 200
    assert response.json()["folder"] == str(chosen.resolve())
    assert app.state.account.output == chosen.resolve()
    assert app.state.capture.output == chosen.resolve()
    restarted = create_companion(inbox)
    assert restarted.state.downloads.folder == chosen.resolve()
    with TestClient(restarted, base_url="http://127.0.0.1:8766") as again:
        reset = again.post("/downloads/folder", headers=ORIGIN, json={"action": "reset"})
    assert reset.json()["is_default"] is True
    assert restarted.state.account.output == inbox.resolve()


def test_cancelled_or_unwritable_choice_keeps_the_current_folder(tmp_path):
    app, inbox, client = client_for(tmp_path)
    with client:
        with patch("app.connectors.hudl_downloads.choose_folder", return_value=None):
            cancelled = client.post("/downloads/folder", headers=ORIGIN, json={"action": "choose"})
        with patch(
            "app.connectors.hudl_downloads.choose_folder", return_value=tmp_path / "missing"
        ):
            missing = client.post("/downloads/folder", headers=ORIGIN, json={"action": "choose"})
    assert cancelled.status_code == 400
    assert missing.status_code == 400
    assert app.state.downloads.folder == inbox.resolve()


def test_delete_moves_only_the_named_file_to_trash(tmp_path):
    app, inbox, client = client_for(tmp_path)
    target = inbox / "hudl-abc.mp4"
    keep = inbox / "hudl-abc.tags.csv"
    target.write_bytes(b"delete me")
    keep.write_bytes(b"keep me")
    before = digest(keep)
    with client:
        response = client.post("/downloads/delete", headers=ORIGIN, json={"name": "hudl-abc.mp4"})
    assert response.status_code == 200
    assert not target.exists()
    assert (tmp_path / "Trash" / "hudl-abc.mp4").read_bytes() == b"delete me"
    assert digest(keep) == before


def test_delete_never_replaces_an_existing_trash_item(tmp_path):
    app, inbox, client = client_for(tmp_path)
    (inbox / "a.mp4").write_bytes(b"new")
    (tmp_path / "Trash" / "a.mp4").write_bytes(b"older")
    with client:
        response = client.post("/downloads/delete", headers=ORIGIN, json={"name": "a.mp4"})
    assert response.status_code == 200
    assert (tmp_path / "Trash" / "a.mp4").read_bytes() == b"older"
    assert sorted(p.read_bytes() for p in (tmp_path / "Trash").iterdir()) == [b"new", b"older"]


def test_delete_refuses_paths_links_hidden_and_busy(tmp_path):
    app, inbox, client = client_for(tmp_path)
    outside = tmp_path / "outside.mp4"
    outside.write_bytes(b"outside")
    os.symlink(outside, inbox / "link.mp4")
    (inbox / ".secret.mp4").write_bytes(b"x")
    (inbox / "busy.mp4").write_bytes(b"x")
    with client:
        names = ["../outside.mp4", "link.mp4", ".secret.mp4", "missing.mp4", "sub/a.mp4"]
        results = [
            client.post("/downloads/delete", headers=ORIGIN, json={"name": n}).status_code
            for n in names
        ]
        app.state.account = MagicMock()
        app.state.account.status.return_value = {"busy": True, "syncing": False}
        busy = client.post("/downloads/delete", headers=ORIGIN, json={"name": "busy.mp4"})
    assert results == [400] * len(names)
    assert busy.status_code == 400
    assert outside.read_bytes() == b"outside"
    assert (inbox / "busy.mp4").exists()
    assert list((tmp_path / "Trash").iterdir()) == []


def test_delete_requires_the_local_app_origin(tmp_path):
    app, inbox, client = client_for(tmp_path)
    (inbox / "a.mp4").write_bytes(b"x")
    with client:
        response = client.post(
            "/downloads/delete", headers={"Origin": "https://evil.test"}, json={"name": "a.mp4"}
        )
    assert response.status_code == 403
    assert (inbox / "a.mp4").exists()
