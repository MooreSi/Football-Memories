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
| Configurable pre/post buffers in Settings | done | Settings > Playback; per-clip override still todo |
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
| Profile photo | done | python-multipart approved (D-009); re-encoded 512x512 JPEG, metadata stripped |
| Primary player on the dashboard | done | "Your player" card on the Library |

## Clip Explorer (brief section 10)

| Task | Status | Notes |
|---|---|---|
| Cross-match search with all brief filters | done | `/api/moments` |
| Results with thumbnail, player, type, match, date, start/end, duration, watched, offline | done | per-moment frame thumbnails |
| Play one / play all / shuffle, autoplay across matches, loop, speeds | done | QueuePlayer |
| Reorder (drag + buttons), save playlist, open/rename/reorder/delete playlists | done | rename is API-only for now |
| Favourite from results | done | |
| Compilation (highlight reel) | done | spec 080 |
| Notes, custom local tags, single-clip export | todo | |

## Backup and integrity (brief section 22)

| Task | Status | Notes |
|---|---|---|
| Database backups (manual + daily automatic, 14 kept) | done | JSON of every row in `Backups/` |
| Metadata / playlist export | done | download a backup |
| Restore (safe, atomic, undoable) | done | confirm + pre-restore backup |
| Media integrity verification | done | background SHA-256 |
| Missing-file detection | done | Storage tab |
| Relinking moved files | done | by size + hash, inside the archive |
| Rebuild thumbnails | done | match thumbnails |
| Rebuild search indexes | n/a | no separate index yet (queries hit the DB) |

## Phases 3, 5-7

Not started. See the brief section 26 for the task lists. Phase 3 (Hudl
connection) is **blocked** on owner decision 002 and Hudl's terms.

## Verification log (newest first)

### 2026-11-09 Highlight reels (branch highlight-reels)
- backend: 167 passed on SQLite and Postgres (real ffmpeg renders: output length, height, audio, silent sources,
  title cards, failure keeps previous output, crash recovery); ruff, mypy clean; migrations a1229716e71a, 77cf12b23a29
- frontend: 81 passed; typecheck and build OK
- real dev run: playlist "Best saves 2026" -> reel with subtitle and closing card; first render FAILED because the dev
  archive path was relative and ffmpeg runs in a scratch folder -> fixed (absolute folder settings, test first);
  re-render done in ~20 s: 84 s (6 x 13 s + 2 x 3 s), 1280x720, H.264 + AAC 48 kHz stereo; frames checked
- found while testing: backups were refused after any schema change -> older backups now restore (D-011)

### 2026-11-09 Backup, restore, integrity (branch backup-restore)
- backend: 149 passed on SQLite and Postgres (round trip identical, atomic failure, confirm, pre-restore undo,
  schema mismatch, fresh ids after restore, retention, auto-backup on startup); ruff, mypy clean; no schema change
- frontend: 71 passed; typecheck and build OK
- real dev Postgres: automatic backup appeared on server start; manual backup; deleted a playlist; restored in the
  UI after typing RESTORE -> playlist back with 6 items, next new id 2 (sequence reset); pre-restore backup listed;
  verify on the real archive: 2/2 ok

### 2026-11-09 Settings and storage health (branch settings-storage)
- backend: 122 passed on SQLite and Postgres (disk usage pinned in tests; a separate test covers low space); ruff, mypy clean; no schema change
- frontend: 66 passed; typecheck and build OK
- browser: Storage tab on real folders warned "Only 23.2 GB free (3% of the disk)"; set 10s before the tag ->
  match page started the 1:04 save at 0:54 and its hint said 10s; dev setting restored to 8s afterwards

### 2026-11-09 Clip Explorer (branch clip-explorer)
- backend: 109 passed on SQLite and Postgres; ruff, mypy clean; migration e801158e8984, no drift
- frontend: 60 passed; typecheck and build OK
- browser 1600px: rail matches reference 02; Save filter -> 6; Play all; autoplay crossed from the City
  video (2:20 save, started 2:12) to the Rovers video (0:12 save, started 0:04); saved "Best saves 2026"
  (API shows 6 items in queue order, 78s); 375px: fixed a 4px top-nav overflow (5 pills), no overflow now
- Not checked: playlist delete confirm dialog in the browser (API-tested), Safari/iPad

### 2026-11-09 Player photos (branch player-photos)
- backend: 85 passed on SQLite and Postgres; ruff, mypy clean; migration 3ea11db09197, alembic check no drift
- frontend: 49 passed; typecheck and build OK
- real upload against the dev API: a synthetic portrait carrying a fake GPS EXIF string came back as
  mjpeg 512x512 with no EXIF segment and no GPS text; shown on the card in the browser; then removed
  through DELETE (no files left in Players/1)
- Not checked: HEIC photos straight from an iPhone (not accepted: JPEG/PNG/WebP only)

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
