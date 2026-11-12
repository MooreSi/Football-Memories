"""Spec 220: new downloads carry their details; the media library follows the index.

No Hudl requests: local files, a synthetic HLS playlist and fakes only.
"""

import json
import subprocess
import zipfile
from pathlib import Path
from unittest.mock import MagicMock

from fastapi.testclient import TestClient

from app.connectors.hudl_batch import assemble_reel
from app.connectors.hudl_capture import capture_hls
from app.connectors.hudl_companion import create_companion
from app.connectors.hudl_exports import export_ranges
from app.connectors.hudl_media import MediaLibrary

ORIGIN = {"Origin": "http://127.0.0.1:8765"}
MOMENTS = [
    {"id": "a", "category": "Goal", "time_s": 0.5, "duration_s": 1.0},
    {"id": "b", "category": "Save", "time_s": 2.0, "duration_s": 1.0},
]
TITLE = "260712 U11 v Cambridge (A)"


def tags(path: Path) -> dict[str, str]:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format_tags", "-of", "json", str(path)],
        capture_output=True,
        text=True,
        check=True,
    ).stdout
    return json.loads(out)["format"].get("tags", {})


def details(tmp_path: Path, kind: str = "moments"):
    return MediaLibrary(tmp_path / "cache").export_details(kind, "m1", TITLE, MOMENTS)


def test_combined_moments_carry_their_details(tmp_path, tiny_video):
    out = tmp_path / "out"
    out.mkdir()
    d = details(tmp_path)
    result = export_ranges(tiny_video, MOMENTS, out, combined=True, match_title=TITLE, details=d)
    found = tags(result)
    assert found["title"] == d.title == "U11 v Cambridge (A) - Moments"
    assert found["date"] == "2026-07-12"


def test_each_clip_in_a_moments_zip_is_titled_by_its_moment(tmp_path, tiny_video):
    out = tmp_path / "out"
    out.mkdir()
    result = export_ranges(tiny_video, MOMENTS, out, match_title=TITLE, details=details(tmp_path))
    with zipfile.ZipFile(result) as archive:
        archive.extractall(tmp_path / "clips")
    titles = sorted(tags(p)["title"] for p in (tmp_path / "clips").glob("*.mp4"))
    assert titles == ["U11 v Cambridge (A) - Goal 1", "U11 v Cambridge (A) - Save 2"]


def test_exports_without_details_are_unchanged(tmp_path, tiny_video):
    out = tmp_path / "out"
    out.mkdir()
    result = export_ranges(tiny_video, MOMENTS, out, combined=True)
    assert "title" not in tags(result)  # negative control


def test_reel_carries_its_details(tmp_path, tiny_video):
    output = tmp_path / "reel.mp4"
    d = details(tmp_path, "reel")
    assemble_reel([tiny_video], output, metadata=d.ffmpeg_args())
    assert tags(output)["title"] == d.title
    plain = tmp_path / "plain.mp4"
    assemble_reel([tiny_video], plain)
    assert "title" not in tags(plain)


def test_full_match_capture_carries_its_details(tmp_path, tiny_video):
    source = tmp_path / "source"
    source.mkdir()
    subprocess.run(
        [
            "ffmpeg",
            "-v",
            "error",
            "-i",
            str(tiny_video),
            "-c",
            "copy",
            "-f",
            "hls",
            "-hls_time",
            "1",
            "-hls_playlist_type",
            "vod",
            str(source / "media.m3u8"),
        ],
        check=True,
    )
    responses = {
        f"https://video.hudl.com/synthetic/{p.name}": p.read_bytes() for p in source.iterdir()
    }
    scratch = tmp_path / "scratch"
    scratch.mkdir()
    d = details(tmp_path, "match")
    path, _ = capture_hls(
        responses.__getitem__,
        "https://video.hudl.com/synthetic/media.m3u8",
        scratch,
        max_height=720,
        metadata=d.ffmpeg_args(),
    )
    assert tags(path)["title"] == "U11 v Cambridge (A) - Full match"


def test_a_recorded_download_updates_the_media_library_only_when_on(tmp_path, tiny_video):
    from app.connectors.hudl_browser import BrowserConnection

    root = tmp_path / "inbox"
    root.mkdir()
    catalogue = MagicMock()
    catalogue.items.return_value = [{"id": "m1", "title": TITLE}]
    connection = BrowserConnection(lambda: None, catalogue, root)
    first = root / "hudl-a-highest-720p-1.mp4"
    first.write_bytes(tiny_video.read_bytes())
    connection.index.record("match", "m1", TITLE, first, root, [])
    assert not (root / "Media library").exists()  # off by default
    connection.media.configure(enabled=True)
    second = root / "hudl-b-highest-720p-1.mp4"
    second.write_bytes(tiny_video.read_bytes())
    connection.index.record("match", "m1", TITLE, second, root, [])
    linked = list((root / "Media library").rglob("*.mp4"))
    assert {p.stat().st_ino for p in linked} == {first.stat().st_ino, second.stat().st_ino}


def _companion(tmp_path: Path, tiny_video: Path):
    app = create_companion(tmp_path / "inbox")
    app.state.downloads.trash = tmp_path / "Trash"
    app.state.downloads.trash.mkdir()
    root = app.state.downloads.folder
    (root / "reels").mkdir(parents=True)
    reel = root / "reels" / "Sam highlights (ab12).mp4"
    reel.write_bytes(tiny_video.read_bytes())
    other = root / "reels" / "Sam highlights (cd34).mp4"
    other.write_bytes(tiny_video.read_bytes())
    app.state.account.index.record("reel", "m1", f"Sam highlights - {TITLE}", reel, root, [])
    app.state.account.index.record("reel", "m2", "Sam highlights", other, root, [])
    return app, root, TestClient(app, base_url="http://127.0.0.1:8766")


CONTEXT = {
    "club": "Aston Villa",
    "player": "Sam Example",
    "matches": {"m1": {"label": "Aston Villa vs. Cambridge United U11", "ours": 3, "theirs": 1}},
}


def test_turning_the_media_library_on_builds_it_with_the_app_details(tmp_path, tiny_video):
    app, root, client = _companion(tmp_path, tiny_video)
    with client:
        off = client.get("/downloads/media", headers=ORIGIN).json()
        response = client.post(
            "/downloads/media", headers=ORIGIN, json={"enabled": True, "context": CONTEXT}
        )
        foreign = client.post(
            "/downloads/media", headers={"Origin": "https://evil.test"}, json={"enabled": False}
        )
    assert off["enabled"] is False
    assert response.status_code == 200
    assert response.json()["enabled"] is True and response.json()["failed"] == []
    assert foreign.status_code == 403
    nfo = next((root / "Media library").rglob("*Cambridge*.nfo"))
    assert "Score: 3-1" in nfo.read_text() and "Sam Example" in nfo.read_text()


def test_media_context_is_validated(tmp_path, tiny_video):
    app, root, client = _companion(tmp_path, tiny_video)
    with client:
        bad = client.post(
            "/downloads/media", headers=ORIGIN, json={"context": {"player": 5, "matches": {}}}
        )
        extra = client.post("/downloads/media", headers=ORIGIN, json={"path": "/etc"})
    assert bad.status_code in {400, 422} and extra.status_code in {400, 422}
    assert not (root / "Media library").exists()


def test_delete_also_moves_that_downloads_media_folder_to_trash(tmp_path, tiny_video):
    app, root, client = _companion(tmp_path, tiny_video)
    with client:
        client.post("/downloads/media", headers=ORIGIN, json={"enabled": True, "context": CONTEXT})
        library = root / "Media library"
        folders = sorted(p.name for p in library.iterdir() if p.is_dir())
        assert len(folders) == 2
        mine = app.state.account.media.folder_for(root, "reels/Sam highlights (ab12).mp4")
        response = client.post(
            "/downloads/remove", headers=ORIGIN, json={"file": "reels/Sam highlights (ab12).mp4"}
        )
        status = client.get("/downloads/media", headers=ORIGIN).json()
    assert response.status_code == 200
    assert mine is not None and not mine.exists()
    assert (tmp_path / "Trash" / mine.name).is_dir()
    assert [p.name for p in library.iterdir() if p.is_dir()] == [
        f for f in folders if f != mine.name
    ]  # the other download's folder untouched
    assert status["enabled"] is True


def test_batch_moment_exports_are_made_with_their_match_details(tmp_path):
    import time
    from unittest.mock import patch

    from app.connectors.hudl_browser import BrowserConnection
    from app.connectors.hudl_media import current_details

    catalogue = MagicMock()
    catalogue.find.side_effect = lambda i: {"id": i, "title": TITLE}
    connection = BrowserConnection(MagicMock(), catalogue, tmp_path / "inbox")
    connection.details.write("m1", {"moments": MOMENTS, "tag_status": "synced"})
    seen = []

    def prepare(identity):
        connection._stream_id, connection._stream_match = f"s-{identity}", identity
        connection._stream_playlist = "#EXTM3U\n"

    def fake_export(playlist, fetch, selected, output, **kwargs):
        seen.append(current_details())
        target = output / "x.zip"
        target.write_bytes(b"zip")
        return target

    with (
        patch.object(connection, "_prepare_stream", side_effect=prepare),
        patch.object(connection, "_pause", lambda: None),
        patch("app.connectors.hudl_exports.export_from_segments", side_effect=fake_export),
    ):
        connection.start_batch([{"match_id": "m1", "codes": ["Goal"]}], combined=False)
        for _ in range(400):
            if not connection.status()["busy"]:
                break
            time.sleep(0.02)
    connection._executor.shutdown()
    assert [d.title if d else None for d in seen] == ["U11 v Cambridge (A) - Moments (Goal)"]
    assert current_details() is None  # nothing leaks outside the export


def test_settings_delete_also_moves_the_media_folder_of_a_full_match(tmp_path, tiny_video):
    app, root, client = _companion(tmp_path, tiny_video)
    match = root / "hudl-abc-highest-720p-1.mp4"
    match.write_bytes(tiny_video.read_bytes())
    app.state.account.index.record("match", "m1", TITLE, match, root, [])
    with client:
        client.post("/downloads/media", headers=ORIGIN, json={"enabled": True})
        folder = app.state.account.media.folder_for(root, match.name)
        assert folder is not None and folder.is_dir()
        response = client.post("/downloads/delete", headers=ORIGIN, json={"name": match.name})
    assert response.status_code == 200
    assert not folder.exists()
    assert (tmp_path / "Trash" / folder.name).is_dir()
    assert app.state.account.media.folder_for(root, match.name) is None


def test_moment_exports_and_reels_save_to_a_drive_without_hard_links(
    tmp_path, tiny_video, monkeypatch
):
    import errno

    from app.services import publish as publish_module

    def no_links(*args, **kwargs):
        raise OSError(errno.ENOTSUP, "Operation not supported")

    monkeypatch.setattr(publish_module.os, "link", no_links)
    out = tmp_path / "out"
    out.mkdir()
    moments = export_ranges(tiny_video, MOMENTS, out, combined=True, match_title=TITLE)
    zipped = export_ranges(tiny_video, MOMENTS, out, match_title=TITLE)
    reel = tmp_path / "reel.mp4"
    assemble_reel([tiny_video], reel)
    assert moments.is_file() and zipped.is_file() and reel.is_file()
    assert sorted(p.name for p in out.iterdir()) == sorted([moments.name, zipped.name])
