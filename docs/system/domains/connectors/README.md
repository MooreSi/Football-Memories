# Connectors

`GET /api/connectors` reports real capabilities. `LocalImportConnector` imports
owner-obtained files; `HudlConnector` currently reports no capabilities. Follow
[the account safety rules](../../rules/20-account-and-library-safety.md) and
the repository's `/safe-change` procedure before enabling account access.

## Hudl login and data research (2026-11-09)

Use `https://www.hudl.com/login` to begin a fresh browser login. A transaction
URL at the identity provider, with its `state` parameter, must never become a
shared configuration. A browser login does not authenticate the app backend.

Owner attests permission for app automation and downloads; D-012 scopes the
desktop helper and supersedes the earlier blanket no-login assumption. Other
users need their own permission. The normal server still has no background
session; its capabilities remain false. Settings separately exposes the host
companion (`hudl_companion.py`, port 8766) and its actual capture progress.

All network/browser access is in `hudl_browser.py`; the parser/local assembler
is `hudl_capture.py`. Observe only match-served HLS and read-only tagging
responses, never copy cookies or guess match IDs. Auth stays in an incognito
context, not in disk storage. Serial transfers, 0.5s pause, no retries/redirects.
The companion restricts browser Origin/Host and startup output directory.

Observed tag contract: synced Sportscode session, moments with millisecond
start/end times and `HUDL_CODE` values. Code labels may be players or categories;
explicit player mappings are required. Do not infer attribution from overlap.
Playback prefetches can be cancelled; only successfully read manifests count.
Clip padding can extend beyond video boundaries; the source adapter clips it
to the playable interval before strict parsing. ffmpeg 8 checks both permitted
extensions and segment-type extension matches: local opaque asset filenames
need the local-only HLS options used by the assembler, with protocol `file` only.

Evidence, sources and missing account/export checks:
[HUDL_INTEGRATION.md](../../../../HUDL_INTEGRATION.md). Pending owner answers:
[002-hudl-access.md](../../../owner-decisions/002-hudl-access.md).

## Saved account helper (D-014, 2026-11-10)
Settings uses the host companion separately from server capability flags.
`hudl_account.py` sanitizes metadata; `hudl_keychain.py` compiles a small native
Security bridge with swiftc into the user's cache. JSON credentials go through
stdin, never argv; no third-party backend dependency or persistent cookies.
`BrowserConnection` serializes login/discovery/media on one Playwright worker.
Account and manual capture share a gate; disconnect before manual capture.
The chooser's cache is private mode 0600 and contains only IDs/titles/canonical
watch links, cleared on account replacement. Streams expose only registered
local nonce/asset paths; manifests contain no signed source URLs. Transfers use
the existing strict HLS parser/host checks and serial fetch policy.

The modern library renders cards from GraphQL VideoItem nodes, so DOM anchors
alone can miss matches. Observe successful normal UI responses and extract
`data.library.edges[].node` with `__typename == VideoItem`, `id`, `title`;
exclude deleted nodes/PlaylistItem and all playback credentials. The served
encoded VideoItem ID maps to the canonical watch URL. `app.hudl.com` DOM links
normalize to the same canonical www host. Discovery is bounded, so a very large
or differently structured library may need the owner to open it and Refresh.
Live saved-account verification completed 2026-11-10: owner Save/Test cached
100 accessible VideoItems; after helper restart it logged in via Keychain,
prepared a stream and played 720p in the app. Download reused the existing
capture with unchanged SHA-256 for both MP4 and tags. This proves the observed
catalogue, not exhaustive historical enumeration.

A successful 200 speculative manifest response can have an empty body. Ignore
non-EXTM3U bodies before they become playback evidence; otherwise master
selection fails before seeing the valid rendition. Regression test watched
red for this case, then green after the guard.

## Connected Library and highest quality (D-015)
`GET /library` on the companion joins strict served catalogue identities with
private detail/image cache. Legacy age labels derive from video titles; D-017 supersedes that for refreshed
catalogues with actual team-library memberships. Successful normal library
responses supply thumbnailUri values; fetch them serially with the ephemeral
browser, saving only image bytes under hashed filenames. Real run cached all
100 thumbnails, including 90 U10 videos. Never persist the thumbnail URL.

Opening a connected match reads its Sportscode payload and streams maximum
served resolution, breaking ties by bitrate. Archived capture filenames map
back to cached served IDs through their existing stable hash; opening that local
match uses the connected maximum-quality source when available. New captures
include selected height/bitrate in the name, leaving older capped copies intact.
`hudl_exports.py` copies local encoded streams to clips and publishes a ZIP
exclusively. Boundaries can include the previous keyframe. A full high-quality
source is captured before exporting ranges; this may take minutes. Scoped local
file links allow attachment downloads with no Origin header, while foreign
Origins or incorrect scopes remain blocked.

`/api/players/tagged-codes` exposes actual imported codes. Explicit owner choice
through `/api/players/from-tag` links only matching category events; overlapping
events remain unattributed. Remote code selection uses cached ranges and a
non-secret local preference; no roster is guessed. Currently only opened videos'
tag metadata is cached, not an automatic scan of every historical video.

## Refresh provenance (spec 130)
Refreshing while the helper remained on playback once replaced the 100-video
catalogue with the player's Tags navigation link. The saved U10 filter then
hid that unclassified entry. Keep previously served team-library URLs only in
ephemeral memory, return there on refresh, and accept DOM video links only while
actually on a verified library page. Fresh normal-library VideoItem responses
remain authoritative. If a redirect leaves only playback navigation, fail before
catalogue replacement and preserve the previous cache. Clear remembered URLs
with the browser context so they cannot leak across accounts.

`/library` derives season labels from valid YYMMDD title prefixes, with July as
the season boundary (matching Import). Invalid/undated titles are Unclassified.
Local metadata polling does not trigger Hudl discovery; external refresh remains
an explicit action with the existing serial scroll bounds and stop conditions.

## Team selector (spec 140, D-017)
The normal team dropdown serves `/ui/webnav/context/team/<id>` links, which
redirect to its accessible library. Read IDs from those links only. The selected
team link can append hash-only fragments; strip those to its served library
route. The image alt text adds Team Avatar to the accessible name, so use visible
numbered team text when locating the selector. Closed-menu context anchors can
already exist with empty text: their presence alone does not mean the menu was
read. Open it to read real team labels. Login can land at Home first; follow a
served Video library before opening the selector.

Discovery visits libraries serially within the unchanged 20-library/60-scroll
bounds and checks the actual resulting team ID before classifying videos. Cache
only validated `age_groups` alongside canonical video metadata; union shared
memberships. API and frontend filters prefer memberships over title ages. A U11
library can legitimately contain videos whose older titles say U10. Legacy
caches retain title fallback until refreshed. Live counts and checks are in
spec 140; no real team IDs or roster fixtures are committed.

## Optional unsynced tags for account video (spec 150)
`parse_moments` still rejects an unverified `isSyncedToVideo` flag, now via a
specific `UnsyncedTags` subclass of CaptureError. Account stream/download catches
only that condition through `optional_moments`, caches `tag_status=unsynced`
and zero ranges, and continues video work. GraphQL/access errors are not caught;
legacy URL capture remains strict. Cache accepts only the known tag-status enum,
never raw response/error bodies. The UI separates this warning from video status
and leaves moment/player export disabled. A full copy with no ranges has an
empty CSV header and still passes duration/checksum/exclusive publication gates.
Real reported U11 full capture completed at 1920×1080 HEVC/AAC, 6195.52s.
The app attachment downloaded with the same SHA-256 as the verified inbox source;
actual 1080p playback also verified. Empty tag CSV has zero rows; all eight prior
inbox files retain their SHA-256. The host helper is idle; playback paused.

## Native playback tags independent of download (spec 160, D-019)
The earlier false-sync interpretation was incomplete: modern Sportscode sessions
have presentationViews with id/attributes/subViews/title, and their native UI
uses startTimeMs/endTimeMs directly despite isSyncedToVideo=false. Verified a
native goal selection against its served start, then the same app seek at 1080p.
The account adapter opts into this observed native-view contract; strict legacy
parse_moments calls still reject false flags. No flag rewriting or guessed offset.
Validation and matching-video filtering remain shared with the strict parser.
Unsupported false-flag sessions retain the explicit unavailable warning.

Observation now waits for three seconds of tag-response quiet (90s bound),
instead of stopping at the first payload. No-tag streams wait ten seconds;
declared incomplete counts still fail rather than pretending a partial list is
complete. Only metadata for opened matches is collected; the library thumbnail
refresh does not scan every historical video's tags. Two opened U11 matches
cached 2,191/66 and 1,927/65 ranges/codes with no new MP4/CSV. Both caches survived
helper restart with no browser session active. All ten inbox files unchanged.
Native HLS preload=none needs load/play when the first user action is a tag seek;
never call load on an hls.js MediaSource, which would detach it.

## Tag index, moment exports and download folder (D-020)

- After Test/Refresh, `_queue_sync` records tag metadata for each match with no
  `tag_status` in its details cache, one page at a time (owner decision 003).
  `status.syncing` marks the sweep; `start()` lets exactly one user action
  pre-empt it (sets `_cancel_sync`). Playwright is single-threaded, so stream
  segment fetches queue behind the sweep: never resume a sweep under a stream.
- Matches whose page fails during a sweep are remembered in memory only and
  skipped until restart; two consecutive failures stop the sweep.
- `export_ranges(..., combined=)` re-encodes each range (libx264 CRF 18,
  yuv420p, AAC 48 kHz stereo) so every part shares one encoder configuration;
  combining then uses the concat demuxer with stream copy. Output keeps the
  source width/height and is verified as H.264 before exclusive publication.
- `DownloadFolder` persists the chosen folder beside the catalogue cache, not
  inside the chosen folder. The details/catalogue cache stays at the original
  `--output` parent. Import still reads only the configured inbox.
- Trash is `~/.Trash` via same-volume `os.rename`; a different volume fails
  safely with nothing removed.

## Hidden sign-in (D-021)

- macOS ignores negative `--window-position` (probe on 2026-11-10 put the
  window at 0,30). Minimizing through CDP keeps forms, clicks and
  `document.visibilityState == "visible"` working.
- Headless `channel="chrome"` reports `HeadlessChrome/<version>` in
  `navigator.userAgent`; headed Chrome reports `Chrome/<version>`.
- D-022 (owner choice): sign-in is headless. A hidden failure closes the
  browser and sets `_visible_next`; the next login is visible. A visible
  verification keeps the window open (`_visible_session`), and the next Test
  reuses it if the page is already on a signed-in Hudl route.
- Unverified: whether Hudl serves playback/tag responses normally to headless
  Chrome. A playback failure in `_observe` has no automatic visible fallback.

## Segment-only moment exports (D-023)

- `export_from_segments` takes the helper's local media playlist (asset-N.bin
  lines) and a fetch-by-index callback. It writes a mini playlist per moment
  (header tags, active EXT-X-MAP, covering segments) and encodes with
  `-ss (moment start - first segment start)`.
- The fetch callback is `BrowserConnection.resource`, which queues on the
  single Playwright worker, so the encode runs on its own thread; the clips
  action decrements `_pending` from that thread (`handed_off`).

## Tag sweep resume (D-024)

- Details cache `tag_status` may be `unavailable` with `tag_error` (<=300
  chars, CaptureError text only) and `checked_at`; retried after 7 days.
- `_login` raises `HudlBlocked` (a CaptureError) so a sign-in failure is never
  recorded against a video. On 2026-11-10 failing examples were
  "Doku Combo 2", "260813 U10 v TA Elite New York", "260906 U10s v Coventry (H)"
  and "261108 U10s v Stoke City (H) - Pitch One"; cause unconfirmed.

## Selected-age index and readable downloads (spec 180, D-025)
Browser code is now the hudl_browser package: public facade, _capture transport /
legacy CLI, _account worker and _timing manifest duration. Public imports remain;
existing test mock targets were relocated only in the separate split checkpoint.

AccountAction.age_group scopes Test/Refresh/sync_tags metadata work. Omitted or
empty HTTP scope means no automatic account-wide tag sweep; app sends its saved
Library age. Direct internal legacy calls retain their prior default. Match
membership lists take precedence over historical title age. Status exposes the
active scope. Switching scope cancels the old sweep at a page boundary without
raising request concurrency/rate or changing account stop conditions.

Most historical unavailable rows were premature video.duration reads (17 seen).
If the player is not ready, parse a complete observed media manifest, or follow
at most three served playlist levels using existing serial fetch policy. Fetch
only manifests, never video segments. Retry this specific old readiness error
within the selected age; leave other unavailable rows on weekly retry.

Downloads use pure sanitized hudl_names.download_name. Keep hashed source capture
identity for reuse and send a readable attachment name. Export ZIP/MP4 containers
and their MP4 members use actual title-derived date and player/type; unknown dates
and venue are explicit. Short random markers prevent export overwrites. Friendly
file downloads require current completed filename plus the existing local scope;
encode filename path components so # and spaces cannot corrupt attachment URLs.
Explicit download_kind keeps moment exports separate from full-match Import.
Live 26-second goal ZIP verified at 1080p H.264; downloaded attachment SHA-256
matched helper output. Prior archive files unchanged; no new full match capture.

## Spec 190 helper additions (2026-11-10)
- Hudl library thumbnails are 320x240 4:3 JPEGs. A full-resolution poster
  (`<details>/<key>.poster`) is grabbed from one stream segment about a fifth
  of the way in when a stream is prepared, or during the tag sweep; `/library`
  then serves it as both `poster_url` and `thumbnail_url`.
- Moment exports go to `<download folder>/moments/`, reels to `reels/`.
  `downloads-index.json` in the helper cache lists completed downloads; only
  files still in the folder are reported. Old `hudl-<key>-highest-*.mp4`
  captures are recognised by name. `/files/<scope>/moments|reels/<name>` only
  serves indexed (or just finished) files.
- Spec 200: `reel.per_match` makes one reel per match instead of one for the batch:
  each is `[match card] + moments + [closing card]` (no opening card), assembled and
  verified right after that match is fetched, named `<reel> - <match title> (<hex>).mp4`
  and indexed as a `reel` with that match's id. Cards are reused across files and
  discarded once at the end; a later failure keeps the reels already saved.
- `/account/batch` runs inside the single account worker, so it fetches
  segments with `_resource` directly. Calling `resource()` from the worker
  would deadlock (it submits to the same one-thread executor and waits).
- Title cards are recorded in the browser (MediaRecorder WebM/MP4) because the
  Mac's ffmpeg has no text renderer; `assemble_reel` normalises every part to
  the largest clip's size, fps and AAC stereo, then joins with `-c copy`.
- Settings > Update uses `git fetch` on the owner's checkout: the GitHub repo
  is private, so the public API returns 404. Apply is `git pull --ff-only`,
  then `docker compose up -d --build`, then the helper re-execs itself.

## Windows helper (D-027, 2026-11-11)
- `secret_store()` picks the macOS Keychain or Windows Credential Manager; the
  helper reports `secret_store` and `platform` on `/account` so the UI names
  the right store, folder picker and Trash/Recycle Bin.
- Chrome's MediaRecorder WebM has no duration header, so `probe()` (which
  needs one) rejects it; reel cards are read with `_card_info` (streams only).
- Wikipedia crest files are often plain SVG names (`Liverpool_FC.svg`), so the
  old "crest/logo/badge" keyword filter missed them; `.svg` counts as a crest.

## Wikipedia crests and rate limits (2026-11-13)
- Wikipedia answers 429 with `Retry-After` (about 20s) after roughly ten quick
  anonymous requests. That used to be cached as "no crest" for 24 hours, so
  Chelsea and Manchester City showed initials. `team_logos` now spaces requests
  1s apart, pauses every lookup for Retry-After on 429/5xx/network errors (not a
  miss), and keeps only a real "not found" for a day.
- Names keep their capitals ("AFC Bournemouth"); title-casing gave "Afc
  Bournemouth", which is not a page. The last lookup, the name as written, may be
  a city or country, so its image must name a club (FC, crest, logo, badge):
  "Tokyo" as written is the city with a flag SVG.

## hudl_browser package layout (2026-11-11)
`_account.py` passed the 800-line ceiling and was split (rule 70): batch and
single-match moment exports and reels live in `_batch.py`, the paced tag and
snapshot sweep in `_tags.py`. They are module functions taking the connection;
`BrowserConnection` keeps one-line delegating methods, so callers, the worker
and tests that patch instance methods are unchanged. Anything that calls
`fetch_media` stays in `_account.py`, because tests patch it there.

## Updating a copy downloaded as a ZIP (2026-11-12)

`git_adopt.py` links a folder with no `.git` to GitHub `main` so Settings >
Update and the installers can fast-forward it. It fetches `main` into a new
`.git`, then walks commits newest first: `read-tree --reset <commit>` (index
only, never `-u`) plus `update-index --refresh` and `diff-files` with
`core.fileMode=false`; the first commit with no modified or missing file wins,
and `git reset` (mixed) puts `main` there. Untracked extras (`.env`, `data/`,
the owner's files) are ignored by design. `--reset` is needed: plain
`read-tree -m` refuses once the index is not up to date with the folder.
No match or no connection removes the `.git` it was building. A `.git` holding
`football-memories-linking` is an unfinished attempt and is redone.
Standard library only and Python 3.9 compatible: the Mac installer runs it with
Apple's `/usr/bin/python3` (3.9.6) before the app environment exists; Windows
uses `uv run --no-project`. Checked on this Mac with GitHub's real Download ZIP
(matched 659d7b1, clean) and an older archive (matched b7a46d3, then
`pull --ff-only` reached main).

Installers restart themselves after a pull that moved HEAD
(`FM_INSTALLER_RESTARTED` stops a loop). On Windows this is required, not
polish: cmd reads a running `.bat` from disk line by line, so the pull and
restart sit in one parenthesised block that cmd reads before running it.
`backend/tests/test_installer_scripts.py` checks the `.bat` label structure as
text, since nothing here runs Windows; it caught a `.bat` broken since 46034aa
(labels spliced into the Docker block, `:check_wsl` missing).

## One database per computer, whichever folder (2026-11-12)

`docker-compose.yml` fixes `name: football-memories`, so every copy of the app
on a computer shares the `football-memories_db-data` volume. Postgres only reads
`POSTGRES_PASSWORD` when it first initialises a volume, so a second folder (new
ZIP) with a new random `FM_DB_PASSWORD` made `alembic upgrade head` fail with
"password authentication failed" and the backend restart forever. Installers now
start `db` alone (`up -d --wait db`), run `scripts/{mac,windows}/sync-db-password`
(`ALTER ROLE` over psql's local socket inside the db container, which the
official image trusts; statement on stdin, not argv), then start the rest and
restart a backend that is not running. Reproduced and verified with the real
images under a scratch `COMPOSE_PROJECT_NAME` (`COMPOSE_PROJECT_NAME` overrides
`name:`): old flow restarted forever, new flow answered `/api/health` in under
5 s. Loopback TCP inside the db container is also trusted, so a password check
must connect from another container to mean anything.

## Update now restarts everything and reloads the page (2026-11-12)

`apply_now`: pull, `docker compose up -d --build` (recreates the app
containers), `uv sync`, then `restart_helper`. Mac `os.execv`s in place (same
PID and log; Python sockets are close-on-exec so 8766 frees). Windows has no
in-place exec (os.execv spawns and exits, closing the helper's console), so it
starts a new helper in its own console with `FM_HELPER_WAIT_FOR_PORT=1` (main
waits for 8766 to free) and `os._exit(0)`. The new window lacks the installer's
"keep this window open" title. The restarted helper has no memory of the
update (status reads idle), so the page decides completion itself: it polls
`/update/status` (error stops), `/update/version` (local `git rev-parse HEAD`)
and `/api/health`, and reloads once the commit changed and the app answers;
failed polls while the helper restarts mean keep waiting; gives up after 30 min
with a message. A copy runs the new behaviour from the update after the one
that installs it (the old page and helper perform that update).

## Media player details (spec 220, 2026-11-12)

New downloads get MP4 tags (title, date, description, synopsis, genre, artist,
album, keywords) from the ffmpeg step that creates them: `capture_hls` and
`assemble_reel` take `metadata=`, `export_ranges` takes `details=`, and
`export_from_segments` reads `hudl_media.tagging(...)` (a context variable, so
its signature and the test doubles that copy it stay unchanged). Each clip in a
moments ZIP is titled by its own moment. ffmpeg 8 writes all ten keys into MP4
with `-c copy` (checked with ffprobe); Plex reads embedded tags from MP4/M4V/MOV
only, not MKV.

`Media library/` (opt-in, `POST /downloads/media`) is one folder per download:
a hard link to the video under a readable name, `poster.jpg` (the `.poster`
full-quality snapshot, JPEG only) and a Kodi `<movie>` `.nfo` per video.
Forum reports say Plex and Jellyfin need a folder per video for per-file
posters. Hard links fail on exFAT/FAT and across drives; that download is then
reported in `failed` and nothing is copied. The manifest
`Media library/.football-memories.json` names the files the app wrote; only
those `.nfo` files are rewritten (when the page's club, player or score
changes), folder names never change, and Delete (Downloaded or Settings)
moves the download's folder to the Trash with it. The club, player, label and
score come from the page (`MediaContext`), because the helper cannot see the
app database or the score corrections.

## Download folders on a network share (2026-11-12, owner report)

macOS SMB mounts (the owner's TrueNAS share) refuse hard links with `ENOTSUP`;
`O_EXCL` create and rename work. Every publish (`save_capture`, moment exports,
reels, media library sidecars) goes through `app.services.publish.publish_new`:
hard link when possible, otherwise claim the name with an empty `O_EXCL`
placeholder and `os.replace` the finished file onto it. An existing file is never
replaced either way. The media library's video cannot use that fallback (it would
move the download), so on a drive with no hard links it copies the video
(`shutil.copyfile` into a `.part`, then `publish_new`) and reports `copied` and
`copied_bytes`; the panel says so. Probed on the share 2026-11-12: `ln -s` makes a
1067-byte Minshall-French "XSym" stub file that only the Mac's SMB client follows
(Plex on the NAS would see a text file), and `cp -c` (clonefile) silently does a
full copy over the network (330 MB in, 318 MB out for 300 MB), so neither avoids
the extra space. Owner's library: 17 reels, 6.2 GB copied.

Plex (seen 2026-11-12 in the owner's "Other videos" library, Plex Personal Media
agent) ignores `.nfo` and reads only the tags inside the file. It splits tag
values at "/": album "U11 2026/27" became two collections, "U11 2026" and "27",
each holding every video. `ffmpeg_args` therefore writes seasons as `2026-27`
(the `.nfo` keeps `2026/27`). A media library copy is the app's own file, so it is
remuxed (`-c copy`, no re-encode) with the app's current details and rewritten
when they change (`tagged` and `copy` in the manifest; copies made before that
was recorded are recognised as the folder-named video with one link and an inode
other than the original's). A hard link is never rewritten: it is the original.

Plex release dates (2026-11-12): from the `date` tag Plex dated 15 reels correctly
but gave the two `2026-07-12` reels the refresh day. Inferred, not confirmed
(Plex's API needs the owner's token): every date that also reads as a future day
when month and day are swapped (07-12 -> 7 December) was rejected; 09-06, 11-01
and 11-08 swap to past days and were accepted. Files now also carry
`creation_time=<day>T12:00:00Z` (binary mvhd time), and media library copies get
the match day as their file date (`os.utime`, copies only). After a refresh the
owner confirmed Plex dated and ordered all 17 correctly. Plex's database can be
read safely from a copy: `pct exec 102`, copy `com.plexapp.plugins.library.db`
to /tmp, open with `Plex SQLite -readonly`.
Before this, a moment export or reel on the share failed after encoding with a
bare `OSError` at the link. Verified on the real share with a throwaway folder.

## One spelling per tag code (spec 230, 2026-11-13)

Coaches' exports mix spellings of the same code: `REGROUPING &amp; COMPACTNESS`
next to `REGROUPING & COMPACTNESS`, `Chris Demo` next to `CHRIS DEMO` (seen in
the owner's cache, 2026-11-13). `/library` serves every moment through
`hudl_metadata.canonical_code` (HTML entities decoded, spaces collapsed, upper
case); the batch exporter compares codes the same way. `MatchCache.read` and the
files on disk stay verbatim (an existing test pins it), so the merge can be
changed without touching the cache. Moment ids are unchanged.

## Veo (spec 250, D-035)

Learned from a read-only look at the owner's account (owner signed in, 2026-11-13):

- No public API. The web app reads JSON under `https://app.veo.co/api/app/` with
  the session cookie alone (no extra header). Sign-in is auth.veo.co, an OIDC
  interaction form: `#email`, `#password`, `button[type=submit]`.
- `clubs/?filter=own` -> `clubs/<slug>/recordings/?filter=own&page=N`, 20 a page,
  `Link: rel="next"`, counts in `x-veo-total-count`, `x-veo-matches-expired`,
  `x-veo-matches-soon-expiring`.
- Per match, by slug: `matches/<slug>/`, `/videos/` (full match MP4 1920x1080 on
  `c.veocdn.com`, no query string), `/highlights/?include_ai=true` (start and
  duration in seconds from the video start, type, tags `{name, slug, origin,
  custom}`, `is_ai_generated`; `team_association` and `involved_players` were
  empty on every match looked at), `/periods/` (`timeframe` [start, end] s).
- Expired recordings (182 of 238) keep their details but list no video and no
  highlights. `expiration_status`: `does-not-expire`, `does-not-expire-soon`,
  `expires-soon`, `expired`.
- Score: `info.stats.score_aggregated {own, opponent}`. `info.age_group` was null.
- `/api/mes/v2/<id>/match-events` and `step-events` need a bearer token the cookie
  does not carry (401). Not used.
- **Opening a match page POSTs `matches/<slug>/views/`.** The helper reads JSON
  only and never opens match pages, so it records no views on Veo.
- The Keychain item is `FootballMemories.Veo` (Hudl's stays `FootballMemories.Hudl`);
  Windows target `FootballMemories/Veo`. Changing `hudl_keychain.swift` rebuilds
  the small Keychain helper, so macOS may ask once to allow it access to the Hudl item.
