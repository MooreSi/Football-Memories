"""Owner request 2026-11-10: moment downloads show progress and time remaining."""

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


def test_status_shows_step_fraction_and_time_left_while_exporting(tmp_path):
    connection = BrowserConnection(MagicMock(), MagicMock(), tmp_path / "inbox")
    connection.details.write("match", {"moments": MOMENTS, "tag_status": "synced"})
    snapshots = []
    clock = iter([100.0, 110.0, 120.0, 130.0])

    def fake_export(source, selected, output, *, combined, progress):
        progress(0, 2)
        progress(1, 2)
        snapshots.append(connection.status()["progress"])
        target = output / "hudl-moments-x.mp4"
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(b"x")
        return target

    with (
        patch.object(connection, "_download", return_value=tmp_path / "source.mp4"),
        patch("app.connectors.hudl_exports.export_ranges", side_effect=fake_export),
        patch("app.connectors.hudl_browser.time.monotonic", side_effect=lambda: next(clock)),
    ):
        connection._pending = 1
        connection._perform("clips", "match", ["a", "b"], True)
    progress = snapshots[0]
    assert progress["step"] == 2 and progress["steps"] == 2
    assert progress["fraction"] == 0.5
    assert progress["eta_s"] == 10.0
    assert "Encoding" in progress["label"]
    assert connection.status()["progress"] is None
    connection._executor.shutdown()
