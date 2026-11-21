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


def test_a_finished_read_reuses_cached_matches_next_time(tmp_path: Path) -> None:
    connection(tmp_path, TwoMatches()).start("refresh")
    again = TwoMatches()
    connection(tmp_path, again).start("refresh")
    assert reads_of(again, FIRST_SLUG) == 0 and reads_of(again, SECOND["slug"]) == 0


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


def test_only_a_new_match_is_read_and_progress_counts_only_new_matches(tmp_path: Path) -> None:
    connection(tmp_path, FakeApi()).start("refresh")
    api = TwoMatches()
    veo = connection(tmp_path, api)
    reports = []
    original = veo._report

    def report(**values: Any) -> None:
        reports.append(values)
        original(**values)

    veo._report = report
    veo.start("refresh")
    assert veo.status()["state"] == "ready"
    assert reads_of(api, FIRST_SLUG) == 0
    assert reads_of(api, SECOND["slug"]) == 4
    assert [r["message"] for r in reports if "progress" in r and r["progress"]] == [
        "Reading Veo match 1 of 1…"
    ]
    assert [r["progress"] for r in reports if r.get("progress")] == [
        {"done": 0, "total": 1, "fraction": 0.0}
    ]
    items = {i["id"]: i for i in veo.library()}
    assert len(items[f"veo-{ACTIVE_ID}"]["moments"]) == 3
    assert items[f"veo-{ACTIVE_ID}"]["score"] == {"ours": 3, "theirs": 1}
    assert items[f"veo-{SECOND_ID}"]["available"] is True


def test_cached_match_expiry_still_comes_from_the_new_list(tmp_path: Path) -> None:
    connection(tmp_path, FakeApi()).start("refresh")
    api = FakeApi()
    headers, _ = api.pages[LIST]
    api.pages[LIST] = (headers, [recording(expiration_status="expired")])
    veo = connection(tmp_path, api)
    veo.start("refresh")
    item = next(i for i in veo.library() if i["id"] == f"veo-{ACTIVE_ID}")
    assert item["available"] is False
    assert item["expiration_status"] == "expired"
    assert reads_of(api, FIRST_SLUG) == 0


def test_a_recording_still_processing_is_read_again_when_video_becomes_ready(
    tmp_path: Path,
) -> None:
    api = FakeApi()
    api.pages[f"/api/app/matches/{FIRST_SLUG}/videos/"] = ({}, [])
    connection(tmp_path, api).start("refresh")
    ready = FakeApi()
    veo = connection(tmp_path, ready)
    veo.start("refresh")
    assert reads_of(ready, FIRST_SLUG) == 4
    assert next(i for i in veo.library() if i["id"] == f"veo-{ACTIVE_ID}")["available"] is True


def test_cached_match_title_updates_without_losing_details(tmp_path: Path) -> None:
    connection(tmp_path, FakeApi()).start("refresh")
    api = FakeApi()
    headers, _ = api.pages[LIST]
    api.pages[LIST] = (headers, [recording(title="Riverside U11 vs Westfield")])
    veo = connection(tmp_path, api)
    veo.start("refresh")
    item = next(i for i in veo.library() if i["id"] == f"veo-{ACTIVE_ID}")
    assert item["title"] == "261108 Riverside U11 vs Westfield"
    assert item["score"] == {"ours": 3, "theirs": 1}
    assert len(item["moments"]) == 3
    assert reads_of(api, FIRST_SLUG) == 0
