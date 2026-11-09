# Handoff

**Read this first.** Then [PROGRESS.md](todo/football-memories/PROGRESS.md) and
[DECISIONS.md](DECISIONS.md). Rules: [CLAUDE.md](../CLAUDE.md) (any agent) and
[60-handoff.md](system/rules/60-handoff.md) (how to leave the work).

## What this is

**Football Memories**: a local-first web app that archives football match
footage, indexes tagged moments, and (next) builds a player's memories
timeline. Full brief: [BRIEF.md](BRIEF.md). Design references:
[design/](design/DESIGN.md).

## Current state (2026-11-09)

- Branch: **`phase1-foundation`**, pushed. Not merged to `main` yet (owner decides).
- **Working vertical slice:** import a video (+ optional `.tags.csv`) from the
  inbox → copy, SHA-256 verify, thumbnail → index in Postgres → Library page →
  Match page with player, event markers, filters (AND/OR), "play moments only".
- Runs in Docker Compose at http://127.0.0.1:8765 (localhost only, D-008).
- Hudl: **not automated, by design** (Terms of Service 3.2). See
  [HUDL_INTEGRATION.md](../HUDL_INTEGRATION.md). Waiting on owner decision 002.
- Tests: backend 52 (SQLite + Postgres), frontend 22. All green.

## How to run

Docker (normal use): see [DEVELOPMENT.md](../DEVELOPMENT.md) "Run everything in Docker".
Dev with hot reload: same file, "Run for development". Checks: [TESTING.md](../TESTING.md).

## Next steps (in order)

1. **Phase 4, Player Hub** (the owner's headline screen 3): `preferences` table
   with the primary player; `GET /api/players/{id}/moments` cross-match query
   (indexed on event_players.player_id); Player Hub page; Memories Timeline
   (season → month → match → event); viewed/unviewed + favourites tables.
2. Settings page: pre/post buffers (now fixed 8s/5s), archive/inbox health
   (exists, writable, free space).
3. Clip Explorer (brief section 10) across matches, reusing EventPanel filters.
4. Playwright e2e for import → play → filter.
5. Phase 5/6: persistent jobs, clip export and highlight reels with ffmpeg,
   backup/restore, storage health.

## Blocked on / waiting for the owner

- [owner-decisions/002-hudl-access.md](owner-decisions/002-hudl-access.md):
  Hudl role, tag export availability, whether to ask Hudl for permission.
- Merge `phase1-foundation` into `main`.

## Gotchas

- Backend: always `uv run ...` from `backend/` (Python 3.12 venv). Bare
  `python3` is 3.13 without the deps.
- Postgres test runs need the dev container `fm-pg-dev` on 127.0.0.1:55432
  and a `memories_test` database (TESTING.md).
- Port 8080 is used by the owner's HomeBoard app; Football Memories uses 8765.
- The inbox is mounted read-only in Docker on purpose (originals are never touched).
- Starlette 1.10 warns that its TestClient's httpx use is deprecated; harmless.
- shadcn/ui is in the brief but not installed yet; primitives live in
  `frontend/src/components/ui/`. Decide before building forms-heavy screens.
