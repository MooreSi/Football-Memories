"""Owner report 2026-11-11: most snapshots stayed 320x240 because full-quality
posters were only made when a match was opened or first indexed. The paced sweep
now also makes posters for already-indexed matches, once each."""

import time
from unittest.mock import patch

from app.connectors.hudl_browser import HudlBlocked
from tests.connectors.test_hudl_tag_sync_resume import connection_with, tagged


def _indexed(connection, identity, **extra):
    connection.details.write(identity, {"tag_status": "synced", "moments": [], **extra})


def test_indexed_matches_without_a_poster_get_one(tmp_path):
    connection = connection_with(tmp_path, ["a", "b", "has", "gone"])
    for identity in ("a", "b", "has"):
        _indexed(connection, identity)
    connection.details.write("gone", {"tag_status": "unavailable", "checked_at": time.time()})
    connection.details.path("has", ".poster").write_bytes(b"\xff\xd8\xffposter")
    made = []

    def poster(identity, manifest):
        made.append(identity)
        connection.details.path(identity, ".poster").write_bytes(b"\xff\xd8\xffnew")

    with (
        patch.object(connection, "_observe", return_value=tagged()) as observe,
        patch.object(connection, "_media_manifest", return_value=object()),
        patch.object(connection, "_poster", side_effect=poster),
    ):
        connection._sync_tags()
    assert made == ["a", "b"]
    assert [c.args[0] for c in observe.call_args_list] == ["a", "b"]
    assert connection.details.read("a")["tag_status"] == "synced"  # tags untouched
    connection._executor.shutdown()


def test_a_failed_poster_is_not_retried_every_sweep(tmp_path):
    connection = connection_with(tmp_path, ["a"])
    _indexed(connection, "a")
    with (
        patch.object(connection, "_observe", return_value=tagged()),
        patch.object(connection, "_media_manifest", side_effect=RuntimeError("no stream")),
    ):
        connection._sync_tags()
    assert "poster_checked_at" in connection.details.read("a")
    with patch.object(connection, "_observe", side_effect=AssertionError("retried")) as again:
        connection._sync_tags()
    again.assert_not_called()
    # A week later it is tried again.
    _indexed(connection, "a", poster_checked_at=time.time() - 8 * 86400)
    with (
        patch.object(connection, "_observe", return_value=tagged()) as later,
        patch.object(connection, "_media_manifest", side_effect=RuntimeError("no stream")),
    ):
        connection._sync_tags()
    later.assert_called_once()
    connection._executor.shutdown()


def test_an_account_refusal_stops_the_poster_sweep(tmp_path):
    connection = connection_with(tmp_path, ["a", "b"])
    _indexed(connection, "a")
    _indexed(connection, "b")
    with patch.object(
        connection, "_observe", side_effect=HudlBlocked("Hudl refused (429).")
    ) as observe:
        connection._sync_tags()
    assert observe.call_count == 1
    assert connection.status()["state"] == "error"
    connection._executor.shutdown()
