"""Public club crests cached locally; unknown identities keep their initials."""

from __future__ import annotations

import hashlib
import json
import re
import threading
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlsplit
from urllib.request import Request, urlopen

from app.services.paths import safe_join

_OFFICIAL = {
    "aston villa": "https://images.gc.avfcservices.co.uk/fit-in/220x220/20e93d37-b109-4697-a19d-f33572bd45dc.png",
    "stoke city": "https://images.gc.stokecityfcservices.co.uk/fit-in/220x220/c83cafc0-6b1d-11f1-9739-ed59ef659b2b.png",
}
_HOSTS = {
    "images.gc.avfcservices.co.uk",
    "images.gc.stokecityfcservices.co.uk",
    "en.wikipedia.org",
    "upload.wikimedia.org",
    "thumb.wikimedia.org",
}
_LOCK = threading.Lock()
_MISSES: dict[str, float] = {}
# Owner report 2026-11-13: a page of crests asked Wikipedia for dozens of clubs at once,
# Wikipedia answered 429, and those clubs were remembered as "no crest" for a day.
# A refusal now pauses every lookup for Retry-After (or a minute) and is not a miss.
_PAUSED_UNTIL: list[float] = [0.0]
_LAST_REQUEST: list[float] = [0.0]
_GAP_S = 1.0
_NO_CREST_S = 86400.0


class _Refused(Exception):
    """The crest source refused or failed for now; try again later."""

    def __init__(self, wait_s: float) -> None:
        super().__init__("crest source unavailable")
        self.wait_s = wait_s


def club_name(name: str) -> str:
    name = re.sub(r"\b(?:u\s*\d{1,2}|under[ -]?\d{1,2}|f\.?c\.?)\b", "", name, flags=re.I)
    return " ".join(name.casefold().strip(" .").split())


def logo_candidate(name: str) -> str | None:
    return _OFFICIAL.get(club_name(name))


def _paced_fetch(url: str) -> bytes:
    """One request at a time (callers hold _LOCK), spaced out as Wikipedia asks."""
    wait = _LAST_REQUEST[0] + _GAP_S - time.monotonic()
    if wait > 0:
        time.sleep(wait)
    _LAST_REQUEST[0] = time.monotonic()
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
        data = response.read(2_000_001)
    if len(data) > 2_000_000:
        raise ValueError("Crest exceeds size limit")
    return bytes(data)


_CLUB_WORDS = ("crest", "logo", "badge", "emblem")


def _is_crest(image: str, url: str, strict: bool = False) -> bool:
    """Club crests on Wikipedia are SVG logos (Liverpool_FC.svg) or named crest/logo/badge.
    Photos (stadiums, players) are JPEGs without those words and are never used.
    `strict` (a page found under the name as written, which may be a city or country)
    also needs the file to say it is a club's: FC, AFC, crest, logo, badge."""
    lowered = f"{image} {url}".lower()
    named = any(w in lowered for w in _CLUB_WORDS)
    if strict:
        return named or re.search(r"(?:^|[^a-z])a?fc(?:[^a-z]|$)", image.lower()) is not None
    return ".svg" in lowered or named


def _written(name: str) -> str:
    """The name as the page would title it: "AFC Bournemouth" keeps its capitals; a name
    typed all in lower case is title-cased."""
    name = re.sub(r"\b(?:u\s*\d{1,2}s?|under[ -]?\d{1,2}|f\.?c\.?)(?=\s|$)", "", name, flags=re.I)
    name = " ".join(name.strip(" .").split())
    return name if name != name.lower() else name.title()


def _wikipedia_crest(name: str) -> str | None:
    """Owner decision 2026-11-11: every team is a football club, so a one-word name
    such as "Liverpool" is looked up as "Liverpool F.C.", then "A.F.C.", then as written."""
    title = _written(name)
    for candidate in (f"{title} F.C.", f"{title} A.F.C.", title):
        query = urlencode(
            {
                "action": "query",
                "format": "json",
                "prop": "pageimages",
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
            if "missing" not in page and source and _is_crest(image, source, strict):
                return str(source)
    return None


def cached_crest(name: str, directory: Path) -> Path | None:
    identity = club_name(name)
    key = hashlib.sha256(identity.encode()).hexdigest()
    target = safe_join(directory, f"{key}.png")
    with _LOCK:
        if target.exists():
            return target
        now = time.monotonic()
        if _MISSES.get(key, 0) > now or _PAUSED_UNTIL[0] > now:
            return None
        try:
            url = logo_candidate(name) or _wikipedia_crest(name)
            if not url:
                raise ValueError("No club crest found")
            image = _paced_fetch(url)
            if not image.startswith(b"\x89PNG\r\n\x1a\n"):
                raise ValueError("Expected PNG crest")
            directory.mkdir(parents=True, exist_ok=True)
            with target.open("xb") as stream:
                stream.write(image)
            return target
        except _Refused as refused:
            _PAUSED_UNTIL[0] = time.monotonic() + refused.wait_s
            return None
        except Exception:
            _MISSES[key] = time.monotonic() + _NO_CREST_S
            return None
