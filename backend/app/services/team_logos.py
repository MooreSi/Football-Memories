"""Public club crests cached locally; unknown identities keep their initials."""

from __future__ import annotations

import hashlib
import json
import os
import re
import threading
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlsplit
from urllib.request import ProxyHandler, Request, build_opener, urlopen

from app.services.paths import safe_join

_OFFICIAL = {
    "aston villa": "https://images.gc.avfcservices.co.uk/fit-in/220x220/20e93d37-b109-4697-a19d-f33572bd45dc.png",
    "stoke city": "https://images.gc.stokecityfcservices.co.uk/fit-in/220x220/c83cafc0-6b1d-11f1-9739-ed59ef659b2b.png",
}
_HOSTS = {
    "images.gc.avfcservices.co.uk",
    "images.gc.stokecityfcservices.co.uk",
    "en.wikipedia.org",
    "commons.wikimedia.org",
    "upload.wikimedia.org",
    "thumb.wikimedia.org",
    "www.thesportsdb.com",
    "r2.thesportsdb.com",
    "www.juniorgrassrootshub.com",
    "cfkzqicresplbojnqrej.supabase.co",
}
_LOCK = threading.Lock()
_MISSES: dict[str, float] = {}
# Owner report 2026-11-13: a page of crests asked Wikipedia for dozens of clubs at once,
# Wikipedia answered 429, and those clubs were remembered as "no crest" for a day.
# A refusal now pauses every lookup for Retry-After (or a minute) and is not a miss.
_PAUSED_UNTIL: list[float] = [0.0]  # kept for the shared-service path; per site below
_SITE_PAUSED: dict[str, float] = {"wikimedia": 0.0, "sportsdb": 0.0, "jgh": 0.0}
# Owner report 2026-11-20: clubs whose last lookup could not ask every source (a site was
# waiting). The shared crest service answers 503 for these, not 404, so libraries ask again.
_UNSETTLED: set[str] = set()


def settled(name: str) -> bool:
    """False when the last lookup of this club could not ask every source."""
    return hashlib.sha256(club_name(name).encode()).hexdigest() not in _UNSETTLED


_LAST_REQUEST: list[float] = [0.0]
_GAP_S = 1.0
# TheSportsDB's free tier allows 30 requests a minute; ask it at most every 2.5 s.
_SPORTSDB_GAP_S = 2.5
_LAST_SPORTSDB: list[float] = [0.0]
# Junior Grassroots Hub (owner request 2026-11-23, consent obtained by the owner): one
# request every 2 s to the site and its crest storage.
_JGH_GAP_S = 2.0
_LAST_JGH: list[float] = [0.0]
_NO_CREST_S = 86400.0


class _Refused(Exception):
    """The crest source refused or failed for now; try again later."""

    def __init__(self, wait_s: float) -> None:
        super().__init__("crest source unavailable")
        self.wait_s = wait_s


# Owner request 2026-11-13: grassroots sides carry a short code or a colour after the
# club ("Solihull Moors CB", "Riverside Reds"); every side shares the club's crest.
_COLOURS = {
    "blue",
    "blues",
    "red",
    "reds",
    "white",
    "whites",
    "black",
    "blacks",
    "green",
    "greens",
    "yellow",
    "yellows",
    "amber",
    "ambers",
    "orange",
    "purple",
    "claret",
    "navy",
    "gold",
    "golds",
}


def _without_side(words: list[str]) -> list[str]:
    while len(words) > 1 and (
        re.fullmatch(r"[A-Z]{1,3}", words[-1]) or words[-1].casefold() in _COLOURS
    ):
        words = words[:-1]
    return words


def club_name(name: str) -> str:
    name = re.sub(r"\b(?:u\s*\d{1,2}|under[ -]?\d{1,2}|f\.?c\.?)\b", "", name, flags=re.I)
    return " ".join(_without_side(name.strip(" .").split())).casefold()


def logo_candidate(name: str) -> str | None:
    return _OFFICIAL.get(club_name(name))


def _paced_fetch(url: str) -> bytes:
    """One request at a time (callers hold _LOCK), spaced out as Wikipedia asks."""
    host = urlsplit(url).hostname
    jgh = host in _JGH_HOSTS
    wait = _LAST_REQUEST[0] + _GAP_S - time.monotonic()
    if host == "www.thesportsdb.com":
        wait = max(wait, _LAST_SPORTSDB[0] + _SPORTSDB_GAP_S - time.monotonic())
    if jgh:
        wait = max(wait, _LAST_JGH[0] + _JGH_GAP_S - time.monotonic())
    if wait > 0:
        time.sleep(wait)
    _LAST_REQUEST[0] = time.monotonic()
    if host == "www.thesportsdb.com":
        _LAST_SPORTSDB[0] = _LAST_REQUEST[0]
    if jgh:
        _LAST_JGH[0] = _LAST_REQUEST[0]
    try:
        return _fetch(url)
    except HTTPError as error:
        if error.code == 429 or error.code >= 500:
            try:
                retry = float(error.headers.get("Retry-After") or 60)
            except ValueError:
                retry = 60.0
            raise _Refused(min(max(retry, 5.0), 3600.0)) from None
        raise
    except (URLError, TimeoutError, OSError):
        raise _Refused(60.0) from None


def _fetch(url: str) -> bytes:
    parsed = urlsplit(url)
    if parsed.scheme != "https" or parsed.hostname not in _HOSTS:
        raise ValueError("Unapproved crest source")
    request = Request(  # noqa: S310 (validated HTTPS hosts)
        url, headers={"User-Agent": "FootballMemories/1.0 (local club crest cache)"}
    )
    with urlopen(request, timeout=8) as response:  # noqa: S310 (validated HTTPS hosts)
        if urlsplit(response.url).hostname not in _HOSTS:
            raise ValueError("Unapproved crest redirect")
        # The clubs sitemap (about 1.6 MB, 2026-11-23) is the one larger answer allowed.
        limit = _SITEMAP_LIMIT if url == _JGH_SITEMAP else 2_000_000
        data = response.read(limit + 1)
    if len(data) > limit:
        raise ValueError("Crest exceeds size limit")
    return bytes(data)


_CLUB_WORDS = ("crest", "logo", "badge", "emblem")


_PICTURE = re.compile(r"\.(?:png|svg)(?:$|[/?])", re.I)


def _club_page(page: dict[str, object]) -> bool:
    """The page says it is a football club ("Association football club in England")."""
    props = page.get("pageprops")
    text = str(props.get("wikibase-shortdesc", "")) if isinstance(props, dict) else ""
    return re.search(r"football club|association football", text, re.I) is not None


def _is_crest(image: str, url: str, strict: bool = False, club_page: bool = False) -> bool:
    """Club crests on Wikipedia are SVG logos (Liverpool_FC.svg) or named crest/logo/badge.
    Photos (stadiums, players) are JPEGs without those words and are never used.
    `strict` (a page found under the name as written, which may be a city or country)
    also needs the file to say it is a club's: FC, AFC, crest, logo, badge."""
    lowered = f"{image} {url}".lower()
    # Owner request 2026-11-15: a football club page's PNG or SVG is its crest, whatever
    # the file is called ("Bolehall_Swifts.png"); a photo (JPEG) never is.
    if club_page and _PICTURE.search(image or url):
        return True
    named = any(w in lowered for w in _CLUB_WORDS)
    if strict:
        return named or re.search(r"(?:^|[^a-z])a?fc(?:[^a-z]|$)", image.lower()) is not None
    return ".svg" in lowered or named


def _written(name: str) -> str:
    """The name as the page would title it: "AFC Bournemouth" keeps its capitals; a name
    typed all in lower case is title-cased."""
    name = re.sub(r"\b(?:u\s*\d{1,2}s?|under[ -]?\d{1,2}|f\.?c\.?)(?=\s|$)", "", name, flags=re.I)
    words = _without_side(name.strip(" .").split())
    # Owner request 2026-11-15: "Bolehall swifts" is the page "Bolehall Swifts F.C.";
    # a word typed in lower case is capitalised, a word with capitals ("AFC") is kept.
    return " ".join(w[0].upper() + w[1:] if w.islower() and w not in _SMALL else w for w in words)


_SMALL = {"and", "of", "the", "de", "la"}


def _wikipedia_crest(name: str) -> str | None:
    """Owner decision 2026-11-11: every team is a football club, so a one-word name
    such as "Liverpool" is looked up as "Liverpool F.C.", then "A.F.C.", then as written."""
    title = _written(name)
    for candidate in (f"{title} F.C.", f"{title} A.F.C.", title):
        query = urlencode(
            {
                "action": "query",
                "format": "json",
                "prop": "pageimages|pageprops",
                "piprop": "thumbnail|name",
                "pithumbsize": 250,
                "pilicense": "any",
                "redirects": 1,
                "titles": candidate,
            }
        )
        data = json.loads(_paced_fetch(f"https://en.wikipedia.org/w/api.php?{query}"))
        strict = candidate == title
        for page in data.get("query", {}).get("pages", {}).values():
            source = page.get("thumbnail", {}).get("source")
            image = page.get("pageimage", "")
            if (
                "missing" not in page
                and source
                and _is_crest(image, source, strict, _club_page(page))
            ):
                return str(source)
    return None


def _words(text: str) -> set[str]:
    return set(re.findall(r"[a-z0-9]+", text.casefold().replace("_", " ")))


_GENERIC = {
    "f",
    "c",
    "a",
    "fc",
    "afc",
    "football",
    "club",
    "crest",
    "logo",
    "badge",
    "emblem",
    "svg",
    "png",
    "jpg",
    "file",
}


def _same_club(name: str, text: str) -> bool:
    """`text` names exactly this club: "Riverside Juniors F.C. (Warwickshire)" is
    Riverside Juniors; "Northgate United F.C." is not "Northgate Rovers". F.C., crest
    words, years and a place in brackets are ignored."""
    club = _words(club_name(name)) - _GENERIC
    found = {w for w in _words(re.sub(r"\([^)]*\)", " ", text)) - _GENERIC if not w.isdigit()}
    # Owner request 2026-11-15: "Blaby & Whetstone" is "Blaby & Whetstone Athletic F.C.";
    # words that name a club's form, not another club, may be added.
    return bool(club) and club <= found and found - club <= _FORM_WORDS


_FORM_WORDS = {"athletic", "juniors", "junior", "youth", "jfc", "yfc"}


def _wikipedia_search(name: str) -> str | None:
    """Owner request 2026-11-13: a club whose page has another title (a county in
    brackets, "Juniors F.C."). Only results naming this club are read, and their image
    must still say it is a club's crest."""
    query = urlencode(
        {
            "action": "query",
            "format": "json",
            "list": "search",
            "srlimit": 5,
            "srsearch": f"{_written(name)} football club",
        }
    )
    hits = json.loads(_paced_fetch(f"https://en.wikipedia.org/w/api.php?{query}"))
    titles = [
        str(h.get("title")) for h in hits.get("query", {}).get("search", []) if isinstance(h, dict)
    ]
    for title in [t for t in titles if _same_club(name, t)][:2]:
        query = urlencode(
            {
                "action": "query",
                "format": "json",
                "prop": "pageimages|pageprops",
                "piprop": "thumbnail|name",
                "pithumbsize": 250,
                "pilicense": "any",
                "titles": title,
            }
        )
        data = json.loads(_paced_fetch(f"https://en.wikipedia.org/w/api.php?{query}"))
        for page in data.get("query", {}).get("pages", {}).values():
            source = page.get("thumbnail", {}).get("source")
            if (
                "missing" not in page
                and source
                and _is_crest(page.get("pageimage", ""), source, True, _club_page(page))
            ):
                return str(source)
    return None


def _commons_crest(name: str) -> str | None:
    """A crest file on Wikimedia Commons named for this club and as a crest, logo or badge."""
    query = urlencode(
        {
            "action": "query",
            "format": "json",
            "generator": "search",
            "gsrnamespace": 6,
            "gsrlimit": 8,
            "gsrsearch": f"{_written(name)} crest OR logo OR badge",
            "prop": "imageinfo",
            "iiprop": "url",
            "iiurlwidth": 250,
        }
    )
    data = json.loads(_paced_fetch(f"https://commons.wikimedia.org/w/api.php?{query}"))
    for page in data.get("query", {}).get("pages", {}).values():
        title = str(page.get("title", ""))
        info = (page.get("imageinfo") or [{}])[0]
        thumb = str(info.get("thumburl") or "")
        if (
            any(w in title.casefold() for w in _CLUB_WORDS)
            and _same_club(name, title.removeprefix("File:"))
            and thumb.endswith(".png")
        ):
            return thumb
    return None


def _sportsdb_crest(name: str) -> str | None:
    """Owner request 2026-11-15: TheSportsDB's free public team search (key "123", as its
    documentation gives) has non-league clubs Wikipedia has no crest for. Only a football
    team named exactly as this club is used, and only a badge on TheSportsDB's own host."""
    query = urlencode({"t": _written(club_name(name))})
    url = f"https://www.thesportsdb.com/api/v1/json/123/searchteams.php?{query}"
    data = json.loads(_paced_fetch(url))
    for team in data.get("teams") or []:
        if not isinstance(team, dict) or team.get("strSport") != "Soccer":
            continue
        badge = str(team.get("strBadge") or "")
        names = [str(team.get(k) or "") for k in ("strTeam", "strTeamAlternate")]
        if (
            urlsplit(badge).scheme == "https"
            and urlsplit(badge).hostname == "r2.thesportsdb.com"
            and badge.endswith(".png")
            and any(n and _same_club(name, n) for n in names)
        ):
            return f"{badge}/small"
    return None


# Owner request 2026-11-23 (decision 008; the owner obtained the site's consent): Junior
# Grassroots Hub lists UK grassroots clubs, most with their crest. Its clubs sitemap names
# every club page (/clubs/<slug>); a page names its club in JSON-LD (SportsClub) with the
# crest as "logo" on the site's own storage. Read: the sitemap once a day, the matching
# club page(s), the crest. Never /api/ (robots.txt).
_JGH = "https://www.juniorgrassrootshub.com"
_JGH_SITEMAP = f"{_JGH}/sitemaps/sitemap/clubs.xml"
_JGH_HOSTS = {"www.juniorgrassrootshub.com", "cfkzqicresplbojnqrej.supabase.co"}
_SITEMAP_LIMIT = 10_000_000
_JGH_INDEX: dict[str, object] = {"slugs": None, "until": 0.0}
_JGH_DAY_S = 86400.0
_JGH_CLUB = re.compile(
    r"<loc>\s*https://www\.juniorgrassrootshub\.com/clubs/([a-z0-9]+(?:-[a-z0-9]+)*)\s*</loc>"
)
_JGH_CREST = re.compile(
    r"https://cfkzqicresplbojnqrej\.supabase\.co/storage/v1/object/public/partner-images/clubs/"
    r"[A-Za-z0-9_-]+\.(?:png|jpe?g|webp)"
)
_JSON_LD = re.compile(r'<script[^>]*type="application/ld\+json"[^>]*>(.*?)</script>', re.S)
# Words a club's own page or slug may add or drop: "fc", "jfc", "and", a page's "-2".
_JGH_QUIET = _GENERIC | _FORM_WORDS | {"and", "the", "jnr", "jnrs", "fc", "cfc", "yfc", "jfc"}


def _club_words(text: str) -> list[str]:
    """Words that name the club: "St John's Juniors F.C." -> ["st", "johns"]."""
    text = re.sub(r"['\u2019]", "", text.casefold()).replace("&", " and ")
    return [w for w in re.findall(r"[a-z0-9]+", text) if w not in _JGH_QUIET and not w.isdigit()]


def _one_letter_out(a: str, b: str) -> bool:
    """One letter changed, added or dropped ("lindsay"/"lindsey"); long words only."""
    if a == b or min(len(a), len(b)) < 5 or abs(len(a) - len(b)) > 1:
        return False
    if len(a) == len(b):
        return sum(x != y for x, y in zip(a, b, strict=True)) == 1
    short, long_ = sorted((a, b), key=len)
    return any(long_[:i] + long_[i + 1 :] == short for i in range(len(long_)))


def _jgh_slugs() -> list[str]:
    slugs = _JGH_INDEX["slugs"]
    if isinstance(slugs, list) and float(str(_JGH_INDEX["until"])) > time.monotonic():
        return slugs
    text = _paced_fetch(_JGH_SITEMAP).decode("utf-8", "replace")
    found = list(dict.fromkeys(_JGH_CLUB.findall(text)))
    _JGH_INDEX.update(slugs=found, until=time.monotonic() + _JGH_DAY_S)
    return found


def _jgh_matches(name: str) -> list[str]:
    """Club pages naming exactly this club; a word one letter out only when no page names
    it exactly and just one page is that close."""
    words = _club_words(club_name(name))
    if not words:
        return []
    want = sorted(words)
    exact: list[str] = []
    near: list[str] = []
    for slug in _jgh_slugs():
        have = sorted(_club_words(slug.replace("-", " ")))
        if have == want:
            exact.append(slug)
        else:
            missing = [w for w in want if w not in have]
            extra = [h for h in have if h not in want]
            if len(missing) == len(extra) == 1 and _one_letter_out(missing[0], extra[0]):
                near.append(slug)
    return exact or (near if len(near) == 1 else [])


def _jgh_page_crest(name: str, slug: str) -> str | None:
    html = _paced_fetch(f"{_JGH}/clubs/{slug}").decode("utf-8", "replace")
    for block in _JSON_LD.findall(html):
        try:
            data = json.loads(block)
        except ValueError:
            continue
        if not isinstance(data, dict) or data.get("@type") != "SportsClub":
            continue
        logo = str(data.get("logo") or "")
        page_name = sorted(_club_words(str(data.get("name") or "")))
        named = page_name == sorted(_club_words(slug.replace("-", " ")))
        if named and _JGH_CREST.fullmatch(logo):
            return logo
    return None


def _jgh_crest(name: str) -> str | None:
    """Two pages for the same club (a duplicate, "colton-juniors-fc") are both read; one
    crest between them is used, two different ones are not guessed between."""
    crests = {c for slug in _jgh_matches(name)[:3] if (c := _jgh_page_crest(name, slug))}
    return crests.pop() if len(crests) == 1 else None


# Owner decision 2026-11-19: a hosted library has no internet. It asks the shared crest
# service (FM_CREST_SERVICE, on its own private network) and keeps the answer locally.
_SHARED_MISS_S = 3600.0


def _shared_get(url: str) -> tuple[int, bytes]:
    """One GET to the crest service, never through a proxy."""
    request = Request(url, headers={"User-Agent": "FootballMemories/1.0"})  # noqa: S310
    try:
        with build_opener(ProxyHandler({})).open(request, timeout=30) as response:
            return int(response.status), bytes(response.read(CREST_LIMIT + 1))
    except HTTPError as error:
        return int(error.code), b""


def _shared_crest(base: str, name: str, key: str, target: Path, directory: Path) -> Path | None:
    try:
        status, data = _shared_get(f"{base.rstrip('/')}/crest?{urlencode({'name': name})}")
    except (URLError, TimeoutError, OSError):
        return None  # the service is restarting or busy: ask again next time
    if status == 404:
        _MISSES[key] = time.monotonic() + _SHARED_MISS_S
        return None
    if status != 200 or len(data) > CREST_LIMIT or crest_type(data) is None:
        return None
    directory.mkdir(parents=True, exist_ok=True)
    with target.open("xb") as stream:
        stream.write(data)
    return target


def cached_crest(name: str, directory: Path) -> Path | None:
    identity = club_name(name)
    key = hashlib.sha256(identity.encode()).hexdigest()
    target = safe_join(directory, f"{key}.png")
    with _LOCK:
        if target.exists():
            return target
        now = time.monotonic()
        if _MISSES.get(key, 0) > now:
            return None
        if _PAUSED_UNTIL[0] > now:
            _UNSETTLED.add(key)
            return None
        _SITE_PAUSED["wikimedia"] = max(_SITE_PAUSED["wikimedia"], _PAUSED_UNTIL[0])
        shared = os.environ.get("FM_CREST_SERVICE")
        if shared:
            return _shared_crest(shared, name, key, target, directory)
        # Owner report 2026-11-20: a refusal from Wikipedia paused every source, so clubs
        # TheSportsDB knows kept their initials. Each site now waits on its own; a club
        # that was not asked everywhere is not remembered as having no crest.
        skipped = False
        try:
            url = logo_candidate(name)
            for source, site in (
                (_wikipedia_crest, "wikimedia"),
                (_jgh_crest, "jgh"),
                (_wikipedia_search, "wikimedia"),
                (_sportsdb_crest, "sportsdb"),
                (_commons_crest, "wikimedia"),
            ):
                if url:
                    break
                if _SITE_PAUSED.get(site, 0.0) > time.monotonic():
                    skipped = True
                    continue
                try:
                    url = source(name)
                except _Refused as refused:
                    _SITE_PAUSED[site] = time.monotonic() + refused.wait_s
                    skipped = True
            if not url:
                raise ValueError("No club crest found")
            image = _paced_fetch(url)
            # Junior Grassroots Hub crests are often JPEG; any crest image is kept as it is
            # (the file keeps its .png name, as an uploaded JPEG does; it is served by type).
            if crest_type(image) is None:
                raise ValueError("Expected a crest image")
            directory.mkdir(parents=True, exist_ok=True)
            with target.open("xb") as stream:
                stream.write(image)
            _UNSETTLED.discard(key)
            return target
        except _Refused as refused:
            host = urlsplit(str(url)).hostname
            site = (
                "sportsdb"
                if host == "r2.thesportsdb.com"
                else "jgh"
                if host in _JGH_HOSTS
                else "wikimedia"
            )
            _SITE_PAUSED[site] = time.monotonic() + refused.wait_s
            _UNSETTLED.add(key)
            return None
        except Exception:
            if skipped:
                _UNSETTLED.add(key)
            else:
                _MISSES[key] = time.monotonic() + _NO_CREST_S
                _UNSETTLED.discard(key)
            return None


CREST_LIMIT = 2_000_000


def crest_type(data: bytes) -> str | None:
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return None


def save_crest(name: str, data: bytes, directory: Path) -> Path:
    """Owner request 2026-11-13: the owner's own crest for a club (grassroots clubs are
    rarely on Wikipedia). It replaces any cached crest for that club."""
    if len(data) > CREST_LIMIT or crest_type(data) is None:
        raise ValueError("Choose a PNG, JPEG or WebP image under 2 MB.")
    identity = club_name(name)
    if not identity:
        raise ValueError("Enter the club's name.")
    key = hashlib.sha256(identity.encode()).hexdigest()
    target = safe_join(directory, f"{key}.png")
    directory.mkdir(parents=True, exist_ok=True)
    temporary = target.with_suffix(".upload")
    with _LOCK:
        temporary.write_bytes(data)
        temporary.replace(target)
        _MISSES.pop(key, None)
    return target
