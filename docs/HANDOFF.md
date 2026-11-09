# Handoff

**Read this first.** Then [PROGRESS.md](todo/football-memories/PROGRESS.md) and
[DECISIONS.md](DECISIONS.md). Rules: [CLAUDE.md](../CLAUDE.md).

## What this is

**Football Memories**: a local-first web app that archives football match
footage (originally from Hudl), indexes tagged moments, and builds a player's
"memories" timeline. Full brief: [BRIEF.md](BRIEF.md). Design references:
[design/reference/](design/reference/).

## Current state (2026-11-09)

- Branch: **`phase1-foundation`** (not yet merged to `main`).
- Backend first vertical slice works and is tested: import a video from the
  inbox folder → copy + verify + thumbnail → index → list/detail API → stream
  with Range → tagged events from a sidecar CSV.
- Frontend: not started yet.
- Hudl: **no automation, by design** (Terms of Service). See
  [HUDL_INTEGRATION.md](../HUDL_INTEGRATION.md).

## How to run (development)

```bash
cd backend && uv sync                       # once
cd backend && uv run pytest                 # tests, SQLite
docker run -d --rm --name fm-pg-dev -e POSTGRES_USER=memories \
  -e POSTGRES_PASSWORD=memories -e POSTGRES_DB=memories \
  -p 127.0.0.1:55432:5432 postgres:17-alpine
export FM_DATABASE_URL=postgresql+psycopg://memories:memories@127.0.0.1:55432/memories
cd backend && uv run alembic upgrade head
cd backend && FM_ARCHIVE_ROOT=../data/archive FM_IMPORT_ROOT=../data/inbox \
  uv run uvicorn app.main:create_app --factory --reload --port 8000
```

API docs: http://localhost:8000/api/docs

## Next steps

1. Frontend scaffold (Vite + React + TS + Tailwind) with the design tokens.
2. Library page, Import page, Match detail page with player and event markers.
3. Docker Compose (db, backend, frontend) bound to 127.0.0.1.
4. Then phase 4 (Player Hub) per the brief.

## Blocked on / waiting for the owner

- [owner-decisions/002-hudl-access.md](owner-decisions/002-hudl-access.md):
  role on Hudl, whether tag export exists, whether to seek Hudl permission.

## Gotchas

- Use `backend/.venv` (uv, Python 3.12). Bare `python3` is 3.13 without deps.
- ffmpeg/ffprobe must be on PATH for tests (Homebrew on the Mac; in the Docker
  image for containers).
- Starlette 1.10 deprecates httpx in its TestClient (a warning only).
