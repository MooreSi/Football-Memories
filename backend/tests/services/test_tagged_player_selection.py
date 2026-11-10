from fastapi.testclient import TestClient


def test_unknown_tag_cannot_create_an_invented_player(client: TestClient) -> None:
    response = client.post("/api/players/from-tag", json={"category": "Imaginary Player"})
    assert response.status_code == 400
    assert client.get("/api/players").json() == []


def test_tag_picker_lists_actual_imported_codes(client: TestClient) -> None:
    assert client.get("/api/players/tagged-codes").json() == []


def test_explicit_player_choice_links_only_that_codes_moments(client, settings, tiny_video):
    import shutil

    shutil.copyfile(tiny_video, settings.import_root / "tagged.mp4")
    (settings.import_root / "tagged.tags.csv").write_text(
        "time,category,players\n0:01,Sam Example,\n0:02,Goal,\n"
    )
    result = client.post(
        "/api/imports",
        json={
            "filename": "tagged.mp4",
            "team_name": "Riverside",
            "opponent": "Rovers",
            "season_label": "2026/27",
            "match_date": "2026-10-18",
            "age_group": "U12",
        },
    )
    assert result.status_code == 201
    choice = client.post("/api/players/from-tag", json={"category": "Sam Example"})
    assert choice.status_code == 200
    player_id = choice.json()["player_id"]
    assert client.get(f"/api/players/{player_id}").json()["totals"]["moments"] == 1
    assert client.get("/api/preferences").json()["primary_player_id"] == player_id
    assert (
        client.get(f"/api/players/{player_id}/moments").json()["items"][0]["category"]
        == "Sam Example"
    )
