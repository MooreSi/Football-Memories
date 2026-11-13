"""Spec 230: one code per situation or player, whatever spelling the coach typed."""

import json
import time
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app.connectors.hudl_browser import BrowserConnection
from app.connectors.hudl_companion import create_companion
from app.connectors.hudl_metadata import canonical_code


def test_entity_space_and_case_variants_become_one_code() -> None:
    assert canonical_code("REGROUPING &amp; COMPACTNESS") == "REGROUPING & COMPACTNESS"
    assert canonical_code("REGROUPING & COMPACTNESS") == "REGROUPING & COMPACTNESS"
    assert canonical_code(" Chris  Demo ") == "CHRIS DEMO"
    assert canonical_code("CHRIS DEMO") == "CHRIS DEMO"


def test_different_codes_stay_different() -> None:
    assert canonical_code("Chris Demo") != canonical_code("Chris Dem")
    assert canonical_code("THEO (T)") == "THEO (T)"
    assert canonical_code("OPP GOAL KICK") != canonical_code("OPPOSITION GOAL KICK")


def test_library_serves_one_spelling_and_leaves_the_cache_file_verbatim(tmp_path) -> None:
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
    moments = [
        {"id": "a", "time_s": 1, "duration_s": 2, "category": "Chris Demo"},
        {"id": "b", "time_s": 5, "duration_s": 2, "category": "CHRIS DEMO"},
        {"id": "c", "time_s": 9, "duration_s": 2, "category": "REGROUPING &amp; COMPACTNESS"},
    ]
    app.state.details.write("synthetic-a", {"moments": moments, "tag_status": "synced"})
    with TestClient(app, base_url="http://127.0.0.1:8766") as client:
        served = client.get("/library", headers={"Origin": "http://127.0.0.1:8765"}).json()[0]
    assert [m["category"] for m in served["moments"]] == [
        "CHRIS DEMO",
        "CHRIS DEMO",
        "REGROUPING & COMPACTNESS",
    ]
    assert [m["id"] for m in served["moments"]] == ["a", "b", "c"]
    on_disk = json.loads(app.state.details.path("synthetic-a").read_text())
    assert [m["category"] for m in on_disk["moments"]] == [m["category"] for m in moments]


def test_batch_by_code_selects_every_spelling_of_it(tmp_path) -> None:
    catalogue = MagicMock()
    catalogue.find.side_effect = lambda i: {"id": i, "title": f"261110 U11 v Club {i}"}
    connection = BrowserConnection(MagicMock(), catalogue, tmp_path / "inbox")
    connection.details.write(
        "m1",
        {
            "moments": [
                {"id": "a", "category": "Chris Demo", "time_s": 1, "duration_s": 1},
                {"id": "b", "category": "CHRIS DEMO", "time_s": 3, "duration_s": 1},
                {"id": "c", "category": "Goal", "time_s": 5, "duration_s": 1},
            ],
            "tag_status": "synced",
        },
    )
    exported: list[list[str]] = []

    def prepare(identity):
        connection._stream_id, connection._stream_match = f"s-{identity}", identity
        connection._stream_playlist = "#EXTM3U\n"

    def fake_export(playlist, fetch, selected, output, *, combined, match_title, progress):
        exported.append([m["id"] for m in selected])
        progress(1, 1)
        target = output / f"{match_title}.zip"
        target.write_bytes(b"zip")
        return target

    with (
        patch.object(connection, "_prepare_stream", side_effect=prepare),
        patch.object(connection, "_pause", lambda: None),
        patch("app.connectors.hudl_exports.export_from_segments", side_effect=fake_export),
    ):
        connection.start_batch([{"match_id": "m1", "codes": ["CHRIS DEMO"]}], combined=False)
        for _ in range(400):
            if not connection.status()["busy"]:
                break
            time.sleep(0.02)
    connection._executor.shutdown()
    assert connection.status()["state"] == "done", connection.status()["message"]
    assert exported == [["a", "b"]]
