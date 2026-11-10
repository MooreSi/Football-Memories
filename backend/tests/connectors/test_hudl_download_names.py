import zipfile

from app.connectors.hudl_exports import export_ranges
from app.connectors.hudl_names import download_name


def test_match_name_has_fixture_venue_and_real_match_date():
    assert download_name("261108 U11 v Rovers (A)") == "U11 v Rovers - Away - 2026-11-08"
    assert (
        download_name("261108 U11 v Rovers (H)", "Sam Example")
        == "U11 v Rovers - Sam Example - 2026-11-08"
    )


def test_invalid_date_is_not_invented_and_components_cannot_escape():
    name = download_name("261332 U11 v ../Rovers (H)", "../Goal / Save")
    assert "/" not in name
    assert "Date unknown" in name


def test_zip_entries_have_match_code_and_date_without_overwriting(tmp_path, tiny_video):
    existing = tmp_path / "keep.mp4"
    existing.write_bytes(b"keep")
    result = export_ranges(
        tiny_video,
        [{"id": "a", "category": "Sam Example", "time_s": 0, "duration_s": 0.4}],
        tmp_path,
        match_title="261108 U11 v Rovers (A)",
    )
    with zipfile.ZipFile(result) as archive:
        assert [n for n in archive.namelist() if n.endswith(".mp4")] == [
            "U11 v Rovers - Sam Example - 001 - 2026-11-08.mp4"
        ]
    assert existing.read_bytes() == b"keep"


def test_completed_friendly_export_is_downloadable_but_other_files_are_not(tmp_path):
    from unittest.mock import MagicMock
    from urllib.parse import quote, unquote

    from fastapi.testclient import TestClient

    from app.connectors.hudl_companion import create_companion

    app = create_companion(tmp_path)
    name = "U11 v Rovers - Sam Example - 2026-11-08.zip"
    (tmp_path / name).write_bytes(b"archive")
    app.state.account = MagicMock()
    app.state.account.status.return_value = {"filename": name, "busy": False}
    with TestClient(app, base_url="http://127.0.0.1:8766") as client:
        result = client.get(f"/files/{app.state.file_scope}/{quote(name)}")
        assert result.status_code == 200
        assert name in unquote(result.headers["content-disposition"])
        denied = client.get(f"/files/{app.state.file_scope}/other.zip")
        assert denied.status_code == 400


def test_friendly_download_url_encodes_filename_characters(tmp_path):
    from unittest.mock import MagicMock

    from fastapi.testclient import TestClient

    from app.connectors.hudl_companion import create_companion

    app = create_companion(tmp_path)
    app.state.account_configured = False
    app.state.account = MagicMock()
    app.state.account.status.return_value = {"filename": "Match - Player #10 - 2026-11-08.zip"}
    with TestClient(app, base_url="http://127.0.0.1:8766") as client:
        response = client.get("/account", headers={"Origin": "http://127.0.0.1:8765"})
    assert "%2310" in response.json()["download_url"]
    assert "#" not in response.json()["download_url"]
