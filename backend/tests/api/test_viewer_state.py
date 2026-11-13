"""Spec 230: clip notes and drawings, continue watching, and the alerts snapshot.

All three live in `preferences`, so every backup carries them without a schema change.
"""

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from app.config import Settings
from app.main import create_app
from app.models import Preference

MATCH = "VmlkZW82YWYxZDRkNmNmNTg2N2MxYzczODkxNmY="
MOMENT = "x" * 77  # real Hudl moment ids are 77 characters, longer than a preference key allows
ARROW = {"kind": "arrow", "x1": 0.1, "y1": 0.2, "x2": 0.5, "y2": 0.6}


def note(**over: object) -> dict[str, object]:
    return {
        "moment_id": MOMENT,
        "match_id": MATCH,
        "time_s": 61.5,
        "text": "Great run",
        "shapes": [ARROW],
        **over,
    }


def test_a_note_with_a_drawing_is_kept_across_a_restart(
    client: TestClient, settings: Settings, session_factory: sessionmaker[Session]
) -> None:
    assert client.get("/api/notes", params={"match_id": MATCH}).json() == []
    assert client.put("/api/notes", json=note()).status_code == 200
    with TestClient(create_app(settings, session_factory=session_factory)) as again:
        saved = again.get("/api/notes", params={"match_id": MATCH}).json()
    assert len(saved) == 1
    assert saved[0]["moment_id"] == MOMENT
    assert saved[0]["text"] == "Great run"
    assert saved[0]["shapes"] == [{**ARROW, "colour": "#facc15"}]
    assert saved[0]["updated_at"] > 0


def test_notes_are_per_match_and_replaced_then_cleared(client: TestClient) -> None:
    client.put("/api/notes", json=note())
    client.put("/api/notes", json=note(moment_id="other", match_id="b3RoZXI=", text="Save"))
    client.put("/api/notes", json=note(text="Even better", shapes=[]))
    mine = client.get("/api/notes", params={"match_id": MATCH}).json()
    assert [(n["text"], n["shapes"]) for n in mine] == [("Even better", [])]
    assert len(client.get("/api/notes").json()) == 2
    client.put("/api/notes", json=note(text="  ", shapes=[]))
    assert client.get("/api/notes", params={"match_id": MATCH}).json() == []
    assert len(client.get("/api/notes").json()) == 1


def test_invalid_notes_are_rejected_and_nothing_is_stored(client: TestClient) -> None:
    for body in (
        note(moment_id=""),
        note(text="x" * 2001),
        note(shapes=[{**ARROW, "x1": 1.5}]),
        note(shapes=[{**ARROW, "kind": "circle"}]),
        note(shapes=[ARROW] * 41),
        note(time_s=-1),
    ):
        assert client.put("/api/notes", json=body).status_code == 422, body
    assert client.get("/api/notes").json() == []


def test_preference_keys_stay_short_and_hide_raw_ids(client: TestClient, session_factory) -> None:
    client.put("/api/notes", json=note())
    client.put("/api/watching", json={"match_id": MATCH, "position_s": 300, "duration_s": 5000})
    with session_factory() as db:
        keys = db.scalars(select(Preference.key)).all()
    assert all(len(k) <= 80 for k in keys)
    assert any(k.startswith("note:") for k in keys) and any(k.startswith("watch:") for k in keys)
    assert not any(MOMENT in k for k in keys)


def test_continue_watching_keeps_the_latest_position_newest_first(client: TestClient) -> None:
    client.put("/api/watching", json={"match_id": "first", "position_s": 100, "duration_s": 5000})
    client.put("/api/watching", json={"match_id": MATCH, "position_s": 300, "duration_s": 5000})
    client.put("/api/watching", json={"match_id": MATCH, "position_s": 420.5, "duration_s": 5000})
    rows = client.get("/api/watching").json()
    assert [(r["match_id"], r["position_s"]) for r in rows] == [(MATCH, 420.5), ("first", 100)]
    assert (
        client.put(
            "/api/watching", json={"match_id": MATCH, "position_s": -3, "duration_s": 1}
        ).status_code
        == 422
    )


def test_continue_watching_forgets_the_oldest_beyond_fifty(client: TestClient) -> None:
    for i in range(53):
        client.put(
            "/api/watching", json={"match_id": f"m{i}", "position_s": 100, "duration_s": 5000}
        )
    rows = client.get("/api/watching").json()
    assert len(rows) == 50
    assert rows[0]["match_id"] == "m52"
    assert "m0" not in {r["match_id"] for r in rows}


def test_alerts_snapshot_starts_empty_and_is_replaced(client: TestClient) -> None:
    assert client.get("/api/alerts/seen").json() is None
    first = {"matches": ["a", "b"], "player": "PAT EXAMPLE", "counts": {"a": 3}}
    assert client.put("/api/alerts/seen", json=first).status_code == 200
    second = {"matches": ["a", "b", "c"], "player": "PAT EXAMPLE", "counts": {"a": 3, "c": 1}}
    client.put("/api/alerts/seen", json=second)
    assert client.get("/api/alerts/seen").json() == second


def test_viewer_state_does_not_leak_into_other_preferences(client: TestClient) -> None:
    client.put("/api/notes", json=note())
    client.put("/api/watching", json={"match_id": MATCH, "position_s": 3, "duration_s": 9})
    client.put("/api/alerts/seen", json={"matches": [], "player": None, "counts": {}})
    assert client.get("/api/preferences").json() == {"primary_player_id": None}
    assert client.get("/api/scores").json() == {}
