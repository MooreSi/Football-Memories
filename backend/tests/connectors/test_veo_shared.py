"""Owner request 2026-11-20: Connect reads the matches straight away, and shared Veo
match links (a public match page) are read with no sign-in. Fake Veo only."""

import json
from contextlib import contextmanager
from pathlib import Path
from typing import Any

import pytest

from app.connectors.hudl_capture import CaptureError
from app.connectors.veo._connection import VeoConnection, shared_slug
from tests.connectors.test_veo_connection import ACTIVE, FakeApi
from tests.connectors.veo_fixtures.synthetic import (
    ACTIVE_ID,
    EXPIRED_ID,
    detail,
    highlights,
    periods,
    recording,
    videos,
)

SHARED_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
SHARED = recording(SHARED_ID, title="Westfield U11 vs Riverside")
SLUG = SHARED["slug"]
LINK = f"https://app.veo.co/matches/{SLUG}/"


class SharedApi(FakeApi):
    """The account pages plus one public match (read by slug, as Veo serves it)."""

    def __init__(self, refuse: str | None = None, status: int = 429) -> None:
        super().__init__(refuse, status)
        self.pages.update(
            {
                f"/api/app/matches/{SLUG}/": ({}, {**SHARED, **detail(identifier=SHARED_ID)}),
                f"/api/app/matches/{SLUG}/videos/": ({}, videos()),
                f"/api/app/matches/{SLUG}/highlights/?include_ai=true": ({}, highlights()),
                f"/api/app/matches/{SLUG}/periods/": ({}, periods()),
            }
        )


def no_credentials() -> Any:
    raise AssertionError("a shared match must never load the Veo account")


def make(tmp_path: Path, signed_in: FakeApi, public: FakeApi) -> tuple[VeoConnection, list[str]]:
    opened: list[str] = []

    @contextmanager
    def session(loader):  # noqa: ANN001, ANN202
        opened.append("signed-in")
        yield signed_in

    @contextmanager
    def public_session():  # noqa: ANN202
        opened.append("public")
        yield public

    veo = VeoConnection(
        no_credentials, tmp_path, session=session, public=public_session, run=lambda w: w()
    )
    return veo, opened


# Owner request 2026-11-20: "I shouldn't need to refresh for it to index/cache".
def test_connect_reads_the_matches_in_the_same_sign_in(tmp_path: Path) -> None:
    api = SharedApi()
    veo, opened = make(tmp_path, api, SharedApi())
    veo.start("test")
    assert opened == ["signed-in"]  # one sign-in for both
    assert {i["id"] for i in veo.library()} == {f"veo-{ACTIVE_ID}", f"veo-{EXPIRED_ID}"}
    status = veo.status()
    assert status["state"] == "ready" and "Select Refresh" not in status["message"]
    assert status["summary"]["moments"] == 3


@pytest.mark.parametrize(
    "link",
    [
        LINK,
        LINK.rstrip("/"),
        f"{LINK}?utm_source=share",
        f"  {LINK}#t=10  ",
    ],
)
def test_a_shared_match_link_gives_its_slug(link: str) -> None:
    assert shared_slug(link) == SLUG


@pytest.mark.parametrize(
    "link",
    [
        f"http://app.veo.co/matches/{SLUG}/",
        f"https://app.veo.co.evil.test/matches/{SLUG}/",
        f"https://evil.test/matches/{SLUG}/",
        f"https://app.veo.co/matches/{SLUG}/highlights/",
        "https://app.veo.co/clubs/riverside/recordings/",
        "https://app.veo.co/matches/../api/app/user/",
        f"https://user@app.veo.co/matches/{SLUG}/",
        f"https://app.veo.co:444/matches/{SLUG}/",
        "not a link",
    ],
)
def test_anything_but_a_veo_match_page_is_refused(link: str) -> None:
    with pytest.raises(CaptureError, match="Veo match"):
        shared_slug(link)


def test_shared_links_are_kept_once_and_deleted(tmp_path: Path) -> None:
    veo, _ = make(tmp_path, SharedApi(), SharedApi())
    assert veo.add_shared(LINK) == SLUG
    assert veo.add_shared(f"{LINK}?again=1") == SLUG
    assert [link["slug"] for link in veo.shared_links()] == [SLUG]
    assert json.loads((tmp_path / "shared.json").read_text()) == {
        "links": [{"slug": SLUG, "url": LINK}]
    }
    veo.remove_shared(SLUG)
    assert veo.shared_links() == []


def test_shared_matches_are_read_without_signing_in(tmp_path: Path) -> None:
    public = SharedApi()
    veo, opened = make(tmp_path, SharedApi(), public)
    veo.add_shared(LINK)
    veo.start("shared")
    assert opened == ["public"]
    assert veo.status()["state"] == "ready", veo.status()["message"]
    (item,) = veo.library()
    assert item["id"] == f"veo-{SHARED_ID}" and item["shared"] is True
    assert item["available"] is True and len(item["moments"]) == 3
    # No team-split reads without an account; left for a signed-in refresh to decide.
    assert "team_data" not in item
    assert all(p.startswith(f"/api/app/matches/{SLUG}/") for p in public.paths)
    assert "veocdn" not in (tmp_path / "library.json").read_text()


def test_reading_shared_matches_keeps_the_account_matches(tmp_path: Path) -> None:
    veo, _ = make(tmp_path, SharedApi(), SharedApi())
    veo.start("refresh")
    account = {i["id"] for i in veo.library()}
    veo.add_shared(LINK)
    veo.start("shared")
    assert {i["id"] for i in veo.library()} == account | {f"veo-{SHARED_ID}"}


def test_an_account_refresh_also_reads_the_shared_links(tmp_path: Path) -> None:
    api = SharedApi()
    veo, opened = make(tmp_path, api, SharedApi())
    veo.add_shared(LINK)
    veo.start("refresh")
    assert opened == ["signed-in"]
    items = {i["id"]: i for i in veo.library()}
    assert items[f"veo-{SHARED_ID}"]["shared"] is True
    assert not any("analysis" in p and SLUG in p for p in api.paths)


def test_a_shared_link_the_account_already_has_is_not_read_twice(tmp_path: Path) -> None:
    api = SharedApi()
    veo, _ = make(tmp_path, api, SharedApi())
    veo.add_shared(f"https://app.veo.co/matches/{ACTIVE['slug']}/")
    veo.start("refresh")
    assert [i["id"] for i in veo.library()].count(f"veo-{ACTIVE_ID}") == 1
    assert api.paths.count(f"/api/app/matches/{ACTIVE['slug']}/") == 1


@pytest.mark.parametrize("status", [403, 404])
def test_a_match_no_longer_shared_is_skipped_and_said(tmp_path: Path, status: int) -> None:
    public = SharedApi(refuse=f"/api/app/matches/{SLUG}/", status=status)
    veo, _ = make(tmp_path, SharedApi(), public)
    veo.add_shared(LINK)
    veo.start("shared")
    assert veo.status()["state"] == "ready"
    assert "1 shared link could not be read" in veo.status()["message"]
    assert public.paths == [f"/api/app/matches/{SLUG}/"]


@pytest.mark.parametrize("status", [401, 429, 500])
def test_a_slow_down_on_a_shared_match_stops_and_keeps_the_library(
    tmp_path: Path, status: int
) -> None:
    veo, _ = make(tmp_path, SharedApi(), SharedApi())
    veo.add_shared(LINK)
    veo.start("shared")
    before = (tmp_path / "library.json").read_text()
    public = SharedApi(refuse=f"/api/app/matches/{SLUG}/", status=status)
    again, _ = make(tmp_path, SharedApi(), public)
    again.start("shared")
    assert again.status()["state"] == "error"
    assert (tmp_path / "library.json").read_text() == before
    assert len(public.paths) == 1  # nothing retried


def test_reading_shared_matches_needs_a_link(tmp_path: Path) -> None:
    veo, _ = make(tmp_path, SharedApi(), SharedApi())
    with pytest.raises(CaptureError, match="shared match link"):
        veo.start("shared")


def test_deleting_a_link_drops_its_match_from_the_list_without_asking_veo(
    tmp_path: Path,
) -> None:
    signed_in, public = SharedApi(), SharedApi()
    veo, _ = make(tmp_path, signed_in, public)
    veo.start("refresh")
    veo.add_shared(LINK)
    veo.start("shared")
    asked = len(signed_in.paths) + len(public.paths)
    veo.remove_shared(SLUG)
    ids = {i["id"] for i in veo.library()}
    assert f"veo-{SHARED_ID}" not in ids and f"veo-{ACTIVE_ID}" in ids
    assert len(signed_in.paths) + len(public.paths) == asked


def test_deleting_a_link_never_touches_a_downloaded_match(tmp_path: Path) -> None:
    saved = tmp_path / "Westfield U11 vs Riverside 2026-11-08.mp4"
    saved.write_bytes(b"footage")
    veo, _ = make(tmp_path, SharedApi(), SharedApi())
    veo.add_shared(LINK)
    veo.start("shared")
    veo.remove_shared(SLUG)
    assert saved.read_bytes() == b"footage"


def test_deleting_an_unknown_link_says_so(tmp_path: Path) -> None:
    veo, _ = make(tmp_path, SharedApi(), SharedApi())
    with pytest.raises(CaptureError, match="not saved"):
        veo.remove_shared(SLUG)


def test_links_cannot_change_while_veo_is_busy(tmp_path: Path) -> None:
    veo = VeoConnection(no_credentials, tmp_path, session=None, run=lambda w: None)
    veo.add_shared(LINK)
    veo.start("shared")  # never finishes
    with pytest.raises(CaptureError, match="finish"):
        veo.remove_shared(SLUG)
    with pytest.raises(CaptureError, match="finish"):
        veo.add_shared(f"https://app.veo.co/matches/{ACTIVE['slug']}/")


def test_saving_a_new_account_keeps_the_shared_matches(tmp_path: Path) -> None:
    veo, _ = make(tmp_path, SharedApi(), SharedApi())
    veo.start("refresh")
    veo.add_shared(LINK)
    veo.start("shared")
    veo.reset()
    assert [i["id"] for i in veo.library()] == [f"veo-{SHARED_ID}"]


def test_watching_a_shared_match_reads_its_video_without_signing_in(tmp_path: Path) -> None:
    veo, opened = make(tmp_path, SharedApi(), SharedApi())
    veo.add_shared(LINK)
    veo.start("shared")
    veo._videos.clear()  # as after a helper restart
    public = SharedApi()
    again, opened = make(tmp_path, SharedApi(), public)
    again.start("watch", f"veo-{SHARED_ID}")
    assert opened == ["public"], again.status()["message"]
    assert public.paths == [f"/api/app/matches/{SLUG}/videos/"]
    assert again.status()["stream_url"]


def test_the_public_reader_only_reads_shared_match_pages(tmp_path: Path) -> None:
    """A public read is limited to /api/app/matches/<slug>/...: never the account."""
    veo, _ = make(tmp_path, SharedApi(), SharedApi())
    reader = veo._public_reader(SharedApi())
    with pytest.raises(CaptureError):
        reader.get("/api/app/user/")
    with pytest.raises(CaptureError):
        reader.get(f"/api/mes/v2/{ACTIVE_ID}/match-events")
    reader.get(f"/api/app/matches/{SLUG}/")


def test_a_refused_video_list_for_a_shared_match_says_veo(tmp_path: Path) -> None:
    veo, _ = make(tmp_path, SharedApi(), SharedApi())
    veo.add_shared(LINK)
    veo.start("shared")
    veo._videos.clear()
    again, _ = make(tmp_path, SharedApi(), SharedApi(refuse=f"/api/app/matches/{SLUG}/videos/"))
    again.start("watch", f"veo-{SHARED_ID}")
    assert again.status()["state"] == "error" and "Veo" in again.status()["message"]
