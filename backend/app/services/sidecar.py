"""Tag sidecar CSV (format v1, documented in HUDL_INTEGRATION.md)."""

from __future__ import annotations

import csv
from dataclasses import dataclass
from pathlib import Path


class SidecarError(ValueError):
    pass


@dataclass(frozen=True)
class SidecarRow:
    line: int
    time_s: float
    category: str
    players: tuple[str, ...]
    duration_s: float
    note: str


def parse_time(text: str) -> float:
    text = text.strip()
    parts = text.split(":")
    if not 1 <= len(parts) <= 3:
        raise ValueError(text)
    values = [float(p) for p in parts]
    if any(v < 0 for v in values):
        raise ValueError(text)
    seconds = 0.0
    for v in values:
        seconds = seconds * 60 + v
    return seconds


def parse_sidecar(path: Path) -> list[SidecarRow]:
    with path.open(newline="", encoding="utf-8-sig") as fh:
        reader = csv.DictReader(fh)
        fields = {f.strip().lower() for f in (reader.fieldnames or [])}
        for required in ("time", "category"):
            if required not in fields:
                raise SidecarError(f"{path.name}: missing required column '{required}'")
        rows: list[SidecarRow] = []
        for line_no, raw in enumerate(reader, start=2):
            row = {(k or "").strip().lower(): (v or "") for k, v in raw.items()}
            try:
                time_s = parse_time(row["time"])
            except ValueError:
                raise SidecarError(
                    f"{path.name} line {line_no}: cannot read time {row['time']!r}"
                ) from None
            category = row["category"].strip()
            if not category:
                raise SidecarError(f"{path.name} line {line_no}: category is empty")
            try:
                duration = float(row.get("duration", "").strip() or 0)
            except ValueError:
                raise SidecarError(
                    f"{path.name} line {line_no}: cannot read duration {row['duration']!r}"
                ) from None
            players = tuple(p.strip() for p in row.get("players", "").split(";") if p.strip())
            rows.append(
                SidecarRow(
                    line_no, time_s, category, players, duration, row.get("note", "").strip()
                )
            )
        return rows
