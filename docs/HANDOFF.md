# Handoff

**Read this first.** Then [PROGRESS.md](todo/football-memories/PROGRESS.md) and
[DECISIONS.md](DECISIONS.md). Rules: [CLAUDE.md](../CLAUDE.md) (any agent) and
[60-handoff.md](system/rules/60-handoff.md) (how to leave the work).

## What this is

**Football Memories**: a local-first web app that archives football match
footage, indexes tagged moments, and (next) builds a player's memories
timeline. Full brief: [BRIEF.md](BRIEF.md). Design references:
[design/](design/DESIGN.md).

## Current state (2026-11-10)

- **Current branch: `codex/hudl-optional-tags`**, based on the pushed reference
  redesign branch. Spec 110 adds username/password Save/Test through macOS
  Keychain, normal-login accessible match cache, in-app Stream and verified
  Download → Import. Owner approved hls.js. Server background sync remains off.
  Shared TeamBadge now caches real club crests (Aston Villa/Stoke verified in
  Library); My Player uses shared charcoal panels/periwinkle accents, preserving
  the reference card/chart/feed layout. Browser preview checked on synthetic
  Sam Example. Owner Save/Test cached 100 accessible videos; Keychain login
  after helper restart and in-app 720p streaming verified. Download reused the
  captured match and offered Import; MP4 and CSV checksums unchanged.
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
- `main` predates the Hudl/reel and screen redesign branches. Continue from the
  current branch to retain these features until they are merged.
- **Working vertical slice:** import a video (+ optional `.tags.csv`) from the
  inbox → copy, SHA-256 verify, thumbnail → index in Postgres → Library page →
  Match page with player, event markers, filters (AND/OR), "play moments only".
- Runs in Docker Compose at http://127.0.0.1:8765 (localhost only, D-008).
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
- Tests: backend 267 passed on SQLite and Postgres; frontend 99 passed.
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
