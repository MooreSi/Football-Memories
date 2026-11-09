"""HTTP API for the first vertical slice."""

import shutil
from pathlib import Path

from fastapi.testclient import TestClient

from app.config import Settings

IMPORT_BODY = {
    "filename": "U12 v Rovers 2026-10-18.mp4",
    "team_name": "Riverside U12",
    "season_label": "2026/27",
    "age_group": "U12",
    "opponent": "Rovers",
    "match_date": "2026-10-18",
    "competition": "League",
}


def _import(client: TestClient, **kw: object) -> dict:  # type: ignore[type-arg]
    r = client.post("/api/imports", json={**IMPORT_BODY, **kw})
    assert r.status_code == 201, r.text
    return r.json()  # type: ignore[no-any-return]


def test_health(client: TestClient) -> None:
    assert client.get("/api/health").json() == {"status": "ok"}


def test_inbox_lists_video_files_and_their_sidecars_only(
    client: TestClient, settings: Settings, inbox_video: Path
) -> None:
    inbox_video.with_suffix(".tags.csv").write_text("time,category\n0:01,Save\n")
    (settings.import_root / "readme.txt").write_text("hi")
    files = client.get("/api/imports/inbox").json()
    assert [(f["filename"], f["has_tags"]) for f in files] == [
        ("U12 v Rovers 2026-10-18.mp4", True)
    ]
    assert files[0]["size_bytes"] == inbox_video.stat().st_size


def test_import_returns_the_match_and_lists_it(client: TestClient, inbox_video: Path) -> None:
    created = _import(client)
    page = client.get("/api/matches").json()
    assert page["total"] == 1
    item = page["items"][0]
    assert item["id"] == created["id"]
    assert (item["opponent"], item["team_name"], item["season_label"]) == (
        "Rovers",
        "Riverside U12",
        "2026/27",
    )
    assert item["thumbnail_url"] == f"/api/media/{item['media_id']}/thumbnail"
    assert item["offline"] is True


def test_duplicate_import_is_a_409_naming_the_existing_match(
    client: TestClient, settings: Settings, inbox_video: Path
) -> None:
    created = _import(client)
    shutil.copyfile(inbox_video, settings.import_root / "again.mp4")
    r = client.post("/api/imports", json={**IMPORT_BODY, "filename": "again.mp4"})
    assert r.status_code == 409
    assert r.json()["detail"]["existing_match_id"] == created["id"]


def test_traversal_in_an_import_filename_is_a_400(client: TestClient) -> None:
    r = client.post("/api/imports", json={**IMPORT_BODY, "filename": "../secrets.mp4"})
    assert r.status_code == 400


def test_matches_search_filters_by_opponent_and_paginates(
    client: TestClient, settings: Settings, inbox_video: Path, other_tiny_video: Path
) -> None:
    _import(client)
    shutil.copyfile(other_tiny_video, settings.import_root / "b.mp4")
    _import(client, filename="b.mp4", opponent="City", match_date="2026-11-01")
    assert [m["opponent"] for m in client.get("/api/matches?q=rov").json()["items"]] == ["Rovers"]
    page = client.get("/api/matches?page=1&page_size=1").json()
    assert (page["total"], [m["opponent"] for m in page["items"]]) == (2, ["City"])


def test_match_detail_includes_events_with_tags_and_players(
    client: TestClient, inbox_video: Path
) -> None:
    inbox_video.with_suffix(".tags.csv").write_text(
        "time,category,players\n0:01,Save,Sam Moore\n0:03,Goal,\n"
    )
    created = _import(client)
    detail = client.get(f"/api/matches/{created['id']}").json()
    assert [(e["time_s"], e["category"], e["players"]) for e in detail["events"]] == [
        (1.0, "Save", ["Sam Moore"]),
        (3.0, "Goal", []),
    ]
    assert detail["media"]["stream_url"] == f"/api/media/{detail['media']['id']}/stream"


def test_unknown_match_is_a_404(client: TestClient) -> None:
    assert client.get("/api/matches/999").status_code == 404


def test_stream_honours_range_requests_so_the_player_can_seek(
    client: TestClient, inbox_video: Path
) -> None:
    created = _import(client)
    media_id = client.get(f"/api/matches/{created['id']}").json()["media"]["id"]
    r = client.get(f"/api/media/{media_id}/stream", headers={"Range": "bytes=0-99"})
    assert r.status_code == 206
    assert r.content == inbox_video.read_bytes()[:100]


def test_thumbnail_is_served_as_jpeg(client: TestClient, inbox_video: Path) -> None:
    created = _import(client)
    media_id = client.get(f"/api/matches/{created['id']}").json()["media"]["id"]
    r = client.get(f"/api/media/{media_id}/thumbnail")
    assert (r.status_code, r.headers["content-type"]) == (200, "image/jpeg")


def test_missing_local_file_is_reported_not_crashed(
    client: TestClient, settings: Settings, inbox_video: Path
) -> None:
    created = _import(client)
    for f in (settings.archive_root / "FootballMemories/Matches").rglob("*.mp4"):
        f.unlink()
    detail = client.get(f"/api/matches/{created['id']}").json()
    assert detail["media"]["available"] is False
    media_id = detail["media"]["id"]
    assert client.get(f"/api/media/{media_id}/stream").status_code == 410


def test_connectors_report_real_capabilities(client: TestClient) -> None:
    by_id = {c["id"]: c for c in client.get("/api/connectors").json()}
    assert set(by_id) == {"local_import", "hudl"}
    assert by_id["local_import"]["capabilities"]["import_files"] is True
    hudl = by_id["hudl"]
    assert hudl["available"] is False
    assert not any(hudl["capabilities"].values())
    assert "Terms" in hudl["reason"]


def test_mock_connector_is_never_exposed_by_the_production_api(client: TestClient) -> None:
    ids = [c["id"] for c in client.get("/api/connectors").json()]
    assert "mock" not in ids
