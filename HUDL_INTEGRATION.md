# Hudl integration: findings and approach

Investigated 2026-11-09. Re-check before changing the approach; Hudl's terms
and products change.

## Findings

| Question (brief section 4) | Finding | Source |
|---|---|---|
| Official API for core video? | **None public.** Hudl's public developer surfaces are its data products (Wyscout Data API, StatsBomb, raw X/Y tracking via Hudl Insight). Core Hudl video integrations are partner/sales-mediated. | [apis.io Hudl listing](https://apis.io/providers/hudl/), [Hudl raw XY data API blog](https://hudl.com/blog/hudl-raw-xy-data-release-api) |
| Is automating the website (browser login + session reuse + scraping) permitted? | **No.** User Terms 3.2(8) prohibit using "any automated means, including bots, scrapers, crawlers" to access or extract data; 3.2(9) prohibits use "in any way not expressly permitted". Breach can mean account suspension. | [Hudl Terms of Service](https://www.hudl.com/terms) |
| What can a parent account do? | View game replays, filterable clips and their athlete's highlights; share highlights. Cannot see playlists, scout film or comments; cannot record or manage video. No download is mentioned. | [Hudl for Parents](https://www.hudl.com/support/club-volleyball/guides/hudl-for-parents) |
| Who can download video? | Hudl's current team-library guidance says coaches and administrators can download; athletes cannot. Actual account/product options still need checking. | [Download Video from Your Library](https://support.hudl.com/s/article/download-video-new-hudl?language=en_US) |
| Tag timestamps / player associations via supported means? | Tag filters and athlete-linked reports exist. Classic American Football supports breakdown downloads; Hudl has documented Assist XML exports for soccer/basketball. Neither proves that this owner's account has an export, or that exported data includes video-relative timestamps and player identity. | See the product-specific research below. |

## Normal sign-in and reusable URL (2026-11-09)

Use **[https://www.hudl.com/login](https://www.hudl.com/login)** as the public
entry point for each user's own credentials. A read-only public request
confirmed that it redirects to Hudl's identity authorization flow. The research
fetcher could not render the final identity page. The owner subsequently signed
in successfully in Safari and in the helper's separate Chrome context.

The owner supplied an `identity.hudl.com/u/login/identifier` URL with a `state`
query parameter. That is a transaction-specific identity URL, not a reusable
app configuration. Do not copy the full URL into source, settings, logs or
fixtures, and do not simply strip its query string: start at Hudl's public
login entry point so Hudl creates a fresh authorization transaction. The value
provided in chat has deliberately not been retained here.

Opening that page signs the user into Hudl in their browser. It does not give
Football Memories an authenticated session or a supported integration. The
owner has explicitly attested Hudl permission for app automation and archiving,
and approved Playwright with an in-memory browser session (decision 002, D-012).
That authorizes this scoped implementation for the owner; it is not independent
verification of an agreement or permission for other users.

## Match and tagged-moment research (2026-11-09)

These are distinct Hudl products and account capabilities, not interchangeable
endpoints or a verified procedure for the owner's account:

| Surface | Documented read-only route | Limit / missing evidence |
|---|---|---|
| Team video library | Library → select video → three-dot menu → Download. | Coach/admin access; a match page URL alone is not evidence of a downloadable file. [Source](https://support.hudl.com/s/article/download-video-new-hudl?language=en_US) |
| College/pro soccer tags | Video → open match → filter tags; navigate among filtered moments. | Guide is specifically for college/pro soccer, lacrosse and basketball. No public extraction endpoint or export schema is documented here. [Source](https://support.hudl.com/s/article/filter-tags-in-video?language=en_US) |
| Stats reports | Reports → Stats → choose games and athletes → underlined statistic opens associated video. | Documents player-linked clips and a CSV export, but does not establish that CSV contains individual event timestamps. Aggregated stats must not be imported as moments. [Source](https://support.hudl.com/s/article/stats-reports-hudl-v3?language=en_US) |
| Classic breakdown download | Select video in Manage Library; include breakdown data in the download. | Guidance is for American Football; do not assume it describes this soccer account. [Source](https://support.hudl.com/s/article/download-multiple-videos-hudl-classic?language=en_US&topic=Watch_and_Manage_Video_Classic) |
| Assist / Sportscode | Hudl documented soccer/basketball Assist breakdowns as downloadable Sportscode XML, with timelines under Manage Data. | This is an older product announcement, not proof of current account entitlement or an exact export schema. [Source](https://www.hudl.com/blog/hudl-and-sportscode-integration-improvements) |

The owner confirmed normal-user access without download/export controls. An
owner-authorized read-only inspection of one accessible match confirmed HLS
playback and Sportscode tagging data in the normal player. The browser adapter
observes those responses, including stable session/moment IDs, millisecond
start/end times, sync status and `HUDL_CODE` labels. Labels can be players or
event types: callers explicitly identify player codes. No overlap-based player
association is inferred. Clips remain ranges over the full match (D-004).

The helper must account for cancelled playback prefetches and crop clip padding
outside the playable interval before strict import validation. Synthetic
fixtures cover those cases. Real capture, import, playback and single-clip
render/download were verified after the owner signed in.
No raw responses, real names, match IDs, session data or media URLs belong here.

## Consequence for the app

The normal server has no background Hudl session or discovery integration.
Authorized desktop capture is a separate local process, with each user signing
directly into Hudl in an ephemeral incognito Chrome context. It observes only
the selected match's actual playback/tag responses, downloads serially and
assembles a verified local match plus tag CSV. No cookie export, password
collection, persistent browser profile, HAR capture or auth-state files.

Instead:

| Connector | Status | Capabilities |
|---|---|---|
| `LocalImportConnector` | **Primary.** Built first. | Import match files the owner obtained through Hudl's own download/export features (or any other legitimate source), with optional tag sidecar files. |
| `MockConnector` | Tests and clearly labelled demo data only. | All capabilities, fake data. Never shown as real content. |
| `HudlConnector` | **Server sync unavailable.** Every server capability remains `false`. | The UI separately exposes the desktop companion's capture status and form. |
| Desktop Hudl capture companion | **Implemented and checked against one accessible match.** Owner permission: decision 002. | Normal sign-in, one accessible match, unencrypted complete muxed HLS and synced Sportscode moments. No mutation, retry loop or bypass. |

The UI reads server capabilities from `GET /api/connectors`; the capture form
reads the host companion directly at `http://127.0.0.1:8766`. It accepts only
the localhost app Origins (ports 8765/5173) and exact localhost Hosts, and never
accepts credentials, session data or arbitrary output paths. No service is
exposed to the LAN. It runs on the host even if the main app runs in Docker.

## Recommended workflow for the owner

For authorized browser capture, follow
[the desktop helper setup](DEVELOPMENT.md#authorized-hudl-browser-capture), then
use **Settings → Connections → Capture match**. Paste the match page URL
(`/watch/video/...`), not an identity login transaction or a signed media URL.
After signing in and verification, use **Import captured match** to index the
new MP4 and `.tags.csv`. Explicit player codes become player-associated
"Player involvement" events. Other Sportscode codes remain categories.

Limits: Chrome and ffmpeg 8 on the desktop; no encrypted/live media or separate
audio playlists; no cross-product schema assumptions; no resumable jobs yet.
Only HTTPS Hudl media hosts served by the player are accepted. Source stream
addresses stay in memory and never reach ffmpeg (it reads a local-only manifest).
Completion requires duration verification and exclusive publication, never
overwriting an existing match/tag pair. Existing import keeps its copy/SHA-256
verification. In Clip Explorer, **Export clip** renders a one-item reel without
title cards; its render page provides **Download MP4**. Player filters select
the explicitly associated moments, and a queue can become a multi-item reel.

For files obtained separately:

1. In Hudl, use Hudl's own download or export feature for each match your role
   allows (coaches/admins typically; parents may need to ask the coach).
2. Drop the file into the app's import folder (`IMPORT_ROOT`).
3. Optionally add a tag sidecar CSV with the same base name
   (`<match>.tags.csv`): see "Tag sidecar format" below. If a coach can export
   tag/breakdown data from Hudl, a converter for that format is a planned task
   once a real sample is available.
4. Import from the app's Import page.

## Tag sidecar format (v1)

UTF-8 CSV with a header row:

| column | required | example |
|---|---|---|
| `time` | yes | `15:32` or `00:15:32` or `932.5` (seconds) |
| `category` | yes | `Save` (kept exactly as written; no fixed taxonomy) |
| `players` | no | `Sam Moore; Alex Smith` (semicolon-separated) |
| `duration` | no | `6` seconds (event length; default 0) |
| `note` | no | free text |

## Open questions for the owner

See [docs/owner-decisions/002-hudl-access.md](docs/owner-decisions/002-hudl-access.md).

## Saved Hudl connection (macOS desktop helper)
Run the helper outside Docker from `backend/`:
```bash
uv run python -m app.connectors.hudl_companion --output ../data/inbox
```
Chrome, ffmpeg and Apple's Swift command-line tools are required. The helper
compiles its Keychain bridge into `~/Library/Caches/FootballMemories` on first
use. Settings → Connections now has Hudl username/password, Save, Test and
Refresh matches. Save stores credentials only in this Mac's Keychain; Test
opens a visible normal Hudl login and caches available match metadata. Complete
any Hudl verification yourself. No authentication bypass or persistent cookies.

Choose Stream to play in the app (Safari native HLS, Chrome/Edge hls.js), or
Download to produce a verified MP4/tag CSV in the helper inbox, then Import.
Only complete unencrypted muxed HLS is supported. Download defaults to the
existing 720p ceiling. Existing captured files are reused, never overwritten.
The cache contains only match IDs/titles/watch links. Signed media URLs stay in
memory; restarting the helper requires another Test. Discovery is bounded and
may need you to open the correct library in the helper browser, then Refresh.
Disconnect releases the account browser for the manual URL capture fallback.
This is a local desktop feature; server background connector flags stay false.
Each user needs permission for automation and archiving. The owner attests that
permission for this installation. Live verification (2026-11-10): owner saved credentials and Test logged in,
caching 100 accessible videos. After restarting the helper, Keychain login
worked without re-entry. In-app playback reached 16 seconds at 1280×720 over
a 5012.2-second match; Download reused the prior capture and offered Import.
SHA-256 confirmed its MP4/tag CSV were unchanged. The earlier full capture,
import and offline playback remain verified. The cached count is observed
content, not a claim that every historical video was enumerated.

## Library workflow and maximum quality (spec 120, supersedes 720p defaults)
Use **Library → All matches** for cached Hudl cards with shared age-group,
season and search filters (spec 130). The original dashboard stays above them.
Refresh loads
normal accessible library responses and caches thumbnail bytes locally. Opening
a card prepares the highest available supported HLS rendition and caches its
actual Sportscode ranges/codes. My Player's tagged-code picker explicitly names
the player; existing imported code rows can become player-linked without
re-importing or inferring overlaps.

Match and code/player downloads are on `/hudl/:id`; local archived match headers
link there when their stable capture ID is in the connected catalogue. Those
archived matches also switch to the highest connected stream automatically.
A new full source copy has selected resolution/bitrate in its filename, so an
older 540p capture cannot satisfy a highest-quality request. Clips are original
encoded stream copies in a ZIP, with exact source labels/ranges in moments.json;
keyframe boundaries can start slightly early. First clip export needs the full
highest-quality source and may take minutes. Completed captures expose a scoped
localhost attachment link; full MP4s can then use the existing Import workflow.
No signed remote address is stored in metadata or sent to the app.

Spec 120 live verification (2026-11-10): all 100 thumbnails cached, U10 age
selection90 videos, 1,717 ranges on opened match. Captured the served maximum
1280×720 H.264 full match and downloaded one goal ZIP through the actual app.
Clip resolution/codec preserved; prior MP4/CSV checksums unchanged. Full-match
attachment/reuse and Keychain login after helper restart verified. 375px Library
has no horizontal overflow. Maximum-quality capture never invents a higher
rendition than Hudl serves.

Spec 130 fixes refresh from playback: only verified library-page links or fresh
normal-library metadata may replace the catalogue; a Tags navigation anchor is
not discovery evidence. Failure keeps the previous cache. Helper unavailability
is shown explicitly with retry, rather than silently hiding the section.

Spec 140 replaces title-based connected age grouping with Hudl's actual team
selector. Discovery opens the menu, follows its served team-context links and
caches each video's library memberships. A historical title does not change its
team grouping; shared videos appear in each applicable group. Legacy caches keep
the old title fallback until refreshed. All matches retains shared filters.

Spec 150 separates unverified tag sync from video availability. Connected videos
can stream/download at highest quality with a visible unsynced-tag warning.
Unverified tag ranges are omitted; player/moment exports remain unavailable for
that match. No sync flags/offsets are changed. Access errors still stop capture.
Legacy manual URL/tag capture retains strict tag requirements.

Spec 160 supersedes the unsynced warning for modern native Sportscode playback
views: Hudl uses those served millisecond times even with its legacy flag false.
Opening a match now retains those validated tags locally without downloading the
full match. All code/player filters and tag seeking work against that cache.
The UI states “Tags cached locally · No full-match download required”. Full
source download remains necessary only for offline video or clip export.
Live U11 Stoke: 2,191 tags, 66 codes, 1080p streaming and goal seek. U11 West Brom:
1,927 tags, 65 codes, streaming/goal seek, no offline match copy. Both caches
survived a helper restart without an active login; all ten archive files kept
identical SHA-256. Unsupported tag formats still show their actual warning.

Spec 180: choose an age in Library before indexing. The saved age is sent with
Test/Refresh/Index actions; only that team's memberships enter the tag queue.
Season and age survive reload/restart. Metadata indexing uses recorded playlist
duration if browser metadata is not ready, with no full-video download. New
attachments use readable fixture/venue or player/type/date names. Existing full
capture identities and files remain reusable and unchanged. Individual ZIP clips
have sequence numbers; export container names add a short unique marker.
