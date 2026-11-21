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
    CREST,
    EXPIRED_ID,
    detail,
    highlights,
    match_events,
    match_report,
    periods,
    recording,
    team_stats,
    videos,
)

LIST = "/api/app/clubs/riverside/recordings/?filter=own"
ACTIVE = recording()
EXPIRED = recording(EXPIRED_ID, expiration_status="expired")


class FakeApi:
    def __init__(self, refuse: str | None = None, status: int = 429) -> None:
        self.refuse = refuse
        self.status = status
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
            # Decision 009: the match report and the events service (team-split data).
            f"/api/app/analysis/matches/{slug}/match-report/": ({}, match_report()),
            f"/api/mes/v2/{ACTIVE_ID}/match-events": ({}, match_events()),
            # Owner request 2026-11-15: each side's totals.
            f"/api/mes/v2/{ACTIVE_ID}/teams/Own/stats": ({}, team_stats(6, 11)),
            f"/api/mes/v2/{ACTIVE_ID}/teams/Opponent/stats": ({}, team_stats(2, 9)),
        }

    def get(self, path: str) -> tuple[dict[str, str], Any]:
        self.paths.append(path)
        if self.refuse and path.startswith(self.refuse):
            raise VeoRefused(self.status)
        return self.pages[path]


def connection(tmp_path: Path, api: FakeApi) -> VeoConnection:
    @contextmanager
    def session(loader):  # noqa: ANN001, ANN202
        yield api

    veo = VeoConnection(lambda: None, tmp_path, session=session, run=lambda work: work())
    return veo


# Owner request 2026-11-20 replaces "a test reads no match": Connect counts the account's
# matches and then reads them in the same sign-in (test_veo_shared.py covers the rest).
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
        "moments": 3,
    }
    assert "2 Veo matches" in status["message"]
    assert api.paths.index(LIST) < api.paths.index(f"/api/app/matches/{ACTIVE['slug']}/")


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
    api = FakeApi(refuse=LIST)
    veo = connection(tmp_path, api)
    veo.start("refresh")
    assert veo.status()["state"] == "error" and "Veo" in veo.status()["message"]
    assert (tmp_path / "library.json").read_text() == before
    assert sum(p == LIST for p in api.paths) == 1  # no retry, no more requests


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


# Decision 009 (owner, 2026-11-14): Refresh also keeps Veo's team-split stats and
# events for each match with video, read once and reused on later refreshes.
def test_refresh_keeps_the_team_split_data_and_reads_it_once(tmp_path: Path) -> None:
    api = FakeApi()
    veo = connection(tmp_path, api)
    veo.start("refresh")
    item = next(i for i in veo.library() if i["id"] == f"veo-{ACTIVE_ID}")
    assert item["team_data"]["stats"]["total_attempts"] == {"own": 9, "opponent": 4}
    assert [e["side"] for e in item["team_data"]["events"]].count("opponent") == 3
    assert "veocdn" not in (tmp_path / "library.json").read_text()
    again = FakeApi()
    connection(tmp_path, again).start("refresh")
    assert not any("match-report" in p or "/api/mes/" in p for p in again.paths)
    item = next(i for i in veo.library() if i["id"] == f"veo-{ACTIVE_ID}")
    assert item["team_data"]["stats"]["goals"] == {"own": 3, "opponent": 1}


@pytest.mark.parametrize("status", [400, 403, 404])
def test_a_match_without_team_data_is_skipped_and_not_asked_again(
    tmp_path: Path, status: int
) -> None:
    api = FakeApi(refuse="/api/app/analysis/", status=status)
    veo = connection(tmp_path, api)
    veo.start("refresh")
    assert veo.status()["state"] == "ready"
    item = next(i for i in veo.library() if i["id"] == f"veo-{ACTIVE_ID}")
    assert item["team_data"] is None
    assert not any("/api/mes/" in p for p in api.paths)  # nothing more for that match
    again = FakeApi()
    connection(tmp_path, again).start("refresh")
    assert not any("match-report" in p for p in again.paths)


@pytest.mark.parametrize("status", [401, 429, 500])
def test_a_sign_out_or_slow_down_on_team_data_stops_the_refresh(
    tmp_path: Path, status: int
) -> None:
    api = FakeApi(refuse="/api/mes/", status=status)
    veo = connection(tmp_path, api)
    veo.start("refresh")
    assert veo.status()["state"] == "error"
    assert sum(p.startswith("/api/mes/") for p in api.paths) == 1


# Owner request 2026-11-15: each side's totals, read once with the report.
def test_refresh_keeps_each_sides_totals(tmp_path: Path) -> None:
    veo = connection(tmp_path, FakeApi())
    veo.start("refresh")
    item = next(i for i in veo.library() if i["id"] == f"veo-{ACTIVE_ID}")
    assert item["team_data"]["totals"]["missed_shots"] == {"own": 6, "opponent": 2}
    assert item["team_data"]["totals"]["out_of_play"] == {"own": 11, "opponent": 9}
    assert "shots_inside_box" not in item["team_data"]["totals"]


def test_refused_totals_keep_the_report_and_events(tmp_path: Path) -> None:
    api = FakeApi(refuse=f"/api/mes/v2/{ACTIVE_ID}/teams/", status=403)
    veo = connection(tmp_path, api)
    veo.start("refresh")
    assert veo.status()["state"] == "ready"
    item = next(i for i in veo.library() if i["id"] == f"veo-{ACTIVE_ID}")
    assert item["team_data"]["stats"]["goals"] == {"own": 3, "opponent": 1}
    assert item["team_data"]["totals"] == {}
    assert sum("/teams/" in p for p in api.paths) == 1  # the first refusal ends the pair


# The first real refresh (2026-11-15) kept sides as None; that cache is read again once.
def test_team_data_kept_by_an_earlier_version_is_read_again(tmp_path: Path) -> None:
    old = {"stats": {}, "events": [{"type": "GOAL", "side": None, "time_s": 1.0, "period": 1}]}
    (tmp_path / "library.json").write_text(
        json.dumps({"matches": [{"id": f"veo-{ACTIVE_ID}", "team_data": old}]})
    )
    api = FakeApi()
    connection(tmp_path, api).start("refresh")
    assert any("match-report" in p for p in api.paths)
    item = next(
        i for i in connection(tmp_path, FakeApi()).library() if i["id"] == f"veo-{ACTIVE_ID}"
    )
    assert {e["side"] for e in item["team_data"]["events"]} == {"own", "opponent"}


class FakeMedia:
    def __init__(self, crest: bytes | Exception = b"\x89PNG\r\n\x1a\nbig") -> None:
        self.crest = crest
        self.crests: list[str] = []

    def media_image(self, url: str) -> bytes:
        raise CaptureError("no posters in this test")

    def media_crest(self, url: str) -> bytes:
        self.crests.append(url)
        if isinstance(self.crest, Exception):
            raise self.crest
        return self.crest


def with_media(tmp_path: Path, api: FakeApi, media: FakeMedia) -> VeoConnection:
    @contextmanager
    def session(loader):  # noqa: ANN001, ANN202
        yield api

    return VeoConnection(
        lambda: None,
        tmp_path,
        session=session,
        run=lambda work: work(),
        media=media,
        shrink=lambda data: b"\x89PNG\r\n\x1a\nsmall:" + data[-3:],
    )


# Owner request 2026-11-15: the club's crest from Veo's match report, saved once on
# this computer (scaled down); its address is not kept.
def test_refresh_saves_the_clubs_crest_once(tmp_path: Path) -> None:
    media = FakeMedia()
    veo = with_media(tmp_path, FakeApi(), media)
    veo.start("refresh")
    assert media.crests == [CREST]
    assert veo.crest() is not None
    assert veo.crest().read_bytes() == b"\x89PNG\r\n\x1a\nsmall:big"
    assert veo.club() == {"names": ["Riverside FC", "Riverside"], "crest": True}
    for name in ("library.json", "club.json"):
        assert "assets.app.veo.co" not in (tmp_path / name).read_text()
    with_media(tmp_path, FakeApi(), media).start("refresh")
    assert media.crests == [CREST]  # not asked again


def test_a_crest_that_cannot_be_read_never_stops_the_refresh(tmp_path: Path) -> None:
    media = FakeMedia(VeoRefused(403))
    veo = with_media(tmp_path, FakeApi(), media)
    veo.start("refresh")
    assert veo.status()["state"] == "ready"
    assert veo.crest() is None
    assert veo.club() == {"names": ["Riverside FC", "Riverside"], "crest": False}
    assert len(media.crests) == 1


def test_an_unscalable_crest_is_not_kept(tmp_path: Path) -> None:
    @contextmanager
    def session(loader):  # noqa: ANN001, ANN202
        yield FakeApi()

    veo = VeoConnection(
        lambda: None,
        tmp_path,
        session=session,
        run=lambda work: work(),
        media=FakeMedia(),
        shrink=lambda data: None,
    )
    veo.start("refresh")
    assert veo.status()["state"] == "ready" and veo.crest() is None
