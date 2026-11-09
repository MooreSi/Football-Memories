"""Highlight reels (spec 080)."""

import hashlib
import json
import shutil
import subprocess
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session, sessionmaker

from app.config import Settings
from app.models import Reel
from app.services import reels


def _probe(path: Path) -> dict:  # type: ignore[type-arg]
    out = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-print_format",
            "json",
            "-show_format",
            "-show_streams",
            str(path),
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    return json.loads(out.stdout)  # type: ignore[no-any-return]


@pytest.fixture
def silent_video(tmp_path_factory: pytest.TempPathFactory) -> Path:
    p = tmp_path_factory.mktemp("silent") / "silent.mp4"
    subprocess.run(
        [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-f",
            "lavfi",
            "-i",
            "testsrc=size=320x240:rate=25",
            "-t",
            "6",
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            str(p),
        ],
        check=True,
    )
    return p


@pytest.fixture
def card_png(tmp_path: Path) -> bytes:
    p = tmp_path / "card.png"
    subprocess.run(
        [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-f",
            "lavfi",
            "-i",
            "color=c=0x0a1020:s=1920x1080",
            "-frames:v",
            "1",
            str(p),
        ],
        check=True,
    )
    return p.read_bytes()


@pytest.fixture
def archive(client: TestClient, settings: Settings, tiny_video: Path, silent_video: Path) -> dict:  # type: ignore[type-arg]
    """tiny_video: 4 s, 320x240, audio; tags at 1 s and 2 s.
    silent: 6 s, no audio; tag at 3 s."""
    shutil.copyfile(tiny_video, settings.import_root / "a.mp4")
    (settings.import_root / "a.tags.csv").write_text(
        "time,category,players\n0:01,Save,Sam\n0:02,Goal,Sam\n"
    )
    shutil.copyfile(silent_video, settings.import_root / "s.mp4")
    (settings.import_root / "s.tags.csv").write_text("time,category,players\n0:03,Claim,Sam\n")
    for f, opp, d in (("a.mp4", "Rovers", "2026-10-18"), ("s.mp4", "City", "2026-11-01")):
        assert (
            client.post(
                "/api/imports",
                json={
                    "filename": f,
                    "team_name": "T",
                    "season_label": "2026/27",
                    "opponent": opp,
                    "match_date": d,
                },
            ).status_code
            == 201
        )
    by_cat = {m["category"]: m["event_id"] for m in client.get("/api/moments").json()["items"]}
    client.put("/api/settings", json={"clip_pre_s": 1, "clip_post_s": 1})
    return by_cat


def _sources(settings: Settings) -> dict[str, str]:
    return {
        p.name: hashlib.sha256(p.read_bytes()).hexdigest()
        for p in (settings.library_root / "Matches").rglob("*.mp4")
    }


def _create(client: TestClient, items: list[dict], **kw: object) -> dict:  # type: ignore[type-arg]
    r = client.post("/api/reels", json={"name": "Best saves", "items": items, **kw})
    assert r.status_code == 201, r.text
    return r.json()  # type: ignore[no-any-return]


def _render(
    client: TestClient, reel_id: int, session_factory: sessionmaker[Session], settings: Settings
) -> dict:  # type: ignore[type-arg]
    assert client.post(f"/api/reels/{reel_id}/render").status_code == 202
    assert reels.process_next(session_factory, settings) == reel_id
    return client.get(f"/api/reels/{reel_id}").json()  # type: ignore[no-any-return]


def test_create_keeps_order_and_uses_saved_timing(client: TestClient, archive: dict) -> None:  # type: ignore[type-arg]
    reel = _create(
        client,
        [{"event_id": archive["Goal"]}, {"event_id": archive["Save"], "pre_s": 0.5, "post_s": 2}],
    )
    assert reel["status"] == "draft"
    assert [(i["moment"]["category"], i["start_s"], i["end_s"]) for i in reel["items"]] == [
        ("Goal", 1.0, 3.0),  # 2 s tag, 1 s before/after from settings
        ("Save", 0.5, 3.0),  # per-clip override
    ]
    assert reel["planned_seconds"] == pytest.approx(4.5)


def test_unknown_moment_is_a_400(client: TestClient, archive: dict) -> None:  # type: ignore[type-arg]
    r = client.post("/api/reels", json={"name": "X", "items": [{"event_id": 999}]})
    assert r.status_code == 400


def test_render_makes_one_mp4_of_the_clips_without_touching_sources(
    client: TestClient,
    archive: dict,
    settings: Settings,
    session_factory: sessionmaker[Session],  # type: ignore[type-arg]
) -> None:
    before = _sources(settings)
    reel = _create(client, [{"event_id": archive["Save"]}, {"event_id": archive["Goal"]}])
    done = _render(client, reel["id"], session_factory, settings)
    assert (done["status"], done["progress"], done["error"]) == ("done", 1.0, None)
    out = settings.archive_root / done["output_relpath"]
    assert out.parent == settings.library_root / "Compilations"
    info = _probe(out)
    kinds = {s["codec_type"]: s for s in info["streams"]}
    assert set(kinds) == {"video", "audio"}
    assert kinds["video"]["height"] == 240  # tallest source: no upscaling
    assert float(info["format"]["duration"]) == pytest.approx(4.0, abs=0.35)  # 2 + 2 s
    assert _sources(settings) == before
    assert list((settings.library_root / "Compilations").rglob("*.part*")) == []


def test_a_source_without_audio_still_renders_with_silence(
    client: TestClient,
    archive: dict,
    settings: Settings,
    session_factory: sessionmaker[Session],  # type: ignore[type-arg]
) -> None:
    reel = _create(client, [{"event_id": archive["Claim"]}, {"event_id": archive["Save"]}])
    done = _render(client, reel["id"], session_factory, settings)
    assert done["status"] == "done", done["error"]
    assert {
        s["codec_type"] for s in _probe(settings.archive_root / done["output_relpath"])["streams"]
    } == {"video", "audio"}


def test_title_cards_add_three_seconds_each(
    client: TestClient,
    archive: dict,
    settings: Settings,
    session_factory: sessionmaker[Session],
    card_png: bytes,  # type: ignore[type-arg]
) -> None:
    reel = _create(client, [{"event_id": archive["Save"]}])
    for which in ("opening", "closing"):
        r = client.put(
            f"/api/reels/{reel['id']}/cards/{which}",
            files={"file": ("c.png", card_png, "image/png")},
        )
        assert r.status_code == 200, r.text
    done = _render(client, reel["id"], session_factory, settings)
    assert float(
        _probe(settings.archive_root / done["output_relpath"])["format"]["duration"]
    ) == pytest.approx(8.0, abs=0.4)


def test_a_card_that_is_not_an_image_is_refused(client: TestClient, archive: dict) -> None:  # type: ignore[type-arg]
    reel = _create(client, [{"event_id": archive["Save"]}])
    r = client.put(
        f"/api/reels/{reel['id']}/cards/opening", files={"file": ("c.png", b"nope", "image/png")}
    )
    assert r.status_code == 400
    assert client.get(f"/api/reels/{reel['id']}").json()["has_opening_card"] is False


def test_failure_leaves_no_partial_file_and_keeps_the_previous_output(
    client: TestClient,
    archive: dict,
    settings: Settings,
    session_factory: sessionmaker[Session],  # type: ignore[type-arg]
) -> None:
    reel = _create(client, [{"event_id": archive["Claim"]}])
    first = _render(client, reel["id"], session_factory, settings)
    good = settings.archive_root / first["output_relpath"]
    for f in (settings.library_root / "Matches").rglob("*.mp4"):
        if "City" in str(f):
            f.unlink()
    failed = _render(client, reel["id"], session_factory, settings)
    assert failed["status"] == "failed"
    assert "missing" in failed["error"]
    assert good.is_file() and failed["output_relpath"] == first["output_relpath"]
    edited = client.put(f"/api/reels/{reel['id']}", json={"name": "Renamed"}).json()
    assert (edited["status"], edited["error"]) == ("draft", None)
    assert list((settings.library_root / "Compilations").rglob("*.part*")) == []


def test_rerender_replaces_the_previous_output(
    client: TestClient,
    archive: dict,
    settings: Settings,
    session_factory: sessionmaker[Session],  # type: ignore[type-arg]
) -> None:
    reel = _create(client, [{"event_id": archive["Save"]}])
    _render(client, reel["id"], session_factory, settings)
    client.put(f"/api/reels/{reel['id']}", json={"items": [{"event_id": archive["Goal"]}]})
    _render(client, reel["id"], session_factory, settings)
    assert len(list((settings.library_root / "Compilations").glob("*.mp4"))) == 1


def test_editing_while_rendering_is_a_409(
    client: TestClient,
    archive: dict,
    session_factory: sessionmaker[Session],  # type: ignore[type-arg]
) -> None:
    reel = _create(client, [{"event_id": archive["Save"]}])
    with session_factory() as db:
        db.get(Reel, reel["id"]).status = "rendering"  # type: ignore[union-attr]
        db.commit()
    assert client.put(f"/api/reels/{reel['id']}", json={"name": "x"}).status_code == 409
    assert client.post(f"/api/reels/{reel['id']}/render").status_code == 409


def test_a_reel_left_rendering_by_a_crash_is_queued_again_on_startup(
    client: TestClient,
    archive: dict,
    session_factory: sessionmaker[Session],  # type: ignore[type-arg]
) -> None:
    reel = _create(client, [{"event_id": archive["Save"]}])
    with session_factory() as db:
        db.get(Reel, reel["id"]).status = "rendering"  # type: ignore[union-attr]
        db.commit()
        assert reels.recover(db) == 1
    assert client.get(f"/api/reels/{reel['id']}").json()["status"] == "queued"


def test_render_needs_at_least_one_clip(client: TestClient, archive: dict) -> None:  # type: ignore[type-arg]
    reel = _create(client, [])
    assert client.post(f"/api/reels/{reel['id']}/render").status_code == 400


def test_video_supports_range_and_download(
    client: TestClient,
    archive: dict,
    settings: Settings,
    session_factory: sessionmaker[Session],  # type: ignore[type-arg]
) -> None:
    reel = _create(client, [{"event_id": archive["Save"]}])
    done = _render(client, reel["id"], session_factory, settings)
    assert client.get(done["video_url"], headers={"Range": "bytes=0-9"}).status_code == 206
    dl = client.get(done["video_url"] + "?download=1")
    disposition = dl.headers["content-disposition"]
    assert disposition.startswith("attachment;")
    assert "Best%20saves" in disposition and disposition.endswith(".mp4")


def test_delete_removes_reel_output_and_cards_but_not_sources(
    client: TestClient,
    archive: dict,
    settings: Settings,
    session_factory: sessionmaker[Session],
    card_png: bytes,  # type: ignore[type-arg]
) -> None:
    before = _sources(settings)
    reel = _create(client, [{"event_id": archive["Save"]}])
    client.put(
        f"/api/reels/{reel['id']}/cards/opening", files={"file": ("c.png", card_png, "image/png")}
    )
    _render(client, reel["id"], session_factory, settings)
    assert client.delete(f"/api/reels/{reel['id']}").status_code == 204
    assert client.get(f"/api/reels/{reel['id']}").status_code == 404
    assert [p for p in (settings.library_root / "Compilations").rglob("*") if p.is_file()] == []
    assert _sources(settings) == before


def test_list_shows_status_and_counts(client: TestClient, archive: dict) -> None:  # type: ignore[type-arg]
    _create(client, [{"event_id": archive["Save"]}, {"event_id": archive["Goal"]}])
    [r] = client.get("/api/reels").json()
    assert (r["name"], r["status"], r["item_count"]) == ("Best saves", "draft", 2)


def test_title_text_is_saved_and_can_be_edited(client: TestClient, archive: dict) -> None:  # type: ignore[type-arg]
    reel = _create(client, [], opening_title="Best saves", opening_subtitle="Season 2026/27")
    assert (reel["opening_title"], reel["opening_subtitle"], reel["closing_text"]) == (
        "Best saves",
        "Season 2026/27",
        None,
    )
    r = client.put(f"/api/reels/{reel['id']}", json={"closing_text": "Thanks for watching"}).json()
    assert (r["opening_title"], r["closing_text"]) == ("Best saves", "Thanks for watching")
