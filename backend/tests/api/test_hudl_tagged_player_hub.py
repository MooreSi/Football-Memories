"""Owner request 2026-11-10: a player tagged only in Hudl videos gets a real hub."""

from fastapi.testclient import TestClient


def test_hudl_tagged_name_opens_an_editable_hub(client: TestClient) -> None:
    response = client.post("/api/players/from-hudl-tag", json={"category": "Sam Example"})
    assert response.status_code == 200
    player_id = response.json()["player_id"]
    hub = client.get(f"/api/players/{player_id}").json()
    assert hub["display_name"] == "Sam Example"
    assert hub["totals"]["moments"] == 0
    assert client.get("/api/preferences").json()["primary_player_id"] == player_id
    edited = client.patch(f"/api/players/{player_id}", json={"shirt_number": "7"})
    assert edited.status_code == 200
    assert edited.json()["shirt_number"] == "7"


def test_hudl_tagged_name_reuses_the_existing_player(client: TestClient) -> None:
    first = client.post("/api/players/from-hudl-tag", json={"category": "Sam Example"})
    second = client.post("/api/players/from-hudl-tag", json={"category": "Sam Example"})
    assert first.json() == second.json()
    assert len(client.get("/api/players").json()) == 1


def test_hudl_tagged_name_rejects_blank_input(client: TestClient) -> None:
    for category in ["", "   ", "x" * 201]:
        response = client.post("/api/players/from-hudl-tag", json={"category": category})
        assert response.status_code in {400, 422}
    assert client.get("/api/players").json() == []


def test_picking_a_name_in_another_case_reuses_the_existing_hub(client) -> None:
    """Owner decision 005: names show as "Sam Example"; a hub made as "SAM EXAMPLE" is reused."""
    first = client.post("/api/players/from-hudl-tag", json={"category": "SAM EXAMPLE"}).json()
    again = client.post("/api/players/from-hudl-tag", json={"category": "Sam  Example"}).json()
    assert again == first
    assert len(client.get("/api/players").json()) == 1
    other = client.post("/api/players/from-hudl-tag", json={"category": "Sam Exampl"}).json()
    assert other != first
