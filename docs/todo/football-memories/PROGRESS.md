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
| Frontend: Vite, React 19, TS, Tailwind v4, TanStack Query | done | frontend/ |
| Docker Compose | done | db + backend + nginx frontend on 127.0.0.1:8765; inbox mounted read-only |
| Design system + layout/navigation | done | tokens in src/index.css; docs/design/DESIGN.md; shadcn/ui not added yet (D-009 pending) |
| Test environment (pytest, vitest) | partial | pytest + vitest done; Playwright not set up |

## Phase 2: Functional match library (first vertical slice)

| Task | Status | Notes |
|---|---|---|
| Models: team, season, team_season, player, match, media, tag, event | done | migration d9db012db345 |
| Local import connector (copy, verify, index, thumbnail) | done | backend/app/services/importer.py |
| Tag sidecar CSV import | done | format in HUDL_INTEGRATION.md |
| Match list/detail API, search, pagination | done | /api/matches |
| Video streaming with Range | done | /api/media/{id}/stream |
| Library UI | done | grid cards, search, team/season filters, load-more pagination, empty states |
| Match detail UI + player + event markers | done | markers, moments-only playlist, AND/OR filters, speeds, frame step, PiP, fullscreen, shortcuts, resume |
| Import UI | done | inbox list, form, season guess, 409 link to existing match |
| Team/season filters UI | done | |

### Phase 2 gaps still open

| Task | Status | Notes |
|---|---|---|
| Grid/list toggle, sort options, multi-select, bulk ops | todo | brief section 7 |
| Watched/unwatched, favourite-player counts on cards | todo | needs phase 4 tables |
| Configurable pre/post buffers in Settings | todo | fixed 8s/5s today (src/lib/events.ts) |
| Resume position stored server-side | todo | browser localStorage today |
| Vidstack evaluation | todo | D-006 |
| Playwright e2e for the slice | todo | checked by hand, see log |

## Phase 4: Player Hub

| Task | Status | Notes |
|---|---|---|
| Primary player, persistent across restarts | done | `preferences` table; test restarts the app on the same DB |
| Player Hub (reference 03) | done | spec 040-player-hub.md |
| Cross-match player moments query + filters | done | `/api/players/{id}/moments` |
| Favourites and viewed tracking | done | `event_marks`; match page hearts + unwatched dots; feed marks watched on play |
| Memories Timeline | partial | timeline + favourites/unwatched/by-type views; calendar and card-gallery views todo |
| Profile photo | todo | needs a new runtime dependency (owner decision) |
| Primary player on the dashboard | done | "Your player" card on the Library |

## Phases 3, 5-7

Not started. See the brief section 26 for the task lists. Phase 3 (Hudl
connection) is **blocked** on owner decision 002 and Hudl's terms.

## Verification log (newest first)

### 2026-11-09 Player Hub (branch phase4-player-hub)
- backend: 73 passed on SQLite and on Postgres 17; ruff, mypy clean; migration f7153841c25d, alembic check no drift
- frontend: 44 passed; typecheck and build OK
- browser (1600px): chose Sam Example as primary; hub matches reference 03 layout; feed played the
  0:08 save from 0:00, unwatched 10 -> 9; heart -> favourites 1 and Favourites view shows only it;
  Edit set shirt 1 + Goalkeeper (shown on card and feed label); timeline grouped Nov/Oct 2026;
  Library shows the Your player card; phone 375px no horizontal scroll
- Not checked: Safari/iPad, keyboard-only walkthrough of the hub, large libraries

### 2026-11-09 UI rebuilt from the owner's reference images (branch ui-reference-layouts)
- Library now follows reference 01 (pill nav, tiles, hero carousel, Watch now panel); Match page
  follows reference 02 (tag rail, clip bar, chips, pinned timeline). New `/api/stats`.
- backend: 55 passed on SQLite and Postgres; ruff, mypy clean
- frontend: 32 passed (EventPanel tests replaced by MomentsRail/MomentTimeline tests covering the
  same behaviours plus counts, All moments and pin placement); typecheck and build OK
- found and fixed: unanchored `library/` in .gitignore hid the new components from git and Tailwind
- browser: desktop 1600px, tablet 768px, phone 375px (no horizontal scroll); pin click at 1:04
  started playback at 0:56; `?moment=` deep link plays that moment

### 2026-11-09 vertical slice complete (branch phase1-foundation)
- backend `uv run pytest`: 52 passed (SQLite) and 52 passed (Postgres 17)
- `ruff check`, `ruff format --check`, `mypy app` (strict): clean; `alembic check`: no drift
- frontend `npm test`: 22 passed; `npm run typecheck`: clean; `npm run build`: OK
- negative control: planted "overwrite allowed" in importer -> 1 test failed
  (`test_never_overwrites_an_existing_different_file_at_the_target_path`); restored -> 52 passed
- manual, dev servers: imported a 3-min synthetic 1280x720 match + 7-tag CSV through the
  UI; library card, detail page, 7 markers; "Play 7 moments" started at 0:04 (12s - 8s)
  and advanced to the 0:31 moment after the window ended
- Docker Compose: built and ran; through nginx on :8765 import 201 with 7 events,
  Range 206, thumbnail 200 image/jpeg, duplicate 409; inbox original unchanged
- Not checked: real Hudl footage, Safari/iPad, keyboard-only walkthrough, large libraries

### 2026-11-09 backend checkpoint
- `uv run pytest` (SQLite): 52 passed
- `TEST_DATABASE_URL=postgresql+psycopg://...@127.0.0.1:55432/memories_test pytest`: 52 passed
- `mypy app` (strict): no issues; `ruff check`: clean
- `alembic upgrade head` + `alembic check` on Postgres 17: no drift
- Not checked: Docker Compose build, frontend (not built yet), real Hudl footage
