"""Withdraw obsolete guesses, never owner decisions or absent snapshot entries."""

import hashlib

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Preference
from app.schemas import TournamentAutomaticInfo, TournamentOut


def seed(db: Session, *, renamed: bool = False, manual: bool = False) -> None:
    identity = hashlib.sha256(b"2026-11-22|riverside|u11|").hexdigest()[:32]
    group = TournamentOut(
        id=identity,
        name="Weekend" if renamed else "Match day",
        name_corrected=renamed,
        entries={"hudl:a": "Blue", "hudl:b": "Blue"},
        automatic={
            "hudl:a": TournamentAutomaticInfo(
                club="Riverside", confidence="review", reason="Old guess"
            ),
            "hudl:b": TournamentAutomaticInfo(
                club="Riverside", confidence="review", reason="Old guess"
            ),
        },
    )
    if manual:
        group.automatic.pop("hudl:a")
    db.add(Preference(key="tournament:" + identity, value=group.model_dump_json()))
    db.commit()


PAIR = [
    {
        "key": f"hudl:{key}",
        "title": f"261122 U11 v Rovers (Game {i})",
        "club": "Riverside",
        "age_group": "U11",
        "players": [],
    }
    for i, key in enumerate(("a", "b"), 1)
]


def test_full_snapshot_withdraws_obsolete_automatic_weekend(
    client: TestClient, db: Session
) -> None:
    seed(db)
    assert client.post("/api/tournaments/detect", json={"matches": PAIR}).json() == []
    assert client.get("/api/tournaments").json() == []


def test_partial_snapshot_preserves_missing_evidence(client: TestClient, db: Session) -> None:
    seed(db)
    groups = client.post("/api/tournaments/detect", json={"matches": PAIR[:1]}).json()
    assert len(groups[0]["entries"]) == 2


def test_withdrawal_keeps_manual_membership(client: TestClient, db: Session) -> None:
    seed(db, manual=True)
    groups = client.post("/api/tournaments/detect", json={"matches": PAIR}).json()
    assert groups[0]["entries"] == {"hudl:a": "Blue"}


def test_owner_renamed_group_is_kept(client: TestClient, db: Session) -> None:
    seed(db, renamed=True)
    groups = client.post("/api/tournaments/detect", json={"matches": PAIR}).json()
    assert groups[0]["name"] == "Weekend"
    assert len(groups[0]["entries"]) == 2
