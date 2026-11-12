# Football Memories: progress

Live status against [the brief](../../BRIEF.md). Update in the same commit as
the work (rule [60-handoff](../../system/rules/60-handoff.md)).

Status values: `done` (built + tested), `partial` (some of it, says what),
`todo`, `blocked` (says on what).

Consolidation checkpoint: `main` fast-forwarded through e2af610, including the
separate package split and complete spec 180. Every local/remote branch tip is
an ancestor; no branches deleted. Docs-only handoff update after the green suites;
no additional code or live capture needed. App/helper run the verified source.

## Spec 190 owner request batch (2026-11-10)

| Item | Status |
|---|---|
| Moments into `moments/` folder | done (tests; not run against real Hudl) |
| Downloaded tab with metadata | done (tests) |
| Library thumbnail download badges | done (tests) |
| Full-resolution snapshots | done (tests with synthetic HLS; real poster grab not yet observed) |
| Both crests on Library hero | done (browser-checked, dev data) |
| Make Highlight Reel + Clips tidy-up | done (tests, browser-checked studio) |
| Player "Plays for" crest + card styles | done (tests, browser-checked gold) |
| Logo, wordmark, full-width banner | done (browser-checked) |
| Batch download moments | done (tests with fakes; not run against real Hudl) |
| Animated reel cards, auto match details, UK date | done (browser-checked previews; recording + real render not run) |
| Player card Moments / Games | done (tests, browser-checked) |
| Installers `.command` / `.bat` | written; `bash -n` passes; not executed (would install software) |
| Settings > Update + header flash | done (tests with fake git; real update not run) |
| ZIP copies update themselves (2026-11-12) | done (real-git tests; linked a real GitHub ZIP and an older archive on this Mac with Apple Python 3.9, then fast-forwarded; Windows `.bat` rewritten, not executed) |
| My Player recent-match bars name the game (vertical text-xs opponent, horizontal date) | done (tests, browser-checked on real data, 2026-11-11) |
| Library Match Profile radar replaces Most tagged, follows the hero (D-029) | done (tests, browser-checked on real data, 2026-11-11) |
| Match Profile split into our team v opposition; hub feed and date strip removed; timeline crests; full name on Your player (D-030) | done (tests, browser-checked on real data, 2026-11-11) |
| Settings: no player/match list, Hudl beside Import | done (tests) |
| One highlight reel per match (spec 200): batch tile + studio Save as switch, `reel.per_match` | done (tests; studio browser-checked on real library, nothing made; not run against real Hudl) |

## Spec 180 completed
- Selected-age indexing, manifest duration fallback, persistent age/season,
  no Team filter, compact Clips/timeline and readable append-only download names.
- Backend 318 SQLite/Postgres sequentially; frontend 146; lint/format/mypy,
  schema drift, TypeScript/build clean. Existing build chunk warning retained.
- Live U11-only sweep completed 87 checks (57 tagged / 28 none / 2 invalid
  timelines; 74,260 cached ranges), crossed prior five-failure stop; 1080p
  H.264 26.04s goal exported from covering segments and downloaded (21,178,316
  bytes, SHA-256 identical). Seven prior archive files unchanged. No full capture.
- Desktop and 375px: Library persistence and Clips/timeline checked; chart/grid
  overflow repaired. Docker/helper restarted. No credential/session policy change.

## Library/Clips polish (spec 180)

Package split checkpoint: hudl_browser public API preserved, implementation
moved verbatim under _capture/_account; only existing mock targets relocated
(and wrapped). Backend 308 passed SQLite/Postgres; frontend 140 passed;
ruff/format/mypy/schema/types/build clean. No behavior change or live Hudl
operation. Feature work and app restart are next.

## Streaming tag cache (spec 160)

| Task | Status | Notes |
|---|---|---|
| Retain native playback tags without full download | done | observed view contract, shared validation, legacy strict unchanged |
| Wait for later tag responses / persist local metadata | done | quiet window regression; both live caches survived helper restart |
| Tag-first native HLS playback | done | red regression; 1080p seek and advancing playback verified |

## Independent Hudl video / tag-sync outcomes (spec 150)

| Task | Status | Notes |
|---|---|---|
| Allow account video with unverified tag sync | done | narrow exception; strict parser and access failures unchanged |
| Explicit tag warning and disabled invalid exports | done | UI regression and reported match checked |
| Full source capture | done | real U11 1080p HEVC/AAC captured, attachment SHA-256 identical, actual playback verified |

## Hudl team-library age groups (spec 140)

| Task | Status | Notes |
|---|---|---|
| Read actual team selector and visit each served library | done | verified team context routes; U10 100 / U11 87 / U12 99 cached live |
| Preserve real memberships across cache restart/shared videos | done | sanitized age_groups override title fallback; legacy metadata still readable |
| All matches filtering and thumbnails | done | all three filters selected in app; 286 images cached; U11 left selected |

## Unified All matches repair (spec 130)

| Task | Status | Notes |
|---|---|---|
| Restore dashboard and place connected cards inside All matches | done | shared age/season/search filters; consistent cards, Show more; desktop and 375px checked |
| Repair disappearing catalogue on refresh from playback | done | verified library routes/metadata only; cache preserved on failure; 100 videos/thumbnails recovered live |
| Visible helper failure and stale-filter recovery | done | retry message, local metadata refetch, invalid saved age cleared |

## Connected Library workflow (spec 120)

| Task | Status | Notes |
|---|---|---|
| Main Library age groups and cached thumbnails | done | all 100 thumbnails cached live; U10 filter shows 90 videos |
| My Player tagged-code selection | done | explicit selection links only matching code events; remote code profiles use cached ranges |
| Highest-quality automatic playback/capture | done | max served resolution then bitrate; separate names preserve capped copies |
| Discoverable match / player / moment download controls | done | highest source captured; selected-goal ZIP downloaded, codec/resolution and old-file preservation verified |

## Current checkpoint: saved Hudl account and team identity (spec 110)

| Task | Status | Notes |
|---|---|---|
| Keychain Save/Test, normal login and metadata cache | done | owner saved/tested; 100 accessible videos cached; Keychain login after restart verified |
| Cached match Stream/Download chooser | done | 720p playback verified; existing capture reused with MP4/CSV checksums unchanged |
| Real team crests | done | official Villa/Stoke images cached; verified on Library, shared Moments badge |
| Consistent My Player styling | done | shared charcoal panels, periwinkle shield/bars; synthetic player browser preview checked |

## Phase 1: Discovery and foundation

| Task | Status | Notes |
|---|---|---|
| Hudl capability research | done | HUDL_INTEGRATION.md; owner question 002 answered |
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
| Single-clip export | done | Export clip → one-item reel → Download MP4 |
| Notes, custom local tags | todo | |

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

Phase 3 desktop capture is implemented within owner-attested permission (002,
D-012); real capture/import/clip download verified. Server background sync and
resumable capture remain unavailable. Phase 5 highlight rendering and phase 6
backups/integrity are implemented above; remaining tasks are in brief section 26.

## Verification log (newest first)

### 2026-11-11 One reel per match (spec 200, main)

- Backend `uv run pytest`: 367 passed on SQLite and 367 on Postgres (sequential);
  ruff check, mypy, alembic check clean. `ruff format --check` flags only
  `tests/test_installers.py`, which this change did not touch (it was flagged before too).
- Frontend: 197 passed; typecheck and build OK (existing chunk-size warning).
- New tests seen red first: per-match batch (made one reel), route (400 on
  `per_match`), BatchDownload tile and two studio tests (controls missing).
- Browser: batch tile shows, opens studio in per-match mode with the first
  match card, no opening card, "Make N highlight reels"; switching back restores
  the opening card. Long-reel warning hidden in per-match mode. Make was not
  pressed: the running helper (port 8766) still has the old code and needs a
  restart before it accepts `per_match`. No Hudl access.

### 2026-11-11 GitHub social preview (codex/github-social-preview)

- Added synthetic artwork and upload instructions in `docs/design/`.
- `sips -g pixelWidth -g pixelHeight -g format docs/design/social-preview.jpg`:
  1280 × 640, JPEG. `stat -f '%z bytes'`: 214610 bytes, below 1 MB.
- Visually inspected the resized image; title and tagline are readable with
  no cropping. Verified new local documentation links and identical Downloads copy.
- Asset/docs only: app suites not rerun; no Hudl access or GitHub setting changes.


### 2026-11-10 Streaming tag cache (codex/hudl-stream-tags)
- Backend: 273 passed SQLite and 273 Postgres; ruff check/format, mypy and
  Alembic drift clean. Frontend: 101 passed; typecheck/build passed. Docker
  rebuilt and /api/health ok. Initial frontend/backend overlap was corrected by
  repeating frontend independently after backend completion.
- Red regressions: modern tags omitted, later response lost, native tag-first
  load missing, cached-state text missing. Pre-existing tests unchanged.
- Live: U11 Stoke 2,191 tags/66 codes; West Brom 1,927/65. Goal seeks and
  advancing 1080p/720p streams verified. No full download; all ten original
  MP4/CSV SHA-256 unchanged. Tags returned after helper restart without session.
- No new clip export or full capture run. Screenshot is private ignored data.

### 2026-11-10 Unsynced tags no longer block account video (codex/hudl-optional-tags)
- Backend stream/download regressions watched red/green; full copy uses real
  4-second media with identical SHA-256 and zero CSV rows. GraphQL-error test
  passed initially, failed when catch was deliberately broadened, then passed
  after restoration. Existing strict parser tests unchanged.
- Final `uv run pytest -q`: 267 SQLite and 267 PostgreSQL passed; ruff
  check/format, mypy and alembic no drift green. Frontend `npm test`: 99 passed;
  typecheck/build green. Docker rebuilt/health OK; no CI workflow.
- Reported U11 match prepares/plays its 1920×1080 stream and shows the separate
  unsynced-tag warning with moment export disabled. Full capture completed as
  HEVC/AAC, 6195.52 seconds, 3,721,611,743 bytes. The app attachment downloaded
  to Downloads; SHA-256 matches the verified inbox source. Empty CSV has zero
  unverified tag rows. Playback advanced with readyState 4 and no media error;
  paused after checking. Helper on 8766 is idle. Proof in ignored local data.
- Eight pre-existing inbox MP4/CSV files rechecked after capture against SHA-256
  baseline: zero changes. No upstream sync change, invented ranges, credentials/session storage
  change or existing footage overwrite.


### 2026-11-10 Actual Hudl team age groups (codex/hudl-team-age-groups)
- Eight backend regressions and one frontend regression watched red/green:
  served team links only, membership persistence, serial discovery, avatar label,
  Home landing, hidden empty menu labels, fragment normalization/fresh reload,
  and shared-video U11 filtering despite its U10 title. Old tests unchanged.
- Final backend `uv run pytest -q`: 264 SQLite, then 264 PostgreSQL passed.
  Ruff check/format, mypy and alembic no drift green. An earlier PostgreSQL run
  was interrupted to address a newly reproduced discovery edge; final run green.
- Frontend `npm test`: 98 passed; typecheck/build green. Docker rebuilt/health OK.
- Live normal-login listing followed only served team-context links. Cached 286
  unique videos and 286 thumbnails, with U10 100, U11 87, U12 99. Selected all
  three filters in All matches and verified counts/real U11 thumbnails; repeat
  refresh retained membership/catalogue. No new footage download.
- Staged secret-word scan: three hits reviewed (two synthetic rejection/leak
  probes, one existing Save/Test description); no secret values or media staged.
  Local Markdown links resolve.
- Temporary counts-only diagnostics removed. No credential/session persistence
  changes or account mutations. No CI workflow; bounded discovery does not prove
  exhaustive enumeration of every historical item.


### 2026-11-10 Unified All matches repair (codex/unified-match-library)
- Backend `uv run pytest -q`: 256 passed SQLite, then 256 PostgreSQL with
  TEST_DATABASE_URL. Network-block and scrub checks included. Ruff check/format,
  mypy and alembic check green. Existing tests unchanged.
- Frontend `npm test`: 97 passed; typecheck/build green. Docker rebuilt, health OK.
- Playback-cache/season/placement regressions watched red first. Later redirect
  and API age-count tests failed with intentionally removed guards, then passed
  after restoration. Additional cross-page link contamination watched red/green.
  Positive remembered-route test added afterward, then failed with traversal
  deliberately disabled and passed after restoration.
- Live authorized read-only helper restart/login/refresh recovered 100 cached
  videos, 100 thumbnails, zero Tags navigation entries. Opened one match and
  refreshed from playback: catalogue still 100. U10 + 2025/26 gives 61 videos.
- Desktop dashboard restored; All matches contains Hudl cards and common filters.
  375px DOM width 375, no overflow. Local proof: data/unified-all-matches.png.
- Staged secret-word scan: one context-only hit describing the existing Save/Test
  form; no secret values or media staged. Local Markdown links resolve.
- No new footage download or file replacement. No credential/session persistence
  changes. Large-library exhaustive enumeration and native Safari HLS remain
  unverified; no CI workflow exists.



### 2026-11-10 Connected Library live completion
- Live main Library: 100 cached thumbnails, U10 shows 90 videos, mixed ages and
  Unclassified remain separate. 375px viewport/content both375, images loaded.
- Dedicated match prepares maximum rendition and caches 1,717 actual tag ranges.
  Download selected goal captured all 1,257 media parts and verified a separate
  source: 1280×720 H.264, 5012.24s, 1,511,015,451 bytes. This video's served
  maximum is 720p. No invented/upscaled quality.
- ZIP passed testzip and downloaded through actual browser attachment into
  Downloads. Clip: 1280×720 H.264, 26.056s, 8,034,016 bytes; stream copy retains
  source encoding. Original ranges/labels included. Previous video and tag CSV
  SHA-256 unchanged.
- Final helper restarted on current code. Full Download selected the existing
  maximum-quality file; its attachment returned206 and MP4 header. Resume stream
  retained completed attachment. Final UI playback reached15.43s at1280×720,
  readyState4. Keychain login required no credential re-entry.
- Final gates: backend250 SQLite/Postgres, frontend94, lint/format/types/build,
  alembic and Docker health green. Docker browser-module hash matches source.
  All staged scan hits reviewed; no secrets/private assets staged. No CI exists.
- Not separately checked: native Safari HLS, exhaustive history enumeration,
  multi-code exports at the 2,000-range limit. Tag cache covers opened videos.

### 2026-11-10 Connected Library checkpoint (codex/hudl-library-workflow)
- Watched new metadata/age/quality/legacy-reuse tests red, then green. Watched
  tagged-code endpoints fail before implementation, and Library thumbnail/age
  UI test fail against its empty component. Untagged full-download request test
  failed on the old tag-required path before fixing it.
- Later detail-route/player-link tests got explicit negative controls: removed
  the no-Origin requirement -> foreign-origin attachment test failed; removed
  category-to-player linking -> player moment count test failed. Restored both.
- Frontend selected-range and explicit-player tests were added afterward; their
  deliberate wrong-ID/wrong-category negative controls failed as expected, then
  sources restored. Same-match stream resumption also retains completed download
  links; removing that preservation made its regression test fail.
- Final backend gates: 250 passed SQLite and 250 PostgreSQL; ruff/format/mypy
  clean; alembic no drift (no schema changes).
  Frontend: 94 passed, typecheck/build clean. No existing tests changed.
- Live refresh: 100 thumbnails cached; U10 filter shows 90 videos. Opened match
  auto-prepared highest stream and cached 1,717 ranges. Selected-goal ZIP job is
  downloading its separate maximum-quality full source; keep helper alive.
- Thumbnail Library proof screenshot in ignored data/hudl-age-library.jpg.
  No user credentials, real roster fixtures or media added to Git.

### 2026-11-10 Live saved-account verification and empty-prefetch fix
- Owner entered credentials in the app and clicked Save/Test. Helper reports
  configured=true, ready, 100 accessible videos cached. No secret values read
  into agent outputs. After helper restart, Keychain normal login succeeded
  without password re-entry.
- Streaming initially stopped on an empty 200 speculative playlist response.
  Added `test_empty_prefetch_is_not_playback_evidence`, watched it fail, then
  reject non-EXTM3U bodies before recording them. No existing test changed.
- In-app stream then played: duration 5012.2s, currentTime 8.8s/16s, readyState4,
  videoWidth1280 (720p). Proof screenshot stays in ignored data/.
- Cached chooser Download for the previously captured match returned the
  existing file + Import link. SHA-256 confirmed both video and CSV unchanged.
- Backend: 238 passed SQLite and 238 PostgreSQL, ruff/format/mypy clean,
  alembic no drift. Frontend: 91 passed, typecheck/build clean.
  Docker rebuilt and health returned ok. Markdown links resolve; staged scan
  hits are documentation terms only. No CI workflow exists.
- Not separately tested: native Safari HLS, all historical library pages,
  fresh full-match capture through chooser (earlier underlying capture verified).

### 2026-11-10 Saved account checkpoint (codex/hudl-account-library)
- `uv run pytest`: 237 passed SQLite; `TEST_DATABASE_URL=… uv run pytest`:
  237 passed PostgreSQL. Ruff check/format, mypy clean; alembic no drift.
- `npm test`: 91 passed; typecheck and build clean. HLS light player is lazy
  loaded (362kB separate chunk; main 470kB), no large-chunk warning.
- New core tests watched red before implementation. Stream manifest test added
  later with explicit negative control: injected fake signed secret into the
  produced manifest, observed expected failure, restored and green.
- Docker Compose rebuilt successfully; `/api/health` returned status ok.
- Native Swift Keychain bridge compiled successfully. No test touches real
  Keychain or Hudl. Owner has not yet entered saved-account credentials.
- Official Villa/Stoke CDN PNGs fetched to ignored archive crest cache; Library
  and Moments visibly show both. My Player preview uses synthetic Sam Example and shared
  dark styling. Screenshot in ignored data/player-consistent-theme.jpg.
- Not yet live-proven: saved-account login/discovery, streaming, cached chooser
  Download action. Earlier manual capture/import/playback proof remains valid.
- No old tests modified or weakened; no schema changes. No CI workflow exists.

### 2026-11-09 Distinct reference-led screens (codex/reference-screen-redesign)
- Spec 100: charcoal dashboard with overview/hero/latest match, compact navy
  analysis workspace, and white/lime Player Profile with dark phone feed.
  Existing routes, real data, API calls and controls retained. No dependencies.
- Desktop Safari screenshots compared with all three owner-supplied references;
  375×812 responsive previews checked for each screen. Mobile analysis filters
  sit before the long moment list. Real Docker library also opened after rebuild.
- Backend: 220 passed SQLite, 220 Postgres; ruff check/format and mypy clean,
  Alembic no drift. Frontend: 88 passed unchanged; typecheck/build clean.
  Docker rebuild + HTTP health check passed. No Hudl access for this task.
- Pure presentation change: no new tests that mirror CSS. Existing behaviour
  suite retained. No new photos, generated people, ratings or invented metrics.


### 2026-11-09 Live Hudl capture verification (codex/hudl-access-research)
- Owner signed into the app-opened Chrome helper. Full capture finished:
  1,257 media parts, 5,012.2 seconds, 960×540 H.264/AAC, 287.9 MiB.
- Import UI indexed all 1,717 moments across 60 codes. Every range lies within
  the video; copied archive SHA-256 equals the inbox source. Local match and
  tagged-goal playback exercised. No Hudl mutations or saved session state.
- Export clip UI created a one-item reel without cards. Render completed;
  Download MP4 returned HTTP 200 attachment, 38.02 seconds, H.264/AAC at 960×540.
- Player-code association is tested offline; live run retained all codes as
  categories. Mobile and other Hudl products/accounts were not tested.
- Docs-only completion checkpoint after green implementation checks above.
  Local Markdown links checked. No GitHub Actions workflow exists; no CI claim.


### 2026-11-09 Authorized desktop Hudl capture checkpoint (codex/hudl-access-research)
- Implemented ephemeral Chrome login, observed HLS/Sportscode conversion, serial
  capture, verified exclusive publication, scoped localhost companion and Settings
  progress/import controls (spec 090, D-012). Playwright approved by owner.
- Clip Explorer exports a moment through the existing one-item reel renderer.
  Integrated existing highlight-reels commits to preserve the running DB schema.
- Backend: 220 passed SQLite and 220 Postgres; ruff check/format and mypy clean;
  Alembic no drift against dev Postgres. Initial check without FM_DATABASE_URL
  targeted unused port 5432; rerun against documented 55432 succeeded.
- Frontend: 88 passed; typecheck and production build passed. Docker rebuild and
  health check passed. Live full-match download is in progress after owner login;
  import/playback/export still need real-capture verification. Mobile not checked.
- Tests written red first for parsing/publication/companion/UI; browser transport
  truncation regression also checked with a failing negative control. All tests
  offline, with synthetic labels and local generated media.
- Fixed MPEG-TS ignore rule that silently excluded TypeScript: restored previously
  ignored frontend API/types/utilities/config to version control. No media included.


### 2026-11-09 Hudl normal-login and export research (branch codex/hudl-access-research)
- Docs-only checkpoint: reusable public login entry point redirects to Hudl
  identity authorization; final identity page and successful sign-in not tested.
- Public Hudl sources checked for role-dependent downloads, athlete-linked
  reports, tag filters and product-specific breakdown/XML exports. Exact owner
  account capabilities and export schema remain unknown; connector unchanged.
- Local Markdown links checked; no code/test changes, so runtime suites not run
  (docs-only procedure in `/commit`). No authenticated Hudl access or downloads.

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


Live completion follow-up (docs-only checkpoint): verified actual full capture,
browser download checksum and 1080p playback; updated pending handoff/spec facts.
No source changes or additional test run were needed after the green checkpoint.
