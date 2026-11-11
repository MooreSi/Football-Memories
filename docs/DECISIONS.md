# Decision log

Decisions made while building, newest first. Owner-only questions live in
[owner-decisions/](owner-decisions/README.md). Format: ID, date, decision,
why, consequence.

## D-028 (2026-11-11) App open on the local network, no password
Owner request: reach the app from a phone on the same Wi-Fi, explicitly with no
password. `FM_BIND=0.0.0.0` (owner's .env and .env.example; compose still
defaults to 127.0.0.1) publishes port 8765 on the LAN. The desktop helper
keeps listening on 127.0.0.1 only; nginx forwards `/helper/` and `/stream/`
to it with the local app's Host/Origin, and the page uses that route whenever
it is not opened on the Mac itself, rewriting the helper's 127.0.0.1:8766
links. Consequence the owner accepted: anyone on the same network can watch,
download, delete downloads, start Hudl actions and change the saved Hudl
account (it cannot read the password). Supersedes D-008 for this install.
JSON is gzipped (the match list is ~29 MB, ~3 MB compressed).

## D-027 (2026-11-11) Hudl helper on Windows; one-word club crests
Owner asked for the Hudl connection on Windows and chose Windows Credential
Manager for the saved password (asked first, per the credential-storage rule).
`WindowsCredentialStore` writes one generic credential `FootballMemories/Hudl`
through advapi32 (ctypes, no new dependency); the password is only in its
blob, never in a file, argv or log. Folder choice uses a PowerShell
FolderBrowserDialog and delete uses the Recycle Bin, with paths passed in
environment variables, never inside the script text. The Windows installer
adds uv, ffmpeg and Chrome via winget and starts the helper minimized.
The ctypes adapter could not be exercised on the Mac: only a fake
Credential Manager is tested.

Crests: every team is a football club (owner), so one-word names are tried
as "<name> F.C.", "<name> A.F.C.", then as written; SVG lead images count as
crests, photos never do. Supersedes the single-word ambiguity guard.

## D-026 (2026-11-10) Spec 190 owner request batch
Sixteen owner requests (spec 190). Decisions made while building:
- Moment exports move to `moments/` under the download folder (owner asked);
  existing files are not moved. Two existing tests that asserted the old
  location were updated to the new folder; their real checks are unchanged.
- Snapshot quality: posters come from one stream segment per match, also
  during the paced tag sweep (one extra segment request per unindexed match).
  This is normal playback traffic; no new request pattern beyond what the
  player itself loads.
- Reel cards are animated canvases recorded in the browser and encoded by the
  helper, since the Mac's ffmpeg cannot draw text. Six themes.
- Batch export reuses the stream path one match at a time with a 2.5 s pause,
  stopping on any Hudl refusal (golden rule 3).
- Update check runs in the helper with the owner's git credentials (private
  repository); updates are fast-forward only and never reset or force.
- Installers download Docker Desktop from docker.com (Mac) or via winget
  (Windows) and leave licence prompts to the user; Homebrew is installed
  only after the user answers Y. The Hudl helper remains Mac-only.

## D-025 (2026-11-10) Selected-age indexing and consistent archive presentation
Owner requests selected-age-only metadata indexing, persistent age/season,
no Library team control, tidier Clips and memories, and readable download names.
Use served age memberships for the metadata queue; requests without a selected
age do not start an account-wide sweep. Existing access/rate/five-failure stops
remain. Changing scope yields at the next page boundary. App-open indexing
avoids active match/Clips routes so metadata work does not compete with playback.

Observed 17 unavailable records were player-duration readiness failures. Use
recorded playlist duration (manifest-only fallback, never video segments) and
retry this specific repaired failure within the selected scope. Other unreadable
records retain weekly retry. Never invent offsets or accept invalid ranges.

New attachments use fixture + venue or player/type + actual ISO date. Unknown
metadata is labelled unknown, never inferred. Existing internal full-capture IDs
and files remain untouched/reusable. ZIP members include a sequence number;
export containers keep a short collision-resistant marker. Filename components
are sanitized; completed friendly files stay scoped and URL encoded. Offline
single-clip attachments retain their reel title plus fixture/type/date.

Clips has one main workspace; saved-clips/playlists/reels remain accessible in
one secondary disclosure. Timeline merges sources by season/month, starts with
12 match cards and six moments each, and reveals all remaining items explicitly.
Shared filters persist locally and notify other screens; no account data stored.

## D-024 (2026-11-10) Tag sweep skips unreadable videos and resumes
Owner report: indexing stopped every run and appeared to restart at match 1.
Finished matches were already saved; the message numbered only the remaining
matches. The stop came from videos that never load tags (e.g. "Doku Combo 2",
a non-match clip, next to "TA Elite New York"): they were retried each run and
two in a row tripped the 2-failure stop. Now a per-video failure is saved as
`tag_status: unavailable` with its reason and `checked_at`, skipped for 7 days,
and the sweep carries on. Sign-in failures and 401/403/429 (`HudlBlocked`) stop
at once; five consecutive per-video failures still stop. Progress reads
"N of total matches". Why those videos fail is not yet known: the saved
`tag_error` will show it.

## D-023 (2026-11-10) Segment-only moment exports, Hudl stats in the hub, auto-check
Owner requests. Moment exports no longer capture the whole match: the helper
reuses (or opens) the match stream and fetches only the HLS segments covering
the selected ranges through its single worker, interleaved with playback, on
a separate encode thread; the stream keeps playing. Opening the app reads the
Hudl match list when it is over 6 hours old (then indexes new matches' tags),
otherwise indexes any match still lacking tags (owner decision 003). The hub,
Your player card and timeline count Hudl-tagged matches/moments; Hudl
"watched" state is per browser (localStorage). When imported data has fewer
than three kinds, the tag profile shows codes overlapping the player's ranges,
labelled as context and excluding codes that look like other players' names;
they are never credited to the player (PlayerCard keeps imported counts only).
Clips keeps the full explorer (filters, playlists, highlight reels) under the
match picker. Every photo opens the crop popup; portrait photos start top-aligned.

## D-022 (2026-11-10) Owner chose headless sign-in
Told that headless Chrome reports `HeadlessChrome` to Hudl, the owner chose it
over the minimized window (supersedes D-021's sign-in part). No user-agent or
fingerprint changes. Any hidden sign-in failure (verification, CAPTCHA, terms,
timeout) closes the browser and the next Test opens a visible window; it is
never retried hidden. After the owner completes Hudl's verification in that
window, Test reuses the signed-in session instead of signing in again.

## D-021 (2026-11-10) Hidden sign-in window, export progress, Clips match picker
Owner requests. Account sign-in launches the same real Chrome (headed) and
minimizes it immediately via CDP `Browser.setWindowBounds`. Headless Chrome
was rejected because it reports `HeadlessChrome` in its user agent (rule 3)
and spoofing it would disguise automation; macOS clamps off-screen window
positions, so `--window-position` cannot hide it. A verification, CAPTCHA or
terms page restores the window for the owner and stops (never automated).
Chrome still shows in the Dock while connected. Moment exports report
step/fraction/time-left in `status.progress`. Clips opens on a match picker
defaulting to the newest Hudl match for the selected age group; imported
clips remain one option. Library "Latest match" and "Recent moments" follow
that same match (the primary player's moments first). Photos: nginx allowed
only 1 MB (also blocking 200 MB backup uploads); now 210 MB with backend
limits unchanged. Oversized or non-JPEG/PNG/WebP photos open a browser crop,
zoom and rotate step that uploads a 1024 px JPEG.

## D-020 (2026-11-10) Player tags indexed for every match; downloads re-encoded; download folder
Owner requests. (1) After Test/Refresh the helper visits each match whose tags
were never recorded and stores only tag metadata (no video); pacing is
provisional owner decision 003. A user action pauses the sweep; status exposes
`syncing` so the UI does not treat it as blocking. (2) Moment downloads offer
separate files (ZIP) or one combined MP4. Both are re-encoded H.264/AAC at the
source resolution with frame-accurate cuts, because stream copy started on the
preceding keyframe and HEVC sources do not play everywhere. This supersedes the
stream-copy note in spec 120. (3) The helper's download folder is selectable
(native Finder picker) and persisted in `.hudl-account/downloads.json`; the
default stays the inbox (golden rule 5). Delete moves one named file to the
macOS Trash, never replaces a Trash item, and refuses links, hidden files,
paths and active operations. (4) A Hudl-tagged name can become a real player
(`POST /api/players/from-hudl-tag`) so its hub accepts photo and details even
before any match is imported. (5) Library hero uses the newest Hudl match for
the selected age group (date from the title prefix).

## D-019 (2026-11-10) Cache native playback tags without full-media capture
Native Sportscode playback responses can report `isSyncedToVideo=false` while
Hudl displays and seeks their video-relative millisecond ranges. Live native UI
selection matched a served goal start exactly. Account parsing now explicitly
accepts the observed presentation-view contract (identified view with subViews)
without changing the upstream flag or applying offsets. This supersedes D-018's
omission for that contract only; legacy URL capture remains strict. Timing,
stable identity, completeness totals, conflicts and access errors still validate.
Wait for observed tag responses to settle before publishing cached metadata.
Streaming writes tag metadata independently of MP4/CSV capture. Native HLS seeks
must start an unstarted stream rather than waiting forever for loadedmetadata.

## D-018 (2026-11-10) Video availability is independent of tag sync
The reported U11 match's strict unsynced-tag error prevented both streaming and
full-match capture. Keep `parse_moments` strict and expose a specific unsynced
exception. Only the account video adapter may omit these ranges and record a
sanitized tag status; GraphQL/access failures and other capture errors still
stop. Never force the upstream sync flag or guess an offset. Legacy explicit
URL/tag capture retains strict behavior. Warn separately in the match screen;
no moment/player exports without verified ranges. Full video copies keep the
highest served quality, source verification, exclusive publication and empty
CSV header when there are no validated moments. Existing files remain untouched.

## D-017 (2026-11-10) Hudl team selector defines connected age groups
The owner points to the actual U10/U11/U12 team selector and requests those
libraries, especially U11. This supersedes D-015's title-based age grouping for
new discovery. Open the served navigation dropdown, follow only its actual team
context links, verify the resulting team-library identity, and cache sanitized
age memberships with each video. A shared video may belong to multiple groups;
union memberships without duplicating its canonical match identity. Existing
legacy caches use the previous title fallback until refreshed. No guessed IDs,
query replay, increased concurrency/limits or account mutations.

The selector's avatar affects its accessible name, and closed-menu team links
can exist with empty labels. Match its visible numbered text and open the menu
when context links lack labels. Login may first land at Home: enter a served
library before reading the selector. Normalize hash-only selector fragments.
Preserve the prior complete catalogue if a team route fails verification.

## D-016 (2026-11-10) One All matches collection and verified refresh provenance
The owner requests connected matches inside All matches with age and season
filters, superseding spec 120's top-of-dashboard catalogue. Keep the original
three-column dashboard and consistent card styling. Share filters across local
and connected sources; a local-team selection restricts results to the archive
because remote team identities have not been mapped. Seasons derive only from
valid dated title prefixes with the existing July boundary; retain Unclassified
for missing dates. Show helper errors and retry rather than hiding the section.

Observed failure: refresh on a playback page accepted its Tags anchor as the
entire catalogue. Remember only actually served library URLs in ephemeral
memory; revisit those routes, or use fresh normal login discovery after restart.
Accept DOM video links only on verified library pages and preserve cached
metadata when discovery fails. Credentials, request limits and download quality
remain governed by D-014/D-015. No footage operation is part of this repair.

## D-015 (2026-11-10) Connected Library and original-quality downloads
Owner explicitly requests age groups/thumbnails in Library, tagged-player
selection, highest-quality streams/offline copies, and discoverable downloads.
This supersedes D-012/D-014's automatic 720p ceiling: automatic account streaming
and download choose maximum served resolution, then maximum bitrate at that
resolution. Manual legacy capture defaults to Highest available; explicit old
quality choices remain for compatibility. New highest-resolution/bitrate names
leave existing capped captures unchanged and cannot reuse them as highest.

Age grouping uses age labels actually present in served video titles, retaining
mixed groups and Unclassified; no guessed team IDs. Cache thumbnail bytes from
observed library thumbnailUri values, not their signed addresses. Cache scrubbed
Sportscode range/code metadata after opening a video. The owner explicitly
selects a code as their player; do not infer ownership from timeline overlap.
Local code selection links only that code's existing events and retains all
other tags. Remote selected code is a non-secret local preference.

Moment downloads first cache the highest-quality full source, then copy original
encoded streams into individually playable MP4s in a ZIP. No downscale or lossy
re-encode. Stream-copy starts may include the preceding keyframe; original tag
ranges/labels accompany the ZIP. File attachments use an ephemeral resource
scope on localhost so browser downloads need not buffer entire matches in JS.
Foreign Origin requests remain refused. No Hudl credentials or media URLs in
metadata, browser storage, filenames or logs.

## D-014 (2026-11-10) Saved local Hudl account, cached matches and consistent styling
The owner explicitly requests username/password Save/Test, accessible-match
caching, stream/download selection and real team logos. Credentials stay in
macOS Keychain through a native Security framework bridge; stdin carries them,
never process arguments. This supersedes D-012's no-app-password-form assumption.
The owner approved hls.js for Chrome/Edge; Safari uses native HLS. Browser cookies
and source media URLs remain in the ephemeral worker, never saved. The app gets
only local resource-scoped stream URLs and sanitized match metadata. Test makes
one normal login attempt; refresh follows only served links and observes normal
library VideoItem responses, without guessed IDs or replayed queries. Limits
are 20 served team libraries and 60 scroll passes each, stopping on auth/rate
failures. Download keeps the existing 720p ceiling and verification rules.

The later owner request for professional consistency supersedes D-013's light
profile palette: My Player retains its distinct layout with shared charcoal
surfaces and periwinkle accents. TeamBadge resolves real cached club crests,
using official club CDNs for known clubs and exact Wikipedia pageimages for
other unambiguous names; initials remain the failure fallback.

## D-013 (2026-11-09) Separate visual canvases for the three reference screens
The owner re-supplied the three references and asked for a redesign with separate
screens. Keep existing routes, but scope the palette and layout by screen:
charcoal dashboard, compact navy analysis, white/lime player profile. Shared
components inherit canvas tokens; the phone feed explicitly restores dark ones.
Preserve real archive data rather than copying sample scores, player images,
ratings or social controls from mockups. At phone widths put analysis filters
before the long moment list so they remain reachable.

## D-012 (2026-11-09) Authorized desktop Hudl capture, ephemeral browser session
Owner reports normal-user access without export controls and explicitly attests
Hudl permission for app automation/downloads (owner decision 002). Build within
that attested scope; do not treat it as permission for other users or an official
public integration. Owner approved Playwright as a runtime dependency.

Each capture opens normal Hudl login in an incognito Chrome context. No password
form in Football Memories, cookie export, persistent browser profile, traces or
HARs. A host companion on 127.0.0.1:8766 bridges the Docker UI to a visible desktop
browser, with exact Origin/Host checks and no arbitrary output paths from the UI.
It observes the actual match player's HLS and Sportscode responses instead of
guessing private identifiers or replaying mutations. Request concurrency is one,
with a 0.5s pause and no retry/redirect loops. Initial quality ceiling is 720p,
user-selectable. These conservative helper defaults are new, not changes to
existing import settings.

Download only complete, unencrypted muxed HLS on HTTPS Hudl media hosts. Remux
from local-only manifests, verify duration, and publish a new MP4/tag CSV pair
exclusively. Crop Sportscode pre-roll/end padding to playable video bounds;
retain strict validation for malformed/reversed times and unsynced sessions.
Users explicitly identify player codes; do not infer player-event ownership from
overlapping timeline rows. Import the pair through the existing app workflow.
Clip Explorer exports a single moment through a one-item reel without title
cards, using the existing renderer and saved clip buffers. Tagged clips remain
locally playable ranges over the full match. Persistent/resumable capture jobs
remain future work.

## D-011 (2026-11-09) Older backups always restore
Restore originally refused any backup whose schema fingerprint differed, which
would strand every backup each time a feature adds a table. Now a backup restores
if every table and column it contains exists today (newer tables start empty,
newer columns take defaults); only a backup from a newer app version is refused.

## D-010 (2026-11-09) Highlight reels: browser-drawn title cards, one re-encode
The Homebrew ffmpeg on the owner's Mac has no text rendering; the Docker one
does. Title cards are drawn on a canvas in the browser and uploaded as PNG, so
they look the same everywhere. Each clip is re-encoded once (H.264 CRF 18, AAC
48 kHz) at the tallest source height so different matches join cleanly; no
upscaling. Folder settings are resolved to absolute paths at start-up because
ffmpeg runs in a scratch working folder (a relative archive path broke the first
real render).


## D-009 (2026-11-09) Profile photos via python-multipart + ffmpeg re-encode
Owner approved adding `python-multipart` (FastAPI's dependency for file
uploads). No image library: ffmpeg (already required) validates and re-encodes
every photo to a 512x512 JPEG, which also strips EXIF/GPS metadata. Replacing or
removing a photo deletes only the app's own re-encoded copy, never a user file.

## D-008 (2026-11-09) Bind to localhost until LAN authentication exists
Docker Compose publishes ports on `127.0.0.1` only. The brief wants LAN access
with authentication (section 21); until login is built, exposing footage of
children to the whole network would be unsafe. Phase 7 (or earlier) adds auth,
then the bind address becomes configurable.

## D-007 (2026-11-09) Event identity for imported tags
`(match_id, source, source_event_id)` is unique. For sidecar CSVs,
`source_event_id` = SHA-1 of `time|category|sorted players`, with `#n`
appended for exact duplicates in one file. Re-importing an edited CSV can
therefore detect unchanged events (needed for notification dedup later).

## D-006 (2026-11-09) Native HTML5 video for the first slice
The archive is local MP4/MOV served with HTTP Range, which the browser plays
natively with no extra library. Custom controls give speeds, event markers and
keyboard shortcuts. Vidstack is re-evaluated when HLS or quality selection is
needed (brief section 9). Swapping is contained to `VideoPlayer`.

## D-005 (2026-11-09) Tests run on SQLite by default, PostgreSQL in verify
Models use portable types only. `pytest` uses in-memory SQLite (fast, no
Docker); `TEST_DATABASE_URL=postgresql+psycopg://...` runs the identical suite
on Postgres, and `/verify` requires both. Migrations are checked with
`alembic check` against Postgres.

## D-004 (2026-11-09) Clips are time ranges, not files
A tagged event points at a time in the match's media asset. Physical clip
files are only cut on request (export, highlight reel). Saves disk space and
keeps one source of truth (brief section 14).

## D-003 (2026-11-09) Import copies; it never moves or deletes
Import copies the inbox file to `.part`, verifies SHA-256, then renames into
`FootballMemories/Matches/<season>/<team>/<date vs opponent>/`. The original
stays in the inbox; a name clash gets a ` (2)` suffix, never an overwrite.
Duplicate footage (same SHA-256) is refused with a pointer to the existing
match. Costs disk until the owner clears the inbox; the owner decides that.

## D-002 (2026-11-09) No Hudl automation; local import is the primary connector
Hudl's Terms 3.2(8) prohibit bots and scrapers, and there is no public API for
team video. `HudlConnector` exists but reports no capabilities. Everything is
built on the local archive. Details and evidence: [HUDL_INTEGRATION.md](../HUDL_INTEGRATION.md).
Open owner question: [002-hudl-access.md](owner-decisions/002-hudl-access.md).

## D-001 (2026-11-09) Stack as specified in the brief
React + TypeScript + Vite + Tailwind; FastAPI + SQLAlchemy 2 + Alembic +
PostgreSQL 17; FFmpeg; Docker Compose. Python 3.12 via `uv` (backend/.venv).
