"""Spec 250: Test and Refresh on one worker, over a fake Veo; the cache is replaced
only when a refresh finishes."""

import json
from contextlib import contextmanager
from pathlib import Path
from typing import Any

import pytest

from app.connectors.hudl_capture import CaptureError
from app.connectors.veo._client import VeoRefused
from app.connectors.veo._connection import VeoConnection
from tests.connectors.veo_fixtures.synthetic import (
    ACTIVE_ID,
    EXPIRED_ID,
    detail,
    highlights,
    periods,
    recording,
    videos,
)

LIST = "/api/app/clubs/riverside/recordings/?filter=own"
ACTIVE = recording()
EXPIRED = recording(EXPIRED_ID, expiration_status="expired")


class FakeApi:
    def __init__(self, refuse: str | None = None) -> None:
        self.refuse = refuse
        self.paths: list[str] = []
        slug = ACTIVE["slug"]
        self.pages = {
            "/api/app/user/": ({}, {"id": "u"}),
            "/api/app/clubs/?filter=own": ({}, [{"slug": "riverside", "name": "Riverside"}]),
            LIST: (
                {
                    "x-veo-total-count": "2",
                    "x-veo-matches-expired": "1",
                    "x-veo-matches-soon-expiring": "0",
                    "link": f'<https://app.veo.co{LIST}&page=2>; rel="next"',
                },
                [ACTIVE],
            ),
            f"{LIST}&page=2": ({}, [EXPIRED]),
            f"/api/app/matches/{slug}/": ({}, detail()),
            f"/api/app/matches/{slug}/videos/": ({}, videos()),
            f"/api/app/matches/{slug}/highlights/?include_ai=true": ({}, highlights()),
            f"/api/app/matches/{slug}/periods/": ({}, periods()),
        }

    def get(self, path: str) -> tuple[dict[str, str], Any]:
        self.paths.append(path)
        if self.refuse and path.startswith(self.refuse):
            raise VeoRefused(429)
        return self.pages[path]


def connection(tmp_path: Path, api: FakeApi) -> VeoConnection:
    @contextmanager
    def session(loader):  # noqa: ANN001, ANN202
        yield api

    veo = VeoConnection(lambda: None, tmp_path, session=session, run=lambda work: work())
    return veo


def test_test_reports_what_the_account_has(tmp_path: Path) -> None:
    api = FakeApi()
    veo = connection(tmp_path, api)
    veo.start("test")
    status = veo.status()
    assert status["state"] == "ready"
    assert status["summary"] == {
        "clubs": 1,
        "matches": 2,
        "with_video": 1,
        "expired": 1,
        "expiring": 0,
    }
    assert "2 matches" in status["message"]
    assert not any("/matches/" in p for p in api.paths)  # a test reads no match


def test_refresh_lists_every_page_and_reads_only_active_matches(tmp_path: Path) -> None:
    api = FakeApi()
    veo = connection(tmp_path, api)
    veo.start("refresh")
    items = {i["id"]: i for i in veo.library()}
    assert set(items) == {f"veo-{ACTIVE_ID}", f"veo-{EXPIRED_ID}"}
    assert [m["category"] for m in items[f"veo-{ACTIVE_ID}"]["moments"]] == [
        "SHOT ON GOAL",
        "VEO CLIP",
        "GOAL",
    ]
    assert items[f"veo-{EXPIRED_ID}"]["available"] is False
    assert sum(EXPIRED["slug"] in p for p in api.paths) == 0
    assert veo.status()["summary"]["moments"] == 3
    saved = (tmp_path / "library.json").read_text()
    assert "veocdn" not in saved and json.loads(saved)


def test_a_refusal_stops_the_refresh_and_keeps_the_last_library(tmp_path: Path) -> None:
    good = connection(tmp_path, FakeApi())
    good.start("refresh")
    before = (tmp_path / "library.json").read_text()
    api = FakeApi(refuse="/api/app/matches/")
    veo = connection(tmp_path, api)
    veo.start("refresh")
    assert veo.status()["state"] == "error" and "Veo" in veo.status()["message"]
    assert (tmp_path / "library.json").read_text() == before
    assert (
        sum(p.startswith("/api/app/matches/") for p in api.paths) == 1
    )  # no retry, no more requests


def test_one_operation_at_a_time(tmp_path: Path) -> None:
    veo = VeoConnection(
        lambda: None, tmp_path, session=None, run=lambda work: None
    )  # never finishes
    veo.start("test")
    with pytest.raises(CaptureError, match="already"):
        veo.start("refresh")


def test_saving_new_credentials_forgets_the_old_account_library(tmp_path: Path) -> None:
    veo = connection(tmp_path, FakeApi())
    veo.start("refresh")
    veo.reset()
    assert veo.library() == [] and veo.status()["summary"] is None
