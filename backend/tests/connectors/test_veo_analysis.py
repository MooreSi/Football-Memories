import hashlib

from fastapi.testclient import TestClient

from app.connectors.hudl_companion import create_companion
from tests.connectors.test_veo_playback import IDENTITY, FakeMedia
from tests.connectors.test_veo_reels import _ready, _seed_download, _video
from tests.connectors.test_veo_reels import long_video as long_video

APP = {"Origin": "http://127.0.0.1:8765"}


def test_analysis_export_is_bounded_verified_and_preserves_the_match(tmp_path):
    veo, api, sessions, folder, index = _ready(tmp_path, FakeMedia())
    saved = _seed_download(veo, folder, index, _video(tmp_path / "synthetic.mp4", 8))
    original = saved.read_bytes()
    before = len(sessions)
    app = create_companion(tmp_path / "companion")
    app.state.veo = veo
    app.state.veo_configured = True
    with TestClient(app, base_url="http://127.0.0.1:8766") as client:
        response = client.post(
            "/veo/action",
            headers=APP,
            json={"action": "analysis", "match_id": IDENTITY, "start_s": 2, "duration_s": 5},
        )
        assert response.status_code == 202
        status = veo.status()
        assert status["state"] == "done"
        ticket = status["analysis_ticket"]
        info = client.get(f"/veo/analysis/{ticket}/info", headers=APP).json()
        video = client.get(f"/veo/analysis/{ticket}/video", headers=APP)
        assert info["match_id"] == IDENTITY and info["source_offset_s"] == 2
        assert info["duration_s"] == 5
        assert info["sha256"] == hashlib.sha256(video.content).hexdigest()
        assert client.get("/veo/analysis/not-a-ticket/video", headers=APP).status_code == 404
    assert saved.read_bytes() == original
    assert len(sessions) == before
    assert not veo._media.downloads


def test_analysis_rejects_a_window_longer_than_ten_minutes(tmp_path):
    app = create_companion(tmp_path / "companion")
    with TestClient(app, base_url="http://127.0.0.1:8766") as client:
        result = client.post(
            "/veo/action",
            headers=APP,
            json={"action": "analysis", "match_id": "synthetic", "duration_s": 1200},
        )
        assert result.status_code == 400
        assert not list(tmp_path.rglob("sample.mp4"))


def test_analysis_reports_measured_clip_progress_and_verification(tmp_path, monkeypatch):
    veo, _, _, folder, index = _ready(tmp_path, FakeMedia())
    _seed_download(veo, folder, index, _video(tmp_path / "source.mp4", 8))
    reports = []
    original = veo._report

    def report(**values):
        reports.append(values)
        original(**values)

    monkeypatch.setattr(veo, "_report", report)
    veo.start("analysis", IDENTITY, reel={"start_s": 2, "duration_s": 5})
    assert veo.status()["state"] == "done"
    measured = [r["progress"] for r in reports if r.get("progress")]
    assert measured
    assert any(0 < p["done"] < 5 for p in measured)
    assert all(p["total"] == 5 for p in measured)
    assert all(0 <= p["fraction"] <= 1 for p in measured)
    assert [p["done"] for p in measured] == sorted(p["done"] for p in measured)
    assert any("Verifying" in r.get("message", "") for r in reports)


def test_remote_analysis_reads_a_window_without_downloading_the_match(tmp_path, long_video):
    from app.services.media import probe
    from tests.connectors.test_veo_reels import ChunkedMedia

    media = ChunkedMedia(long_video.read_bytes())
    veo, _, _, folder, index = _ready(tmp_path, media)
    veo.start("analysis", IDENTITY, reel={"start_s": 60, "duration_s": 4})
    status = veo.status()
    assert status["state"] == "done", status["message"]
    clip = veo.directory / "analysis" / status["analysis_ticket"] / "sample.mp4"
    assert probe(clip).duration_s == 4
    assert 0 < media.sent < len(media.body) * 0.6
    assert media.downloads == []
    assert index.entries(folder) == []
    assert "http" not in status["message"]
