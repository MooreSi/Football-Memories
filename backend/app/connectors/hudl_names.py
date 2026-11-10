"""Readable attachment names derived only from the served match title."""

import re
from datetime import date

from app.services.paths import sanitize_component


def download_name(title: str, category: str | None = None, number: int | None = None) -> str:
    title = title.strip()
    stamp = "Date unknown"
    prefix = re.match(r"^(\d{2})(\d{2})(\d{2})(?:\s|$)", title)
    if prefix:
        try:
            stamp = date(2000 + int(prefix[1]), int(prefix[2]), int(prefix[3])).isoformat()
            title = title[prefix.end() :].strip()
        except ValueError:
            pass
    venue = (
        "Home"
        if re.search(r"\(H\)", title, re.I)
        else "Away"
        if re.search(r"\(A\)", title, re.I)
        else "Venue unknown"
    )
    fixture = re.sub(r"\s*\([HAN]\)\s*", " ", title, flags=re.I).strip()
    label = category or venue
    parts = [fixture, label] + ([f"{number:03}"] if number is not None else []) + [stamp]
    return " - ".join(sanitize_component(p)[:100] for p in parts)
