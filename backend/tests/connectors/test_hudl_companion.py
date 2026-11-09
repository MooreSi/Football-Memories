from pathlib import Path
from unittest.mock import create_autospec

from fastapi.testclient import TestClient

from app.connectors.hudl_companion import CaptureManager, create_companion


def test_companion_rejects_foreign_websites_before_starting_capture(tmp_path: Path) -> None:
    app = create_companion(tmp_path)
    manager = create_autospec(CaptureManager, instance=True)
    app.state.capture = manager
    with TestClient(app, base_url="http://127.0.0.1:8766") as client:
        response = client.post("/capture", headers={"Origin": "https://evil.test"}, json={})
    assert response.status_code == 403
    manager.start.assert_not_called()


def test_companion_rejects_dns_rebinding_hosts(tmp_path: Path) -> None:
    with TestClient(create_companion(tmp_path), base_url="http://evil.test:8766") as client:
        response = client.get("/status", headers={"Origin": "http://127.0.0.1:8765"})
    assert response.status_code == 403


def test_companion_accepts_app_capture_with_explicit_quality_and_players(tmp_path: Path) -> None:
    app = create_companion(tmp_path)
    manager = create_autospec(CaptureManager, instance=True)
    app.state.capture = manager
    with TestClient(app, base_url="http://127.0.0.1:8766") as client:
        response = client.post(
            "/capture",
            headers={"Origin": "http://127.0.0.1:8765"},
            json={
                "url": "https://www.hudl.com/watch/video/synthetic-video",
                "max_height": 540,
                "player_codes": ["SAM EXAMPLE"],
            },
        )
    assert response.status_code == 202
    request = manager.start.call_args.args[0]
    assert request.player_codes == ["SAM EXAMPLE"]
    assert request.max_height == 540


def test_companion_refuses_credentials_and_does_not_echo_them(tmp_path: Path) -> None:
    with TestClient(create_companion(tmp_path), base_url="http://127.0.0.1:8766") as client:
        response = client.post(
            "/capture",
            headers={"Origin": "http://127.0.0.1:8765"},
            json={
                "url": "https://www.hudl.com/watch/video/synthetic-video",
                "password": "FAKE_SECRET",
            },
        )
    assert response.status_code == 400
    assert "FAKE_SECRET" not in response.text


def test_companion_status_does_not_contain_session_material(tmp_path: Path) -> None:
    with TestClient(create_companion(tmp_path), base_url="http://127.0.0.1:8766") as client:
        response = client.get("/status", headers={"Origin": "http://localhost:5173"})
    assert response.json() == {
        "state": "idle",
        "message": "Ready to capture a match.",
        "filename": None,
    }
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
