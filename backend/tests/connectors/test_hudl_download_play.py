"""Owner request 2026-11-11: Downloaded > Play plays the downloaded file itself.
A moments ZIP is played clip by clip, so its videos are served individually."""

import zipfile

from fastapi.testclient import TestClient

from app.connectors.hudl_companion import create_companion

ORIGIN = {"Origin": "http://127.0.0.1:8765"}


def _app(tmp_path, tiny_video):
    app = create_companion(tmp_path / "inbox")
    root = app.state.downloads.folder
    (root / "moments").mkdir(parents=True)
    bundle = root / "moments" / "Stoke moments.zip"
    with zipfile.ZipFile(bundle, "x", compression=zipfile.ZIP_STORED) as z:
        z.write(tiny_video, "Stoke - Goal - 001 - 2026-11-08.mp4")
        z.write(tiny_video, "Stoke - Save - 002 - 2026-11-08.mp4")
        z.writestr("moments.json", "[]")
    app.state.account.index.record("moments", "m1", "261108 U11 v Stoke (A)", bundle, root, [])
    return app, bundle


def test_zip_members_are_listed_in_order_and_played_from_the_zip(tmp_path, tiny_video):
    app, bundle = _app(tmp_path, tiny_video)
    before = bundle.read_bytes()
    with TestClient(app, base_url="http://127.0.0.1:8766") as client:
        listing = client.get(
            "/downloads/members", params={"file": "moments/Stoke moments.zip"}, headers=ORIGIN
        )
        assert listing.status_code == 200
        members = listing.json()
        assert [m["name"] for m in members] == [
            "Stoke - Goal - 001 - 2026-11-08.mp4",
            "Stoke - Save - 002 - 2026-11-08.mp4",
        ]
        clip = client.get(members[0]["url"].removeprefix("http://127.0.0.1:8766"))
        assert clip.status_code == 200
        assert clip.headers["content-type"] == "video/mp4"
        assert clip.content == tiny_video.read_bytes()
        ranged = client.get(
            members[0]["url"].removeprefix("http://127.0.0.1:8766"), headers={"Range": "bytes=0-9"}
        )
        assert ranged.status_code == 206 and len(ranged.content) == 10  # phones need byte ranges
    assert bundle.read_bytes() == before  # the download itself is only read


def test_members_only_for_indexed_zips_and_only_their_videos(tmp_path, tiny_video):
    app, _ = _app(tmp_path, tiny_video)
    scope = app.state.file_scope
    with TestClient(app, base_url="http://127.0.0.1:8766") as client:
        assert (
            client.get(
                "/downloads/members", params={"file": "moments/other.zip"}, headers=ORIGIN
            ).status_code
            == 400
        )
        base = f"/files/{scope}/moments/Stoke%20moments.zip"
        assert client.get(base, params={"member": "moments.json"}).status_code == 400
        assert client.get(base, params={"member": "../../etc/passwd"}).status_code == 400
        assert client.get(base, params={"member": "missing.mp4"}).status_code == 400
    app.state.account._executor.shutdown()
