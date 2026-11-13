"""Owner request 2026-11-13: the owner can give a grassroots club its crest."""

from fastapi.testclient import TestClient

PNG = b"\x89PNG\r\n\x1a\nsynthetic-crest"


def test_an_uploaded_crest_is_served_for_that_club(client: TestClient) -> None:
    answer = client.post(
        "/api/team-logo",
        data={"name": "Riverside Juniors CB"},
        files={"file": ("c.png", PNG, "image/png")},
    )
    assert answer.status_code == 200
    got = client.get("/api/team-logo", params={"name": "Riverside Juniors"})
    assert got.status_code == 200 and got.content == PNG
    assert got.headers["content-type"] == "image/png"


def test_a_jpeg_is_served_as_a_jpeg_and_other_files_are_refused(client: TestClient) -> None:
    jpeg = b"\xff\xd8\xff\xe0synthetic"
    assert (
        client.post(
            "/api/team-logo",
            data={"name": "Northgate"},
            files={"file": ("c.jpg", jpeg, "image/jpeg")},
        ).status_code
        == 200
    )
    assert (
        client.get("/api/team-logo", params={"name": "Northgate"}).headers["content-type"]
        == "image/jpeg"
    )
    refused = client.post(
        "/api/team-logo",
        data={"name": "Northgate"},
        files={"file": ("c.gif", b"GIF89a", "image/gif")},
    )
    assert refused.status_code == 400
    assert client.get("/api/team-logo", params={"name": "Northgate"}).content == jpeg
