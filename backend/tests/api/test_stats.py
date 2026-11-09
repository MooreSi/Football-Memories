"""Overview numbers for the Library dashboard tiles. Real counts only (brief section 28)."""

import shutil
from pathlib import Path

from fastapi.testclient import TestClient

from app.config import Settings

BODY = {
    "team_name": "Riverside U12",
    "season_label": "2026/27",
    "age_group": "U12",
    "opponent": "Rovers",
    "match_date": "2026-10-18",
}


def test_stats_on_an_empty_archive_are_zero(client: TestClient) -> None:
    s = client.get("/api/stats").json()
    assert s == {
        "matches": 0,
        "moments": 0,
        "footage_seconds": 0.0,
        "teams": 0,
        "players": 0,
        "top_tags": [],
        "recent_moments": [],
    }


def test_stats_count_matches_moments_footage_and_rank_tags(
    client: TestClient, settings: Settings, inbox_video: Path, other_tiny_video: Path
) -> None:
    inbox_video.with_suffix(".tags.csv").write_text(
        "time,category,players\n0:01,Save,Sam\n0:02,Save,Sam\n0:03,Goal,Alex\n"
    )
    first = client.post("/api/imports", json={**BODY, "filename": inbox_video.name})
    assert first.status_code == 201
    shutil.copyfile(other_tiny_video, settings.import_root / "b.mp4")
    assert (
        client.post(
            "/api/imports",
            json={**BODY, "filename": "b.mp4", "opponent": "City", "match_date": "2026-11-01"},
        ).status_code
        == 201
    )

    s = client.get("/api/stats").json()
    assert (s["matches"], s["moments"], s["teams"], s["players"]) == (2, 3, 1, 2)
    assert 6.5 < s["footage_seconds"] < 7.5  # 4s + 3s of generated video
    assert s["top_tags"] == [{"name": "Save", "count": 2}, {"name": "Goal", "count": 1}]


def test_recent_moments_come_newest_match_first_with_match_context(
    client: TestClient, inbox_video: Path
) -> None:
    inbox_video.with_suffix(".tags.csv").write_text("time,category,players\n0:01,Save,Sam\n")
    created = client.post("/api/imports", json={**BODY, "filename": inbox_video.name}).json()
    [m] = client.get("/api/stats").json()["recent_moments"]
    assert m["match_id"] == created["id"]
    assert (m["category"], m["players"], m["opponent"], m["time_s"]) == (
        "Save",
        ["Sam"],
        "Rovers",
        1.0,
    )
