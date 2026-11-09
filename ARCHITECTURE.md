# Architecture

Football Memories is a **modular monolith**: one FastAPI backend, one React
frontend, one PostgreSQL database, run with Docker Compose on the owner's Mac.
Rules that enforce this shape: [docs/system/rules/30-architecture.md](docs/system/rules/30-architecture.md).
Decisions and their reasons: [docs/DECISIONS.md](docs/DECISIONS.md).

```
browser ──HTTP──▶ frontend (nginx: static React build, proxies /api)
                     │
                     ▼
                  backend (FastAPI)
                   ├─ api/          routes: validate, call one service, shape the response
                   ├─ services/     behaviour: importer, library queries, media, sidecar, paths
                   ├─ connectors/   adapters: LocalImport (primary), Hudl (server sync disabled), Mock (tests)
                   ├─ models.py     SQLAlchemy schema  ──▶ PostgreSQL (Alembic migrations)
                   └─ ffmpeg/ffprobe (subprocess)      ──▶ archive folder (bind mount)
```

Authorized desktop capture is a separate host-only process on 127.0.0.1:8766.
Settings talks directly to its scoped API; it opens ephemeral Chrome, captures
one accessible match and Sportscode tags into the inbox, then closes the session.
The existing importer copies/verifies/indexes that pair. It is independent of
server background sync and does not give the Docker backend a Hudl session.

## Backend layers

| Layer | Path | May | May not |
|---|---|---|---|
| API | `backend/app/api/` | parse/validate input, call services, map errors to HTTP | hold business logic, touch the filesystem directly |
| Services | `backend/app/services/` | all behaviour, DB access via SQLAlchemy sessions | import FastAPI |
| Connectors | `backend/app/connectors/` | describe and implement a footage source | claim a capability without working code |
| Paths | `services/paths.py` | turn user-supplied names into paths | (everything else must go through it) |
| Media | `services/media.py` | run ffprobe/ffmpeg | modify an input file |

## Frontend

Vite + React 19 + TypeScript + Tailwind v4 + TanStack Query + React Router.

| Path | Holds |
|---|---|
| `src/api/` | typed fetch client and API types (mirror `backend/app/schemas.py`) |
| `src/lib/` | pure logic (event filters, clip windows, formatting); unit-tested |
| `src/components/ui/` | design-system primitives (Button, Badge, EmptyState, PageHeader, Spinner) |
| `src/components/` | feature components (AppShell, MatchCard, EventPanel, VideoPlayer) |
| `src/pages/` | one file per route |
| `src/index.css` | design tokens (`@theme`); the only place colours are defined |

Design direction and references: [docs/design/DESIGN.md](docs/design/DESIGN.md).

## Data model (current)

| Table | Purpose | Key constraints |
|---|---|---|
| `teams` | a team (e.g. "Riverside U12") | unique name |
| `seasons` | "2026/27" | unique label |
| `team_seasons` | the team's **age group in that season** | PK (team, season) |
| `players` | a person who appears in tags; optional shirt number, position, photo path | unique display_name |
| `matches` | one game | unique (source, source_match_id); index (team, date), season |
| `media_assets` | a local file for a match (full match / clip / compilation) | unique sha256; path relative to ARCHIVE_ROOT |
| `tag_definitions` | source tag names, kept verbatim | unique (source, name) |
| `events` | a tagged moment = a time in a match | unique (match, source, source_event_id); index (match, time), tag |
| `event_players` | event ↔ player | PK (event, player); index player |
| `event_marks` | favourite + first-viewed time per moment | PK event (cascade); index favourite |
| `preferences` | key/value app preferences (`primary_player_id`) | PK key |
| `playlists` | a saved, named list | |
| `reels` / `reel_items` | highlight reels: name, title text, render status/progress/error, output file; items with per-clip pre/post trims | items cascade |
| `playlist_items` | moment + position in a playlist | unique (playlist, event); index (playlist, position); cascades from both |

Planned (brief section 14): playback_history, download/sync jobs, notifications, settings,
source media records. Each arrives with its migration and tests.

## Storage layout

```
<ARCHIVE_ROOT>/FootballMemories/
  Matches/<season>/<team>/<date> vs <opponent>/<original file name>
  Thumbnails/<sha256[:2]>/<sha256>.jpg
  Thumbnails/moments/<media sha[:16]>-<event id>.jpg   (per-moment frames, made on first view)
  Backups/<kind>-<YYYYMMDD-HHMMSS>.json   (manual, auto (14 kept), pre-restore, uploaded)
  Players/<player id>/photo-<hash>.jpg   (profile photo, 512x512, metadata stripped)
  Compilations/<reel name> (<id>).mp4    (rendered highlight reels)
  Compilations/.cards/<id>-opening.png   (title cards)
  Clips/                                 (created when single-clip export lands)
```

Paths in the database are relative to `ARCHIVE_ROOT`, so the archive can be
moved and re-mounted. The inbox (`IMPORT_ROOT`) is mounted read-only in Docker.

## API

OpenAPI: `/api/docs` (Swagger UI) and `/api/openapi.json`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | liveness |
| GET | `/api/connectors` | connectors and their real capabilities |
| GET | `/api/imports/inbox` | video files waiting in the import folder |
| POST | `/api/imports` | import one file (copy, verify, thumbnail, index, tags) |
| GET | `/api/matches` | paginated, searchable, filter by team/season |
| GET | `/api/matches/{id}` | detail with media and events |
| GET | `/api/media/{id}/stream` | the video, with HTTP Range (seeking) |
| GET | `/api/media/{id}/thumbnail` | JPEG thumbnail |
| GET | `/api/teams`, `/api/seasons` | filter options |
| GET | `/api/stats` | overview counts, top tags, recent moments (Library tiles) |
| GET / PUT | `/api/preferences`, `/api/preferences/primary-player` | the primary player (stored in the DB, survives restarts) |
| GET | `/api/players` | players with moment and match counts |
| GET / PATCH | `/api/players/{id}` | profile: totals, tag counts, team/season history, per-match series, co-tagged players; edit name/shirt/position |
| GET | `/api/players/{id}/moments` | cross-match moments, newest match first; filters `category`, `favourites`, `unwatched` |
| PUT / DELETE / GET | `/api/players/{id}/photo` | upload (multipart, re-encoded), remove, serve the profile photo |
| GET | `/api/moments` | Clip Explorer search across all matches: multi-value team/season/match/player (any/all)/type filters, date range, favourites, unwatched, text; newest/oldest; paginated |
| GET | `/api/moments/facets` | filter options with counts |
| GET | `/api/events/{id}/thumbnail` | a frame at the moment itself, cached under `Thumbnails/moments/` |
| GET / POST | `/api/playlists` | saved playlists (ordered moments) |
| GET / PUT / DELETE | `/api/playlists/{id}` | open, rename/reorder, delete (never deletes moments or files) |
| GET / PUT | `/api/settings` | clip timing: seconds before/after a tag (defaults 8 / 5, range 0-60) |
| GET | `/api/storage/health` | archive + import folder checks (exists, readable, writable, free space) and missing indexed files |
| GET / POST | `/api/backups` | list / make a backup (JSON of every row) |
| POST | `/api/backups/upload` | add a backup file from elsewhere (validated) |
| GET / DELETE | `/api/backups/{name}` | download / delete a backup |
| POST | `/api/backups/{name}/restore` | replace all rows; needs `{"confirm": "RESTORE"}`; writes a pre-restore backup first; one transaction |
| POST / GET | `/api/storage/verify` | start / poll background SHA-256 verification of every video |
| POST | `/api/storage/relink` | find moved videos under the archive by size + hash and re-point them |
| POST | `/api/storage/rebuild-thumbnails` | recreate missing match thumbnails |
| GET / POST | `/api/reels` | highlight reels: list / create (ordered moments, per-clip trims, title text) |
| GET / PUT / DELETE | `/api/reels/{id}` | open / edit (409 while rendering) / delete (removes its video and cards, never sources) |
| PUT / DELETE | `/api/reels/{id}/cards/{opening,closing}` | title card PNG drawn by the browser |
| POST | `/api/reels/{id}/render` | queue a render (background worker; progress on the reel) |
| GET | `/api/reels/{id}/video` | the rendered MP4 (Range; `?download=1` as attachment) |
| PUT | `/api/events/{id}/favourite` | favourite on/off (idempotent) |
| POST | `/api/events/{id}/viewed` | mark a moment watched |
