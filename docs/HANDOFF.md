# Handoff

**Read this first.** Then [PROGRESS.md](todo/football-memories/PROGRESS.md) and
[DECISIONS.md](DECISIONS.md). Rules: [CLAUDE.md](../CLAUDE.md) (any agent) and
[60-handoff.md](system/rules/60-handoff.md) (how to leave the work).

## What this is

**Football Memories**: a local-first web app that archives football match
footage, indexes tagged moments, and (next) builds a player's memories
timeline. Full brief: [BRIEF.md](BRIEF.md). Design references:
[design/](design/DESIGN.md).

## Current state (2026-11-11)

- **Library names our side from Plays for (2026-11-12, owner report):** the hero,
  Latest match panel and Match Profile used only the newest imported team, so a
  fresh install showed "Home vs. Stoke City". LibraryPage now uses `useHomeClub`
  like Downloaded and Reel Studio. Test plus browser check on dev data.

- **New-folder install could not reach its database (2026-11-12, owner report):**
  a second ZIP in a new folder got a new `.env` password, but the shared
  `football-memories` database volume kept the first one; backend crash-looped
  and the installer said "did not answer on port 8765". Installers now sync the
  db role password from `.env` before starting the backend
  (`scripts/mac/sync-db-password.sh`, tested; `scripts/windows/sync-db-password.ps1`,
  not run on Windows), use curl/HTTP timeouts, and print the backend's last log
  lines on failure. Reproduced and fixed end to end with scratch Docker projects.

- **ZIP copies update themselves (2026-11-12, owner report from a second Mac):**
  `backend/app/connectors/git_adopt.py` links a folder unzipped from GitHub to
  the exact `main` commit it came from (new `.git`, index only, no file
  changed); Settings > Update runs it on the first check, both installers in
  step 4 (Mac: Apple `/usr/bin/python3`; Windows: `uv run --no-project`, uv now
  installed in step 3 with Git). Installers restart themselves after a pull
  that moved HEAD. Settings > Update now shows any helper 400 message instead
  of "helper not running". **The Windows `.bat` had been broken since 46034aa**
  (labels spliced into the Docker block, `:check_wsl` missing, so WSL check and
  Docker download misbehaved); rewritten and covered by a label-structure test.
  Verified on this Mac with GitHub's real ZIP and an older archive. **Not run
  on Windows.** The owner's existing ZIP Mac needs the one-time Terminal
  command in INSTALL.md (Updating), since its old installer cannot link itself.

- **One reel per match (spec 200, `main`):** batch download has a fourth tile,
  and the Reel Studio has a Save as switch (One reel / One reel per match).
  Per-match mode drops the opening card. Each match is fetched in turn, then
  saved as its own verified reel in `reels/`
  (`POST /account/batch` with `reel.per_match`). Tests and a browser check pass. Deployed:
  frontend image rebuilt (`docker compose up -d --build frontend`; a plain
  restart reuses the old bundle) and helper restarted on the new code (log
  `data/helper.log`). Not run against the real account.

- **`.env` fix:** `.gitignore`'s `.env.*` also ignored `.env.example`, so every
  GitHub copy lacked the template; the installers' `cp`/`copy` failed silently,
  no `.env` was written and compose stopped on `FM_DB_PASSWORD`. Template now
  tracked (`!.env.example`); the settings step moved to
  `scripts/mac/ensure-env.sh` (tested in `backend/tests/test_installers.py`) and
  `scripts/windows/ensure-env.ps1`, which fill in a missing/blank password and
  never change an existing one. Fresh-checkout compose config verified on Mac.

- **Installer fixes (owner report from a new Mac and a Windows PC):**
  Windows installer now checks WSL 2 + Virtual Machine Platform first (no
  admin), and if missing runs `scripts/windows/setup-wsl.ps1` elevated (one
  UAC prompt): enables both features, `wsl --install --no-distribution`,
  offers a restart and re-runs itself once via HKCU RunOnce. Smart App Control
  blocks browser-downloaded `.bat` files (Mark of the Web, no override), so
  `install-windows.ps1` is a one-line `irm | iex` bootstrap that fetches the app
  with git (or the ZIP via PowerShell) and runs the installer; the `.bat` also
  unblocks its own scripts. **Not executed on real Windows** (no Windows here);
  PowerShell parsed in a container only. Mac `forkpty: Resource temporarily
  unavailable` is Terminal failing before the installer starts (process limit
  reached); no installer cause found, troubleshooting added to INSTALL.md,
  owner asked for `ps` output if it recurs.

- **Social preview on `codex/github-social-preview`:** upload-ready
  [JPEG](design/social-preview.jpg) and [instructions](design/social-preview.md).
  Verified 1280 × 640, 214,610 bytes; visually checked after resizing.
  Asset/docs only; no app suites rerun or GitHub setting changed.

- **Renamed:** GitHub repo is now `MooreSi/Football-Memories` (was
  Football-Clip-Recorder; GitHub redirects the old URL) and the local folder
  is `/Users/simon/Football Memories`. Release **v0.1** published; About and
  topics set; README rewritten for users with synthetic-data screenshots in
  `docs/screenshots/`. The 18 old feature branches (all fully merged, 0 unique
  commits each) were deleted on the owner's go-ahead; `main` is the only branch.

- **Latest polish:** Recent moments read from kick-off (times are true video
  time; matches run about 1h23m); every crest sits on the same white disc with
  the same inset; overview tiles keep one number size with the unit below and
  scale to the tile; Downloaded has Play (full match, combined video, reel as
  one MP4 with its cards; a moments ZIP plays clip by clip via
  `/downloads/members`). `_account.py` split into `_batch.py` and `_tags.py`
  to stay under 800 lines.

- **Snapshot backfill:** only 4 of 286 matches had full-quality posters (they
  were made only on stream or first tag index). The paced sweep now also makes
  posters for indexed matches in the selected age group, one Hudl page at a
  time with a 2.5 s pause; failures are retried weekly (`poster_checked_at`).
  App open starts it automatically. Not yet observed running live.

- **D-027 follow-ups on `main`:** reel assembly accepts browser-recorded
  cards (the "A reel part could not be read" failure); one-word clubs get
  crests (Liverpool, Arsenal verified live); Library Recent moments / Most
  tagged follow the hero match and Overview counts the selected age/season;
  Hudl helper runs on Windows with Windows Credential Manager (ctypes adapter
  untested on real Windows; installer not executed). Helper restarted on the
  new code.

- **Spec 190 (owner batch of 16 requests) on `main`:** see
  [190-owner-requests-nov10.md](todo/football-memories/190-owner-requests-nov10.md)
  and PROGRESS. Player card styles, club crest and Moments/Games; Library hero
  crests and download badges; Downloaded tab; moments/ and reels/ folders with
  a download index; full-resolution snapshots; new logo and banner; reel studio
  with six animated card themes and auto-filled match cards; batch download;
  Settings > Update (helper-side git, fast-forward only) with header flash;
  Mac/Windows installers (INSTALL.md). Backend 341 (SQLite and Postgres),
  frontend 171. **Not live-verified against Hudl:** batch export, reel
  recording and render, poster grab, update apply; installers were not
  executed (they install software). Migration b190c1ab0001 adds two
  player columns. Deployed: Docker rebuilt (migration applied), helper
  restarted on the new code (PID 64788, log `data/helper.log`, ends the old
  in-memory Hudl session). Live: update check via git (up to date), download
  index found the 2 existing full captures, Downloaded tab and Library badges
  render on real data. Liverpool shows initials: single-word club names are
  rejected by the crest lookup as ambiguous (team_logos.py), a known gap.
- **Current branch: `main`**, including every local and remote feature branch
  through `codex/library-clips-polish` (owner requested all-branch merge).
  Spec 110 adds username/password Save/Test through macOS
  Keychain, normal-login accessible match cache, in-app Stream and verified
  Download → Import. Owner approved hls.js. Server background sync remains off.
  Shared TeamBadge now caches real club crests (Aston Villa/Stoke verified in
  Library); My Player uses shared charcoal panels/periwinkle accents, preserving
  the reference card/chart/feed layout. Browser preview checked on synthetic
  Sam Example. Owner Save/Test cached 100 accessible videos; Keychain login
  after helper restart and in-app 720p streaming verified. Download reused the
  captured match and offered Import; MP4 and CSV checksums unchanged.
- **Spec 180 complete:** Library team selector removed; age/season persist and
  scope metadata indexing to the selected team's served memberships. Fixed
  premature video-duration failures using recorded manifest duration (no video
  fetch). Clips has one main workspace and secondary saved-clips/playlist tools;
  memories merge into season/month cards with six moment previews, twelve match
  previews and explicit expansion. Phone grid/chart overflow fixed. Friendly
  attachment/ZIP member names include fixture, venue or player/type, ISO date;
  stable old capture identities remain reusable. Live U11 sweep completed all
  87 checks: 74,260 ranges (57 tagged / 28 without tags / 2 invalid timelines).
  A 1080p H.264 26.04s goal ZIP downloaded with
  matching SHA-256. Seven pre-existing archive files unchanged. Docker rebuilt
  and restarted; host helper PID 9872. Desktop/375px checked. Backend 318 /
  frontend 146 green.
- **D-024 (2026-11-10, owner report):** tag sweep no longer stops on
  unreadable videos (saved as unavailable with reason, retried weekly) and
  reports overall progress. 28 of 286 matches indexed before this fix. Check
  `tag_error` in `data/.hudl-account/details/*.json` to learn why the
  unreadable ones fail.
- **D-023 (2026-11-10, owner request):** moment downloads fetch only the
  covering stream segments (stream keeps playing); Clips shows the full
  explorer under the match picker; app open auto-checks Hudl (6 h) and indexes
  missing tags; hub/card/timeline include Hudl tag data; crop popup on every
  photo. **Not live-verified:** segment export on real Hudl HLS, first
  automatic tag sweep (281 of 286 matches still unindexed at handoff).
- **D-022 (2026-11-10, owner choice):** Hudl sign-in is now headless (no
  window, honestly identified). Failures fall back to a visible window on the
  next Test. **Not live-verified**: headless sign-in, stream and tag loading on
  real Hudl.
- **D-021 (2026-11-10, owner request):** sign-in Chrome is minimized (not
  headless, see D-021); progress bar with time left for moment exports; Play
  Tagged highlights the playing moment green, hides video controls unless the
  pointer is over the video and skips seeks between adjacent moments; Clips
  has a match picker (newest Hudl match for the selected age group); Library
  Latest match and Recent moments follow that match; photo crop/resize dialog
  and nginx upload limit fixed (was 1 MB). Browser-checked: Library latest
  panel (U11 Stoke, Lawson Moore moments). **Not live-verified:** minimized
  sign-in against Hudl, export progress on a real export, smoothness of real
  moment transitions, photo crop with a real phone photo.
- **D-020 (2026-11-10, owner request):** match page "Play Tagged" plays the
  chosen player's/selected moments back to back; moment download asks for
  separate files (ZIP) or one combined MP4, both re-encoded H.264 at source
  resolution. Player page lists every cached match where the player is tagged;
  tag metadata for all matches is indexed after each Hudl Test/Refresh (or
  "Index remaining matches"), pacing per owner decision 003 (open). Hudl-tagged
  names open a real Player Hub (photo/details). Library hero shows the newest
  Hudl match for the selected age group with prev/next arrows. Settings >
  Storage chooses the helper's download folder and moves files to the Trash.
  Verified in the browser: hero (U11 Stoke, then West Brom) and Storage list.
  **Not live-verified:** the first tag sweep against real Hudl, Play Tagged on a
  real stream, combined/separate export of a real match, Finder folder picker,
  Trash move on real files. These need the owner (each is read-only on Hudl).
- **Spec 160:** native Sportscode tags now cache independently of full video
  capture (D-019 supersedes the false-sync omission for observed native views).
  U11 Stoke: 2,191 tags / 66 codes; U11 West Brom: 1,927 / 65, streamed without
  downloading. Native Hudl and app goal seeks matched; actual 1080p/720p playback
  verified. Both caches survived helper restart with session_active=false; all
  ten inbox MP4/CSV files retain SHA-256. Existing CSV files were not rewritten.
  Observation waits for tag-response quiet; native HLS first tag-seek starts
  loading media. Legacy strict capture and unsupported-format warnings remain.
  Host helper 8766 PID 63629 runs final source. No pending owner action.
- **Spec 150:** unsynced tags no longer block account streaming/full capture.
  Strict parsing still rejects them; the account adapter records `tag_status`
  and omits unverified ranges. Match page shows a separate warning; moment/player
  exports remain disabled without valid ranges. Auth/GraphQL errors still stop.
  Live reported U11 match now streams/plays at 1920×1080 (readyState 4,
  advancing time, no media error). Highest full capture completed: HEVC/AAC,
  6195.52 seconds, 3,721,611,743 bytes. The app's attachment downloaded to the
  owner's Downloads folder with identical SHA-256 to the inbox copy. Empty tag
  CSV contains zero unverified ranges. All 8 previous inbox files are unchanged.
  Host helper 8766 (PID 56845) is idle with an active ephemeral stream; preview
  playback is paused. No live verification remains pending for this repair.
- **Spec 140:** connected ages now come from the real Hudl team selector,
  superseding title-based grouping. Follow served context links, verify team
  identity, preserve membership lists across cache restarts/shared videos. Hidden
  dropdown links have empty labels and avatars alter accessible names; tests
  cover both plus Home landing and selector hash fragments. Live discovery read
  U10 100, U11 87, U12 99 videos (286 unique), and the app's three filters showed
  those counts, with all 286 thumbnails cached. U11 remains selected in the
  preview. Repeat refresh retained all three groups. No footage download or
  credential/session storage change in this repair.
- **Spec 130:** connected Hudl cards now live inside All matches, with shared
  search/age/season filters and the original overview/hero/latest layout restored.
  Refresh previously mistook a playback Tags anchor for the entire catalogue;
  discovery now revisits actually served library routes, only accepts library
  links/fresh metadata, and preserves cache on failure. Helper errors show retry.
  Live Keychain refresh restored 100 videos/100 thumbnails; opened a match and
  refreshed again without losing entries. Shared U10 + 2025/26 yields 61 videos.
  Desktop and 375px checked, no phone overflow. Seasons use valid dated title
  prefixes with July boundary; undated videos remain Unclassified. Helper on
  8766 is running the final source with an active ephemeral session. No footage
  downloaded, deleted or overwritten in this repair.
- **Spec 120:** main Library has connected Hudl age selection and cached footage
  cards. Live refresh cached all 100 thumbnails (90 U10 videos). Dedicated match
  screen automatically streams maximum served resolution/bitrate and caches
  actual Sportscode tags (1,717 verified). Full match, player/code and selected
  range download controls now live on that screen; local archived match headers
  link there and switch to connected maximum-quality streams. My Player has an
  explicit tagged-code picker for existing imported codes and opened Hudl videos.
  New highest-quality captures leave older files intact. Moment ZIP exports copy
  encoded streams without resizing; boundaries may include preceding keyframes.
  Live highest-quality full match captured and selected goal ZIP downloaded
  through the app: source/clip both 1280×720 H.264. Older MP4/CSV checksums
  unchanged. Full MP4 attachment/reuse verified; 375px Library has no overflow.
  Final helper is running on 8766 with active Keychain-backed ephemeral session.
- Authorized capture from `codex/hudl-access-research` remains integrated.
  Authorized browser capture implemented (spec 090, D-012): host companion on
  127.0.0.1:8766, normal incognito Chrome login, HLS capture and Sportscode tag
  CSV, Settings → Connections form/progress, then existing Import workflow.
  Owner attests automation/download permission and approved Playwright.
  Real capture → import → playback → single-clip render/download verified.
  Captured 83m32s at 960×540 with H.264/AAC and 1,717 moments across 60 codes.
  Existing `highlight-reels` commits are integrated here because the running
  database already uses that schema; no database downgrade was performed.
- `main` now contains all existing feature branches, including Hudl/reels and
  the screen redesign. Historical branch names remain available; none deleted.
- **Working vertical slice:** import a video (+ optional `.tags.csv`) from the
  inbox → copy, SHA-256 verify, thumbnail → index in Postgres → Library page →
  Match page with player, event markers, filters (AND/OR), "play moments only".
- Runs in Docker Compose at http://127.0.0.1:8765, and on the LAN at
  http://MacMini.local:8765 with no password (owner choice, D-028).
- Hudl: scoped desktop capture authorized by owner decision 002; each user needs
  their own permission. Server background sync remains unavailable. Setup and
  current verification: [HUDL_INTEGRATION.md](../HUDL_INTEGRATION.md).
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
- Backups (Settings > Backups): daily automatic + manual, download/upload,
  safe restore; Storage tab has verify / find moved files / rebuild thumbnails.
- Highlight reels (`/clips/reels`): queue -> reel -> per-clip trims, opening and
  closing cards drawn in the browser, background render to one MP4 with progress,
  crash recovery; download.
- Tests: backend 341 passed on SQLite and Postgres; frontend 171 (see D-020 note on the one updated match-page test).
  Lint, types, build, schema drift and Docker health checks green.
- **Owner's Mac disk is 99% full (about 16 GB free of 926 GB on 2026-11-09).** Full
  matches are several GB each; the Storage tab warns about this.

## How to run

Docker (normal use): see [DEVELOPMENT.md](../DEVELOPMENT.md) "Run everything in Docker".
Dev with hot reload: same file, "Run for development". Checks: [TESTING.md](../TESTING.md).

## Next steps (in order)

1. **Phase 4 leftovers:** calendar and card-gallery views of the timeline;
   "season highlights" shortcut once playlists exist.
2. Per-clip timing override (brief section 9) and playback history on the server.
3. Clip Explorer leftovers: notes and custom local tags on moments; crossfade
   transitions. Single-clip export now uses the reel renderer with one item.
4. Playwright e2e for import → play → filter → playlist.
5. Phase 5/6: persistent jobs, clip export and highlight reels with ffmpeg,
   backup/restore, storage health.

## Blocked on / waiting for the owner

- [owner-decisions/002-hudl-access.md](owner-decisions/002-hudl-access.md):
  Normal-user/no-export role and automation permission answered. Real capture/import and clip download verified after owner sign-in. Explicit
  player-code mapping is covered offline; this live run preserved all labels
  as categories. Saved-account login, discovery, stream and Download reuse now
  verified. Helper remains on 8766 with active ephemeral session and credentials
  in Mac Keychain. No pending owner action. Spec 120 Library, maximum-quality source capture
  and selected-range download verified. Large-library exhaustive
  enumeration and native Safari HLS have not been separately verified.


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
- `*.ts` also matches TypeScript source: `!frontend/**/*.ts` keeps source/config
  tracked while root/data MPEG transport streams remain ignored. Previously
  ignored API/types/utilities/config are included with this capture change.
- Screen-specific theme variables live in `frontend/src/screens.css`, scoped
  to AppShell `data-screen`. My Player now shares the charcoal dashboard palette (latest owner request,
  D-014 supersedes the light/lime palette).
  Mobile analysis filters must appear before the potentially long moment list.
- After adding a new folder of components, restart the Vite dev server if
  Tailwind classes look missing (it once served stale CSS). `npm run build` is
  the source of truth.
- Starlette 1.10 warns that its TestClient's httpx use is deprecated; harmless.
- shadcn/ui is in the brief but not installed yet; primitives live in
  `frontend/src/components/ui/`. Decide before building forms-heavy screens.
