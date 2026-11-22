"""Owner report 2026-11-20 (a new hosted account): a Veo read that stops part-way
starts again from the first match on the next Connect or Refresh. Matches already read
in the unfinished run are kept and not asked for again; the finished list still
replaces the cache only when the run completes (spec 250)."""

from pathlib import Path
from typing import Any

from app.connectors.veo._connection import VeoConnection
from tests.connectors.test_veo_connection import LIST, FakeApi, connection
from tests.connectors.veo_fixtures.synthetic import (
    ACTIVE_ID,
    detail,
    highlights,
    periods,
    recording,
    videos,
)

SECOND_ID = "22222222-3333-4444-5555-666666666666"
SECOND = recording(SECOND_ID)
FIRST_SLUG = recording()["slug"]


class BrokenAfter(Exception):
    """An error with text that must never reach the owner (it could hold an address)."""


class TwoMatches(FakeApi):
    """Two matches with video; `fail_on` makes one read raise an unexpected error."""

    def __init__(self, fail_on: str | None = None) -> None:
        super().__init__()
        self.fail_on = fail_on
        slug = SECOND["slug"]
        headers, items = self.pages[LIST]
        self.pages[LIST] = ({**headers, "x-veo-total-count": "3"}, [*items, SECOND])
        self.pages.update(
            {
                f"/api/app/matches/{slug}/": ({}, detail(identifier=SECOND_ID)),
                f"/api/app/matches/{slug}/videos/": ({}, videos()),
                f"/api/app/matches/{slug}/highlights/?include_ai=true": ({}, highlights()),
                f"/api/app/matches/{slug}/periods/": ({}, periods()),
                # No report for this one: kept as None, as for any match without one.
                f"/api/app/analysis/matches/{slug}/match-report/": ({}, None),
                f"/api/mes/v2/{SECOND_ID}/match-events": ({}, None),
                f"/api/mes/v2/{SECOND_ID}/teams/Own/stats": ({}, None),
                f"/api/mes/v2/{SECOND_ID}/teams/Opponent/stats": ({}, None),
            }
        )

    def get(self, path: str) -> tuple[dict[str, str], Any]:
        if self.fail_on and path == self.fail_on:
            self.paths.append(path)
            raise BrokenAfter("https://c.veocdn.com/secret/address.mp4")
        return super().get(path)


def reads_of(api: FakeApi, slug: str) -> int:
    return sum(p.startswith(f"/api/app/matches/{slug}/") for p in api.paths)


def test_an_interrupted_read_carries_on_from_where_it_stopped(tmp_path: Path) -> None:
    first = TwoMatches(fail_on=f"/api/app/matches/{SECOND['slug']}/")
    stopped = connection(tmp_path, first)
    stopped.start("test")
    assert stopped.status()["state"] == "error"
    assert reads_of(first, FIRST_SLUG) == 4

    again = TwoMatches()
    veo = connection(tmp_path, again)
    veo.start("test")
    assert veo.status()["state"] == "ready"
    assert reads_of(again, FIRST_SLUG) == 0  # read in the stopped run, not asked again
    assert reads_of(again, SECOND["slug"]) == 4
    items = {i["id"]: i for i in veo.library()}
    assert items[f"veo-{ACTIVE_ID}"]["available"] is True
    assert len(items[f"veo-{ACTIVE_ID}"]["moments"]) == 3
    assert items[f"veo-{ACTIVE_ID}"]["team_data"] is not None
    assert items[f"veo-{SECOND_ID}"]["available"] is True


def test_a_finished_read_starts_afresh_next_time(tmp_path: Path) -> None:
    connection(tmp_path, TwoMatches()).start("refresh")
    again = TwoMatches()
    connection(tmp_path, again).start("refresh")
    assert reads_of(again, FIRST_SLUG) == 4 and reads_of(again, SECOND["slug"]) == 4


def test_the_stopped_run_still_leaves_the_last_finished_list(tmp_path: Path) -> None:
    connection(tmp_path, FakeApi()).start("refresh")
    before = (tmp_path / "library.json").read_text()
    connection(tmp_path, TwoMatches(fail_on=f"/api/app/matches/{SECOND['slug']}/")).start("refresh")
    assert (tmp_path / "library.json").read_text() == before


def test_a_new_account_never_carries_on_from_the_last_one(tmp_path: Path) -> None:
    connection(tmp_path, TwoMatches(fail_on=f"/api/app/matches/{SECOND['slug']}/")).start("test")
    veo = connection(tmp_path, TwoMatches())
    veo.reset()
    again = TwoMatches()
    connection(tmp_path, again).start("test")
    assert reads_of(again, FIRST_SLUG) == 4


def test_disconnect_forgets_the_unfinished_run(tmp_path: Path) -> None:
    connection(tmp_path, TwoMatches(fail_on=f"/api/app/matches/{SECOND['slug']}/")).start("test")
    connection(tmp_path, TwoMatches()).forget()
    again = TwoMatches()
    connection(tmp_path, again).start("test")
    assert reads_of(again, FIRST_SLUG) == 4


def test_an_unexpected_stop_names_its_cause_and_what_was_kept(tmp_path: Path, caplog: Any) -> None:
    veo = connection(tmp_path, TwoMatches(fail_on=f"/api/app/matches/{SECOND['slug']}/"))
    veo.start("test")
    status = veo.status()
    assert status["state"] == "error"
    assert "BrokenAfter" in status["message"]
    assert "1 match read so far is kept" in status["message"]
    assert "veocdn" not in status["message"] and "veocdn" not in caplog.text
    assert "BrokenAfter" in caplog.text


def test_a_refusal_also_says_what_was_kept(tmp_path: Path) -> None:
    api = TwoMatches()
    api.refuse = f"/api/app/matches/{SECOND['slug']}/"
    veo: VeoConnection = connection(tmp_path, api)
    veo.start("test")
    message = veo.status()["message"]
    assert "slow down" in message and "1 match read so far is kept" in message


def test_connect_reuses_finished_matches_and_reads_only_new_ones(tmp_path: Path) -> None:
    connection(tmp_path, FakeApi()).start("refresh")
    saved = connection(tmp_path, FakeApi()).library()[0]
    again = TwoMatches()
    veo = connection(tmp_path, again)
    veo.start("test")
    assert veo.status()["state"] == "ready"
    assert reads_of(again, FIRST_SLUG) == 0
    assert reads_of(again, SECOND["slug"]) == 4
    assert veo.library()[0] == saved
    assert len(veo.library()) == 3


def test_automatic_refresh_reuses_completed_cache(tmp_path: Path) -> None:
    connection(tmp_path, FakeApi()).start("refresh")
    again = TwoMatches()
    veo = connection(tmp_path, again)
    veo.start("refresh", only_missing=True)
    assert veo.status()["state"] == "ready"
    assert reads_of(again, FIRST_SLUG) == 0
    assert reads_of(again, SECOND["slug"]) == 4


def test_incremental_check_updates_expiry_without_rereading_details(tmp_path: Path) -> None:
    connection(tmp_path, FakeApi()).start("refresh")
    again = FakeApi()
    headers, items = again.pages[LIST]
    again.pages[LIST] = (headers, [{**items[0], "expiration_status": "expires-soon"}])
    veo = connection(tmp_path, again)
    veo.start("test")
    assert reads_of(again, FIRST_SLUG) == 0
    assert veo.library()[0]["expiration_status"] == "expires-soon"
    assert len(veo.library()[0]["moments"]) == 3
    assert veo.status()["summary"]["expiring"] == 1


def test_incremental_check_marks_expired_matches_unavailable(tmp_path: Path) -> None:
    connection(tmp_path, FakeApi()).start("refresh")
    again = FakeApi()
    headers, items = again.pages[LIST]
    again.pages[LIST] = (headers, [{**items[0], "expiration_status": "expired"}])
    veo = connection(tmp_path, again)
    veo.start("test")
    assert reads_of(again, FIRST_SLUG) == 0
    assert veo.library()[0]["available"] is False
    assert veo.library()[0]["moments"] == []


def test_incremental_check_retries_a_match_that_now_has_video(tmp_path: Path) -> None:
    first = FakeApi()
    first.pages[f"/api/app/matches/{FIRST_SLUG}/videos/"] = ({}, [])
    connection(tmp_path, first).start("refresh")
    again = FakeApi()
    veo = connection(tmp_path, again)
    veo.start("test")
    assert reads_of(again, FIRST_SLUG) == 4
    assert veo.library()[0]["available"] is True
