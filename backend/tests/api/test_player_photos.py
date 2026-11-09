"""Player profile photos (brief section 11). Photos of a child: re-encoded to a
512x512 JPEG so embedded metadata (EXIF GPS, device, timestamps) never survives."""

import json
import shutil
import subprocess
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.config import Settings

SECRET = b"SECRET-GPS-51.5074N-0.1278W"


def _image(path: Path, size: str = "800x600", color: str = "0x2563eb") -> bytes:
    subprocess.run(
        [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-f",
            "lavfi",
            "-i",
            f"color=c={color}:s={size}",
            "-frames:v",
            "1",
            str(path),
        ],
        check=True,
    )
    return path.read_bytes()


def _with_exif(jpeg: bytes) -> bytes:
    """Insert an APP1 'Exif' segment carrying a fake GPS string right after SOI."""
    payload = b"Exif\x00\x00" + SECRET
    segment = b"\xff\xe1" + (len(payload) + 2).to_bytes(2, "big") + payload
    assert jpeg[:2] == b"\xff\xd8"
    return jpeg[:2] + segment + jpeg[2:]


def _probe(data: bytes, tmp: Path) -> dict:  # type: ignore[type-arg]
    f = tmp / "probe.jpg"
    f.write_bytes(data)
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-print_format", "json", "-show_streams", str(f)],
        capture_output=True,
        text=True,
        check=True,
    ).stdout
    return json.loads(out)["streams"][0]  # type: ignore[no-any-return]


@pytest.fixture
def sam(client: TestClient, settings: Settings, tiny_video: Path) -> int:
    shutil.copyfile(tiny_video, settings.import_root / "m.mp4")
    (settings.import_root / "m.tags.csv").write_text("time,category,players\n0:01,Save,Sam\n")
    client.post(
        "/api/imports",
        json={
            "filename": "m.mp4",
            "team_name": "Riverside",
            "season_label": "2026/27",
            "opponent": "Rovers",
            "match_date": "2026-10-18",
        },
    )
    return next(p["id"] for p in client.get("/api/players").json() if p["display_name"] == "Sam")


def _upload(
    client: TestClient, player_id: int, data: bytes, name: str = "me.jpg", ctype: str = "image/jpeg"
):  # type: ignore[no-untyped-def]
    return client.put(f"/api/players/{player_id}/photo", files={"file": (name, data, ctype)})


def test_a_new_player_has_no_photo(client: TestClient, sam: int) -> None:
    assert client.get(f"/api/players/{sam}").json()["photo_url"] is None


def test_upload_stores_a_512_square_jpeg_and_serves_it(
    client: TestClient, sam: int, tmp_path: Path
) -> None:
    r = _upload(client, sam, _image(tmp_path / "in.png"), "in.png", "image/png")
    assert r.status_code == 200, r.text
    url = r.json()["photo_url"]
    assert url.startswith(f"/api/players/{sam}/photo")
    photo = client.get(url)
    assert (photo.status_code, photo.headers["content-type"]) == (200, "image/jpeg")
    s = _probe(photo.content, tmp_path)
    assert (s["codec_name"], s["width"], s["height"]) == ("mjpeg", 512, 512)


def test_embedded_metadata_such_as_gps_is_stripped(
    client: TestClient, sam: int, tmp_path: Path
) -> None:
    original = _with_exif(_image(tmp_path / "in.jpg"))
    assert SECRET in original  # negative control: the input really carries it
    url = _upload(client, sam, original).json()["photo_url"]
    assert SECRET not in client.get(url).content


def test_the_photo_lives_under_the_archive_players_folder(
    client: TestClient, sam: int, settings: Settings, tmp_path: Path
) -> None:
    _upload(client, sam, _image(tmp_path / "in.jpg"))
    files = list((settings.library_root / "Players" / str(sam)).glob("*.jpg"))
    assert len(files) == 1
    assert list(settings.library_root.rglob("*.part*")) == []


def test_replacing_a_photo_serves_the_new_one_and_removes_the_old_copy(
    client: TestClient, sam: int, settings: Settings, tmp_path: Path
) -> None:
    first = _upload(client, sam, _image(tmp_path / "a.jpg", color="red")).json()["photo_url"]
    second = _upload(client, sam, _image(tmp_path / "b.jpg", color="green")).json()["photo_url"]
    assert first != second  # the URL changes so browsers do not show a cached old photo
    assert len(list((settings.library_root / "Players" / str(sam)).glob("*.jpg"))) == 1
    assert client.get(second).status_code == 200


def test_remove_photo(client: TestClient, sam: int, settings: Settings, tmp_path: Path) -> None:
    url = _upload(client, sam, _image(tmp_path / "a.jpg")).json()["photo_url"]
    assert client.delete(f"/api/players/{sam}/photo").status_code == 200
    assert client.get(f"/api/players/{sam}").json()["photo_url"] is None
    assert client.get(url).status_code == 404
    assert list((settings.library_root / "Players" / str(sam)).glob("*.jpg")) == []


def test_a_file_that_is_not_an_image_is_rejected_and_nothing_is_written(
    client: TestClient, sam: int, settings: Settings
) -> None:
    r = _upload(client, sam, b"definitely not a picture", "evil.jpg")
    assert r.status_code == 400
    assert client.get(f"/api/players/{sam}").json()["photo_url"] is None
    assert not (settings.library_root / "Players").exists() or not any(
        p.is_file() for p in (settings.library_root / "Players").rglob("*")
    )


def test_a_video_is_not_accepted_as_a_photo(client: TestClient, sam: int, tiny_video: Path) -> None:
    r = _upload(client, sam, tiny_video.read_bytes(), "clip.jpg")
    assert r.status_code == 400


def test_an_oversized_upload_is_refused(client: TestClient, sam: int) -> None:
    r = _upload(client, sam, b"\xff\xd8" + b"0" * (10 * 1024 * 1024 + 1))
    assert r.status_code == 413


def test_the_client_file_name_is_never_used_as_a_path(
    client: TestClient, sam: int, settings: Settings, tmp_path: Path
) -> None:
    r = _upload(client, sam, _image(tmp_path / "a.jpg"), "../../../../escape.jpg")
    assert r.status_code == 200
    assert not (settings.archive_root.parent / "escape.jpg").exists()
    assert not any(settings.archive_root.parent.rglob("escape.jpg"))


def test_photo_for_an_unknown_player_is_a_404(client: TestClient, tmp_path: Path) -> None:
    assert _upload(client, 999, _image(tmp_path / "a.jpg")).status_code == 404
    assert client.get("/api/players/999/photo").status_code == 404


def test_players_list_carries_the_photo_url(client: TestClient, sam: int, tmp_path: Path) -> None:
    url = _upload(client, sam, _image(tmp_path / "a.jpg")).json()["photo_url"]
    assert [p["photo_url"] for p in client.get("/api/players").json()] == [url]
