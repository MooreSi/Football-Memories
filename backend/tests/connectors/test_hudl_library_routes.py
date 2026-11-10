from fastapi.testclient import TestClient

from app.connectors.hudl_companion import create_companion


def test_library_returns_age_and_cached_thumbnail_without_signed_addresses(tmp_path):
    app = create_companion(tmp_path / "inbox")
    app.state.catalogue.replace(
        [
            {
                "id": "synthetic-a",
                "title": "U10 vs Rovers",
                "url": "https://www.hudl.com/watch/video/synthetic-a",
            }
        ]
    )
    app.state.details.image("synthetic-a", b"\xff\xd8\xffsynthetic-image")
    with TestClient(app, base_url="http://127.0.0.1:8766") as client:
        response = client.get("/library", headers={"Origin": "http://127.0.0.1:8765"})
        assert response.status_code == 200
        item = response.json()[0]
        assert item["age_group"] == "U10"
        assert item["thumbnail_url"].endswith("/account/match/synthetic-a/thumbnail")
        image = client.get(
            "/account/match/synthetic-a/thumbnail", headers={"Origin": "http://127.0.0.1:8765"}
        )
        assert image.content == b"\xff\xd8\xffsynthetic-image"


def test_capture_attachment_requires_local_download_scope(tmp_path):
    output = tmp_path / "inbox"
    output.mkdir()
    (output / "hudl-synthetic.mp4").write_bytes(b"synthetic-video")
    app = create_companion(output)
    with TestClient(app, base_url="http://127.0.0.1:8766") as client:
        assert client.get("/files/wrong/hudl-synthetic.mp4").status_code == 403
        response = client.get(f"/files/{app.state.file_scope}/hudl-synthetic.mp4")
        assert response.status_code == 200
        assert response.content == b"synthetic-video"
        assert "attachment" in response.headers["content-disposition"]
        assert (
            client.get(
                f"/files/{app.state.file_scope}/hudl-synthetic.mp4",
                headers={"Origin": "https://evil.test"},
            ).status_code
            == 403
        )
