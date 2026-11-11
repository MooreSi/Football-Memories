"""Spec 190: batch moment downloads across matches, and highlight reels with
animated title cards, assembled by the desktop helper."""

import base64
import shutil
import subprocess
import time
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.connectors.hudl_batch import CardStore, assemble_reel
from app.connectors.hudl_browser import BrowserConnection
from app.connectors.hudl_capture import CaptureError
from app.connectors.hudl_companion import create_companion
from app.services.media import MediaError, probe

ORIGIN = {"Origin": "http://127.0.0.1:8765"}


def _card(path, size="640x360", seconds=1):
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
            f"color=c=navy:size={size}:rate=30",
            "-t",
            str(seconds),
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            str(path),
        ],
        check=True,
    )
    return path


def test_reel_joins_cards_and_clips_of_different_sizes_at_the_largest(
    tiny_video, other_tiny_video, tmp_path
):
    card = _card(tmp_path / "card.mp4", "640x360", 1)
    output = tmp_path / "reel.mp4"
    assemble_reel([card, tiny_video, other_tiny_video, card], output, cards={card})
    info = probe(output)
    assert (info.width, info.height) == (320, 240)  # the largest clip, cards fit inside
    assert info.video_codec == "h264" and info.audio_codec == "aac"
    assert 8.5 < info.duration_s < 10.5  # 1 + 4 + 3 + 1 seconds


def test_reel_failure_publishes_nothing(tmp_path):
    bad = tmp_path / "bad.mp4"
    bad.write_bytes(b"not a video")
    output = tmp_path / "reel.mp4"
    with pytest.raises(CaptureError):
        assemble_reel([bad], output)
    assert not output.exists()


def test_card_store_accepts_only_short_video_files(tmp_path):
    store = CardStore(tmp_path / "cards")
    mp4 = _card(tmp_path / "c.mp4").read_bytes()
    card_id = store.save(mp4)
    assert store.path(card_id).read_bytes() == mp4
    webm = b"\x1a\x45\xdf\xa3" + b"\x00" * 64
    assert store.path(store.save(webm)).suffix == ".webm"
    with pytest.raises(CaptureError):
        store.save(b"<html>not a video</html>")
    with pytest.raises(CaptureError):
        store.save(b"\x1a\x45\xdf\xa3" + b"\x00" * (CardStore.MAX_BYTES + 1))
    with pytest.raises(CaptureError):
        store.path("../../etc/passwd")


MOMENTS = {
    "m1": [
        {"id": "a", "category": "Sam Example", "time_s": 1, "duration_s": 1},
        {"id": "b", "category": "Goal", "time_s": 5, "duration_s": 1},
    ],
    "m2": [{"id": "c", "category": "Sam Example", "time_s": 2, "duration_s": 1}],
}


def _connection(tmp_path):
    catalogue = MagicMock()
    catalogue.find.side_effect = lambda i: {"id": i, "title": f"2611{i[-1]}0 U11 v Club {i}"}
    connection = BrowserConnection(MagicMock(), catalogue, tmp_path / "inbox")
    for identity, moments in MOMENTS.items():
        connection.details.write(identity, {"moments": moments, "tag_status": "synced"})
    return connection


def _wait(connection):
    for _ in range(400):
        if not connection.status()["busy"]:
            return
        time.sleep(0.02)


def test_batch_exports_each_match_in_turn_into_the_moments_folder(tmp_path):
    connection = _connection(tmp_path)
    opened, exported = [], []

    def prepare(identity):
        opened.append(identity)
        connection._stream_id, connection._stream_match = f"s-{identity}", identity
        connection._stream_playlist = "#EXTM3U\n"

    def fake_export(playlist, fetch, selected, output, *, combined, match_title, progress):
        exported.append(([m["id"] for m in selected], output, combined))
        progress(1, 1)
        target = output / f"{match_title}.zip"
        target.write_bytes(b"zip")
        return target

    with (
        patch.object(connection, "_prepare_stream", side_effect=prepare),
        patch.object(connection, "_pause", lambda: None),
        patch("app.connectors.hudl_exports.export_from_segments", side_effect=fake_export),
    ):
        connection.start_batch(
            [
                {"match_id": "m1", "codes": ["Sam Example"]},
                {"match_id": "m2", "codes": ["Sam Example"]},
            ],
            combined=False,
        )
        _wait(connection)
    connection._executor.shutdown()
    status = connection.status()
    assert status["state"] == "done", status["message"]
    assert opened == ["m1", "m2"]
    assert [e[0] for e in exported] == [["a"], ["c"]]
    assert all(e[1] == tmp_path / "inbox" / "moments" for e in exported)
    entries = connection.index.entries(tmp_path / "inbox")
    assert sorted(e["match_id"] for e in entries) == ["m1", "m2"]
    assert "2 matches" in status["message"]


def test_batch_skips_matches_without_the_chosen_moments_and_stops_on_refusal(tmp_path):
    from app.connectors.hudl_browser._capture import HudlBlocked

    connection = _connection(tmp_path)
    calls = []

    def prepare(identity):
        calls.append(identity)
        raise HudlBlocked("Hudl refused access (403).")

    with (
        patch.object(connection, "_prepare_stream", side_effect=prepare),
        patch.object(connection, "_pause", lambda: None),
    ):
        connection.start_batch(
            [
                {"match_id": "m1", "codes": ["Nobody"]},
                {"match_id": "m2", "codes": ["Sam Example"]},
                {"match_id": "m1", "codes": ["Goal"]},
            ],
            combined=True,
        )
        _wait(connection)
    connection._executor.shutdown()
    assert calls == ["m2"]  # m1 had no "Nobody" moments; the refusal stopped the rest
    assert connection.status()["state"] == "error"


def test_batch_reel_adds_cards_and_records_one_reel(tmp_path, tiny_video):
    connection = _connection(tmp_path)
    cards = CardStore(tmp_path / "cards")
    connection.cards = cards
    opening = cards.save(_card(tmp_path / "o.mp4").read_bytes())
    m1_card = cards.save(_card(tmp_path / "m1.mp4").read_bytes())

    def prepare(identity):
        connection._stream_id, connection._stream_match = f"s-{identity}", identity
        connection._stream_playlist = "#EXTM3U\n"

    def fake_export(playlist, fetch, selected, output, *, combined, match_title, progress):
        assert combined is True
        target = output / f"{selected[0]['id']}.mp4"
        shutil.copyfile(tiny_video, target)
        return target

    with (
        patch.object(connection, "_prepare_stream", side_effect=prepare),
        patch.object(connection, "_pause", lambda: None),
        patch("app.connectors.hudl_exports.export_from_segments", side_effect=fake_export),
    ):
        connection.start_batch(
            [
                {"match_id": "m1", "moment_ids": ["a", "b"], "card_id": m1_card},
                {"match_id": "m2", "codes": ["Sam Example"]},
            ],
            combined=True,
            reel={"name": "Sam's season", "opening_card": opening, "closing_card": None},
        )
        _wait(connection)
    connection._executor.shutdown()
    status = connection.status()
    assert status["state"] == "done", status["message"]
    assert status["filename"].startswith("reels/") and status["filename"].endswith(".mp4")
    reel = tmp_path / "inbox" / status["filename"]
    assert 9 < probe(reel).duration_s < 11  # card 1 + clip 4 + card 1 + clip 4
    [entry] = connection.index.entries(tmp_path / "inbox")
    assert entry["kind"] == "reel" and entry["matches"] == ["m1", "m2"]
    assert entry["moment_count"] == 3
    assert not cards.path(opening).exists()  # used cards are cleaned up
    leftovers = [p for p in (tmp_path / "inbox" / "reels").iterdir() if p.name.startswith(".")]
    assert leftovers == []


def test_batch_per_match_reels_saves_one_verified_reel_per_match(tmp_path, tiny_video):
    connection = _connection(tmp_path)
    cards = CardStore(tmp_path / "cards")
    connection.cards = cards
    m1_card = cards.save(_card(tmp_path / "m1.mp4").read_bytes())
    m2_card = cards.save(_card(tmp_path / "m2.mp4").read_bytes())
    closing = cards.save(_card(tmp_path / "c.mp4").read_bytes())
    existing = tmp_path / "inbox" / "reels" / "keep me.mp4"
    existing.parent.mkdir(parents=True)
    existing.write_bytes(b"owner's file")

    def prepare(identity):
        connection._stream_id, connection._stream_match = f"s-{identity}", identity
        connection._stream_playlist = "#EXTM3U\n"

    def fake_export(playlist, fetch, selected, output, *, combined, match_title, progress):
        assert combined is True
        target = output / f"{selected[0]['id']}.mp4"
        shutil.copyfile(tiny_video, target)
        return target

    with (
        patch.object(connection, "_prepare_stream", side_effect=prepare),
        patch.object(connection, "_pause", lambda: None),
        patch("app.connectors.hudl_exports.export_from_segments", side_effect=fake_export),
    ):
        connection.start_batch(
            [
                {"match_id": "m1", "moment_ids": ["a"], "card_id": m1_card},
                {"match_id": "m2", "codes": ["Sam Example"], "card_id": m2_card},
            ],
            combined=True,
            reel={
                "name": "Sam's season",
                "opening_card": None,
                "closing_card": closing,
                "per_match": True,
            },
        )
        _wait(connection)
    connection._executor.shutdown()
    status = connection.status()
    assert status["state"] == "done", status["message"]
    assert "2 highlight reels" in status["message"]
    folder = tmp_path / "inbox" / "reels"
    reels = sorted(p for p in folder.iterdir() if p.suffix == ".mp4" and p != existing)
    assert len(reels) == 2
    assert reels[0].name.startswith("Sam's season - 261110 U11 v Club m1")
    assert reels[1].name.startswith("Sam's season - 261120 U11 v Club m2")
    for reel in reels:
        assert 5 < probe(reel).duration_s < 7  # match card 1 + clip 4 + closing card 1
    assert existing.read_bytes() == b"owner's file"
    entries = sorted(connection.index.entries(tmp_path / "inbox"), key=lambda e: e["file"])
    assert [(e["kind"], e["match_id"], e["matches"]) for e in entries] == [
        ("reel", "m1", ["m1"]),
        ("reel", "m2", ["m2"]),
    ]
    assert all(not cards.path(c).exists() for c in (m1_card, m2_card, closing))
    assert [p for p in folder.iterdir() if p.name.startswith(".")] == []


def test_card_upload_and_batch_routes(tmp_path):
    app = create_companion(tmp_path / "inbox")
    app.state.catalogue.replace(
        [{"id": "m1", "title": "U11 v A", "url": "https://www.hudl.com/watch/video/m1"}]
    )
    mp4 = _card(tmp_path / "c.mp4").read_bytes()
    with TestClient(app, base_url="http://127.0.0.1:8766") as client:
        r = client.post(
            "/reel/cards", json={"data": base64.b64encode(mp4).decode()}, headers=ORIGIN
        )
        assert r.status_code == 200
        assert app.state.account.cards.path(r.json()["card_id"]).is_file()
        bad = client.post(
            "/reel/cards", json={"data": base64.b64encode(b"nope").decode()}, headers=ORIGIN
        )
        assert bad.status_code == 400
        unknown = client.post(
            "/account/batch",
            json={"items": [{"match_id": "not-cached", "codes": ["X"]}], "combined": False},
            headers=ORIGIN,
        )
        assert unknown.status_code == 400
        with patch.object(app.state.account, "start_batch") as start:
            ok = client.post(
                "/account/batch",
                json={"items": [{"match_id": "m1", "codes": ["X"]}], "combined": True},
                headers=ORIGIN,
            )
            assert ok.status_code == 202
            start.assert_called_once()
    app.state.account._executor.shutdown()


def _live_card(path, seconds=1):
    """Like Chrome's MediaRecorder output: a stream written live, with no duration header."""
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
            "color=c=navy:size=640x360:rate=30",
            "-t",
            str(seconds),
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-f",
            "matroska",
            "-live",
            "1",
            str(path),
        ],
        check=True,
    )
    return path


def test_reel_accepts_browser_recorded_cards_without_a_duration(tiny_video, tmp_path):
    card = _live_card(tmp_path / "card.webm")
    with pytest.raises(MediaError):
        probe(card)  # the cause of "A reel part could not be read" (owner report 2026-11-11)
    output = tmp_path / "reel.mp4"
    assemble_reel([card, tiny_video, card], output, cards={card})
    info = probe(output)
    assert (info.width, info.height) == (320, 240)
    assert 5.5 < info.duration_s < 7.5


def test_batch_route_forwards_per_match_reels(tmp_path):
    app = create_companion(tmp_path / "inbox")
    app.state.catalogue.replace(
        [{"id": "m1", "title": "U11 v A", "url": "https://www.hudl.com/watch/video/m1"}]
    )
    with TestClient(app, base_url="http://127.0.0.1:8766") as client:
        with patch.object(app.state.account, "start_batch") as start:
            ok = client.post(
                "/account/batch",
                json={
                    "items": [{"match_id": "m1", "codes": ["X"]}],
                    "combined": True,
                    "reel": {"name": "R", "per_match": True},
                },
                headers=ORIGIN,
            )
            assert ok.status_code == 202, ok.text
            assert start.call_args.kwargs["reel"]["per_match"] is True
            plain = client.post(
                "/account/batch",
                json={"items": [{"match_id": "m1", "codes": ["X"]}], "reel": {"name": "R"}},
                headers=ORIGIN,
            )
            assert plain.status_code == 202
            assert start.call_args.kwargs["reel"]["per_match"] is False
    app.state.account._executor.shutdown()
