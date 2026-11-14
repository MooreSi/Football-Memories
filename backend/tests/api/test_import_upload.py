"""Owner request 2026-11-14: a video dropped on (or chosen in) the Import page is
saved into the import folder's `uploaded/` subfolder, then imported as usual. It is
written as a hidden `.part` first and published under a name nothing else has; an
existing file is never replaced (golden rule 4)."""

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.config import Settings

URL = "/api/imports/upload"


def test_an_uploaded_video_lands_in_the_uploaded_folder_and_is_listed(
    client: TestClient, settings: Settings
) -> None:
    body = b"\x00\x00\x00\x18ftypmp42" + b"x" * 5000
    r = client.put(URL, params={"filename": "U12 v Rovers.mp4"}, content=body)
    assert r.status_code == 201, r.text
    assert r.json() == {
        "filename": "uploaded/U12 v Rovers.mp4",
        "size_bytes": len(body),
        "has_tags": False,
    }
    saved = settings.import_root / "uploaded" / "U12 v Rovers.mp4"
    assert saved.read_bytes() == body
    assert not [p for p in saved.parent.iterdir() if p.name.endswith(".part")]
    listed = [f["filename"] for f in client.get("/api/imports/inbox").json()]
    assert "uploaded/U12 v Rovers.mp4" in listed


def test_an_upload_never_replaces_a_file_with_the_same_name(
    client: TestClient, settings: Settings
) -> None:
    folder = settings.import_root / "uploaded"
    folder.mkdir()
    existing = folder / "match.mp4"
    existing.write_bytes(b"the original")
    r = client.put(URL, params={"filename": "match.mp4"}, content=b"new video")
    assert r.status_code == 201
    assert existing.read_bytes() == b"the original"
    assert r.json()["filename"] == "uploaded/match (2).mp4"
    assert (folder / "match (2).mp4").read_bytes() == b"new video"


@pytest.mark.parametrize("name", ["notes.txt", "clip", "../escape.mp4", "a/b.mp4", ""])
def test_only_a_plain_video_file_name_is_accepted(
    client: TestClient, settings: Settings, name: str
) -> None:
    r = client.put(URL, params={"filename": name}, content=b"data")
    assert r.status_code in (400, 422)
    assert not (settings.import_root / "uploaded").exists() or not any(
        (settings.import_root / "uploaded").iterdir()
    )
    assert not (settings.import_root.parent / "escape.mp4").exists()


def test_an_empty_upload_is_refused_and_leaves_nothing(
    client: TestClient, settings: Settings
) -> None:
    r = client.put(URL, params={"filename": "empty.mp4"}, content=b"")
    assert r.status_code == 400
    folder = settings.import_root / "uploaded"
    assert not folder.exists() or not any(folder.iterdir())


def test_an_uploaded_video_can_be_imported(
    client: TestClient, settings: Settings, inbox_video: Path
) -> None:
    data = inbox_video.read_bytes()
    name = client.put(URL, params={"filename": "Upload v Town.mp4"}, content=data).json()[
        "filename"
    ]
    r = client.post(
        "/api/imports",
        json={
            "filename": name,
            "team_name": "Riverside U12",
            "opponent": "Town",
            "match_date": "2026-10-18",
            "season_label": "2026/27",
        },
    )
    assert r.status_code == 201, r.text
    assert (settings.import_root / name).read_bytes() == data  # the upload is kept, not moved
