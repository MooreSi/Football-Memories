from urllib.parse import unquote

from tests.api.test_api import _import


def test_offline_full_match_attachment_has_fixture_and_date(client, inbox_video):
    match = _import(client)
    response = client.get(f"/api/media/{match['media_id']}/download")
    name = unquote(response.headers["content-disposition"])
    assert "Riverside U12 v Rovers" in name
    assert "2026-10-18.mp4" in name
