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

- **`main` is current** (phase 1-2 slice, reference-image UI, phase 4 Player Hub, player photos, Clip Explorer and Settings merged 2026-11-09). Start new work on a fresh
  branch from `main`, e.g. `phase4-player-hub`.
- **Working vertical slice:** import a video (+ optional `.tags.csv`) from the
  inbox → copy, SHA-256 verify, thumbnail → index in Postgres → Library page →
  Match page with player, event markers, filters (AND/OR), "play moments only".
- Runs in Docker Compose at http://127.0.0.1:8765 (localhost only, D-008).
- Hudl: **not automated, by design** (Terms of Service 3.2). See
  [HUDL_INTEGRATION.md](../HUDL_INTEGRATION.md). Waiting on owner decision 002.
- UI follows the owner's reference images: Library = reference 01, Match page =
  reference 02, Player Hub = reference 03 (docs/design/DESIGN.md).
- Phase 4 Player Hub merged to `main`: primary player (kept
  across restarts), profile, favourites, watched state, Memories Timeline.
- Profile photos: upload/replace/remove in the hub's Edit panel; re-encoded and
  metadata-stripped (D-009).
- Clip Explorer (`/clips`, reference 02): search moments across all matches,
  queue player that crosses matches, saved playlists.
- Settings (`/settings`): clip timing used everywhere moments play; storage
  health with free space and missing-file detection.
- Tests: backend 122 (SQLite + Postgres), frontend 66. All green.
- **Owner's Mac disk is 98% full (23 GB free of 926 GB on 2026-11-09).** Full
  matches are several GB each; the Storage tab warns about this.

## How to run

Docker (normal use): see [DEVELOPMENT.md](../DEVELOPMENT.md) "Run everything in Docker".
Dev with hot reload: same file, "Run for development". Checks: [TESTING.md](../TESTING.md).

## Next steps (in order)

1. **Phase 4 leftovers:** calendar and card-gallery views of the timeline;
   "season highlights" shortcut once playlists exist.
2. Per-clip timing override (brief section 9) and playback history on the server.
3. Clip Explorer leftovers: notes and custom local tags on moments, export.
4. Playwright e2e for import → play → filter → playlist.
5. Phase 5/6: persistent jobs, clip export and highlight reels with ffmpeg,
   backup/restore, storage health.

## Blocked on / waiting for the owner

- [owner-decisions/002-hudl-access.md](owner-decisions/002-hudl-access.md):
  Hudl role, tag export availability, whether to ask Hudl for permission.

## Gotchas

- Backend: always `uv run ...` from `backend/` (Python 3.12 venv). Bare
  `python3` is 3.13 without the deps.
- Postgres test runs need the dev container `fm-pg-dev` on 127.0.0.1:55432
  and a `memories_test` database (TESTING.md).
- Port 8080 is used by the owner's HomeBoard app; Football Memories uses 8765.
- The inbox is mounted read-only in Docker on purpose (originals are never touched).
- `.gitignore` rules for footage are anchored to the root (`/library/`): an
  unanchored `library/` once hid `frontend/src/components/library/` from both git
  and Tailwind's class scanner (classes silently missing). Anchor new ignore rules.
- After adding a new folder of components, restart the Vite dev server if
  Tailwind classes look missing (it once served stale CSS). `npm run build` is
  the source of truth.
- Starlette 1.10 warns that its TestClient's httpx use is deprecated; harmless.
- shadcn/ui is in the brief but not installed yet; primitives live in
  `frontend/src/components/ui/`. Decide before building forms-heavy screens.
