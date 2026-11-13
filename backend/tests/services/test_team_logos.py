import pytest

from app.services import team_logos
from app.services.team_logos import club_name, logo_candidate


class _Clock:
    def __init__(self) -> None:
        self.now = 1000.0

    def monotonic(self) -> float:
        return self.now

    def sleep(self, seconds: float) -> None:
        self.now += seconds


@pytest.fixture(autouse=True)
def clock(monkeypatch):
    """Lookups remember misses in module state; every test starts clean on a fake clock."""
    fake = _Clock()
    monkeypatch.setattr(team_logos, "_MISSES", {})
    monkeypatch.setattr(team_logos, "_PAUSED_UNTIL", [0.0])
    monkeypatch.setattr(team_logos.time, "monotonic", fake.monotonic)
    monkeypatch.setattr(team_logos.time, "sleep", fake.sleep)
    return fake


def test_age_group_and_club_suffixes_share_identity() -> None:
    assert club_name("Aston Villa U10") == "aston villa"
    assert club_name("Stoke City FC U12") == "stoke city"


def test_known_official_crests_and_unknown_fallback() -> None:
    assert logo_candidate("Aston Villa U10") is not None
    assert logo_candidate("Stoke City") is not None
    assert logo_candidate("Riverside U12") is None


def test_real_crest_cache_reuses_bytes_without_network(tmp_path, monkeypatch) -> None:
    from app.services.team_logos import cached_crest

    calls = []

    def fetch(url):
        calls.append(url)
        return b"\x89PNG\r\n\x1a\nsynthetic-image"

    monkeypatch.setattr("app.services.team_logos._fetch", fetch)
    first = cached_crest("Aston Villa U10", tmp_path)
    second = cached_crest("Aston Villa U12", tmp_path)
    assert first == second
    assert first.read_bytes() == b"\x89PNG\r\n\x1a\nsynthetic-image"
    assert len(calls) == 1


def _wiki(image: str | None, missing: bool = False) -> bytes:
    import json

    page = (
        {"missing": ""}
        if missing
        else (
            {
                "pageimage": image.split("/thumb/")[-1].split("/")[2]
                if "/thumb/" in image
                else image.rsplit("/", 1)[-1],
                "thumbnail": {"source": image},
            }
            if image
            else {}
        )
    )
    return json.dumps({"query": {"pages": {"1": page}}}).encode()


def test_one_word_club_is_looked_up_as_a_football_club(tmp_path, monkeypatch) -> None:
    """Owner decision 2026-11-11: every team is a football club, so "Liverpool" means
    Liverpool F.C. Its Wikipedia crest is named Liverpool_FC.svg (no "crest" word)."""
    from urllib.parse import parse_qs, urlsplit

    from app.services.team_logos import cached_crest

    asked = []
    crest = "https://upload.wikimedia.org/wikipedia/en/thumb/0/0c/Liverpool_FC.svg/250px-Liverpool_FC.svg.png"

    def fetch(url):
        if "api.php" in url:
            asked.append(parse_qs(urlsplit(url).query)["titles"][0])
            return _wiki(crest)
        assert url == crest
        return b"\x89PNG\r\n\x1a\nliverpool"

    monkeypatch.setattr("app.services.team_logos._fetch", fetch)
    path = cached_crest("Liverpool", tmp_path)
    assert path is not None and path.read_bytes().endswith(b"liverpool")
    assert asked == ["Liverpool F.C."]


def test_other_club_name_forms_are_tried_in_turn(tmp_path, monkeypatch) -> None:
    from urllib.parse import parse_qs, urlsplit

    from app.services.team_logos import cached_crest

    asked = []
    crest = "https://upload.wikimedia.org/wikipedia/en/a/ab/Rovers_AFC_badge.png"

    def fetch(url):
        if "api.php" in url:
            title = parse_qs(urlsplit(url).query)["titles"][0]
            asked.append(title)
            return _wiki(crest) if title == "Rovers A.F.C." else _wiki(None, missing=True)
        return b"\x89PNG\r\n\x1a\nrovers"

    monkeypatch.setattr("app.services.team_logos._fetch", fetch)
    assert cached_crest("Rovers", tmp_path) is not None
    assert asked == ["Rovers F.C.", "Rovers A.F.C."]


def test_a_photo_is_never_taken_as_a_crest(tmp_path, monkeypatch) -> None:
    from unittest.mock import Mock

    from app.services.team_logos import cached_crest

    photo = "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Stadium_2019.jpg/250px-Stadium_2019.jpg"
    fetch = Mock(return_value=_wiki(photo))
    monkeypatch.setattr("app.services.team_logos._fetch", fetch)
    assert cached_crest("Nowhere Town", tmp_path) is None
    assert all(
        "api.php" in c.args[0] for c in fetch.call_args_list
    )  # the photo is never downloaded


def _rate_limited(url, retry_after="30"):
    from email.message import Message
    from urllib.error import HTTPError

    headers = Message()
    if retry_after:
        headers["Retry-After"] = retry_after
    return HTTPError(url, 429, "Too Many Requests", headers, None)


def test_a_rate_limited_lookup_is_retried_soon(tmp_path, monkeypatch, clock) -> None:
    """Owner report 2026-11-13: Chelsea and Manchester City showed initials. Wikipedia
    had answered 429 and the miss was kept for 24 hours as if no crest existed."""
    from app.services.team_logos import cached_crest

    crest = "https://upload.wikimedia.org/wikipedia/en/thumb/c/cc/Chelsea_FC.svg/250px-Chelsea_FC.svg.png"
    calls = []

    def fetch(url):
        calls.append(url)
        if len(calls) == 1:
            raise _rate_limited(url)
        return _wiki(crest) if "api.php" in url else b"\x89PNG\r\n\x1a\nchelsea"

    monkeypatch.setattr("app.services.team_logos._fetch", fetch)
    assert cached_crest("Chelsea", tmp_path) is None
    # Inside Wikipedia's Retry-After window nothing is asked, for this club or any other.
    assert cached_crest("Chelsea", tmp_path) is None
    assert cached_crest("Fulham", tmp_path) is None
    assert len(calls) == 1
    clock.now += 31
    path = cached_crest("Chelsea", tmp_path)
    assert path is not None and path.read_bytes().endswith(b"chelsea")


def test_a_club_with_no_crest_is_not_asked_again_for_a_day(tmp_path, monkeypatch, clock) -> None:
    from unittest.mock import Mock

    from app.services.team_logos import cached_crest

    fetch = Mock(return_value=_wiki(None, missing=True))
    monkeypatch.setattr("app.services.team_logos._fetch", fetch)
    assert cached_crest("CFT Slovakia", tmp_path) is None
    asked = fetch.call_count
    assert asked > 0
    clock.now += 3600
    assert cached_crest("CFT Slovakia", tmp_path) is None
    assert fetch.call_count == asked
    clock.now += 86400
    cached_crest("CFT Slovakia", tmp_path)
    assert fetch.call_count > asked


def test_the_club_name_keeps_its_capitals(tmp_path, monkeypatch) -> None:
    """ "AFC Bournemouth" is the page title; title-casing it gave "Afc Bournemouth"."""
    from urllib.parse import parse_qs, urlsplit

    from app.services.team_logos import cached_crest

    asked = []
    crest = "https://upload.wikimedia.org/wikipedia/en/thumb/e/e5/AFC_Bournemouth_%282013%29.svg/250px-x.png"

    def fetch(url):
        if "api.php" in url:
            title = parse_qs(urlsplit(url).query)["titles"][0]
            asked.append(title)
            return _wiki(crest) if title == "AFC Bournemouth" else _wiki(None, missing=True)
        return b"\x89PNG\r\n\x1a\ncherries"

    monkeypatch.setattr("app.services.team_logos._fetch", fetch)
    assert cached_crest("AFC Bournemouth", tmp_path) is not None
    assert asked == ["AFC Bournemouth F.C.", "AFC Bournemouth A.F.C.", "AFC Bournemouth"]


def test_a_page_found_as_written_must_show_a_club_crest(tmp_path, monkeypatch) -> None:
    """ "Tokyo" as written is the city, whose page image is a flag SVG."""
    from app.services.team_logos import cached_crest

    flag = "https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Flag_of_Tokyo_Metropolis.svg/250px-x.png"
    crest = "https://upload.wikimedia.org/wikipedia/en/thumb/0/0b/FC_Barcelona_%28crest%29.svg/250px-x.png"
    downloads = []

    def fetch(url):
        from urllib.parse import parse_qs, urlsplit

        if "api.php" in url:
            title = parse_qs(urlsplit(url).query)["titles"][0]
            if title in {"Tokyo", "Barcelona"}:
                return _wiki(flag if title == "Tokyo" else crest)
            return _wiki(None, missing=True)
        downloads.append(url)
        return b"\x89PNG\r\n\x1a\nimage"

    monkeypatch.setattr("app.services.team_logos._fetch", fetch)
    assert cached_crest("Tokyo", tmp_path) is None
    assert downloads == []
    assert cached_crest("Barcelona", tmp_path) is not None  # negative control


# Owner request 2026-11-13: grassroots (mostly Veo) teams carry a side code or colour
# ("Solihull Moors CB", "Kidderminster CG"); the club's crest is the same for all sides.
@pytest.mark.parametrize(
    ("team", "club"),
    [
        ("Solihull Moors CB", "solihull moors"),
        ("Kidderminster CG", "kidderminster"),
        ("Riverside Blue", "riverside"),
        ("Riverside U11 Reds", "riverside"),
        ("AFC Wimbledon", "afc wimbledon"),
        ("PSV", "psv"),
        ("Aston Villa", "aston villa"),
    ],
)
def test_a_side_code_or_colour_shares_the_clubs_crest(team: str, club: str) -> None:
    assert club_name(team) == club


def test_a_side_code_is_dropped_from_the_wikipedia_lookup(tmp_path, monkeypatch) -> None:
    from app.services.team_logos import cached_crest

    asked: list[str] = []

    def fetch(url):
        asked.append(url)
        if "wikipedia.org/w/api.php" in url:
            return b'{"query":{"pages":{"1":{"pageimage":"Solihull_Moors_FC_logo.svg","thumbnail":{"source":"https://upload.wikimedia.org/x.png"}}}}}'
        return b"\x89PNG\r\n\x1a\nsynthetic"

    monkeypatch.setattr("app.services.team_logos._fetch", fetch)
    assert cached_crest("Solihull Moors CB", tmp_path) is not None
    assert "Solihull+Moors+F.C." in asked[0] and "CB" not in asked[0]


def test_an_uploaded_crest_replaces_the_cached_one_and_is_served_first(
    tmp_path, monkeypatch
) -> None:
    from app.services.team_logos import cached_crest, save_crest

    monkeypatch.setattr("app.services.team_logos._fetch", lambda url: pytest.fail("no lookup"))
    png = b"\x89PNG\r\n\x1a\nowner-crest"
    path = save_crest("Riverside Juniors CB", png, tmp_path)
    assert path.read_bytes() == png
    assert cached_crest("Riverside Juniors", tmp_path) == path
    jpeg = b"\xff\xd8\xff\xe0owner-jpeg"
    assert save_crest("Riverside Juniors", jpeg, tmp_path).read_bytes() == jpeg
    for bad in (b"GIF89a", b"<svg", b"\x89PNG\r\n\x1a\n" + b"x" * 2_000_001):
        with pytest.raises(ValueError):
            save_crest("Riverside Juniors", bad, tmp_path)
    assert cached_crest("Riverside Juniors", tmp_path).read_bytes() == jpeg  # type: ignore[union-attr]


# Owner request 2026-11-13: "do a better job of searching for grassroots crests".
# After the exact page titles, Wikipedia's own search and Wikimedia Commons crest files
# are tried (both allow automated reads; Google's image search does not).


def _search(*titles: str) -> bytes:
    import json

    return json.dumps({"query": {"search": [{"title": t} for t in titles]}}).encode()


def _commons(*files: tuple[str, str]) -> bytes:
    import json

    pages = {str(i): {"title": t, "imageinfo": [{"thumburl": u}]} for i, (t, u) in enumerate(files)}
    return json.dumps({"query": {"pages": pages}}).encode()


def _lookups(monkeypatch, search: bytes, pages: dict[str, str], commons: bytes):  # noqa: ANN202
    from urllib.parse import parse_qs, urlsplit

    asked: list[str] = []
    downloads: list[str] = []

    def fetch(url):
        query = parse_qs(urlsplit(url).query)
        if "commons.wikimedia.org" in url:
            asked.append("commons")
            return commons
        if "api.php" in url and query.get("list") == ["search"]:
            asked.append("search")
            return search
        if "api.php" in url:
            title = query["titles"][0]
            asked.append(title)
            return _wiki(pages[title]) if title in pages else _wiki(None, missing=True)
        downloads.append(url)
        return b"\x89PNG\r\n\x1a\nfound"

    monkeypatch.setattr("app.services.team_logos._fetch", fetch)
    return asked, downloads


def test_wikipedia_search_finds_a_club_whose_page_has_another_title(tmp_path, monkeypatch) -> None:
    from app.services.team_logos import cached_crest

    crest = "https://upload.wikimedia.org/wikipedia/en/thumb/a/ab/Riverside_Juniors_FC_logo.svg/250px-x.png"
    asked, downloads = _lookups(
        monkeypatch,
        _search("Riverside Juniors F.C. (Warwickshire)", "Riverside (river)"),
        {"Riverside Juniors F.C. (Warwickshire)": crest},
        _commons(),
    )
    assert cached_crest("Riverside Juniors CB", tmp_path) is not None
    assert downloads == [crest]
    assert asked[-2:] == [
        "search",
        "Riverside Juniors F.C. (Warwickshire)",
    ]  # the river page is never read


def test_a_search_hit_for_another_club_is_not_used(tmp_path, monkeypatch) -> None:
    """ "Northgate Rovers" must not take Northgate United's crest."""
    from app.services.team_logos import cached_crest

    asked, downloads = _lookups(
        monkeypatch,
        _search("Northgate United F.C."),
        {"Northgate United F.C.": "https://upload.wikimedia.org/x/Northgate_United_FC_crest.png"},
        _commons(),
    )
    assert cached_crest("Northgate Rovers", tmp_path) is None
    assert downloads == [] and "Northgate United F.C." not in asked


def test_a_commons_crest_file_is_used_when_wikipedia_has_none(tmp_path, monkeypatch) -> None:
    from app.services.team_logos import cached_crest

    crest = "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Riverside_Juniors_FC_crest.svg/250px-x.png"
    _, downloads = _lookups(
        monkeypatch,
        _search(),
        {},
        _commons(
            ("File:Riverside Juniors church.jpg", "https://upload.wikimedia.org/c/church.jpg"),
            ("File:Northgate FC crest.svg", "https://upload.wikimedia.org/c/northgate.png"),
            ("File:Riverside Juniors FC crest.svg", crest),
        ),
    )
    assert cached_crest("Riverside Juniors", tmp_path) is not None
    assert downloads == [crest]  # not the church photo, not another club's crest


def test_a_commons_file_without_crest_words_is_not_used(tmp_path, monkeypatch) -> None:
    from app.services.team_logos import cached_crest

    _, downloads = _lookups(
        monkeypatch,
        _search(),
        {},
        _commons(
            ("File:Riverside Juniors playing field.svg", "https://upload.wikimedia.org/c/field.png")
        ),
    )
    assert cached_crest("Riverside Juniors", tmp_path) is None
    assert downloads == []
