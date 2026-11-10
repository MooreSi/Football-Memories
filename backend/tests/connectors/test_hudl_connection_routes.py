from pathlib import Path
from unittest.mock import MagicMock

from fastapi.testclient import TestClient

from app.connectors.hudl_companion import create_companion

ORIGIN = {"Origin": "http://127.0.0.1:8765"}


def test_save_uses_keychain_and_never_returns_password(tmp_path: Path) -> None:
    app = create_companion(tmp_path)
    app.state.keychain = MagicMock()
    app.state.account = MagicMock()
    app.state.account.status.return_value = {"busy": False}
    with TestClient(app, base_url="http://127.0.0.1:8766") as client:
        response = client.post(
            "/account/credentials",
            headers=ORIGIN,
            json={"username": "parent@example.test", "password": "FAKE_SECRET"},
        )
    assert response.status_code == 200
    saved = app.state.keychain.save.call_args.args[0]
    assert saved.password.get_secret_value() == "FAKE_SECRET"
    assert "FAKE_SECRET" not in response.text
    app.state.account.reset.assert_called_once()


def test_invalid_credentials_input_is_not_echoed(tmp_path: Path) -> None:
    with TestClient(create_companion(tmp_path), base_url="http://127.0.0.1:8766") as client:
        response = client.post(
            "/account/credentials", headers=ORIGIN, json={"username": [], "password": "FAKE_SECRET"}
        )
    assert response.status_code == 400
    assert "FAKE_SECRET" not in response.text


def test_stream_action_requires_a_cached_match(tmp_path: Path) -> None:
    with TestClient(create_companion(tmp_path), base_url="http://127.0.0.1:8766") as client:
        response = client.post(
            "/account/action", headers=ORIGIN, json={"action": "stream", "match_id": "not-cached"}
        )
    assert response.status_code == 400
