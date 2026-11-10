# Decision log

Decisions made while building, newest first. Owner-only questions live in
[owner-decisions/](owner-decisions/README.md). Format: ID, date, decision,
why, consequence.

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
