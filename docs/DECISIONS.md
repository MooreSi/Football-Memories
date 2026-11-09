# Decision log

Decisions made while building, newest first. Owner-only questions live in
[owner-decisions/](owner-decisions/README.md). Format: ID, date, decision,
why, consequence.

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
