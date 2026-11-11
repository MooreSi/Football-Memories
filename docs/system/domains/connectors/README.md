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

## hudl_browser package layout (2026-11-11)
`_account.py` passed the 800-line ceiling and was split (rule 70): batch and
single-match moment exports and reels live in `_batch.py`, the paced tag and
snapshot sweep in `_tags.py`. They are module functions taking the connection;
`BrowserConnection` keeps one-line delegating methods, so callers, the worker
and tests that patch instance methods are unchanged. Anything that calls
`fetch_media` stays in `_account.py`, because tests patch it there.
