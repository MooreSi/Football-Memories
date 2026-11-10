"""Owner request 2026-11-10: moment downloads show progress and time remaining."""

import time
from unittest.mock import MagicMock, patch

from app.connectors.hudl_browser import BrowserConnection
from app.connectors.hudl_exports import export_ranges

MOMENTS = [
    {"id": "a", "category": "SAM", "time_s": 0.5, "duration_s": 1.0},
    {"id": "b", "category": "SAM", "time_s": 2.0, "duration_s": 1.0},
]


def test_export_reports_each_finished_part(tiny_video, tmp_path):
    seen = []
    export_ranges(
        tiny_video, MOMENTS, tmp_path, combined=True, progress=lambda d, t: seen.append((d, t))
    )
    assert seen[0] == (0, 3)
    assert seen[-1] == (3, 3)
    assert [d for d, _ in seen] == sorted(d for d, _ in seen)


def test_status_shows_fraction_and_time_left_while_exporting(tmp_path):
    connection = BrowserConnection(MagicMock(), MagicMock(), tmp_path / "inbox")
    connection.details.write("match", {"moments": MOMENTS, "tag_status": "synced"})
    connection._stream_id, connection._stream_match = "s1", "match"
    connection._stream_playlist = "#EXTM3U\n"
    snapshots = []
    clock = iter([100.0, 110.0, 120.0, 130.0])

    def fake_export(playlist, fetch, selected, output, *, combined, progress):
        progress(0, 2)
        progress(1, 2)
        snapshots.append(connection.status()["progress"])
        target = output / "hudl-moments-x.mp4"
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(b"x")
        return target

    with (
        patch.object(connection, "_download", side_effect=AssertionError("no full download")),
        patch("app.connectors.hudl_exports.export_from_segments", side_effect=fake_export),
        patch(
            "app.connectors.hudl_browser._account.time.monotonic", side_effect=lambda: next(clock)
        ),
    ):
        connection.start("clips", "match", ["a", "b"], combined=True)
        for _ in range(200):
            if not connection.status()["busy"]:
                break
            time.sleep(0.02)
    progress = snapshots[0]
    assert progress["step"] == 1 and progress["steps"] == 1
    assert progress["fraction"] == 0.5
    assert progress["eta_s"] == 10.0
    assert "encoding" in progress["label"]
    assert connection.status()["progress"] is None
    assert connection.status()["filename"] == "moments/hudl-moments-x.mp4"  # spec 190 folder
    connection._executor.shutdown()
