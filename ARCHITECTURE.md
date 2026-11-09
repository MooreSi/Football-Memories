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
                   ├─ connectors/   adapters: LocalImport (primary), Hudl (disabled), Mock (tests)
                   ├─ models.py     SQLAlchemy schema  ──▶ PostgreSQL (Alembic migrations)
                   └─ ffmpeg/ffprobe (subprocess)      ──▶ archive folder (bind mount)
```

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

Planned (brief section 14): playlists, playlist_items, playback_history, download/sync jobs, notifications, settings,
source media records. Each arrives with its migration and tests.

## Storage layout

```
<ARCHIVE_ROOT>/FootballMemories/
  Matches/<season>/<team>/<date> vs <opponent>/<original file name>
  Thumbnails/<sha256[:2]>/<sha256>.jpg
  Players/<player id>/photo-<hash>.jpg   (profile photo, 512x512, metadata stripped)
  Clips/  Compilations/                  (created when those features land)
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
| PUT | `/api/events/{id}/favourite` | favourite on/off (idempotent) |
| POST | `/api/events/{id}/viewed` | mark a moment watched |
