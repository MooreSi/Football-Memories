"""Spec 220: details for Plex and other media players.

Owner request 2026-11-12. Two things, both local and both additive:

* ``MediaDetails.ffmpeg_args``: MP4 tags (title, date, description...) that the
  ffmpeg step creating a new download writes into it. Finished files are never
  rewritten.
* ``MediaLibrary.sync``: an opt-in ``Media library/`` folder inside the download
  folder, one folder per download: a hard link to the video under a readable
  name (no extra space; the download is not moved or changed), the match poster
  and a Kodi-style ``.nfo``. A moments ZIP is unpacked there (it is only read).
  The app replaces only files its manifest says it wrote, and never deletes
  anything here except through Downloaded > Delete.
"""

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import tempfile
import threading
import xml.etree.ElementTree as ET
import zipfile
from collections.abc import Callable, Iterable, Iterator
from contextlib import contextmanager
from contextvars import ContextVar
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any

from app.connectors.hudl_metadata import age_group, season_label
from app.services.paths import sanitize_component
from app.services.publish import links_unsupported, publish_new

FOLDER = "Media library"
MANIFEST = ".football-memories.json"
_KIND = {"match": "Full match", "moments": "Moments", "reel": "Highlights"}


_TAGGING: ContextVar[MediaDetails | None] = ContextVar("media_details", default=None)


@contextmanager
def tagging(details: MediaDetails | None) -> Iterator[None]:
    """The details an export made inside this block writes into its files. The export
    entry points keep their signatures, so callers and their test doubles are unchanged."""
    token = _TAGGING.set(details)
    try:
        yield
    finally:
        _TAGGING.reset(token)


def current_details() -> MediaDetails | None:
    return _TAGGING.get()


def _played(title: str) -> date | None:
    prefix = re.match(r"^(\d{2})(\d{2})(\d{2})(?:\s|$)", title.strip())
    if not prefix:
        return None
    try:
        return date(2000 + int(prefix[1]), int(prefix[2]), int(prefix[3]))
    except ValueError:
        return None


def _undated(title: str) -> str:
    return re.sub(r"^\d{6}\s+", "", title.strip()) if _played(title) else title.strip()


def _uk(day: date) -> str:
    return f"{day.day} {day.strftime('%B %Y')}"


@dataclass(frozen=True)
class MediaDetails:
    title: str
    name: str
    played: date | None
    plot: str
    tags: tuple[str, ...]
    genres: tuple[str, ...]
    player: str | None
    album: str | None

    def ffmpeg_args(self) -> list[str]:
        # Plex splits tag values at "/" ("U11 2026/27" became collections "U11 2026"
        # and "27"), so seasons are written 2026-27 inside the file.
        def plain(text: str | None) -> str | None:
            return text.replace("/", "-") if text else text

        values = {
            "title": self.title,
            "date": self.played.isoformat() if self.played else None,
            "description": self.plot.split("\n", 1)[0],
            "synopsis": self.plot,
            "comment": "Saved by Football Memories",
            "genre": "Football",
            "artist": self.player,
            "album": plain(self.album),
            "keywords": ", ".join(plain(t) or "" for t in self.tags) or None,
        }
        args: list[str] = []
        for key, value in values.items():
            if value:
                args += ["-metadata", f"{key}={value}"]
        return args

    def clip(self, number: int, category: str) -> MediaDetails:
        """One moment inside a moments download."""
        return MediaDetails(
            title=f"{re.sub(r' - Moments(?: \(.*\))?$', '', self.title)} - {category} {number}",
            name=self.name,
            played=self.played,
            plot=self.plot,
            tags=self.tags,
            genres=self.genres,
            player=self.player,
            album=self.album,
        )

    def nfo(self) -> str:
        movie = ET.Element("movie")
        ET.SubElement(movie, "title").text = self.title
        ET.SubElement(movie, "sorttitle").text = self.name
        ET.SubElement(movie, "plot").text = self.plot
        ET.SubElement(movie, "outline").text = self.plot.split("\n", 1)[0]
        if self.played:
            ET.SubElement(movie, "premiered").text = self.played.isoformat()
            ET.SubElement(movie, "year").text = str(self.played.year)
        for genre in self.genres:
            ET.SubElement(movie, "genre").text = genre
        for tag in self.tags:
            ET.SubElement(movie, "tag").text = tag
        if self.album:
            ET.SubElement(ET.SubElement(movie, "set"), "name").text = self.album
        if self.player:
            actor = ET.SubElement(movie, "actor")
            ET.SubElement(actor, "name").text = self.player
            ET.SubElement(actor, "role").text = "Player"
        ET.indent(movie)
        return (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
            "<!-- Written by Football Memories; rewritten when the match details change. -->\n"
            + ET.tostring(movie, encoding="unicode")
            + "\n"
        )


class MediaLibrary:
    def __init__(self, cache: Path) -> None:
        self.settings = cache / "media-library.json"
        self._lock = threading.Lock()
        self.enabled = False
        self.context: dict[str, Any] = {}
        try:
            saved = json.loads(self.settings.read_text())
            self.enabled = saved.get("enabled") is True
            if isinstance(saved.get("context"), dict):
                self.context = saved["context"]
        except (OSError, ValueError, AttributeError):
            pass

    def configure(
        self, *, enabled: bool | None = None, context: dict[str, Any] | None = None
    ) -> None:
        with self._lock:
            if enabled is not None:
                self.enabled = enabled
            if context is not None:
                self.context = context
            _write_atomic(
                self.settings,
                json.dumps({"enabled": self.enabled, "context": self.context}).encode(),
            )

    # --- what a download is ---------------------------------------------------

    def details(self, entry: dict[str, Any], titles: dict[str, str]) -> MediaDetails:
        kind = str(entry.get("kind"))
        own = str(entry.get("title") or "")
        ids = [str(m) for m in entry.get("matches") or []]
        known = self.context.get("matches") or {}
        # (match id, Hudl title) pairs; a one-match download falls back to its own title.
        pairs = [(m, titles.get(m) or (own if len(ids) == 1 else "")) for m in ids]
        pairs = [(m, t) for m, t in pairs if t] or ([("", own)] if own else [])
        labels = [str((known.get(m) or {}).get("label") or _undated(t)) for m, t in pairs]
        dates = [d for d in (_played(t) for _, t in pairs) if d]
        played = max(dates) if dates else None
        player = self.context.get("player")
        player = player if isinstance(player, str) and player else None
        codes = [str(c) for c in entry.get("codes") or []]
        single = len(pairs) == 1
        first = pairs[0][1] if pairs else ""
        if kind == "reel" and not single:
            title = own or "Highlight reel"
        elif kind == "reel":
            reel = own.split(" - ", 1)[0] if " - " in own else own or "Highlights"
            title = f"{labels[0]} - {reel}"
        else:
            suffix = _KIND.get(kind, "Video")
            if kind == "moments" and len(codes) == 1:
                suffix += f" ({codes[0]})"
            title = f"{labels[0] if labels else 'Football'} - {suffix}"
        grouping = [
            x for x in (age_group(first), season_label(first)) if first and x != "Unclassified"
        ]
        lines = []
        if single:
            facts = [labels[0] + (f", {_uk(played)}" if played else "")]
            score = known.get(pairs[0][0])
            if isinstance(score, dict) and all(
                isinstance(score.get(k), int) for k in ("ours", "theirs")
            ):
                facts.append(f"Score: {score['ours']}-{score['theirs']}")
            if re.search(r"\(H\)", first):
                facts.append("Home")
            elif re.search(r"\(A\)", first):
                facts.append("Away")
            lines.append(". ".join(facts) + ".")
        else:
            lines.append(f"Highlights from {len(pairs)} matches.")
            for label, (_, hudl) in zip(labels, pairs, strict=True):
                day = _played(hudl)
                lines.append(label + (f", {_uk(day)}" if day else ""))
        if grouping:
            season = season_label(first) != "Unclassified"
            lines.append(" ".join(grouping) + (" season." if season else "."))
        count = int(entry.get("moment_count") or 0)
        if count:
            lines.append(
                f"{count} tagged {'moment' if count == 1 else 'moments'}"
                + (f": {', '.join(codes)}." if codes else ".")
            )
        if player:
            lines.append(f"Player: {player}.")
        album_parts = grouping
        tags = grouping + codes
        safe = sanitize_component(title)[:150]
        return MediaDetails(
            title=title,
            name=f"{played.isoformat()} {safe}" if played else safe,
            played=played,
            plot="\n".join(lines),
            tags=tuple(dict.fromkeys(tags)),
            genres=("Football", _KIND.get(kind, "Video")),
            player=player,
            album=" ".join(album_parts) or None,
        )

    def export_details(
        self,
        kind: str,
        match_id: str | None,
        title: str | None,
        moments: Iterable[dict[str, Any]],
        *,
        matches: list[str] | None = None,
        titles: dict[str, str] | None = None,
    ) -> MediaDetails:
        """Details for a download that is about to be written."""
        chosen = list(moments)
        return self.details(
            {
                "kind": kind,
                "match_id": match_id,
                "matches": matches or ([match_id] if match_id else []),
                "title": title,
                "moment_count": len(chosen),
                "codes": sorted({str(m.get("category", "")) for m in chosen} - {""}),
            },
            titles or {},
        )

    # --- the media library folder ---------------------------------------------

    def _manifest(self, library: Path) -> dict[str, dict[str, Any]]:
        try:
            data = json.loads((library / MANIFEST).read_text())
        except (OSError, ValueError):
            return {}
        if not isinstance(data, dict):
            return {}
        return {k: v for k, v in data.items() if isinstance(v, dict)}

    def folder_for(self, root: Path, relative: str) -> Path | None:
        library = root / FOLDER
        record = self._manifest(library).get(relative)
        if not record:
            return None
        folder = library / str(record.get("folder", ""))
        if (
            folder.parent != library
            or folder.name in {"", ".", ".."}
            or folder.is_symlink()
            or not folder.is_dir()
        ):
            return None
        return folder

    def forget(self, root: Path, relative: str) -> None:
        library = root / FOLDER
        with self._lock:
            manifest = self._manifest(library)
            if manifest.pop(relative, None) is not None:
                _write_atomic(library / MANIFEST, json.dumps(manifest).encode())

    def sync(
        self,
        root: Path,
        entries: list[dict[str, Any]],
        titles: dict[str, str],
        poster: Callable[[str], Path | None],
    ) -> dict[str, Any]:
        library = root / FOLDER
        created = updated = copied = copied_bytes = 0
        failed: list[str] = []
        with self._lock:
            library.mkdir(exist_ok=True)
            manifest = self._manifest(library)
            for entry in entries:
                relative = str(entry["file"])
                source = root / relative
                if source.is_symlink() or not source.is_file():
                    continue
                details = self.details(entry, titles)
                record = manifest.get(relative)
                folder = library / str(record["folder"]) if record else None
                if folder is None or folder.is_symlink() or not folder.is_dir():
                    folder = _new_folder(library, details.name)
                    record = {"folder": folder.name, "files": []}
                    manifest[relative] = record
                assert record is not None
                ours: list[str] = record.setdefault("files", [])
                try:
                    videos, extra = self._videos(source, folder, record, details)
                    if not extra and _retag(source, folder, record, details):
                        updated += 1
                except OSError:
                    failed.append(relative)
                    if not ours:
                        manifest.pop(relative, None)
                        _remove_if_empty(folder)
                    continue
                created += videos
                if extra:
                    copied += 1
                    copied_bytes += extra
                match_ids = [str(m) for m in entry.get("matches") or []]
                image = poster(match_ids[-1]) if match_ids else None
                target = folder / "poster.jpg"
                if image and not target.exists() and _is_jpeg(image):
                    _publish(target, image.read_bytes())
                    ours.append(target.name)
                    created += 1
                for video in sorted(folder.glob("*.mp4")):
                    if video.name not in ours:
                        continue
                    text = (
                        details.clip(*_clip_number(video.name)).nfo()
                        if source.suffix.lower() == ".zip"
                        else details.nfo()
                    )
                    nfo = video.with_suffix(".nfo")
                    if nfo.name not in ours:
                        if nfo.exists() or nfo.is_symlink():
                            continue  # someone else's file: never replaced
                        _publish(nfo, text.encode())
                        ours.append(nfo.name)
                        created += 1
                    elif not nfo.is_symlink() and (
                        not nfo.is_file() or nfo.read_text(errors="replace") != text
                    ):
                        _write_atomic(nfo, text.encode())
                        updated += 1
            _write_atomic(library / MANIFEST, json.dumps(manifest).encode())
        return {
            "folder": str(library),
            "created": created,
            "updated": updated,
            "failed": failed,
            "copied": copied,
            "copied_bytes": copied_bytes,
        }

    @staticmethod
    def _videos(
        source: Path, folder: Path, record: dict[str, Any], details: MediaDetails
    ) -> tuple[int, int]:
        """Put ``source``'s video(s) in ``folder``. Returns (files made, bytes copied
        because the drive cannot link; 0 when linked or unpacked from a ZIP)."""
        ours: list[str] = record["files"]
        made = 0
        if source.suffix.lower() == ".zip":
            with zipfile.ZipFile(source) as archive:
                for info in archive.infolist():
                    name = info.filename
                    if "/" in name or name.startswith(".") or not name.lower().endswith(".mp4"):
                        continue
                    target = folder / name
                    if target.exists() or target.is_symlink():
                        continue
                    descriptor, temporary = tempfile.mkstemp(dir=folder, prefix=".", suffix=".part")
                    try:
                        with os.fdopen(descriptor, "wb") as out, archive.open(info) as data:
                            while chunk := data.read(1 << 20):
                                out.write(chunk)
                        publish_new(Path(temporary), target)  # never replaces a file
                    finally:
                        Path(temporary).unlink(missing_ok=True)
                    ours.append(name)
                    made += 1
            return made, 0
        target = folder / f"{folder.name}{source.suffix.lower()}"
        if target.name in ours or target.exists() or target.is_symlink():
            return 0, 0
        try:
            os.link(source, target)  # no extra space; the original is never moved
            copied = 0
        except OSError as error:
            if not links_unsupported(error):
                raise
            # SMB shares (the owner's NAS), exFAT and FAT have no hard links: copy.
            # The original is only read; the copy is published without replacing.
            # A copy is this app's own file, so it carries the app's details inside
            # it (Plex reads only those). The original is only read.
            descriptor, temporary = tempfile.mkstemp(dir=folder, prefix=".", suffix=".part")
            os.close(descriptor)
            try:
                if not _tagged(source, Path(temporary), details):
                    shutil.copyfile(source, temporary)
                copied = Path(temporary).stat().st_size
                publish_new(Path(temporary), target)
            finally:
                Path(temporary).unlink(missing_ok=True)
            record["copy"] = target.name
            record["tagged"] = details.ffmpeg_args()
        ours.append(target.name)
        return 1, copied


def _tagged(source: Path, output: Path, details: MediaDetails) -> bool:
    """Remux ``source`` into ``output`` with ``details`` (no re-encode)."""
    if source.suffix.lower() != ".mp4":
        return False
    try:
        done = subprocess.run(
            [
                "ffmpeg",
                "-hide_banner",
                "-loglevel",
                "error",
                "-nostdin",
                "-y",
                "-i",
                str(source),
                "-map",
                "0",
                "-c",
                "copy",
                *details.ffmpeg_args(),
                "-f",
                "mp4",
                str(output),
            ],
            capture_output=True,
            timeout=3600,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired):
        return False
    return done.returncode == 0 and output.stat().st_size > 0


def _retag(source: Path, folder: Path, record: dict[str, Any], details: MediaDetails) -> bool:
    """Rewrite the details inside this app's own copy when they changed. Never a
    hard link (that would be the original download) and never a file not ours."""
    name = record.get("copy")
    if name is None and source.suffix.lower() != ".zip":
        # Copies made before copies were marked: the video this app wrote for the
        # download. The link and inode checks below tell a copy from the original.
        name = f"{folder.name}{source.suffix.lower()}"
    if not isinstance(name, str) or name not in record.get("files", []):
        return False
    if record.get("tagged") == details.ffmpeg_args():
        return False
    copy = folder / name
    if copy.is_symlink() or not copy.is_file():
        return False
    status = copy.stat()
    if status.st_nlink != 1 or status.st_ino == source.stat().st_ino:
        return False
    descriptor, temporary = tempfile.mkstemp(dir=folder, prefix=".", suffix=".part")
    os.close(descriptor)
    try:
        if not _tagged(copy, Path(temporary), details):
            return False
        os.replace(temporary, copy)  # replaces only this app's own copy
    finally:
        Path(temporary).unlink(missing_ok=True)
    record["copy"] = name
    record["tagged"] = details.ffmpeg_args()
    return True


def _clip_number(name: str) -> tuple[int, str]:
    found = re.search(r" - ([^-]+?) - (\d{3})(?: - |\.mp4$)", name)
    return (int(found[2]), found[1].strip()) if found else (0, "Moment")


def _new_folder(library: Path, name: str) -> Path:
    candidate, number = library / name, 2
    while True:
        try:
            candidate.mkdir()
            return candidate
        except FileExistsError:
            candidate = library / f"{name} ({number})"
            number += 1


def _remove_if_empty(folder: Path) -> None:
    try:
        folder.rmdir()
    except OSError:
        pass


def _is_jpeg(path: Path) -> bool:
    try:
        with path.open("rb") as stream:
            return stream.read(3) == b"\xff\xd8\xff"
    except OSError:
        return False


def _publish(target: Path, content: bytes) -> None:
    """Write a new file; never replaces one (hard-link publish)."""
    descriptor, temporary = tempfile.mkstemp(dir=target.parent, prefix=".", suffix=".part")
    try:
        with os.fdopen(descriptor, "wb") as stream:
            stream.write(content)
        publish_new(Path(temporary), target)
    finally:
        Path(temporary).unlink(missing_ok=True)


def _write_atomic(target: Path, content: bytes) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary = tempfile.mkstemp(dir=target.parent, prefix=".", suffix=".tmp")
    try:
        with os.fdopen(descriptor, "wb") as stream:
            stream.write(content)
        os.replace(temporary, target)
    finally:
        Path(temporary).unlink(missing_ok=True)


def sync_downloads(
    media: MediaLibrary, index: Any, root: Path, catalogue: list[dict[str, Any]], cache: Any
) -> dict[str, Any]:
    """Build or refresh the media library from the download index. ``cache`` is the
    helper's MatchCache, whose ``.poster`` files are the full-quality snapshots."""
    titles = {str(i["id"]): str(i["title"]) for i in catalogue if i.get("title")}

    def poster(match_id: str) -> Path | None:
        path = cache.path(match_id, ".poster")
        return path if isinstance(path, Path) and path.is_file() else None

    return media.sync(root, index.entries(root, catalogue=catalogue), titles, poster)
