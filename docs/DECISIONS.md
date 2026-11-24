# Decision log

Decisions made while building, newest first. Owner-only questions live in
[owner-decisions/](owner-decisions/README.md). Format: ID, date, decision,
why, consequence.

## D-054 (2026-11-24) Implement football training with independent review evidence

Owner explicitly requests the baseline's missing tracking, football training,
goal/pass/tackle recognition and player attribution. Use existing local labelled
football images, retain originals, and keep the admin-only preview boundary.
Separate training labels, predictions and human-confirmed facts; do not turn
heuristic proximity into a pass or unknown identity into a name. Require
independent Veo match evaluation and class-specific support/precision/recall.
Use torso colours, jersey evidence and reviewed source/time-bounded identities;
no face/voice/gait model or biometric embeddings. Earlier sibling caches containing
such embeddings are not used. Preserve original inference artifacts and source
footage; admin corrections live as versioned review records. A small detector
pilot or fewer track births cannot establish reliability of named-player actions.

## D-053 (2026-11-23) Build and trial local analytics for the admin only

Owner explicitly requests a new private GitHub repository, a local video pipeline
before any AWS move, selection of any Veo game for a two-minute real trial, full
end-to-end checks and access only by the app admin. Worker lives independently
in `MooreSi/Football-Video-Analytics`; existing full-admin + CSRF guards protect
its local filesystem job queue and every artifact download through the gateway.
No worker network listener or source credentials. Use already downloaded owner
footage and preserve originals. Deliver experimental person/ball observations,
tracklets and annotated video honestly; no confirmed Hudl-like football action
claims or named player attribution from this first pretrained baseline. Preview
deployment is scoped to gateway integration and the admin library only. Keep the
admin preview on its tested build by recording/pausing that account's automatic
updates; no other account preference or image is changed by the preview rollout.

## D-051 (2026-11-23) Release grouped tournaments, keep ambiguous recordings for review
Owner authorizes general release to all hosted libraries, local containers and GitHub,
superseding D-050's admin-only preview. Default grouped presentation on, explicit0 rollback.
All matches is browse-only; tournament editing uses an existing-squad/create-squad dropdown.
Unassigned games are a review bucket, not an entered squad. Cached Liverpool pitch games
contain both established player cohorts; owner explicitly leaves both for review rather
than forcing Squad2. Improve relative overlap and preserve existing squad labels after
manual assignment. Owner approves outdated control/free-text test changes. End the admin
preview hold by restoring its earlier automatic-update preference; preserve other users'
settings and all databases/footage during the authorized one-time full rollout.

## D-050 (2026-11-23) Grouped Library is an isolated admin preview
Owner selects mockup 1: expandable tournaments → squads → matches and compact team stats,
with ordinary games separate and existing corrections/rename preserved. Review on the
admin hosted account before any general rollout. Implement an off-by-default build flag,
push only the feature branch, build only versioned preview images and keep updater latest,
default image tags and main unchanged. Pause admin auto-update (previously enabled) so a
normal release cannot replace the preview; restore after review. Other users/local app
remain on the released interface. Existing backend, membership and detection rules remain.

## D-049 (2026-11-23) Ordinary weekend pairs are not tournaments
Owner clarifies that two games against the same opponent, including different 5v5,
7v7, 9v9 and 11v11 formats, are ordinary fixtures. Unnamed detection now needs at
least three distinct games and at least two opponents within date/club/age scope.
Source duplicates, halves and format-only variants cannot inflate that count.
Named Cup/Tournament/Festival evidence still qualifies directly. Player overlap
identifies entered squads only; it does not establish that a tournament occurred.
The owner explicitly authorized replacing prior tests' two-game discovery expectations;
keep persistence/correction tests on named synthetic Cup fixtures instead.

A complete snapshot may withdraw obsolete automatic guesses. Partial snapshots,
manual memberships/exclusions and owner-renamed tournaments are preserved. Library
tournament choices depend on actual member games matching selected age and season,
including all imported pages; search does not hide tournament choices. Card-level
Rename makes the existing stable-ID correction discoverable. Checkbox sizing is
explicit and excluded from full-width text-input styling, with wrapping footers.

## D-048 (2026-11-23) Tournament membership is automatic with durable corrections
Owner supersedes spec 490's manual-first workflow. Group cached matches automatically
when the Library loads or date/title/player evidence changes. Use date, home club and
age as scopes, named tournament title segments or numbered/multiple fixtures as evidence,
and sufficiently overlapping player tags to distinguish entered squads. Explicit home-side
team labels win; unknown squads remain unassigned. Generated Squad numbers are provisional,
with explanations/review labels. No inferred real team names or statistical probability.

Manual assignments and exclusions survive all future detection; existing manual groups
remain intact. Correcting an automatic assignment moves it, while separate manual groups
survive. A corrected team label can guide comparable rosters in that same event. Renaming
an entire tournament preserves its detection identity/name; identity refinements retain
corrected names and remove only emptied obsolete automatic groups. Unknown/late home-club
responses cannot downgrade known-club assignments. Reuse cached/local metadata only; do
not trigger new source indexing, sign-in, stream, or external AI calls. Raw roster inputs
are not persisted with automatic grouping evidence. Date-only event classification remains
reviewable; multi-day events can be combined manually. Local rollout only in this change.

## D-047 (2026-11-23) Tournament grouping belongs in Match Library
Owner requests multi-game tournament assignment with distinct entered home teams.
Keep the workflow beside the games: card checkboxes, reachable batch action and dialog,
then tournament/team filters and per-team score summaries above the cards. Store local
membership in namespaced database preferences so existing backups include it without
changing schema compatibility. Source-qualified game IDs avoid collisions. A game has
one entered team in each tournament but can belong to several tournaments. Reusing a
name (case-insensitive) changes membership; use edition/year to distinguish events.
Tournament totals cover the whole group independent of card filters; unknown scores
remain unscored, with coverage shown. Reuse existing source-side score semantics;
entered-team labels do not reinterpret which side is ours. No invented standings,
points rules or winners. Hosted rollout remains separate from this local feature build.

## D-046 (2026-11-23) Player Hub and private preview are separate main tabs
Owner reports losing the previous Hub and explicitly requests reinstating it with
the Lab as a separate tab. Keep original My Player chooser/profile/card/memories,
move preview to `/player-lab`, redirect its old URL and independently highlight
the admin-only Lab entry. Remove the global preview shortcut. Keep saved profiles,
selections and notebook storage intact; copying between local/hosted libraries is
a separate owner choice, not an automatic consequence of restoring navigation.
Owner then explicitly approved copying the original local profile to the empty
hosted admin library. Copy its editable identity/card style/photo, select it there,
verify both sides and leave original data intact; do not copy derived totals or footage.

## D-045 (2026-11-23) Player performance experiment is hosted-admin only
Owner requests all feasible Kickstats-inspired review tools for admin testing.
Use a separate `/player/lab` workspace guarded by the gateway's full admin identity;
ordinary accounts and unauthenticated local installs are excluded. Existing public
player pages stay intact. Experimental manual outcomes, feedback and goals are
browser drafts with portable import/export, clearly separate from saved app stats.
No third-party AI, invented rating or spatial inference. Missing attempts/outcomes
withhold percentages; comparisons require comparable direct evidence and position.

## D-044 (2026-11-22) Automatic Veo checks reuse completed match metadata
Owner reports that showing Veo rereads matches already cached. Connect and automatic
checks reuse completed available matches by stable ID/slug while listing the account
for new matches and current expiry. Missing/unavailable matches are still read. Keep
explicit Refresh as the full metadata update so changes to existing highlights can
be requested; this preserves its documented/tested behavior. Shared matches reused
by an automatic account check need explicit Refresh for expiry/highlight changes,
since no account listing supplies their current state. No full-video downloads,
credential/session changes or request-rate increase are part of this fix.

## D-043 (2026-11-21) Explicit My Player position selects one performance role
Owner supersedes D-042's mixed-role presentation: a saved goalkeeper position shows
only keeper performance in every season and report; an explicit outfield position
shows only outfield stats. With position unset, keeper attribution is the fallback.
Retire pitch-involvement and chance-attack sections. Milestones become career football
totals and next positive targets; goals conceded is context, never a target to celebrate.
Share hub/report aggregation, keeping source/coverage/likely labels in exported reports.
Penalty saves/goals need an explicit named outcome; a generic penalty, miss or team
penalty-scored overlap does not credit a player. Clean sheets require a consistent known
score and a confirmed sole keeper; split/unknown/inferred-only keeper coverage is excluded.
Appearances mean recorded tags or saved assignments, not confirmed full-match minutes.

## D-042 (2026-11-21) Season story summarizes football performance by role
Owner replaces monthly moment picks with whole-season goalkeeper and outfield totals.
Keep both panels for mixed-role seasons; profile position is only an empty-data fallback,
not a historical lineup. Reuse match assignments/action sources and label estimates and
team-tag involvement. Show all twenty supported outfield categories, including generic
fouls and recorded defensive/attacking 1v1 encounters; do not infer duel wins or foul
direction. Generic fouls, fouls won and fouls conceded are separate categories, never a
summed foul total. Keeper save percentage comes from aggregate saves/shots in the same
known-save match sample. July–June dates determine seasons; undated data stays separate.

## D-041 (2026-11-21) Football totals replace moment-volume player records
Owner requested all four Records and streaks cards change by position. Outfield uses
goals scored, shots on target, chances and passes. Choose shots faced and save percentage
as the two additional keeper metrics alongside saves and conceded. Reuse existing match
attribution/corrections, preserving likely and overlap labels; unavailable stays unknown.
Ratios and shots faced only include matches with known saves, with visible coverage.
Profile position takes priority; keeper evidence is the fallback when position is unset.

## D-040 (2026-11-21) Infer keepers within periods and retain unknown assignments
Owner reported an outfield player selected as keeper and incorrect conceded totals.
Goal-kick overlap is uncertain evidence: weight timing across multiple kicks, allow
free changes between tagged periods, and require repeated support. Preserve unknown
periods and score ties. A confirmed list of multiple keepers alone cannot identify
who conceded; use the owner's goal assignment or matching timed evidence. Inference
still estimates saves and timing; do not persist calculated assignments as confirmed.

## D-039 (2026-11-21) Estimate playing minutes, explicitly
Owner supersedes D-038’s confirmed-only display. Existing cached player metadata has
named timed tags, not dependable lineup/substitution records. Use first-to-last
approximate touch within END HALF-delimited periods, excluding known keeper spells;
state that absences, untagged edges and missing period boundaries can affect it.
Two distinct touches in a period are required; no padded-clip sum or extrapolation.
Saved confirmed values (including zero) still win and clearing restores an estimate.
Presentation exploration stays separate until the owner chooses a layout.

## D-038 (2026-11-21) Preserve player action labels; confirm playing time explicitly
Owner identified Passing under Individual action on player moments. The earlier
code-name-only search missed it because the parser discarded non-HUDL_CODE labels.
Preserve supported action values on each original moment and prefer that direct
link over team overlaps, without counting both. Generic defensive/dribbling labels
do not establish a specific action or success. Minutes played is confirmed by the
owner and stored per player/match in preferences, never inferred from clip lengths.

## D-037 (2026-11-21) Player comparison shows tagged involvement, never invented actions
Owner requested outfield pass/shot totals on the match page. The cached data has
player windows and team events, not action attribution. Show overlapping own-team
events with a clear explanation and reviewable clips; unavailable codes stay a dash.
Do not infer passes from touches or possession. Veo's empty state explains the lack
of named data. Exclude timed keeper activity and retain later outfield involvement.

## D-036 (2026-11-17) Season top scorers count the likely scorer until confirmed
Owner request: the season report's TOP SCORERS showed only a note ("125 goals have
no confirmed scorer yet") because spec 270 shared confirmed scorers only. Now each
of our goals counts for the owner's scorer, else the likely one from the tags
(`lib/goals.ts` nearest touch). The note says how many goals behind the top three are
only likely and how many have no scorer. Later the same day (owner request) the match
report also names who scored: confirmed else likely, "(likely)" after a guessed name,
"N unknown" for goals with no scorer; keepers stay confirmed only. "Plays alongside" removed from the season report's player lines (not relevant).

## D-035 (2026-11-13) Veo connection authorized, same scope as Hudl
Owner decision 006: permission to access the owner's Veo account; Veo has no
public API (its help pages offer in-app downloads only), so the desktop helper
uses normal-user browser capture as D-012 does for Hudl. Credentials go in the
OS secret store (Keychain on macOS, Credential Manager on Windows, as D-014 and
the Windows decision of 2026-11-11), under a Veo entry separate from Hudl's.
Same safeguards: read-only, one sign-in attempt, challenges stop the run,
cookies and signed URLs in memory only, no automated test talks to Veo.

## D-034 (2026-11-13) Drawings are saved as vector data, not pixels or Hudl metadata (spec 240)
Owner asked whether a saved drawing is best kept as metadata. It is kept as data
in the app: the marks (kind, 0..1 points, colour, width, label) with the note in
`preferences`, on a tagged moment (moment id) or any frame (`frame:<match>:<s>`).
Hudl is never written to (golden rules). Vector data replays over the video at
its time, stays sharp at any size, is in every backup and can be edited; the PNG
screenshot is an export of it. Older arrow/line notes read back unchanged.

## D-033 (2026-11-13) Opponents and season reports follow one team across seasons
Owner request: all-teams totals mixed different players. A team is keyed by
season start year minus age, so it moves up an age group each season. Opponents
shows that team (all its seasons by default, or one), each club split by season
with every game; the match page counts only that team's meetings; the season
report is one team in one season. Default team: link, saved choice, Library age
group, the primary player's most-tagged age group this season, then the busiest.

## D-032 (2026-11-13) Owner answers 005: possession time, weights, name case
The Match Profile radar's possession point shows time on the ball (%), replacing
the tag count D-030 pinned (its test now expects the %). Momentum weights stay.
Player-name codes display as "Chris Demo" (page-side re-casing of name-like
codes only; the helper's merged key stays upper case). `from-hudl-tag` finds a
hub by name ignoring case and spacing, so the owner's existing upper-case hub is
reused rather than duplicated.

## D-031 (2026-11-13) Insights from tag lengths, times and overlaps (spec 230)
Tag codes are merged where the helper serves its cache (`canonical_code`:
entities decoded, spaces collapsed, upper case); files on disk stay verbatim and
batch-by-code compares canonical forms. Possession is summed tag length per side,
contested time reported apart. Momentum weights (attacking-third entry 1,
penalty-area entry 2, chance 3, goal 5) are this app's choice. A player's
involvement is overlap with situation tags and is always worded "during". A phase
of play is one of our possession tags containing a chance or goal; using that
tag's own id lets Play Tagged, downloads and reels work unchanged. Notes,
watch positions and the alerts snapshot live in `preferences` (keys hashed, as
Hudl moment ids are longer than a key), so backups carry them with no schema
change. The Match Profile radar still counts possession tags (an existing test
pins it); time-based possession sits above it. Owner question 005.

## D-030 (2026-11-11) Match Profile per team; player hub de-duplicated
The Match Profile draws our team (cyan #22d3ee, solid) and the opposition
(orange #fb923c, dashed), each 22% opaque so the overlap reads as a third tone.
Codes `OPPOSITION X`/`OPP X` are theirs; a prefix P is ours when `P X` pairs with
an opposition X and P names our club (full name, a word, initials, initials+FC)
or P pairs with two or more opposition codes. The rest are listed as "Neither
side". Each axis is scaled to the bigger side, so possession does not squash the
other situations; the key keeps the real counts. Known gap: one-word player-name
codes (a first name alone) cannot be told from codes like QCC or POFTB, so they
can appear under "Neither side". The player hub drops its moments feed and its
match-date strip (both repeated the timeline and bars); timeline cards show the
opposition crest; Your player shows the full name, with the new count on the label row.

## D-029 (2026-11-11) Tag profile moves to the Library as the Match Profile
Owner request: the radar replaces "Most tagged" on the Library and follows the
match on the hero. It counts that match's own codes, leaving out player-name
codes (heuristic `looksLikePlayer`) and BALL OUT OF PLAY; under three kinds it
falls back to the bar list. Points are numbered with a key below, because the
left column is too narrow for full code names. My Player loses the radar, and
the overlap-based `hudlTagProfile` and its test are removed (no other caller).
My Player's bars name the opponent vertically (text-xs) with a horizontal date.

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
than three kinds, the tag profile showed codes overlapping the player's ranges
(superseded by D-029: the radar is now the Library's Match Profile). Hudl codes
are never credited to the player (PlayerCard keeps imported counts only).
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
