"""Spec 190: moment exports live in moments/, and a download index feeds the
Downloaded screen and the Library badges."""

import time
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app.connectors.hudl_browser import BrowserConnection
from app.connectors.hudl_companion import create_companion
from app.connectors.hudl_index import DownloadIndex
from app.connectors.hudl_metadata import capture_key

ORIGIN = {"Origin": "http://127.0.0.1:8765"}
MOMENTS = [
    {"id": "a", "category": "Sam Example", "time_s": 0.5, "duration_s": 1.0},
    {"id": "b", "category": "Goal", "time_s": 2.0, "duration_s": 1.0},
]


def test_index_lists_only_files_that_still_exist(tmp_path):
    root = tmp_path / "inbox"
    (root / "moments").mkdir(parents=True)
    kept = root / "moments" / "kept.zip"
    kept.write_bytes(b"zip")
    gone = root / "moments" / "gone.zip"
    index = DownloadIndex(tmp_path / "index.json")
    index.record("moments", "m1", "261108 U11 v Stoke (A)", kept, root, MOMENTS)
    index.record("moments", "m1", "261108 U11 v Stoke (A)", gone, root, MOMENTS)
    entries = index.entries(root)
    assert [e["file"] for e in entries] == ["moments/kept.zip"]
    entry = entries[0]
    assert entry["kind"] == "moments"
    assert entry["match_id"] == "m1"
    assert entry["moment_count"] == 2
    assert entry["codes"] == ["Goal", "Sam Example"]
    assert entry["size"] == 3
    assert entry["combined"] is False


def test_index_survives_a_restart_and_rejects_files_outside_the_folder(tmp_path):
    root = tmp_path / "inbox"
    root.mkdir()
    outside = tmp_path / "elsewhere.mp4"
    outside.write_bytes(b"x")
    index = DownloadIndex(tmp_path / "index.json")
    index.record("match", "m1", "Title", outside, root, [])
    assert DownloadIndex(tmp_path / "index.json").entries(root) == []


def test_existing_full_match_captures_are_recognised_without_an_index(tmp_path):
    root = tmp_path / "inbox"
    root.mkdir()
    name = f"hudl-{capture_key('m1')}-highest-1080p-5000000.mp4"
    (root / name).write_bytes(b"video")
    index = DownloadIndex(tmp_path / "index.json")
    entries = index.entries(root, catalogue=[{"id": "m1", "title": "261108 U11 v Stoke (A)"}])
    assert len(entries) == 1
    assert entries[0]["kind"] == "match"
    assert entries[0]["match_id"] == "m1"
    assert entries[0]["file"] == name


def test_moment_export_is_written_to_the_moments_folder_and_indexed(tmp_path):
    catalogue = MagicMock()
    catalogue.find.return_value = {"id": "m1", "title": "261108 U11 v Stoke (A)"}
    connection = BrowserConnection(MagicMock(), catalogue, tmp_path / "inbox")
    connection.details.write("m1", {"moments": MOMENTS, "tag_status": "synced"})
    connection._stream_id, connection._stream_match = "s1", "m1"
    connection._stream_playlist = "#EXTM3U\n"
    folders = []

    def fake_export(playlist, fetch, selected, output, *, combined, match_title, progress):
        folders.append(output)
        output.mkdir(parents=True, exist_ok=True)
        target = output / "Stoke moments.zip"
        target.write_bytes(b"zip")
        return target

    with patch("app.connectors.hudl_exports.export_from_segments", side_effect=fake_export):
        connection.start("clips", "m1", ["a", "b"])
        for _ in range(200):
            if not connection.status()["busy"]:
                break
            time.sleep(0.02)
    connection._executor.shutdown()
    assert folders == [tmp_path / "inbox" / "moments"]
    assert connection.status()["filename"] == "moments/Stoke moments.zip"
    entries = connection.index.entries(tmp_path / "inbox")
    assert [(e["kind"], e["match_id"], e["file"]) for e in entries] == [
        ("moments", "m1", "moments/Stoke moments.zip")
    ]


def test_download_index_route_serves_links_and_moments_files(tmp_path):
    root = tmp_path / "inbox"
    app = create_companion(root)
    app.state.catalogue.replace(
        [
            {
                "id": "m1",
                "title": "261108 U11 v Stoke (A)",
                "url": "https://www.hudl.com/watch/video/m1",
            }
        ]
    )
    folder = app.state.downloads.folder / "moments"
    folder.mkdir(parents=True)
    clip = folder / "Stoke moments.zip"
    clip.write_bytes(b"zip-bytes")
    app.state.account.index.record(
        "moments", "m1", "261108 U11 v Stoke (A)", clip, app.state.downloads.folder, MOMENTS
    )
    with TestClient(app, base_url="http://127.0.0.1:8766") as client:
        entries = client.get("/downloads/index", headers=ORIGIN).json()
        assert len(entries) == 1
        url = entries[0]["url"]
        assert url.startswith(f"http://127.0.0.1:8766/files/{app.state.file_scope}/moments/")
        response = client.get(url.removeprefix("http://127.0.0.1:8766"))
        assert response.status_code == 200
        assert response.content == b"zip-bytes"
        scope = app.state.file_scope
        assert client.get(f"/files/{scope}/moments/..%2F..%2Fsecret.zip").status_code in {400, 404}
        assert client.get(f"/files/{scope}/moments/not-indexed.zip").status_code == 400
    app.state.account._executor.shutdown()
