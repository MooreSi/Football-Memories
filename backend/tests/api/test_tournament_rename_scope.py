"""A tournament rename is one shared event name across every entered squad."""

from fastapi.testclient import TestClient


def test_rename_updates_the_whole_tournament_without_changing_either_squad(
    client: TestClient,
) -> None:
    client.put(
        "/api/tournaments",
        json={"name": "Match day", "team": "Blue", "match_keys": ["hudl:a", "hudl:b"]},
    )
    before = client.put(
        "/api/tournaments",
        json={"name": "Match day", "team": "White", "match_keys": ["hudl:c", "veo:d"]},
    ).json()[0]
    response = client.patch(f"/api/tournaments/{before['id']}", json={"name": "Autumn Festival"})
    assert response.status_code == 200
    group = client.get("/api/tournaments").json()[0]
    assert group["name"] == "Autumn Festival"
    assert group["entries"] == {
        "hudl:a": "Blue",
        "hudl:b": "Blue",
        "hudl:c": "White",
        "veo:d": "White",
    }
    assert group["id"] == before["id"]
    assert group["name_corrected"] is True
