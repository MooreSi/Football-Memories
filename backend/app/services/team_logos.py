"""Public club crests cached locally; unknown identities keep their initials."""

from __future__ import annotations

import hashlib
import json
import re
import threading
import time
from pathlib import Path
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


def club_name(name: str) -> str:
    name = re.sub(r"\b(?:u\s*\d{1,2}|under[ -]?\d{1,2}|f\.?c\.?)\b", "", name, flags=re.I)
    return " ".join(name.casefold().strip(" .").split())


def logo_candidate(name: str) -> str | None:
    return _OFFICIAL.get(club_name(name))


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


def cached_crest(name: str, directory: Path) -> Path | None:
    identity = club_name(name)
    key = hashlib.sha256(identity.encode()).hexdigest()
    target = safe_join(directory, f"{key}.png")
    with _LOCK:
        if target.exists():
            return target
        if _MISSES.get(key, 0) > time.monotonic():
            return None
        try:
            url = logo_candidate(name)
            if not url:
                if len(identity.split()) < 2:
                    raise ValueError("Ambiguous team identity")
                title = identity.title() + " F.C."
                query = urlencode(
                    {
                        "action": "query",
                        "format": "json",
                        "prop": "pageimages",
                        "piprop": "thumbnail",
                        "pithumbsize": 160,
                        "pilicense": "any",
                        "titles": title,
                    }
                )
                data = json.loads(_fetch(f"https://en.wikipedia.org/w/api.php?{query}"))
                pages = data.get("query", {}).get("pages", {})
                url = next(
                    (
                        page.get("thumbnail", {}).get("source")
                        for page in pages.values()
                        if "missing" not in page
                    ),
                    None,
                )
                if not url or not any(word in url.lower() for word in ("crest", "logo", "badge")):
                    raise ValueError("No unambiguous club crest")
            image = _fetch(url)
            if not image.startswith(b"\x89PNG\r\n\x1a\n"):
                raise ValueError("Expected PNG crest")
            directory.mkdir(parents=True, exist_ok=True)
            with target.open("xb") as stream:
                stream.write(image)
            return target
        except Exception:
            _MISSES[key] = time.monotonic() + 86400
            return None
