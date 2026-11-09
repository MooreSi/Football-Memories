# Decision log

Decisions made while building, newest first. Owner-only questions live in
[owner-decisions/](owner-decisions/README.md). Format: ID, date, decision,
why, consequence.

## D-012 (2026-11-09) Authorized desktop Hudl capture, ephemeral browser session
Owner reports normal-user access without export controls and explicitly attests
Hudl permission for app automation/downloads (owner decision 002). Build within
that attested scope; do not treat it as permission for other users or an official
public integration. Owner approved Playwright as a runtime dependency.

Each capture opens normal Hudl login in an incognito Chrome context. No password
form in Football Memories, cookie export, persistent browser profile, traces or
HARs. A host companion on 127.0.0.1:8766 bridges the Docker UI to a visible desktop
browser, with exact Origin/Host checks and no arbitrary output paths from the UI.
It observes the actual match player's HLS and Sportscode responses instead of
guessing private identifiers or replaying mutations. Request concurrency is one,
with a 0.5s pause and no retry/redirect loops. Initial quality ceiling is 720p,
user-selectable. These conservative helper defaults are new, not changes to
existing import settings.

Download only complete, unencrypted muxed HLS on HTTPS Hudl media hosts. Remux
from local-only manifests, verify duration, and publish a new MP4/tag CSV pair
exclusively. Crop Sportscode pre-roll/end padding to playable video bounds;
retain strict validation for malformed/reversed times and unsynced sessions.
Users explicitly identify player codes; do not infer player-event ownership from
overlapping timeline rows. Import the pair through the existing app workflow.
Clip Explorer exports a single moment through a one-item reel without title
cards, using the existing renderer and saved clip buffers. Tagged clips remain
locally playable ranges over the full match. Persistent/resumable capture jobs
remain future work.

## D-011 (2026-11-09) Older backups always restore
Restore originally refused any backup whose schema fingerprint differed, which
would strand every backup each time a feature adds a table. Now a backup restores
if every table and column it contains exists today (newer tables start empty,
newer columns take defaults); only a backup from a newer app version is refused.

## D-010 (2026-11-09) Highlight reels: browser-drawn title cards, one re-encode
The Homebrew ffmpeg on the owner's Mac has no text rendering; the Docker one
does. Title cards are drawn on a canvas in the browser and uploaded as PNG, so
they look the same everywhere. Each clip is re-encoded once (H.264 CRF 18, AAC
48 kHz) at the tallest source height so different matches join cleanly; no
upscaling. Folder settings are resolved to absolute paths at start-up because
ffmpeg runs in a scratch working folder (a relative archive path broke the first
real render).


## D-009 (2026-11-09) Profile photos via python-multipart + ffmpeg re-encode
Owner approved adding `python-multipart` (FastAPI's dependency for file
uploads). No image library: ffmpeg (already required) validates and re-encodes
every photo to a 512x512 JPEG, which also strips EXIF/GPS metadata. Replacing or
removing a photo deletes only the app's own re-encoded copy, never a user file.

## D-008 (2026-11-09) Bind to localhost until LAN authentication exists
Docker Compose publishes ports on `127.0.0.1` only. The brief wants LAN access
with authentication (section 21); until login is built, exposing footage of
children to the whole network would be unsafe. Phase 7 (or earlier) adds auth,
then the bind address becomes configurable.

## D-007 (2026-11-09) Event identity for imported tags
`(match_id, source, source_event_id)` is unique. For sidecar CSVs,
`source_event_id` = SHA-1 of `time|category|sorted players`, with `#n`
appended for exact duplicates in one file. Re-importing an edited CSV can
therefore detect unchanged events (needed for notification dedup later).

## D-006 (2026-11-09) Native HTML5 video for the first slice
The archive is local MP4/MOV served with HTTP Range, which the browser plays
natively with no extra library. Custom controls give speeds, event markers and
keyboard shortcuts. Vidstack is re-evaluated when HLS or quality selection is
needed (brief section 9). Swapping is contained to `VideoPlayer`.

## D-005 (2026-11-09) Tests run on SQLite by default, PostgreSQL in verify
Models use portable types only. `pytest` uses in-memory SQLite (fast, no
Docker); `TEST_DATABASE_URL=postgresql+psycopg://...` runs the identical suite
on Postgres, and `/verify` requires both. Migrations are checked with
`alembic check` against Postgres.

## D-004 (2026-11-09) Clips are time ranges, not files
A tagged event points at a time in the match's media asset. Physical clip
files are only cut on request (export, highlight reel). Saves disk space and
keeps one source of truth (brief section 14).

## D-003 (2026-11-09) Import copies; it never moves or deletes
Import copies the inbox file to `.part`, verifies SHA-256, then renames into
`FootballMemories/Matches/<season>/<team>/<date vs opponent>/`. The original
stays in the inbox; a name clash gets a ` (2)` suffix, never an overwrite.
Duplicate footage (same SHA-256) is refused with a pointer to the existing
match. Costs disk until the owner clears the inbox; the owner decides that.

## D-002 (2026-11-09) No Hudl automation; local import is the primary connector
Hudl's Terms 3.2(8) prohibit bots and scrapers, and there is no public API for
team video. `HudlConnector` exists but reports no capabilities. Everything is
built on the local archive. Details and evidence: [HUDL_INTEGRATION.md](../HUDL_INTEGRATION.md).
Open owner question: [002-hudl-access.md](owner-decisions/002-hudl-access.md).

## D-001 (2026-11-09) Stack as specified in the brief
React + TypeScript + Vite + Tailwind; FastAPI + SQLAlchemy 2 + Alembic +
PostgreSQL 17; FFmpeg; Docker Compose. Python 3.12 via `uv` (backend/.venv).
