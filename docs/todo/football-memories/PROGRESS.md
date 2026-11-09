# Football Memories: progress

Live status against [the brief](../../BRIEF.md). Update in the same commit as
the work (rule [60-handoff](../../system/rules/60-handoff.md)).

Status values: `done` (built + tested), `partial` (some of it, says what),
`todo`, `blocked` (says on what).

## Phase 1: Discovery and foundation

| Task | Status | Notes |
|---|---|---|
| Hudl capability research | done | HUDL_INTEGRATION.md; owner question 002 open |
| Architecture + decision log | done | ARCHITECTURE.md, docs/DECISIONS.md |
| Backend: FastAPI, SQLAlchemy, Alembic, Postgres | done | backend/ |
| Frontend: Vite, React, TS, Tailwind | todo | |
| Docker Compose | todo | |
| Design system + layout/navigation | todo | |
| Test environment (pytest, vitest) | partial | pytest done |

## Phase 2: Functional match library (first vertical slice)

| Task | Status | Notes |
|---|---|---|
| Models: team, season, team_season, player, match, media, tag, event | done | migration d9db012db345 |
| Local import connector (copy, verify, index, thumbnail) | done | backend/app/services/importer.py |
| Tag sidecar CSV import | done | format in HUDL_INTEGRATION.md |
| Match list/detail API, search, pagination | done | /api/matches |
| Video streaming with Range | done | /api/media/{id}/stream |
| Library UI | todo | |
| Match detail UI + player + event markers | todo | |
| Import UI | todo | |
| Team/season filters UI | todo | |

## Phases 3-7

Not started. See the brief section 26 for the task lists. Phase 3 (Hudl
connection) is **blocked** on owner decision 002 and Hudl's terms.

## Verification log (newest first)

### 2026-11-09 backend checkpoint
- `uv run pytest` (SQLite): 52 passed
- `TEST_DATABASE_URL=postgresql+psycopg://...@127.0.0.1:55432/memories_test pytest`: 52 passed
- `mypy app` (strict): no issues; `ruff check`: clean
- `alembic upgrade head` + `alembic check` on Postgres 17: no drift
- Not checked: Docker Compose build, frontend (not built yet), real Hudl footage
