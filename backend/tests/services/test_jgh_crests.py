"""Owner request 2026-11-23 (decision 008, consent obtained by the owner): grassroots club
crests from Junior Grassroots Hub. The site lists every club in its clubs sitemap
(/clubs/<slug>); a club's page names it in JSON-LD (SportsClub) with its crest ("logo") on
the site's own storage. The app reads the sitemap once a day, the one matching club page
and its crest, never /api/, paced. All offline: a synthetic site below."""

import json
from email.message import Message
from pathlib import Path
from urllib.error import HTTPError

import pytest
from fastapi.testclient import TestClient

from app.services import team_logos

SITE = "https://www.juniorgrassrootshub.com"
SITEMAP = f"{SITE}/sitemaps/sitemap/clubs.xml"
STORE = "https://cfkzqicresplbojnqrej.supabase.co/storage/v1/object/public/partner-images"
JPEG = b"\xff\xd8\xff\xe0" + b"synthetic-jpeg-crest"
PNG = b"\x89PNG\r\n\x1a\n" + b"synthetic-png-crest"


class _Clock:
    def __init__(self) -> None:
        self.now = 1000.0

    def monotonic(self) -> float:
        return self.now

    def sleep(self, seconds: float) -> None:
        self.now += seconds


@pytest.fixture(autouse=True)
def clock(monkeypatch: pytest.MonkeyPatch) -> _Clock:
    fake = _Clock()
    monkeypatch.setattr(team_logos, "_MISSES", {})
    monkeypatch.setattr(team_logos, "_PAUSED_UNTIL", [0.0])
    monkeypatch.setattr(team_logos, "_UNSETTLED", set())
    monkeypatch.setattr(team_logos, "_SITE_PAUSED", {"wikimedia": 0.0, "sportsdb": 0.0})
    monkeypatch.setattr(team_logos, "_JGH_INDEX", {"slugs": None, "until": 0.0})
    # Pacing stamps are written in place on the fake clock; fresh lists keep them
    # from outliving the test (a later real-clock test would sleep for hours).
    for name in ("_LAST_REQUEST", "_LAST_SPORTSDB", "_LAST_JGH"):
        monkeypatch.setattr(team_logos, name, [0.0])
    monkeypatch.setattr(team_logos.time, "monotonic", fake.monotonic)
    monkeypatch.setattr(team_logos.time, "sleep", fake.sleep)
    return fake


def _page(name: str, logo: str | None) -> bytes:
    club: dict[str, object] = {
        "@context": "https://schema.org",
        "@type": "SportsClub",
        "name": name,
        "sport": "Association Football",
    }
    if logo:
        club["logo"] = logo
    crumbs = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": []}
    scripts = "".join(
        f'<script type="application/ld+json">{json.dumps(d)}</script>' for d in (club, crumbs)
    )
    other = f'<img src="{STORE}/logos/sponsor.png">'  # a sponsor's logo on the same page
    return f"<html><head>{scripts}</head><body>{other}</body></html>".encode()


class _Site:
    """Wikipedia, TheSportsDB and Commons know nothing; Junior Grassroots Hub knows `clubs`
    (slug -> (name on the page, crest URL or None))."""

    def __init__(self, clubs: dict[str, tuple[str, str | None]]) -> None:
        self.clubs = clubs
        self.asked: list[str] = []
        self.at: list[float] = []
        self.refuse_jgh = False

    def fetch(self, url: str) -> bytes:
        self.asked.append(url)
        if "juniorgrassrootshub.com" in url or "supabase.co" in url:
            self.at.append(team_logos.time.monotonic())
            if self.refuse_jgh:
                headers = Message()
                headers["Retry-After"] = "300"
                raise HTTPError(url, 429, "Too Many Requests", headers, None)
        if url == SITEMAP:
            locs = "".join(f"<url><loc>{SITE}/clubs/{s}</loc></url>" for s in self.clubs)
            return f'<?xml version="1.0"?><urlset>{locs}</urlset>'.encode()
        if url.startswith(f"{SITE}/clubs/"):
            slug = url.rsplit("/", 1)[-1]
            name, logo = self.clubs[slug]
            return _page(name, logo)
        if url.startswith(STORE):
            return PNG if url.endswith(".png") else JPEG
        if "thesportsdb.com" in url:
            return b'{"teams": null}'
        if "list=search" in url or "commons.wikimedia.org" in url:
            return b'{"query": {}}'
        if "wikipedia.org" in url:
            return b'{"query": {"pages": {"-1": {"missing": ""}}}}'
        raise AssertionError(f"unexpected request {url}")

    def jgh(self) -> list[str]:
        return [u for u in self.asked if "juniorgrassrootshub.com" in u or "supabase.co" in u]


def _site(monkeypatch: pytest.MonkeyPatch, clubs: dict[str, tuple[str, str | None]]) -> _Site:
    site = _Site(clubs)
    monkeypatch.setattr(team_logos, "_fetch", site.fetch)
    return site


CLUBS: dict[str, tuple[str, str | None]] = {
    "norton-lindsey": ("Norton Lindsey", f"{STORE}/clubs/nl1.jpg"),
    "kenilworth-sporting-juniors": ("Kenilworth Sporting Juniors", f"{STORE}/clubs/ks1.jpg"),
    "riverside-rovers": ("Riverside Rovers", f"{STORE}/clubs/rr1.png"),
    "solihull-moors-foundation-cb": ("Solihull Moors Foundation CB", f"{STORE}/clubs/smf.png"),
    "northgate-united": ("Northgate United", f"{STORE}/clubs/nu1.png"),
    "bolehall-swifts": ("Bolehall Swifts", None),
}


def test_a_grassroots_club_gets_its_crest_from_its_club_page(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    site = _site(monkeypatch, CLUBS)
    path = team_logos.cached_crest("Norton Lindsey", tmp_path)
    assert path is not None and path.read_bytes() == JPEG  # a JPEG crest is kept as it is
    assert site.jgh() == [SITEMAP, f"{SITE}/clubs/norton-lindsey", f"{STORE}/clubs/nl1.jpg"]
    assert not any("/api/" in u for u in site.jgh())  # robots.txt keeps /api/ out


@pytest.mark.parametrize(
    ("team", "slug"),
    [
        ("Kenilworth Sporting", "kenilworth-sporting-juniors"),  # "Juniors" names its form
        ("Riverside Rovers CB U11", "riverside-rovers"),  # side code and age group dropped
        ("riverside rovers fc", "riverside-rovers"),
        ("Norton Lindsay", "norton-lindsey"),  # one letter out, and no other club close
    ],
)
def test_a_team_name_finds_its_clubs_page(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, team: str, slug: str
) -> None:
    site = _site(monkeypatch, CLUBS)
    assert team_logos.cached_crest(team, tmp_path) is not None
    assert f"{SITE}/clubs/{slug}" in site.asked


@pytest.mark.parametrize(
    "team",
    [
        "Solihull Moors",  # the Foundation CB page is another club's
        "Northgate Rovers",  # Northgate United is not Northgate Rovers
        "Riverside",  # a word of a club's name is not the club
        "Norton",
    ],
)
def test_another_clubs_page_is_never_used(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, team: str
) -> None:
    site = _site(monkeypatch, CLUBS)
    assert team_logos.cached_crest(team, tmp_path) is None
    assert site.jgh() == [SITEMAP]


def test_a_near_spelling_is_not_guessed_between_two_clubs(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    clubs = {
        "elm-ravens": ("Elm Ravens", f"{STORE}/clubs/e1.png"),
        "elm-rovers": ("Elm Rovers", f"{STORE}/clubs/e2.png"),
    }
    site = _site(monkeypatch, clubs)
    assert team_logos.cached_crest("Elm Ravers", tmp_path) is None  # Ravens or Rovers?
    assert site.jgh() == [SITEMAP]


def test_a_club_page_without_a_crest_gives_none(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    site = _site(monkeypatch, CLUBS)
    assert team_logos.cached_crest("Bolehall Swifts", tmp_path) is None
    assert site.jgh() == [SITEMAP, f"{SITE}/clubs/bolehall-swifts"]
    assert not list(tmp_path.glob("*"))


@pytest.mark.parametrize(
    "logo",
    [
        f"{STORE}/logos/sponsor.png",  # the site's storage, but a sponsor's logo
        "https://evil.example/partner-images/clubs/x.png",
        f"{STORE}/clubs/../logos/x.png",
        "http://cfkzqicresplbojnqrej.supabase.co/storage/v1/object/public/partner-images/clubs/x.png",
    ],
)
def test_only_a_crest_on_the_sites_own_club_storage_is_used(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, logo: str
) -> None:
    site = _site(monkeypatch, {"elm-ravens": ("Elm Ravens", logo)})
    assert team_logos.cached_crest("Elm Ravens", tmp_path) is None
    assert logo not in site.asked


def test_a_page_naming_another_club_is_not_used(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    site = _site(monkeypatch, {"elm-ravens": ("Oak Wanderers", f"{STORE}/clubs/x.png")})
    assert team_logos.cached_crest("Elm Ravens", tmp_path) is None
    assert f"{STORE}/clubs/x.png" not in site.asked


def test_two_pages_for_one_club_with_different_crests_are_not_guessed(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    clubs = {
        "colton-juniors": ("Colton Juniors", f"{STORE}/clubs/c1.png"),
        "colton-juniors-fc": ("Colton Juniors FC", f"{STORE}/clubs/c2.png"),
    }
    site = _site(monkeypatch, clubs)
    assert team_logos.cached_crest("Colton Juniors", tmp_path) is None
    assert not any(u.startswith(f"{STORE}/clubs/") for u in site.asked)


def test_two_pages_for_one_club_where_only_one_has_a_crest_use_it(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    clubs = {
        "colton-juniors": ("Colton Juniors", None),
        "colton-juniors-fc": ("Colton Juniors FC", f"{STORE}/clubs/c2.png"),
    }
    _site(monkeypatch, clubs)
    path = team_logos.cached_crest("Colton Juniors", tmp_path)
    assert path is not None and path.read_bytes() == PNG


def test_the_clubs_list_is_read_once_for_many_clubs(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    site = _site(monkeypatch, CLUBS)
    team_logos.cached_crest("Norton Lindsey", tmp_path)
    team_logos.cached_crest("Riverside Rovers", tmp_path)
    team_logos.cached_crest("Somewhere Athletic", tmp_path)
    assert site.asked.count(SITEMAP) == 1


def test_the_clubs_list_is_read_again_the_next_day(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, clock: _Clock
) -> None:
    site = _site(monkeypatch, CLUBS)
    team_logos.cached_crest("Somewhere Athletic", tmp_path)
    clock.now += 86401 * 2  # past the day both the list and the miss are kept
    team_logos.cached_crest("Somewhere Athletic", tmp_path)
    assert site.asked.count(SITEMAP) == 2


def test_the_site_is_asked_at_most_once_every_two_seconds(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    site = _site(monkeypatch, CLUBS)
    team_logos.cached_crest("Norton Lindsey", tmp_path)
    team_logos.cached_crest("Kenilworth Sporting", tmp_path)
    gaps = [b - a for a, b in zip(site.at, site.at[1:], strict=False)]
    assert len(site.at) == 5 and min(gaps) >= 2.0


def test_wikipedias_own_club_crest_comes_first(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    site = _site(monkeypatch, CLUBS)
    wiki = (
        "https://upload.wikimedia.org/wikipedia/en/thumb/a/ab/Riverside_Rovers_FC.svg/250px-x.png"
    )
    real = site.fetch

    def fetch(url: str) -> bytes:
        if "en.wikipedia.org" in url and "Riverside+Rovers+F.C." in url:
            site.asked.append(url)
            page = {"pageimage": "Riverside_Rovers_FC.svg", "thumbnail": {"source": wiki}}
            return json.dumps({"query": {"pages": {"1": page}}}).encode()
        if url == wiki:
            site.asked.append(url)
            return PNG
        return real(url)

    monkeypatch.setattr(team_logos, "_fetch", fetch)
    assert team_logos.cached_crest("Riverside Rovers", tmp_path) is not None
    assert site.jgh() == []


def test_a_refusal_from_the_site_waits_on_its_own_and_is_not_a_miss(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, clock: _Clock
) -> None:
    site = _site(monkeypatch, CLUBS)
    site.refuse_jgh = True
    assert team_logos.cached_crest("Norton Lindsey", tmp_path) is None
    assert any("thesportsdb.com" in u for u in site.asked)  # the other sources still asked
    site.asked.clear()
    team_logos.cached_crest("Riverside Rovers", tmp_path)
    assert site.jgh() == []  # inside its Retry-After window
    clock.now += 301
    site.refuse_jgh = False
    assert team_logos.cached_crest("Norton Lindsey", tmp_path) is not None  # asked again


# --- hosted libraries: the shared crest service passes a JPEG crest on --------------


def test_the_shared_service_serves_a_jpeg_crest_as_a_jpeg(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    _site(monkeypatch, CLUBS)
    monkeypatch.delenv("FM_CREST_SERVICE", raising=False)
    monkeypatch.setenv("FM_CREST_DIR", str(tmp_path))
    from app.crest_service import create_app

    answer = TestClient(create_app()).get("/crest", params={"name": "Norton Lindsey"})
    assert answer.status_code == 200 and answer.content == JPEG
    assert answer.headers["content-type"] == "image/jpeg"


def test_a_hosted_library_keeps_a_jpeg_crest_from_the_service(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("FM_CREST_SERVICE", "http://crests:8200")
    monkeypatch.setattr(team_logos, "_shared_get", lambda url: (200, JPEG))
    path = team_logos.cached_crest("Norton Lindsey", tmp_path)
    assert path is not None and path.read_bytes() == JPEG
