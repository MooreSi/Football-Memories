"""Test and Refresh for the Veo account, one operation at a time (spec 250)."""

from __future__ import annotations

import json
import logging
import os
import re
import secrets
import subprocess
import tempfile
import threading
import time
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

from app.connectors.hudl_capture import CaptureError
from app.connectors.hudl_metadata import capture_key

from ._client import VeoRefused
from ._parse import ACTIVE, best_video, library_item, next_page, team_data, team_totals

MAX_PAGES = 100
# 2: Veo's "Own"/"Opponent" sides and each side's totals (owner request 2026-11-15).
TEAM_DATA_VERSION = 2
NO_REPORT = {400, 403, 404, 405}
# Owner request 2026-11-20: a shared match link is Veo's own public match page.
# Owner report 2026-11-20: untitled recordings carry the time with underscores.
_SLUG = re.compile(r"[a-z0-9][a-z0-9_-]{2,150}")
NOT_SHARED = {403, 404}  # the match is private now, or gone: skip it, read the rest
MAX_SHARED = 200


def shared_slug(link: str) -> str:
    """The match slug from a shared Veo match link (https://app.veo.co/matches/<slug>/).
    Anything else is refused; the app never builds a Veo address from other input."""
    try:
        parts = urlsplit(str(link).strip())
        port = parts.port
    except ValueError:
        port, parts = -1, urlsplit("")
    found = re.fullmatch(r"/matches/([^/]+)/?", parts.path or "")
    if (
        parts.scheme != "https"
        or parts.hostname != "app.veo.co"
        or port is not None
        or parts.username is not None
        or not found
        or not _SLUG.fullmatch(found[1])
    ):
        raise CaptureError(
            "That is not a Veo match link. Paste the address of a shared Veo match, like "
            "https://app.veo.co/matches/<match>/."
        )
    return found[1]


def _cause(error: BaseException) -> str:
    """An unexpected error's type and where it was raised, for the status and the helper
    log. Never its message: Playwright errors can carry Veo addresses (golden rule 1)."""
    frame = error.__traceback__
    while frame is not None and frame.tb_next is not None:
        frame = frame.tb_next
    where = f" in {Path(frame.tb_frame.f_code.co_filename).name}:{frame.tb_lineno}" if frame else ""
    cause = f"{type(error).__name__}{where}"
    logging.getLogger(__name__).warning("Veo operation stopped: %s", cause)
    return cause


class _PublicReader:
    """A signed-out read may only ask for a shared match's own pages."""

    def __init__(self, api: Any) -> None:
        self._api = api

    def get(self, path: str) -> tuple[dict[str, str], Any]:
        found = re.match(r"^/api/app/matches/([^/?]+)/", path)
        if not found or not _SLUG.fullmatch(found[1]) or ".." in path:
            raise CaptureError("A shared Veo match is read from its own match pages only.")
        result: tuple[dict[str, str], Any] = self._api.get(path)
        return result


class VeoConnection:
    def __init__(
        self,
        loader: Callable[[], Any],
        directory: Path,
        session: Any = None,
        run: Callable[[Callable[[], None]], Any] | None = None,
        media: Any = None,
        probe: Callable[[Path], float | None] | None = None,
        index: Any = None,
        folder: Callable[[], Path] | None = None,
        sleep: Callable[[float], None] = time.sleep,
        shrink: Callable[[bytes], bytes | None] | None = None,
        public: Callable[[], Any] | None = None,
    ) -> None:
        if session is None:
            from ._client import session as real_session

            session = real_session
        if public is None:
            from ._client import public_session

            public = public_session
        self._public: Callable[[], Any] = public
        self.shared_path = directory / "shared.json"
        if media is None:
            from . import _client as media
        self._media = media
        self._probe = probe or _probe_duration
        self._shrink = shrink or shrink_crest
        self._club_read = False
        self.index = index
        self._folder = folder or (lambda: directory.parent)
        # Spec 260: video addresses and the stream token live in memory only.
        self._videos: dict[str, str] = {}
        self._stream: tuple[str, str] | None = None
        self._media_lock = threading.Lock()
        self._downloading = False
        self._sleep = sleep
        self.cards: Any = None  # the helper's title-card store, for reels
        self.posters = directory / "posters"
        self.loader = loader
        self.directory = directory
        self.path = directory / "library.json"
        # Owner report 2026-11-20: matches read by a run that has not finished, so the
        # next Connect or Refresh carries on from there instead of starting again.
        self.progress_path = directory / "progress.json"
        self._session = session
        self._lock = threading.Lock()
        self._busy = False
        self._executor: ThreadPoolExecutor | None = None
        self._run = run or self._submit
        self._state: dict[str, Any] = {
            "state": "idle",
            "message": "",
            "summary": None,
            "progress": None,
            "match_id": None,
            "stream_url": None,
            "filename": None,
        }

    def __repr__(self) -> str:
        return f"VeoConnection(state={self._state['state']!r})"

    def _submit(self, work: Callable[[], None]) -> None:
        if self._executor is None:
            self._executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="veo")
        self._executor.submit(work)

    def status(self) -> dict[str, Any]:
        with self._lock:
            try:
                checked: float | None = self.path.stat().st_mtime
            except OSError:
                checked = None
            return {**self._state, "busy": self._busy, "library_checked_at": checked}

    def _report(self, **values: Any) -> None:
        with self._lock:
            self._state.update(values)

    def start(
        self,
        action: str,
        match_id: str | None = None,
        name: str | None = None,
        reel: dict[str, Any] | None = None,
    ) -> None:
        if action == "disconnect":
            self.disconnect()
            return
        if action not in {"test", "refresh", "shared", "watch", "download", "reel", "moments"}:
            raise CaptureError("Choose Connect, Refresh, Watch or Download.")
        if action == "shared" and not self.shared_links():
            raise CaptureError("Add a shared match link first.")
        if action in {"watch", "download", "reel", "moments"}:
            item = self._match(match_id)
            if item is None or not item.get("available") or not item.get("slug"):
                raise CaptureError("Veo has no video for this match.")
        with self._lock:
            if self._busy:
                raise CaptureError("A Veo operation is already running.")
            self._busy = True
            self._downloading = action in {"download", "reel", "moments"}
            message = "Signing in to Veo…"
            if action == "shared":
                message = "Reading shared Veo matches…"
            if action in {"watch", "download"} and match_id in self._videos:
                message = "Preparing the Veo video…"
            if action in {"reel", "moments"}:
                message = "Preparing the highlights…"
            self._state.update(state="working", message=message, progress=None)
        self._run(lambda: self._perform(action, match_id, name, reel))

    def disconnect(self) -> None:
        """Forget the in-memory video addresses and stream; the saved account and the
        cached match list stay. No request to Veo."""
        with self._lock:
            if self._busy:
                raise CaptureError("Wait for the Veo operation to finish first.")
            self._videos.clear()
            self._stream = None
            self._state.update(
                state="idle",
                message="Disconnected. Your Veo account stays saved; select Connect to sign in.",
                summary=None,
                progress=None,
                match_id=None,
                stream_url=None,
                filename=None,
            )

    def forget(self) -> None:
        """Owner request 2026-11-20: Disconnect forgets the account: in-memory video
        addresses, the account's matches, their posters and the club's crest and names.
        Shared match links are not the account's and stay, with their matches and posters.
        Downloads are never touched. No request to Veo."""
        with self._lock:
            if self._busy:
                raise CaptureError("Wait for the Veo operation to finish, then disconnect.")
            self._busy = True
        try:
            self._videos.clear()
            self._stream = None
            shared = [i for i in self.library() if i.get("shared")]
            keep = {f"{capture_key(str(i.get('id')))}.jpg" for i in shared}
            if self.posters.is_dir():
                for poster in self.posters.iterdir():
                    if poster.name not in keep:
                        poster.unlink(missing_ok=True)
            for name in ("crest.png", "club.json", "progress.json"):
                (self.directory / name).unlink(missing_ok=True)
            if shared:
                self._write(shared)
            else:
                self.path.unlink(missing_ok=True)
            self._report(
                state="idle",
                summary=None,
                progress=None,
                match_id=None,
                stream_url=None,
                filename=None,
                message="Disconnected. The saved Veo account and its cached matches were "
                "removed; your downloads are kept.",
            )
        finally:
            with self._lock:
                self._busy = False

    def _match(self, identity: str | None) -> dict[str, Any] | None:
        return next((i for i in self.library() if i.get("id") == identity), None)

    def _perform(
        self,
        action: str,
        match_id: str | None = None,
        name: str | None = None,
        reel: dict[str, Any] | None = None,
    ) -> None:
        try:
            if action in {"reel", "moments"} and match_id:
                from ._reels import make_reel, save_moments

                (make_reel if action == "reel" else save_moments)(self, match_id, name, reel or {})
                return
            if action in {"watch", "download"} and match_id:
                url = self._videos.get(match_id) or self._read_video(match_id)
                if action == "watch":
                    self._watch(match_id, url)
                else:
                    self._download(match_id, url, name)
                return
            if action == "shared":
                with self._public() as api:
                    self._refresh_shared(self._public_reader(api))
                return
            with self._session(self.loader) as api:
                if action == "test":
                    # Owner request 2026-11-20: Connect reads the matches straight away,
                    # in the same sign-in, with no separate Refresh.
                    self._test(api)
                self._refresh(api)
        except CaptureError as error:
            self._report(state="error", message=f"{error}{self._kept()}", progress=None)
        except Exception as error:
            self._report(
                state="error",
                message=f"The Veo connection stopped unexpectedly ({_cause(error)}).{self._kept()}"
                " Try again.",
                progress=None,
            )
        finally:
            with self._lock:
                self._busy = False
                self._downloading = False

    def _kept(self) -> str:
        count = len(self._progress())
        if not count:
            return ""
        return (
            f" {count} match{' read so far is' if count == 1 else 'es read so far are'} kept; "
            "Connect or Refresh carries on from there."
        )

    def _progress(self) -> dict[str, dict[str, Any]]:
        try:
            items = json.loads(self.progress_path.read_text()).get("matches")
        except (OSError, ValueError, AttributeError):
            return {}
        if not isinstance(items, dict):
            return {}
        return {k: v for k, v in items.items() if isinstance(v, dict) and v.get("id") == k}

    def _save_progress(self, items: dict[str, dict[str, Any]]) -> None:
        self._save(self.progress_path, json.dumps({"matches": items}).encode())

    def _clubs(self, api: Any) -> list[dict[str, Any]]:
        api.get("/api/app/user/")
        _, clubs = api.get("/api/app/clubs/?filter=own")
        return [c for c in clubs or [] if isinstance(c, dict) and isinstance(c.get("slug"), str)]

    def _test(self, api: Any) -> None:
        clubs = self._clubs(api)
        total = expired = expiring = 0
        for club in clubs:
            headers, _ = api.get(f"/api/app/clubs/{club['slug']}/recordings/?filter=own")
            total += int(headers.get("x-veo-total-count", 0) or 0)
            expired += int(headers.get("x-veo-matches-expired", 0) or 0)
            expiring += int(headers.get("x-veo-matches-soon-expiring", 0) or 0)
        summary = {
            "clubs": len(clubs),
            "matches": total,
            "with_video": total - expired,
            "expired": expired,
            "expiring": expiring,
        }
        self._report(
            state="ready",
            summary=summary,
            message=(
                f"Connected to Veo: {total} matches in {len(clubs)} "
                f"club{'s' if len(clubs) != 1 else ''}, {total - expired} with video, "
                f"{expired} expired. Reading them now…"
            ),
        )

    def _refresh(self, api: Any) -> None:
        recordings: list[dict[str, Any]] = []
        clubs = self._clubs(api)
        for club in clubs:
            base = f"/api/app/clubs/{club['slug']}/recordings/?filter=own"
            page: int | None = 1
            for _ in range(MAX_PAGES):
                if page is None:
                    break
                self._report(message=f"Listing Veo matches… ({len(recordings)} so far)")
                headers, items = api.get(base if page == 1 else f"{base}&page={page}")
                recordings += [
                    r for r in items or [] if isinstance(r, dict) and r.get("identifier")
                ]
                page = next_page(headers.get("link"))
        self._save_posters(recordings)
        active = [
            r
            for r in recordings
            if r.get("is_accessible") and r.get("expiration_status") in ACTIVE and r.get("slug")
        ]
        known = {i.get("id"): i for i in self.library()}
        self._club_read = False
        library: list[dict[str, Any]] = []
        read = self._progress()
        done = 0
        for r in recordings:
            if r not in active:
                library.append(library_item(r))
                continue
            done += 1
            if f"veo-{r['identifier']}" in read:
                library.append(read[f"veo-{r['identifier']}"])
                continue
            self._report(
                message=f"Reading Veo match {done} of {len(active)}…",
                progress={
                    "done": done - 1,
                    "total": len(active),
                    "fraction": (done - 1) / len(active),
                },
            )
            slug = r["slug"]
            _, detail = api.get(f"/api/app/matches/{slug}/")
            _, videos = api.get(f"/api/app/matches/{slug}/videos/")
            self._remember(f"veo-{r['identifier']}", videos)
            _, highlights = api.get(f"/api/app/matches/{slug}/highlights/?include_ai=true")
            _, periods = api.get(f"/api/app/matches/{slug}/periods/")
            item = library_item(r, detail, highlights, periods, videos)
            if item["available"]:
                previous = known.get(item["id"]) or {}
                kept = previous.get("team_data")
                item["team_data"] = (
                    kept
                    if "team_data" in previous
                    and (kept is None or kept.get("v") == TEAM_DATA_VERSION)
                    else self._team_data(api, slug, str(r["identifier"]))
                )
            library.append(item)
            read[item["id"]] = item
            self._save_progress(read)
        account = {i.get("slug") for i in library}
        shared, unread = self._read_shared(api, account, known)
        library += shared
        self._write(library)
        self.progress_path.unlink(missing_ok=True)
        moments = sum(len(i["moments"]) for i in library)
        with_video = sum(1 for i in library if i["available"])
        self._report(
            state="ready",
            progress=None,
            summary={
                "clubs": len(clubs),
                "matches": len(library),
                "with_video": with_video,
                "expired": sum(1 for i in library if i["expiration_status"] == "expired"),
                "expiring": sum(1 for i in library if i["expiration_status"] == "expires-soon"),
                "moments": moments,
            },
            message=(
                f"Read {len(library)} Veo matches: {with_video} with video and "
                f"{moments} highlights.{_unread(unread)}"
            ),
        )

    # Owner request 2026-11-20: shared match links, so matches can be seen with no Veo
    # account entered. The links are the only thing saved; matches are read like the rest.
    def shared_links(self) -> list[dict[str, str]]:
        try:
            links = json.loads(self.shared_path.read_text()).get("links")
        except (OSError, ValueError, AttributeError):
            return []
        return [
            {"slug": link["slug"], "url": f"https://app.veo.co/matches/{link['slug']}/"}
            for link in links or []
            if isinstance(link, dict) and _SLUG.fullmatch(str(link.get("slug") or ""))
        ]

    def _save_links(self, links: list[dict[str, str]]) -> None:
        self._save(self.shared_path, json.dumps({"links": links}).encode())

    def add_shared(self, link: str) -> str:
        slug = shared_slug(link)
        with self._lock:
            if self._busy:
                raise CaptureError("Wait for the Veo operation to finish first.")
            links = self.shared_links()
            if all(item["slug"] != slug for item in links):
                if len(links) >= MAX_SHARED:
                    raise CaptureError(f"At most {MAX_SHARED} shared match links can be saved.")
                self._save_links(
                    [*links, {"slug": slug, "url": f"https://app.veo.co/matches/{slug}/"}]
                )
        return slug

    def remove_shared(self, slug: str) -> None:
        """Forget one link and its match in the cached list. No request to Veo; a match
        already downloaded stays exactly where it is."""
        with self._lock:
            if self._busy:
                raise CaptureError("Wait for the Veo operation to finish first.")
            links = self.shared_links()
            if all(item["slug"] != slug for item in links):
                raise CaptureError("That shared match link is not saved.")
            self._save_links([item for item in links if item["slug"] != slug])
            library = self.library()
            gone = [i for i in library if i.get("shared") and i.get("slug") == slug]
            for item in gone:
                self._videos.pop(str(item.get("id")), None)
            if gone:
                self._write([i for i in library if i not in gone])

    def is_shared(self, identity: str | None) -> bool:
        item = self._match(identity)
        return bool(item and item.get("shared"))

    def _public_reader(self, api: Any) -> _PublicReader:
        return _PublicReader(api)

    def _read_shared(
        self, api: Any, skip: set[Any], known: dict[Any, dict[str, Any]]
    ) -> tuple[list[dict[str, Any]], int]:
        """Each shared match not already in the account's list: its details, video list,
        highlights and halves (no team-split reads: those are the account's). A match Veo
        no longer shares (403/404) keeps its last details and is counted; any other
        refusal stops the run as usual."""
        items: list[dict[str, Any]] = []
        unread = 0
        links = [link for link in self.shared_links() if link["slug"] not in skip]
        for number, link in enumerate(links):
            slug = link["slug"]
            self._report(message=f"Reading shared Veo match {number + 1} of {len(links)}…")
            try:
                _, match = api.get(f"/api/app/matches/{slug}/")
            except VeoRefused as refused:
                if refused.status not in NOT_SHARED:
                    raise
                unread += 1
                items += [i for i in known.values() if i.get("shared") and i.get("slug") == slug]
                continue
            if not isinstance(match, dict) or not match.get("identifier"):
                unread += 1
                continue
            match = {**match, "slug": slug}
            videos = highlights = periods = None
            if match.get("is_accessible") and match.get("expiration_status") in ACTIVE:
                _, videos = api.get(f"/api/app/matches/{slug}/videos/")
                self._remember(f"veo-{match['identifier']}", videos)
                _, highlights = api.get(f"/api/app/matches/{slug}/highlights/?include_ai=true")
                _, periods = api.get(f"/api/app/matches/{slug}/periods/")
            self._save_posters([match])
            item = library_item(match, match, highlights, periods, videos)
            items.append({**item, "shared": True, "url": link["url"]})
        return items, unread

    def _refresh_shared(self, api: Any) -> None:
        """Shared matches only, signed out; the account's matches already listed stay."""
        account = [i for i in self.library() if not i.get("shared")]
        known = {i.get("id"): i for i in self.library()}
        shared, unread = self._read_shared(api, {i.get("slug") for i in account}, known)
        self._write(account + shared)
        with_video = sum(1 for i in shared if i["available"])
        self._report(
            state="ready",
            progress=None,
            message=(
                f"Read {len(shared)} shared Veo match{'es' if len(shared) != 1 else ''}: "
                f"{with_video} with video.{_unread(unread)}"
            ),
        )

    def _team_data(self, api: Any, slug: str, identifier: str) -> dict[str, Any] | None:
        """Decision 009: Veo's match report and its events for one match, read once.
        A match Veo has no report for (400/403/404/405) is kept as None and not asked
        again; a sign-out, slow-down or server error stops the refresh as usual. Each
        side's totals (owner request 2026-11-15) are optional: a refusal keeps none."""
        try:
            _, report = api.get(f"/api/app/analysis/matches/{slug}/match-report/")
            _, events = api.get(f"/api/mes/v2/{identifier}/match-events")
        except VeoRefused as refused:
            if refused.status in NO_REPORT:
                return None
            raise
        self._read_club(report)
        sides: list[Any] = []
        try:
            for side in ("Own", "Opponent"):
                sides.append(api.get(f"/api/mes/v2/{identifier}/teams/{side}/stats")[1])
        except VeoRefused as refused:
            if refused.status not in NO_REPORT:
                raise
            sides = []
        data = team_data(report, events)
        data["totals"] = team_totals(*sides) if len(sides) == 2 else {}
        data["v"] = TEAM_DATA_VERSION
        return data

    # Owner request 2026-11-15: the club's name and crest from Veo's match report.
    def crest(self) -> Path | None:
        path = self.directory / "crest.png"
        return path if path.is_file() else None

    def club(self) -> dict[str, Any]:
        try:
            names = json.loads((self.directory / "club.json").read_text()).get("names")
        except (OSError, ValueError, AttributeError):
            names = None
        names = [n for n in names or [] if isinstance(n, str)]
        return {"names": names, "crest": self.crest() is not None}

    def _read_club(self, report: Any) -> None:
        """Once per refresh: the club's names, and its crest if none is saved yet. The
        crest's address is used once and not kept; a failed read never stops a refresh."""
        if self._club_read or not isinstance(report, dict):
            return
        self._club_read = True
        teams = _mapping(report.get("teams"))
        side = teams.get("own_side")
        own = _mapping(teams.get(side)) if side in ("home", "away") else {}
        club = _mapping(report.get("club"))
        names = [
            n.strip()[:200]
            for n in (club.get("name"), own.get("name"))
            if isinstance(n, str) and n.strip()
        ]
        if names:
            unique = list(dict.fromkeys(names))
            self._save(self.directory / "club.json", json.dumps({"names": unique}).encode())
        url = own.get("crest_url")
        if self.crest() is not None or not isinstance(url, str):
            return
        try:
            small = self._shrink(self._media.media_crest(url))
        except Exception:  # noqa: BLE001 (a crest is optional; try again next refresh)
            return
        if small:
            self._save(self.directory / "crest.png", small)

    def _save(self, target: Path, data: bytes) -> None:
        self.directory.mkdir(parents=True, exist_ok=True, mode=0o700)
        descriptor, temporary = tempfile.mkstemp(dir=self.directory, suffix=".tmp")
        try:
            with os.fdopen(descriptor, "wb") as stream:
                stream.write(data)
            os.replace(temporary, target)
        finally:
            Path(temporary).unlink(missing_ok=True)

    def poster(self, identity: str) -> Path | None:
        path = self.posters / f"{capture_key(identity)}.jpg"
        return path if path.is_file() else None

    def _save_posters(self, recordings: list[dict[str, Any]]) -> None:
        """One still per match from Veo's own thumbnail, kept on this computer; the
        thumbnail's address is not stored. Missing ones only; a refusal stops posters
        for this refresh (no retries) and never stops the refresh."""
        waiting = [
            r
            for r in recordings
            if isinstance(r.get("thumbnail"), str) and self.poster(f"veo-{r['identifier']}") is None
        ]
        for number, r in enumerate(waiting):
            self._report(message=f"Saving Veo posters… ({number + 1} of {len(waiting)})")
            if number:
                self._sleep(1.0)
            try:
                data = self._media.media_image(r["thumbnail"])
            except Exception:  # noqa: BLE001 (a poster is optional; stop asking Veo for more)
                return
            self.posters.mkdir(parents=True, exist_ok=True, mode=0o700)
            target = self.posters / f"{capture_key('veo-' + str(r['identifier']))}.jpg"
            descriptor, temporary = tempfile.mkstemp(dir=self.posters, suffix=".tmp")
            try:
                with os.fdopen(descriptor, "wb") as stream:
                    stream.write(data)
                os.replace(temporary, target)
            finally:
                Path(temporary).unlink(missing_ok=True)

    def _remember(self, identity: str, videos: Any) -> str | None:
        video = best_video(videos if isinstance(videos, list) else [])
        url = video.get("url") if video else None
        if isinstance(url, str) and url:
            self._videos[identity] = url
            return url
        return None

    def _read_video(self, identity: str) -> str:
        """One sign-in and one JSON read: this match's video list (no match page, no view).
        A shared match is read signed out (owner request 2026-11-20)."""
        item = self._match(identity) or {}
        if item.get("shared"):
            with self._public() as public:
                _, videos = self._public_reader(public).get(
                    f"/api/app/matches/{item.get('slug')}/videos/"
                )
        else:
            with self._session(self.loader) as api:
                _, videos = api.get(f"/api/app/matches/{item.get('slug')}/videos/")
        url = self._remember(identity, videos)
        if url is None:
            raise CaptureError("Veo has no video for this match.")
        return url

    def _watch(self, identity: str, url: str) -> None:
        token = secrets.token_urlsafe(24)
        with self._lock:
            self._stream = (token, identity)
        self._report(
            state="ready",
            match_id=identity,
            stream_url=f"http://127.0.0.1:8766/veo/stream/{token}",
            message="Veo video ready. It plays through the desktop helper.",
            progress=None,
        )

    def stream(self, token: str, header: str | None) -> tuple[int, int, int, bytes]:
        """One Range read for the browser's video element: (start, end, total, bytes)."""
        with self._lock:
            current = self._stream
            downloading = self._downloading
        if not token or current is None or token != current[0]:
            raise CaptureError("This stream has expired. Select Watch again.")
        if downloading:
            raise CaptureError("Wait for the Veo download to finish, then play the match.")
        found = re.fullmatch(r"bytes=(\d+)-(\d*)", (header or "bytes=0-").strip())
        if not found:
            raise CaptureError("That part of the video does not exist.")
        url = self._videos.get(current[1])
        if url is None:
            raise CaptureError("This stream has expired. Select Watch again.")
        with self._media_lock:
            start, total, body = self._media.media_range(
                url, int(found[1]), int(found[2]) if found[2] else None
            )
        return start, start + len(body) - 1, total, body

    def _downloaded(self, identity: str, folder: Path) -> str | None:
        """The file this match was already downloaded to, from the download index."""
        if self.index is None:
            return None
        for entry in self.index.entries(folder):
            if entry.get("kind") == "match" and entry.get("match_id") == identity:
                return str(entry["file"])
        return None

    def _saved_match(self, identity: str, folder: Path) -> Path | None:
        """The full match file already on this computer, if the index lists one."""
        done = self._downloaded(identity, folder)
        if done is None:
            return None
        path = Path(done) if Path(done).is_absolute() else folder / done
        return path if path.is_file() else None

    def _download(self, identity: str, url: str, name: str | None = None) -> Path:
        item = self._match(identity) or {}
        folder = self._folder()
        folder.mkdir(parents=True, exist_ok=True)
        done = self._downloaded(identity, folder)
        if done is not None:
            self._report(
                state="done",
                filename=done,
                match_id=identity,
                message="This Veo match is already downloaded. Nothing was replaced.",
            )
            return Path(done) if Path(done).is_absolute() else folder / done
        # Owner request 2026-11-13: "<match> <date>.mp4". Never another file's name.
        stem = " ".join(p for p in (file_label(name, item.get("title")), title_date(item)) if p)
        target, number = folder / f"{stem}.mp4", 2
        while target.exists() or target.with_name(target.name + ".part").exists():
            target, number = folder / f"{stem} ({number}).mp4", number + 1
        part = target.with_name(target.name + ".part")

        def progress(done: int, total: int) -> None:
            self._report(
                message=(
                    f"Downloading the Veo match… {done // 1_000_000} of {total // 1_000_000} MB"
                ),
                progress={"done": done, "total": total, "fraction": done / total if total else 0},
            )

        with self._media_lock:
            self._media.media_download(url, part, progress)
        if not self._probe(part):
            raise CaptureError(
                f"The downloaded video could not be read, so it was kept as {part.name}."
            )
        try:
            os.link(part, target)  # fails if the target appeared meanwhile: never overwrite
        except FileExistsError:
            raise CaptureError(
                f"{target.name} appeared during the download; the new copy is {part.name}."
            ) from None
        except OSError:
            if target.exists():
                raise CaptureError(f"{target.name} already exists; kept {part.name}.") from None
            os.rename(part, target)
        else:
            part.unlink()
        if self.index is not None:
            # The index writes the match details into the file (a full copy of it), which
            # takes minutes on a network drive; say so rather than look stuck at 100%.
            self._report(
                message="Writing the match details into the saved file… (a few minutes "
                "on a network drive)",
                progress=None,
            )
            self.index.record(
                "match", identity, item.get("title"), target, folder, item.get("moments") or []
            )
        self._report(
            state="done",
            progress=None,
            filename=target.name,
            match_id=identity,
            message=f"Downloaded {item.get('title') or 'the Veo match'} to the download folder.",
        )
        return target

    def _write(self, library: list[dict[str, Any]]) -> None:
        self.directory.mkdir(parents=True, exist_ok=True, mode=0o700)
        descriptor, temporary = tempfile.mkstemp(dir=self.directory, suffix=".tmp")
        try:
            with os.fdopen(descriptor, "w") as stream:
                json.dump({"saved_at": time.time(), "matches": library}, stream)
            os.replace(temporary, self.path)
        finally:
            Path(temporary).unlink(missing_ok=True)

    def library(self) -> list[dict[str, Any]]:
        try:
            data = json.loads(self.path.read_text())
            items = data.get("matches") if isinstance(data, dict) else None
            return [i for i in items or [] if isinstance(i, dict)]
        except (OSError, ValueError):
            return []

    def reset(self) -> None:
        # A new account replaces the account's matches; shared links are not the account's.
        self.progress_path.unlink(missing_ok=True)
        shared = [i for i in self.library() if i.get("shared")]
        if shared:
            self._write(shared)
        else:
            self.path.unlink(missing_ok=True)
        self._report(
            state="idle",
            summary=None,
            progress=None,
            message="Veo account saved. Select Test to connect.",
        )

    def close(self) -> None:
        if self._executor is not None:
            self._executor.shutdown(wait=False)


def _unread(count: int) -> str:
    if not count:
        return ""
    return (
        f" {count} shared link{' could' if count == 1 else 's could'} not be read "
        "(Veo may no longer share it)."
    )


def _mapping(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


CREST_SIZE = 512
CREST_BYTES = 2_000_000  # the app's crest store takes up to 2 MB


def shrink_crest(data: bytes) -> bytes | None:
    """A crest scaled to fit 512 x 512 as PNG (Veo's is about 2000 px, 2.4 MB)."""
    try:
        done = subprocess.run(
            [
                "ffmpeg",
                "-hide_banner",
                "-loglevel",
                "error",
                "-nostdin",
                "-i",
                "pipe:0",
                "-frames:v",
                "1",
                "-vf",
                f"scale={CREST_SIZE}:{CREST_SIZE}:force_original_aspect_ratio=decrease",
                "-f",
                "image2pipe",
                "-c:v",
                "png",
                "pipe:1",
            ],
            input=data,
            capture_output=True,
            timeout=60,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired):
        return None
    out = done.stdout
    if done.returncode or not out.startswith(b"\x89PNG\r\n\x1a\n") or len(out) > CREST_BYTES:
        return None
    return bytes(out)


def _probe_duration(path: Path) -> float | None:
    """ffprobe's duration of a downloaded video, or None when it cannot read it."""
    try:
        done = subprocess.run(
            [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "csv=p=0",
                str(path),
            ],
            capture_output=True,
            text=True,
            timeout=120,
            check=False,
        )
        value = float(done.stdout.strip()) if done.returncode == 0 else 0.0
    except (OSError, subprocess.TimeoutExpired, ValueError):
        return None
    return value if value > 0 else None


def file_label(name: str | None, title: object) -> str:
    """A safe file name from the page's label, else the title without its date prefix."""
    raw = name if isinstance(name, str) and name.strip() else str(title or "Veo match")
    if raw is not name:
        raw = re.sub(r"^\d{6}\s+", "", raw)
    words = re.sub(r"[^\w .,&'()-]", " ", raw).split()
    label = " ".join(w for w in words if w.strip(".-"))[:120].strip(" .")
    return label or "Veo match"


def title_date(item: dict[str, Any]) -> str:
    found = re.match(r"^(\d{2})(\d{2})(\d{2})\s", str(item.get("title") or ""))
    return f"20{found[1]}-{found[2]}-{found[3]}" if found else ""
