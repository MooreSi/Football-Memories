## Spec700 app release verified — 25 November2026

Frontend958 tests/188 files (--maxWorkers=4), typecheck and hosted build pass.
Backend854 SQLite+854 PostgreSQL, ruff check/format, mypy and Alembic check pass.
Worker187 and gateway482 plus4 Docker tests verified. Worker CI45605869616 green;
gateway CI45605872041 pending. Browser isolated cached footage:1280px table/image
and source-bound report visible, no page overflow;375px iframe table wraps within
panel, screenshot saved. Reference02 compared. New null-method validator regression
observed red then green; original checks unchanged. UI provenance explicitly says
assistant checks, experimental/not applied, missing coverage and adult-template
assumptions. No signed-in production acceptance/playback exercised. Admin deployment
and comparison-child publication pending. External .claude/launch.json untouched.


## Spec700 benchmark implemented — 25 November2026

Pinned offline MV/SV model observations and immutable operator benchmark completed
on four cached games. Six assistant-marked frames/eight lines across three games,
not independent human ground truth; fourth active pitch ambiguous and excluded
from accuracy. Every third prediction frame withheld from temporal anchors.
Neither model passes coverage/accuracy gates; no candidate promoted or applied.
Current goal estimate also has substantial errors in some views. Keep owner review
and explicit youth dimensions; do not advertise universal or whole-game accuracy.
Worker docs/PITCH_CALIBRATION.md records all scores/hashes/limitations; private
runtime/pitch-benchmark-700 holds eight fresh reports. No old result/source writes.
Video Lab source-bound read-only comparison shows errors AND missing views, adult
geometry warning, check provenance, frame image and downloads. Gateway allows
only the five declared artifacts with existing owner/admin checks. Optional
models remain outside runtime; base deps and normal inference defaults unchanged.
Release checks and admin deployment still being finished.

# Football Memories: progress

## Complete pitch atlas admin preview DEPLOYED — 25 November 2026

App3e276e3 (includes committed spec670 frame labels), gateway4a878df and native
worker97577fa deployed, gateway first. Fresh completed childab208abe6e984da6b8b21664fec9bb8b
of8af26291 ends in “Complete pitch + bird’s-eye”. Copied44 labels/revision39;
no real calibration accepted. Refresh Video Lab and select this run. Future camera
preparation publishes the atlas; older runs can rebuild. Accepted geometry applies
to registered frames of the analysed video; the10-minute analysis cap remains.

Full-duration cylindrical rendering retains both goal ends in cached240s and600s
different games, including the left end previously discarded by the planar guard.
Final outputs pitch-atlas-690-rcw-v5 (92.87s,98 rendered/236 candidate views,27 goal
clusters) and pitch-atlas-690-outdoor-v2 (101.38s,96/265,18 clusters) each have two
unconfirmed goal candidates. Both final images and relative top-down images visually
reviewed. Source/22 and21 artifact hashes, ZIP CRCs and exact atlas binding verified.
Neither game yielded a trustworthy pair of white touchlines: proposed width is
explicitly estimated in goal-mouth units, not a measured full pitch boundary.
The complete observed atlas stays editable beyond that starting mask; unseen
pixels stay black. Goal/contact estimates and physical corners require review.
No universal all-game detector/metric accuracy or unseen-ground recovery claim.

Verified combined frontend954/typecheck/hosted build; backend854 SQLite+854
PostgreSQL/lint/format/mypy/Alembic; worker160/lint/format/project checks; gateway477
plus4 Docker cases/lint/format/mypy (2 opt-in skips). Worker CI45596394947 and gateway
CI45596397912 green. App has no CI. New seam, goal, late-view, live projection,
source/ID, review/UI and unrelated-vertex regressions observed behavioural red then
green. Rectification correspondence tests were added after implementation.
Browser isolated cached footage1280: dragged both views, keyboard edit, save/reload
revision1, only intended points6/12/17 changed; corners=null and goals_confirmed=false.
Reference02 compared;375px iframe controls visually checked. Browser viewport
override did not change the actual1280px viewport, so no measured375px overflow
claim. Signed-in production acceptance/playback not independently exercised.

Exactly gateway+approved admin web/backend/capture changed(4/32). Other28 containers,
shared hosted tags/global latest6138b56 and admin auto-update=false preserved.
All375 previously existing job JSON hashes unchanged. Helpers idle/busy=false/not
syncing with unchanged network counters before move. Worker restarted idle and
holds its processing lock. Admin health ok and VideoLabPage-B8T00I6f.js served;
anonymous jobs/atlas image401. No source account access, media/result overwrite,
new dependency/weight download or real review acceptance. Unrelated external
.claude/launch.json remains untouched/unstaged in the app.


## Combined atlas and frame-label checkpoint — 25 November 2026

Merged committed `codex/team-kits` throughc12ab55, preserving spec670 frame labelling
alongside spec690. No code conflicts or existing assertion changes. Combined
frontend954 tests, typecheck and hosted build pass. Backend854 SQLite+854 PostgreSQL,
lint/format/mypy/Alembic unchanged green. Isolated cached-footage browser: actual
drags in both views changed only points6/12/17 (17 keyboard); saved revision1,
goals_confirmed=false and corners=null. Production acceptance remains the owner’s.
Deployment, final responsive check and publication pending at this checkpoint.


## Complete pitch atlas implementation checkpoint — 25 November 2026

Branch `codex/local-video-analytics` (worker `codex/local-pipeline`). Spec690 replaces
new-run planar previews with a full-duration cylindrical atlas that retains both
observed goal ends. Legacy reviews remain supported. Reusable source/time-bound
goalpost observations, explicit unconfirmed goal anchors, linked panorama/bird's-eye
boundary editing and optional physical-corner metre calibration are implemented.
Goal-guided turf is an estimated starting mask; width is approximate without both
observed touchlines. Unseen pixels stay black. No universal detector accuracy or
unanalysed whole-match coverage is claimed; the 10-minute analysis cap remains.

Verified app frontend942 tests (four workers), typecheck/hosted build; backend854
SQLite+854 PostgreSQL, lint/format/mypy/Alembic. New goal/edit/seam/schema/API tests
observed behavioural red then green; rectification correspondence tests were added
after implementation (not claimed TDD). Worker/gateway final checks recorded in
their repos. Cached240s and600s different games show both ends in the complete
atlas; final masked versions and browser acceptance review still in progress.
No source-account access, new dependency/weights or original-media overwrite.
Deployment remains pending; preserve concurrent spec670 frame-label work, all
other libraries/shared hosted tags/global latest and admin auto-update=false.
Unrelated `.claude/launch.json` remains untouched/unstaged.


## Stitched panorama admin deployment COMPLETE — 25 November 2026

App014a3ad, gatewaybfb32f5 and native worker6a02bf2 deployed, gateway first.
Worker kickstarted idle and holds its processing lock. Admin-only app moved via
updates._move; auto-update remainsfalse. Exactly gateway+admin web/backend/capture
changed(4/32); other28/shared hosted tags/global latest6138b56 preserved. Helpers
were idle/busy=false/not syncing before the move. Admin health ok and combined
VideoLabPage-DLZgErej.js served. Anonymous jobs/panorama artifact401; other-owner
job metadata404. No production session fabricated or source account contacted.

New completed child8af26291 of8389ebf0 ends in "Pitch panorama" in the run picker.
Copied44 labels at review revision39, no real panorama acceptance. Source/18 result
artifact hashes/ZIP CRC verified; all352 previously existing job JSON hashes
unchanged. Other completed results preserved. New analyses build panoramas through
camera preparation; older runs use Build stitched pitch. Edit/accept once to apply
throughout registered moments; Stop using panorama restores local boundaries.
Metres requires explicit review of the four real corners. Unmatched views abstain.
Current1–10-minute analysis window cap remains; no unanalysed full match is claimed.

Final gates: frontend934 tests (--maxWorkers=4), typecheck/hosted build; backend854
SQLite+854 PostgreSQL/lint/format/mypy/Alembic; worker149/lint/format/project checks;
gateway470 plus4 Docker tests/lint/format/mypy (2 opt-in skips). Worker code
CI45583957929 and gateway code CI45583952572 green; app has no CI. Initial default
frontend release run hit the unchanged LibraryHosted5s timeout; four tests pass
alone, all934 pass with four workers, no assertion/timeout changes. Browser checks
were isolated cached-footage1280/375/reference02, including drag/save/reload and
corners opt-in; signed-in production playback/acceptance not independently checked.
Unrelated external .claude/launch.json edit remains untouched/unstaged in the app.
Next: refresh Video Lab and review the new panorama run.24-point turf proposal is
not semantic touchline truth;1174/1199 registered views is geometric coverage, not
an independent accuracy score. Real reviewed calibration still belongs to owner.


## Panorama acceptance precedence — 25 November 2026

Accepted panorama geometry now overrides older local boundaries throughout registered
views. The local boundary editor is hidden while the panorama is active; Stop using
panorama restores local corrections. New priority regression observed red then green.
Frontend release check934 passed (--maxWorkers=4), typecheck/hosted build pass.
An earlier default-worker run timed out in the unchanged LibraryHosted permission
test at5s; its four tests passed alone, then all934 passed with four workers. No
assertions or timeout changed. Other gates remain the spec680 verified checkpoint.
Unrelated externally changed .claude/launch.json is left untouched and unstaged.


## Stitched pitch review implemented (spec680) — 25 November 2026

App/gateway branch `codex/local-video-analytics`, worker `codex/local-pipeline`.
Camera preparation now publishes a source-bound left/centre/right pitch panorama,
image and registration JSON. Explicit review accepts an editable3–32-point mask
against the exact panorama ID; optional reviewed four physical corners compose
image→panorama→metres for live positions/heat/distance. Homogeneous ground clipping
handles distant vertices behind the current view. Unknown views abstain. Existing
local corrections, labels/results and10-minute analysis limit remain. New analyses
include preparation; older runs offer Build stitched pitch. No source-account,
credentials/session-format, dependencies/weights or media overwrite changes.

Includes committed team-kit/ball updates through1b34a6d; the concurrent spec670
Veo detector-training plan is outside this feature. Worker cached240.006s trial:
initial end-reference image rejected for extreme stretching; centred/render-bounded
mosaic2057x773,37 rendered views,24 unreviewed turf vertices.1174/1199 camera views
registered (97.91%); homogeneous clipping gives visible ground in all1174. Real
pitch-line/metric accuracy is NOT independently established; grass proposal includes
apron/adjacent ground. Genuine observed pixels fill people masks (no inpainting);
unseen areas black, people may repeat. Final private output panorama-680-rcw-v6;
source/18 artifact hashes/ZIP CRC pass. First full tracking85.47s; final panorama
replay13.00s. Original sources/parents and production reviews unchanged.

Verified: frontend933/typecheck/hosted build; backend854 SQLite+854 PostgreSQL,
ruff/format/mypy/Alembic no drift; worker149/lint/format/project checks;
gateway470 passed,2 opt-in skips plus4 Docker tests; lint/format/mypy clean.
New panorama, publishing, geometry, API acceptance and UI regressions observed
red then green. An initial full frontend run caught the new malformed-schema test
before its validator implementation; no existing assertions changed. Isolated
cached-footage browser1280/375/reference02: keyboard, drag (saved point changed),
add/remove, accept, All changes saved, reload persistence, optional corners remain
off, phone scrollWidth=clientWidth. Production acceptance/playback not claimed.
Deployment pending at this code checkpoint: gateway first, approved admin only,
idle worker reload; preserve other libraries/shared hosted tags/global latest and
admin auto-update=false. Do not accept a real panorama on the owner's behalf.


## Combined admin deployment completed — 25 November 2026

App `2de8b34` (`codex/local-video-analytics`) combines spec650 boundaries with
spec660 team-kit/ball work. Gateway `44bf89e` deployed first; app built with
FM_BUILD_LATEST=0 and moved only the approved admin via updates._move. Worker
`1039d6a` (`codex/local-pipeline`) merges dense-clip and was kickstarted idle;
PID21022 owns its watch lock. All17 jobs remain complete;337 existing job JSON
hashes unchanged. Exactly gateway plus admin web/backend/capture changed (4/32);
other28 containers/shared hosted tags/global latest6138b56 unchanged. Admin
auto-update remainsfalse. Before move helpers were ready/busy=false/not syncing;
capture traffic369 bytes over12.6s (not zero; no claim of a silent network).

Admin /api/health reports ok; combined VideoLabPage-DSmwwAic.js served with boundary,
kit and ball code. Deployed gateway accepts boundary schema; anonymous jobs/samples
401. No source request, real rerun, credentials/session-format change, new weights
or dependency. Existing labels/results retained; no signed-in production playback
or pointer drag/edge-double-click acceptance claimed. Isolated cached-footage UI
save/keyboard/add/remove and1280/375/reference02 checks passed; phone no overflow.

Fresh verification: backend854 SQLite+854 PostgreSQL, ruff/format/mypy/Alembic;
frontend910/typecheck/hosted build; worker142/lint/format/project checks;
gateway466 passed,2 opt-in skips plus4 Docker cases, lint/format/mypy pass.
Worker code CI45576125935 and gateway code CI45530315662 green. App has no CI.
Next: refresh Video Lab. Existing runs need Update camera tracking to generate
new automatic masks; review turf proposals around apron/adjacent pitches. Team,
role, ball and identity accuracy remain experimental; no new independent audit.


## Combined boundary, kit and ball checkpoint — 25 November 2026

Branch `codex/local-video-analytics`: merged `codex/team-kits` after spec650.
Resolved shared editor/workspace code by retaining both multi-vertex source-bound
boundaries and per-moment kit assignments, remembered kits, camera-steadied ball
filtering and the ball-only use of whole-clip dense refinements. Existing labels,
metre calibration and original outputs remain separate. No existing test changed
in conflict resolution; inherited branch tests were not observed red this session.

Verified this session: backend854 SQLite and854 PostgreSQL; ruff/format/mypy and
Alembic no drift; frontend910 tests, typecheck and hosted build. Cached isolated
browser1280/375: keyboard point movement, insert/remove/save, All changes saved;
375px scrollWidth=clientWidth. Compared reference02. Existing kit/ball integration
tests pass; no new real analysis or signed-in production acceptance. Worker merged
its dense-clip branch separately,142 tests and lint/format/project checks pass.
Deployment pending at this checkpoint; retain newer live kit/ball functionality,
update gateway before app and reload worker only idle. Other libraries, shared
hosted tags, global latest and admin auto-update hold must remain unchanged.


## Automatic editable pitch boundaries (spec650, 2026-11-25)

Branch `codex/local-video-analytics`. Resumed the unfinished spec650 app, gateway
and worker changes. Camera preparation proposes a refreshed 24-point visible-turf
envelope, independent of physical metre calibration. Video Lab supports 3–32
vertices with insert/remove/drag/keyboard controls and revisioned human corrections.
Corrections follow camera motion within one shot; automatic suggestions expire
and explicit no-turf observations clear them. Source binding now requires a
present matching hash (new regression observed red, then green). Existing runs
use Update camera tracking; labels and original results carry forward.

Verified: backend854 SQLite +854 PostgreSQL, ruff/format/mypy and Alembic no drift;
frontend867/typecheck/hosted build; worker138/lint/format/project checks;
gateway466 passed,2 opt-in skips,4 Docker cases passed separately, lint/types clean.
Inherited unfinished tests already passed when resumed; their original red runs
were not independently observed this session. No existing assertions changed.
Isolated cached-footage browser1280/375: add/remove/save, saved confirmation,
24 handles and no phone overflow; reference02 compared. Pointer drag/edge double
click and authenticated production acceptance not independently exercised.

Existing private cached600.04s camera trial:130.158s,3000 steps,24 rejected/cut
steps,612 proposals. Current output visually checked at16/30/31/34/120/300/480/590s;
13 artifact hashes, source hash, parent manifest and ZIP CRC pass. Turf includes
apron/adjacent ground: these are unreviewed masks, not semantic touchlines or
independent accuracy evidence. No source account operation, dependencies/weights,
media overwrite or training. Not yet deployed at this code checkpoint. Next:
check idle runtime, deploy gateway before admin app, reload worker only idle;
preserve other libraries/shared tags/global latest and existing admin update hold.


## Selected-window progress (spec640, 2026-11-24)

Branch `codex/local-video-analytics`. Confirmed analysis reuses saved footage or
input-side seek plus existing range relay; no full-match download fallback.
Added ffmpeg output-seconds progress and remote fetched-byte detail. Gradient
bar shows measured encoding/worker progress, indeterminate connection, clip
verification and gateway import. Synthetic90s/late4s range export passes with
nonzero bytes below60% and no full download/archive entry. This does not claim
a byte audit of the real transfer. Progress tests red first; no existing test
expectations changed. Owner's in-flight window left running; read-only status
subsequently reported done. No new source request queued.
Verified: backend854 SQLite +854 PostgreSQL; ruff/format/mypy/Alembic;
frontend860, typecheck and hosted build. Measured-progress test failed before
implementation; UI determinate/indeterminate tests failed before implementation.
Existing tests unchanged except the import needed to register the shared synthetic
fixture. Synthetic gradient preview checked against reference02; no real source
transfer byte audit or new live analysis. No app CI.

Deployed admin-only app `f14fc04` after helper preparation completed
(busy=false/state=done). Exactly admin web/backend/capture changed (3/32), other29,
shared tags/global latest6138b56, gateway and worker unchanged. Auto-update remains
false. Health200, new VideoLabPage-C0M4t4WV bundle and measured-progress code loaded.
Owner-submitted worker job remained running throughout; no new analysis queued.
Synthetic browser gradient/stage acceptance passed; no fresh live source run to
verify the new preparation callbacks. Safari was on another page, so it was not
reloaded or interrupted. Refresh Video Lab to load the new gradient bars.


## Analyse button repair (spec630, 2026-11-24)

Branch `codex/local-video-analytics`. Fixed the stale jobs-list busy guard: poll
while any job is queued/running, including when viewing a different completed
run. Veo picker explains running-analysis and invalid-window refusals. Synthetic
background-completion regression and out-of-range feedback both failed before
the fix and pass afterwards. All 13 live worker status files were complete;
reported match cache duration3939s/available confirms16–20min is valid. No new
source-account operation/analysis, credentials or footage changes.
Verified: backend852 SQLite +852 PostgreSQL, ruff/format/mypy/Alembic pass;
existing clip tests2 pass after the annotation-only correction. Frontend858,
typecheck and hosted build pass. First frontend full run found an ambiguous
status-role query in the new test; scoped it to the picker (same expected text).
No existing test expectations weakened. No CI workflow.

Deployed admin-only app `d2f383c` using the existing updates._move path.
Exactly admin web/backend/capture changed (3/32); other29, gateway/worker,
shared :hosted tags and global latest6138b56 unchanged; auto-update false.
Backend health200 and VideoLabPage-BdRYHb4I served. Helper status before move:
Hudl idle/not syncing, Veo ready, both busy=false; existing media traffic was
present (no claim of a quiet network). Standard move recreated the helper and
its ephemeral streams. Signed-in Safari refreshed; selected the reported match,
start16/duration4: Analyse enabled. Left these selections ready; did not press
Analyse or queue a new source operation. New-run completion was verified with
synthetic fixtures; no new live end-to-end analysis performed.


Live status against [the brief](../../BRIEF.md). Update in the same commit as
the work (rule [60-handoff](../../system/rules/60-handoff.md)).

Status values: `done` (built + tested), `partial` (some of it, says what),
`todo`, `blocked` (says on what).

Consolidation checkpoint: `main` fast-forwarded through e2af610, including the
separate package split and complete spec 180. Every local/remote branch tip is
an ancestor; no branches deleted. Docs-only handoff update after the green suites;
no additional code or live capture needed. App/helper run the verified source.

## Camera-aware Video Lab (spec620, 2026-11-24)

| Work | State | Evidence |
|---|---|---|
| Extra pitch points and visible-corner fit | implemented | up to9 named UI points; skip guessed corners; known-point least squares, singular refusal, exact paused-time interpolation, corrections blended within camera shots |
| Learned team/role corrections | implemented, experimental | full multiview embeddings + torso colours; reviewed example bank; conflict abstention; per-review source-bound model; legacy review compatibility |
| Veo game/duration and named runs | implemented | own-helper cache/serialized range export; start +1–10 min; H.264 duration/hash verification; CSRF/admin/permission guards; named run dropdown |
| Local gates | pass | backend852 SQLite +852 Postgres; lint/format/mypy/schema; frontend856/types/hosted build; worker133/lint/format/project; gateway reports its final gates |
| Manual evidence | limited, honest | synthetic browser1280/375 controls/save/no overflow; real cached120s camera18.508s/599 steps; real998 tracks/4296 views111.441s; hashes/ZIP verified |

Originals/completed results preserved; no new dependencies/weights or source
account request. No new independent identification accuracy claim. No global
neural fine-tune; online per-game exemplar model uses only human corrections.
Deployed admin preview: gateway2be7fb7, app6dd4010, native worker d70f345.
Worker/gateway code CI green; app has no workflow. Exactly4/32 containers changed,
28 others/shared :hosted/global latest6138b56 unchanged; admin auto-update false.
Health200/new bundle+helper route/schema verified, anonymous APIs401, both prior
trials complete. No new source-account operation or live analysis queued; signed-in
production playback/fresh Veo selection remains an owner acceptance check.

## Identification before statistics (spec590, 2026-11-24)

2026-11-24 follow-up: published both completed trials to the live runtime catalogue
and admin-owned jobs: outdoor1080p `c880cae077d84522875ed0a4fe6e66a4`, indoor540p
`cbd21303dbcc442b83414654793e079e`. Full copied-file hashes match originals;
live gateway job views complete with video/team downloads, wrong owner404,
anonymous jobs401. Catalogue backup retained privately. No code/deployment or
training change. Docs-only link/diff checks; app suites not rerun. Signed-in
playback unverified because browser attachment requires an app update/network
policy. Refresh Video Lab; Runs uses these eight-character prefixes.

| Work | Status | Evidence |
|---|---|---|
| Opt-in calibrated worker stage | done, experimental | source-bound kit/roles, pitch/track uncertainty, staff/keeper/referee examples, ball evidence, new preview/manifest/ZIP |
| Real different-game experiments | done | indoor540p rejected; existing1080p outdoor600.04s baseline1058.956s + calibrated569.952s |
| Team/role reliability | partial, target not met |148 assistant-audited observations: kit coverage52→55/100; overall team-credit precision94.55→94.83%; sideline leaks2→3; role accuracy35.14→51.35%; referee0/6 |
| Individual identity | not reliable | keeper3/6; existing OCR0 accepted number hints/0 names; track IDs are not people |
| Validation | done for worker checkpoint |111 tests, lint/format/project and CPU CI green;10+12 artifact hashes/sizes, ZIP CRC/JSON, full decodes and unchanged source/raw/parent |
| Game statistics/promotion | deferred | no new passing/tackling attribution; app/gateway/default worker/deployment unchanged |

Same-source assistant visual labels are not independent human or match-disjoint
accuracy. No new source request, weights or dependency; existing footage/results
preserved. App changes are docs-only, local Markdown links/diff checks pass; no
app code tests re-run because app code did not change. See [spec590](590-identification-first.md)
and worker `docs/IDENTIFICATION_TRIAL.md`. Next: reviewed youth role/team data,
part-aware role model with hard staff/referee/keeper negatives and specialised
jersey recognition before action statistics.

## Football training extension (spec560, 2026-11-24)

Building on private worker a0ef724:35 worker tests, real detector fine-tune and
source-hashed feature extraction. Tracking replay5248→1130 births; no labelled
identity score. Actual detector pilot is experimental; real action labels missing.
Admin review API/UI component tests now green, full gates and deployment pending.
See [spec560](560-football-model-training.md) and worker docs/TRAINING.md.

## Local admin video analysis (spec 550, 2026-11-23)

Branch `codex/local-video-analytics`, worker private repo
`MooreSi/Football-Video-Analytics` (`codex/local-pipeline`).

| Task | Status | Evidence |
|---|---|---|
| Private repo, local worker and bounded sample | done | New isolated environment/LaunchAgent; original preserved, no source download |
| Real model inference / media pipeline | done (baseline) | Faster R-CNN MPS268.659s,360 sampled frames; full MP4 decode/hash/ZIP checks pass; no football-action accuracy claim |
| Gateway admin security/API | done | 13 new red-first tests;405 +4 Docker, lint/format/types |
| App interface | partial | Private route/nav;785 frontend tests/typecheck/build; signed-in desktop/phone checks blocked by Mac lock |
| Admin preview deployment | done | Only gateway +admin web/backend/capture changed; all other container IDs unchanged; health/nginx clean; anonymous API401 |
| Live browser acceptance | blocked | Embedded browser redirects to login, no admin session; Mac unlock needed; no MFA bypass |

Opt-in real integration passed in256.62s using an isolated synthetic full-admin:
API submission→native model→completed status→all artifact downloads; hashes,
ZIP/source bytes and206 video Range checked. Live anonymous sample/job/video/ZIP
routes all401. This does not establish signed-in browser playback.

Nine pipeline and five queue tests observed red before implementation;14 worker
tests pass. Two UI behaviours observed red against a placeholder; full-admin
access guards reused. Backend850 SQLite +850 PG, frontend785, gateway405 +4
real-Caddy, portal72 and provisioner86; lint/format/types/build/schema drift clean.
Existing populated-live-stack guard skipped provisioner Docker test; no provisioner
code changed. Full output FFmpeg decode clean; original full-match SHA-256/size
unchanged. No existing test assertions changed, source login, schema migration,
AWS or footage overwrite. Admin auto updates paused (previously true) to retain
preview; global latest/default app tags unchanged. Restore preference on preview
retirement/general release. [Spec](550-local-video-analytics.md).

## Junior Grassroots Hub crests (2026-11-23)

Branch `crests/junior-grassroots-hub`. Owner asked for grassroots crests from
juniorgrassrootshub.com. Its terms forbid systematic extraction without written consent; the
owner then said they obtained consent (recorded in owner decision 008). New source
`_jgh_crest` in `team_logos.py`, asked after Wikipedia's exact club page: clubs sitemap
(once a day, in memory), slug matched to the team name (`club_name` strips age group, FC,
side code/colour; "juniors"/"jfc"/"and" are quiet; one letter out only when exactly one
page is that close), the page's JSON-LD SportsClub `logo`, accepted only on the site's own
`partner-images/clubs/` storage and only when the page names that club. Two pages with
different crests are not guessed between. Never `/api/`; one request per 2 s; a 429 pauses
only this site. JPEG crests are now kept and served as JPEG (library cache, shared crest
service, hosted libraries). Gateway `egress/crests.filter` gained the two exact hosts
(gateway branch of the same name).

Tests: 25 new cases observed red first (setup-only state added, then 18 behavioural reds;
the 7 negative guards passed trivially before the source existed). `tests/services/conftest.py`
says JGH lists none of the clubs in the older crest tests; no existing assertion changed.
Gateway sync test observed red against the new app hosts before the filter change. SQLite
**850 passed**, PostgreSQL **850 passed** (sequential), frontend **767 passed**, typecheck,
build, ruff, mypy; gateway **392 passed**, ruff, mypy. Manual read-only check against the
real site: Norton Lindsey (also "Lindsay"), Olton Ravens, Kenilworth Sporting (Juniors),
Bolehall Swifts, Racing Club Warwick, Redditch United, Solihull Moors CB resolve; Solihull
Academy Blue is not listed; "Riverside Juniors" matches two clubs and stays initials. In the
dev app the real `trimCrest` fills the disc for round crests (Norton Lindsey's stray corner
icon ignored); Kenilworth's white shield sits at the shield size, as intended. No frontend
change.

**Deployed 2026-11-23** (owner: "Deploy both", then "update them all now"). Released on
`main` as `17f7f8b` (rebased on the tournament-report work; suites re-run green after the
rebase: SQLite/PostgreSQL 850 each, frontend 778 in 156 files). Gateway `main` `70d3785`:
only `crest-filter` rebuilt and recreated; updater built `17f7f8b`, moved `:hosted` and the
`crests` service. The four hosted libraries (all auto-update on) were moved at once by
running the gateway's own `updates.auto_round` once in its container, after checking no
ffmpeg/browser process in any library; all answer /api/health 200. Live: the crest service
returns Norton Lindsey and Kenilworth as JPEG and Olton Ravens as PNG through the filter,
and a hosted backend keeps the JPEG (checked in a temporary folder). Local: the primary
checkout was on another agent's `codex/local-video-analytics` branch with uncommitted work, so the
images were built from a separate worktree at `17f7f8b` and the containers recreated from
the primary checkout with `--no-build` after a no-ffmpeg check; 8765 /api/health 200 and
its crest endpoint returns the new crests. No Hudl/Veo request and no library file changed.

## Tournament reports (spec 540, 2026-11-23)

Branch `codex/tournament-report-release`, isolated managed worktree because the original
checkout has separate unfinished crest work. Expanded tournaments offer Tournament report;
squad detail offers Squad report. Both use `/report/tournament/:id?team=...`, with a squad
selector, shared current event name and full membership independent of Library filters.
Includes played/W/D/L, goals for/against, GD, clean sheets, win rate over scored games,
score coverage, per-squad summaries and every match/result with score source. Unassigned
recordings remain in review and never contribute to assigned-squad totals. Missing/hidden
source games stay in coverage with unknown scores; individual imported fetch failures
retain successful games. No detector, data assignment, schema or dependency changes.

Reuses existing embedded-crest SVG/PNG reporting. Long event/squad names wrap. Navigating
from a scrolled Library now opens the report at the top. Print/PDF uses paginated text
rows, avoiding the reproduced SVG split through text; scoped min-height reset avoids a
reproduced blank page. Native Safari saved final synthetic PDF is one clean page;
Chromium1440/375 no horizontal overflow, actual PNG1080x2248 verified. Existing reports and
Library cards unchanged. No real source login/refresh/index/stream or footage operation.

Tests: report aggregation, source keys/corrections, outside/duplicate controls, squad scope,
unknown/zero and unavailable/deleted members, direct squad links, error state, long text,
print content and scroll position. New cases observed red before implementation; existing
tests untouched. SQLite825 passed69.11s; PostgreSQL825 passed127.74s; ruff lint/format,
mypy, Alembic no drift, frontend typecheck/build pass. Frontend778 passed in156 files
(36.73s). Existing canvas/media/bundle warnings remain. No CI workflow exists. One initial frontend full run was stopped on detecting
another checkout's full suite; final frontend run starts only after those suites finish.

Released to main as `dfd84ec18720c5b445ffe5171a10ebab67b025f9`. Normal host updater
built/published all versioned images, default tags and shared crests without error. All
four hosted libraries moved through gateway/provisioner after per-library cached source
idle and zero-render checks; every web/backend/capture tag matches this release. Local
frontend built from this isolated tested checkout and recreated after the same checks;
local backend/helper unchanged because this feature changes only frontend code.
All health/nginx checks and direct SPA report routes pass. Every hosted library serves
`index-Wdtd7YVI.js` with report route/content and print CSS; local serves
`index-x-2xqVg1.js`. Runtime snapshots prove exactly12 hosted app containers, local frontend
and shared crests changed; all32 container names, every database and all other containers
preserved. All four automatic-update preferences retained (true). Synthetic tabs/server
closed and viewport reset. Managed checkout is `~/.codex/worktrees/tournament-report/Football Memories`.
This deployment record is docs-only; no repeat suites/app recreation for this checkpoint.

## General tournament release (spec 530, 2026-11-23)

Branch `codex/tournament-release`; owner now authorizes main/GitHub release and deployment
to every hosted library and the local app, superseding the isolated preview restriction.
All matches is browse-only (no Edit/Select/+ Add tournament); tournament view retains
correction/selection and removes the misleading + button. Entered home team is a real
dropdown of this event's squads with Create new squad and a separate name field. Unassigned
games live in a Needs review bucket and do not inflate squad counts or squad stats.

Cached Liverpool audit: six U11 games, two assigned cohorts plus two unassigned Liverpool
pitch recordings. Both recordings contain 17 tagged players, covering both established
squads with substantial tag activity; metadata cannot justify Squad2. Owner explicitly
leaves both for review. No real assignments changed, no raw rosters stored/printed. New
relative-overlap rule stops three incidental shared players from making distinct cohorts
ambiguous, while complete/mixed rosters still need review. A second reproduced bug caused
manual assignment of a mixed recording to an existing squad to renumber that squad's
other games. Stable-label claims now distinguish allocated cohorts from reserved manual
labels; real temporary-API browser confirms two squads stay two after the correction.

Tests: new detector cases observed red for incidental overlap and stable-label reuse;
mixed-full-roster negative control stays unassigned. Four new UI tests observed red for
review counts, removed controls and squad dropdown; browser covers existing assignment,
creation and automatic reconciliation. Owner approved outdated All-matches-selection and
free-text tests updated. Legacy Library regressions explicitly cover flag0 rollback;
release/default contract and full Library integration cover the grouped view. Docker and
normal builds now default on; explicit0 remains rollback. SQLite **825 passed** (69.25s),
frontend **767 passed in153 files** (45.67s); typecheck/default build, ruff lint/format/mypy
and dev-PG Alembic no drift pass. Final PostgreSQL **825 passed** (103.25s),
sequential after SQLite. Existing canvas/media/
bundle warnings remain. Chromium desktop1440/phone375, native dropdown saves against real
temporary API; no horizontal overflow, All matches has zero tournament actions. No real
source login/refresh/index/stream or footage operation; no dependencies/schema changes.

Released/pushed main as `6ad1a00`. Normal host updater built all images/default :hosted
and shared crests, published latest with no error, then gateway/provisioner moved all four
hosted libraries after per-library idle-source/zero-render checks. Every hosted backend/
web/capture runs `hosted-6ad1a000af83a051893d95bc28b77a170e2a0f81`. Local backend/frontend
rebuilt/recreated with zero renders; local desktop helper unchanged. All health/nginx
checks pass. Hosted `index-BZGsQGcN.js` and local `index-HORAitMe.js` contain the released
UI; every hosted detector file hash matches tested source. Runtime snapshots: exactly
12 hosted app containers, 2 local app containers and shared crests changed; all32 container
names retained and every database/other container preserved. Admin auto-update restored
to pre-preview true and audited; all other users' preferences retained. Live Liverpool
GET confirms two assigned squads and two unassigned games, unchanged as owner requested.
Synthetic server/tabs closed and viewport reset. No CI workflow. This final deployment
record is docs-only; no repeat suites or app recreation needed for this checkpoint.

## Preview refinement: original match cards (2026-11-23)

Owner requests original thumbnail/score-pill cards in All matches, Other matches and
squad drill-down, home-team crests on squad cards, and no background-refresh page bounce.
Same `codex/admin-grouped-tournaments-preview` branch; admin-only rollout still applies.
Hudl/Veo card markup is extracted unchanged into shared renderers and used by every
preview view; imported cards reuse MatchCard. Two columns from 640px, one on phones.
Squad crests use the source home club through TeamBadge, preserving its cached crest/
initials fallback. Initial loading is separate from background fetching; cached cards
stay visible, and score-loading space is reserved so refreshes do not move the layout.

New card-rendering, squad-crest and background-loading tests observed behavioral red
before implementation. Real Library integration confirms original Hudl/Veo thumbnails,
score pills and correct home-club crest in the grouping views. Existing tests untouched.
SQLite **822 passed** (68.48s), dedicated PostgreSQL **822 passed** (103.79s), sequential;
frontend **762 passed in152 files** (39.05s). Ruff lint/format/mypy, dev-PG Alembic no drift,
typecheck and default/preview builds pass. Existing canvas/media/bundle warnings remain.
Synthetic real-API browser checks pass in Chromium and native Safari; desktop shows two
cards, phone375 one, no horizontal overflow, 16px checkboxes. Cached refresh comparison:
card top 959.234375px and library height1117.140625px identical before/after; no transient
loading status. Illustrative fixtures only; no source login/refresh/index/stream or footage
operation. Code commit `eb5df8a` pushed on the preview branch and installed only on
admin as `hosted-eb5df8a97bea3034b6acdc371508fc4028fe259d`. Sources idle and zero active
renders before the gateway/provisioner move. Admin auto-update remains off (original
pre-preview preference was true). Health/nginx and served `index-Cs2VJgOn.js` /
`index-NRlKFpdV.css` confirm restored cards and removed row/shirt CSS. Runtime snapshots
prove only admin web/backend/capture changed; every database, other user's containers,
local running app, shared crests, default :hosted tags and updater release metadata/latest
are unchanged. Only the new built version was registered under the updater lock. Main
remains `2669f8a`. No general rollout. Synthetic tabs/server closed; viewport reset. No CI
workflow. Final checkpoint is deployment/docs only; no suite rerun after verified code.

## Admin-only Grouped Library preview (spec 520, 2026-11-23)

Branch `codex/admin-grouped-tournaments-preview`. Owner selected mockup 1 and explicitly
requested admin-only review before releasing it to other accounts. New opt-in build flag
`VITE_FM_GROUPED_TOURNAMENTS=1` (`FM_GROUPED_TOURNAMENTS=1` Docker build argument) enables
compact All matches/Tournaments tabs, dated event rows, squad cards and match/stats
drill-down. Existing dashboard retained; ordinary games stay outside tournament groups.
Age/season/search scope, real scores and coverage, whole-event rename, per-game/squad
corrections, multiple selection and mistaken-membership removal use existing APIs.
Automatic-group reasons remain behind one disclosure; no detector or schema change.

Verification: four initial navigation/selection/scope tests observed behavioral red/green;
missing compact removal action observed red/green; rename and release-flag/Library wiring
characterization added. Existing tests untouched. SQLite **822 passed** (65.20s), dedicated
PostgreSQL **822 passed** (83.66s), sequential. Frontend **758 passed**; typecheck, default
and opt-in builds pass. Ruff lint/format/mypy and dev PostgreSQL Alembic no drift pass.
Synthetic real-API browser checks: event → squad → matches, score coverage, shared rename
and batch dialog; 1440px desktop and 375px phone have no horizontal overflow and 16px
checkboxes. Intermediate squad cards now stack based on available width. Existing canvas/
media and bundle warnings remain. No live source login/refresh/index/stream or footage
operation. No CI workflow exists.

Committed/pushed feature branch only; code commit `e426347` is installed on the hosted
admin account as `hosted-e426347faf958003e32c28d2483e6fd4989e21e8`. Gateway/provisioner move
followed idle cached source status and zero active renders. Admin auto-update is now off
(previously true), audited; restore it after owner review. Normal Settings may offer the
stable release because updater latest deliberately stays on stable: do not choose Update
now during this preview. Admin health/nginx and served `index-gSNEcSAO.js` layout verified.
Runtime before/after comparison proves only admin backend/web/capture changed; all
32 container names retained, every database, other user's containers, local running stack,
shared crests, default :hosted tags and updater release metadata/latest remain unchanged.
Only the preview version was added to built under the updater lock. Main remains
`2669f8a`. No broad rollout or merge until owner approval. Synthetic preview server/tabs
closed and viewport reset after review. This final checkpoint is deployment/docs only;
no repeated suites after the already verified code commit.

## Tournament fixes and design alternatives (spec 510, 2026-11-23)

Branch `codex/tournament-library`. Owner requests mockups before deciding on a new
presentation; no new main layout implemented. Interactive carousel in the chat workspace
contains Grouped Library, Tournament Hub and Compact Drawer, with event → squad → matches,
whole-event rename and optional compact rows/stats. Illustrative squads, no invented scores.
Design decision pending. Preview is separate from the production app and makes no API calls.

Repairs: normalize U11/U11s/U 11s/Under-11 age identities in scopes and fixture identities;
strip pitch/field/court number suffixes from opponent identity. Threshold remains three
distinct games/multiple opponents. Actual cached Oct26 title/age audit now includes both
previously missed U11 Liverpool pitch recordings in the six-game U11 group; U10 remains
its own four-game group. No raw roster output or source login/refresh/index/stream.

Popup dismissal reproduced when text-selection drag starts inside and releases on the
backdrop. Shared Overlay now dismisses only a click that starts on the backdrop; input
clicks and selection drags keep editing open. Existing cancel/Escape still work. Rename
scope is explicit: all games and entered teams within the same tournament. API test
confirms stable identity and every membership across two squads; no per-match title rewrite.

New tests observed red/green for three alias/pitch cases and popup drag (deliberate
backdrop negative control); API rename characterization passes. Existing tests untouched.
Full SQLite **822 passed** (60.91s), dedicated PostgreSQL **822 passed** (87.04s), sequential.
Frontend **750 passed in148 files** (34.66s); lint/format/mypy/typecheck/build and dev-PG
Alembic no drift pass. Existing canvas/media and bundle warnings remain. Synthetic
production-build API browser verifies drag/edit/save and all four cards renamed. Mockup
carousel tested for all three drill-down flows, 375px reflow (343px inner width/scrollwidth),
syntax/readback and local state. Temporary preview servers/tabs close after verification.
Fix commit `973ba61` pushed to main and deployed through the host updater/gateway to
admin backend/web/capture after both sources idle and zero active renders. Other hosted
libraries retain their update preferences; no manual move for them. Databases retained.
Local backend/frontend rebuilt/recreated; local helper unchanged. Both health/nginx checks
pass; local bundle `index-Cd15LcjC.js`, hosted `index-DxWw0L5J.js` and rename scope text
verified. Running hosted detector passes a synthetic mixed-age-alias/pitch check. Snapshot
shows only intended app containers/shared crests moved, with every database unchanged.
Owner reload runs corrected grouping on current cache. Preview processes/tabs closed and
viewport reset; inline mockups remain available from the chat fragment. No production layout
selected or implemented; no real footage/credential operation, schema change, dependency
or CI. This final deployment checkpoint is docs only.

## Conservative tournaments and Library layout (2026-11-23)

Branch `codex/tournament-library`, D-049. Owner clarified ordinary weekend pairs,
including 5v5/7v7/9v9/11v11, are not tournaments and explicitly approved updating
outdated two-game test expectations. Unnamed inference now requires >=3 distinct
games against >=2 opponents; duplicates/halves/format variants do not inflate counts.
Named tournaments still qualify. Complete snapshots withdraw obsolete automatic guesses;
manual memberships, exclusions, partial snapshots and owner-renamed tournaments survive.
Cards have stable 16px checkboxes and wrapping actions; the full-width text-input rule
excludes checkboxes/radios. Rename is directly available on every grouped card. Dropdown
choices follow actual membership matching age/season across imported/Hudl/Veo metadata;
all imported pages are considered and search does not hide choices. Hidden active
selections reset after scope loading finishes; stats still cover the whole tournament.

Verification: new tests observed expected red before implementation; 8 weekend detector,
4 stale-group API, 2 component-scope/rename and 1 Library-wiring tests added. Owner-approved
existing persistence/squad fixtures now use named Cup evidence; existing multi-fixture
expectation now uses three fixtures. `uv run pytest`: **818 passed** SQLite (60.21s),
dedicated PostgreSQL **818 passed** (96.84s), sequential. `npm test`: **748 passed** in
147 files (32.82s); typecheck/build pass, bundle `index-BCK9jNN5.js`. Ruff lint/format,
mypy and dev PostgreSQL Alembic no-drift pass. Existing canvas/media and bundle warnings.
Synthetic real-API browser review: Safari direct-card rename/save, Chromium desktop1440/
phone375; no horizontal overflow, checkboxes16px, clean footer. Firefox UI launch timed
out; not claimed tested. Cached hosted Nov22 title/age audit: U11 twelve games still form
one group; U12 two-format pair remains ungrouped. No source login/refresh/stream, new
dependency, schema migration or footage operation.

Released/pushed main as `1e357a2`. Host updater built the exact commit and gateway moved
only the admin library manually after Hudl/Veo idle and zero active renders. Backend/web/
capture run `hosted-1e357a2`; database and other libraries unchanged by this manual rollout.
Shared crests follow the normal updater; other libraries retain their update settings.
Local backend/frontend also rebuilt/recreated, with no local helper restart. Both health
checks and nginx configurations pass; local `index-BCK9jNN5.js`, hosted `index-N5FAsTyQ.js`
and shared `index-5DAL8Tip.css` verified, including new UI text/footer CSS and API routes.
Initial local health request raced startup; subsequent readiness check succeeded. Container
snapshot confirms only intended app containers and shared crests moved. Owner reloads the
webpage to run the new complete-snapshot cleanup; no synthetic records or forced metadata
reconciliation written to the live database. Temporary browser tabs/server closed and
viewport restored. No CI workflow exists. This follow-up is deployment/docs only.

## Hosted tournament release repair (2026-11-23)

Owner reported that refreshing Hudl/Library did not classify 22 November matches.
Confirmed hosted website was still on `552b65e`; tournament commits were only deployed
locally/on the feature branch. Fast-forwarded/pushed main to tested `709e07d`; host updater
built it, and gateway `_move` deployed the admin library through the existing provisioner.
Both capture sources idle and zero active renders before rollout. Its backend/web/capture
now run `hosted-709e07d`; database/local stack unchanged. Other libraries retain their own
update preferences; no manual move performed for them. Shared crest update follows the
normal host updater. Cached hosted catalogue has 296 matches, including twelve U11 games
on 22 November (four games per opponent). Pure detector over cached titles/ages identifies
all twelve in one 2026-11-22 U11 group. No source login/refresh or footage operations.
Health, nginx, detect route, tournament GET and served `index-DjkSpuNE.js` feature checked.
Tournament GET still empty before browser reload; owner must reload the webpage to load
the new bundle and run reconciliation. No code change/tests rerun: previously recorded
806 SQLite/806 PostgreSQL/745 frontend plus all gates cover the exact deployed commit.
Deployment/docs-only follow-up, branch `codex/tournament-library`; no CI workflow exists.

## Automatic tournament and squad tagging (spec 500, 2026-11-23)

**Done**, branch `codex/tournament-library`, deployed locally. Owner replaces manual-first
grouping with automatic classification on Library load/cached metadata changes. Backend
uses date/club/age scopes, title event/game/fixture cues and conservative complete-link
player cohorts. Named home-side squads (also in away fixtures) take priority. Provisional
Squad numbers stay stable; sparse/ambiguous rosters stay unassigned, with explanation and
review labels. Veo action labels never become player names. Imported DB metadata includes
explicit event-player relations, independent of UI pagination.

Single-game Correct, whole-squad correction, tournament rename, membership moves/removal
and remembered exclusions are real persisted operations. Old manual groups remain manual;
corrections seed comparable rosters within their event. Renamed tournaments retain identity
and corrected names through metadata refinements. API reconciliation is idempotent and
partial snapshots do not erase memberships. PostgreSQL advisory transactions serialize
initial creation; UI waits for home-team queries, cancels old detection around manual edits
and suppresses cancelled responses. Backend rejects late unknown-club downgrades. A browser
review exposed duplicate placeholder groups during loading; red/green regressions now cover
both obsolete-empty cleanup and late-snapshot protection. No raw roster persistence in
inference records, source account requests, external AI, new dependencies or schema change.

Verification:
- Detector tests observed red on absent behavior, later on unstable squad numbering and
  away-side parsing; **10 pass**. New automatic API tests observed 404 then red on loading
  refinement/race cases; **12 pass**. Existing 4 tournament API tests pass unchanged.
- Frontend automatic invocation, live player-evidence update, provenance/direct correction
  and rename tests observed red/green; **4 new tests**. Focused automatic/manual/integrated
  Library set: **10 pass**. No existing tests modified.
- Final `cd backend && uv run pytest`: **806 passed**, 61.62s (SQLite).
- Same suite with dedicated `TEST_DATABASE_URL=postgresql+psycopg://memories:memories@127.0.0.1:55432/memories_test`:
  **806 passed**, 83.01s. Full suites were sequential, with network/fixture safeguards.
- Final `cd frontend && npm test`: **745 passed in 145 files**, 23.67s.
- Ruff lint/format, mypy, frontend typecheck/build all pass; dev PostgreSQL `alembic check`
  reports no upgrade operations. Existing media/canvas test and bundle-size warnings remain.
- Isolated production build served real tournament APIs against a temporary SQLite DB,
  fake helper catalogue, fictional rosters and scores. Browser verified automatic grouping,
  two squads, direct correction seeding a matching game, rename, reload, manual/auto badges,
  explanation and phone dialog. Widths exactly 1440/375px. Reference 01 and supplied card
  image remain the layout authority; screenshots are synthetic, no source account reached.
- Read-only local date/title cache audit: **289** cached records, latest date prefix
  **261115**, none **261122** (the screenshot date). 68 candidate date/title groups without
  roster input are exploratory heuristic output, not a measured accuracy result. No cache
  writes or real roster output.
- `docker compose build backend frontend`, then `docker compose up -d --no-deps backend frontend`:
  local backend/frontend recreated only, zero active renders before rollout. Health OK,
  new detect route present in OpenAPI, actual tournament GET empty before Library reload;
  no synthetic data written to production. nginx valid; `index-C4zqzSZt.js` served with
  automatic-grouping feature. No helper restart or hosted rollout; no footage operations.
- No repository CI workflow exists. Owner can reload Library to classify its current cache.

## Tournament groups (spec 490, 2026-11-23)

**Done**, branch `codex/tournament-library`, deployed locally. Bottom-right checkbox
selection covers imported, Hudl and Veo cards; floating batch action, named tournament
and entered-team dialog, reusable suggestions, automatic post-save filtering,
tournament/team filters and per-team results/goals/score coverage. Reassignment and
membership removal preserve all games. Database preferences include groups in normal
backups without schema changes. Source-qualified IDs avoid collisions; tournament and
team names reuse existing spelling case-insensitively. One entered team per game per
tournament; a game can belong to several tournaments. Tournament totals are independent
of card search/age/season; missing/unavailable scores are excluded from W/D/L and goals.
Only member games are scored; imported member metadata reads use batches of four.

Verification:
- API tests first returned 404; implemented persistence, batch validation, reassignment,
  independent groups and removal: **4 passed**. No existing tests modified.
- Pure stats tests first failed on empty aggregation; component and integrated Library
  tests first failed on missing selection/filter/action behavior. **8 focused frontend
  tests passed**, including save failure retention and removal.
- `cd backend && uv run pytest`: **784 passed** (61.53s).
- Same command with dedicated `TEST_DATABASE_URL=postgresql+psycopg://memories:memories@127.0.0.1:55432/memories_test`:
  **784 passed** (84.03s). Full suites ran sequentially; network/fixture safeguards included.
- `uv run ruff check app tests`, `uv run ruff format --check app tests`, `uv run mypy app`:
  all clean. Dev PostgreSQL `alembic check`: no upgrade operations.
- `cd frontend && npm test`: **741 passed across 144 files**; `npm run typecheck`
  and `npm run build` pass. Existing canvas/media test warnings and bundle-size warning remain.
- Isolated synthetic HTTP server served the production build with fake API/helper data.
  Browser reviewed reference 01 and supplied card image, checkbox placement, dialog,
  batch save, automatic filter and separate team stats. 1440px and 375px document widths
  exactly match their viewports. No real helper or account contacted by browser review.
- `docker compose up -d --build backend frontend`: only local backend/frontend recreated;
  database retained, zero queued/rendering reels before rollout. Health OK, real local
  `/api/tournaments` returned empty list (no synthetic groups written), nginx config valid;
  served `index-CK7ERQhM.js` contains the new batch action.
- No hosted rollout, real-source check, footage operation or helper restart. No CI workflow.

## Shared hosted login investigation (2026-11-23)

Follow-up session/audit investigation: excluded the IP hash used by both owner working tests
at 10:55 and 10:59 (recent library access logs show Firefox/macOS and Edge/Windows, with
successful cached Veo requests). Lambro has three other historical IP groups: two successful
logins on Nov 20 at 18:08/19:18; two on Nov 20 19:44 and Nov 21 19:51 (last seen Nov 23
08:22); one on Nov 22 21:25 (last seen 21:27). IP hashes identify login-time groups, not
people or guaranteed current network addresses. Database stores no raw IP or browser string.
Gateway access logs show internal proxy IP; edge has no HTTP access logger configured.
Library web container recreated at 10:55, so its prior browser access logs are unavailable.

Important new evidence: today's 08:57 successful login is a different account, registered
at 08:15 and with neither service permission. Its session last-seen is 09:16:30; gateway
permission GET succeeds at 09:16:49, immediately before screenshot clock 09:17. Lambro's
other sessions show no activity then. This strongly points to the separate account session
being used on the phone, rather than device-local credentials or IP-specific routing.
Screenshot does not display identity, so correlation is strong but cannot prove which
browser produced it. Need verify account icon on phone, then sign out/sign in as intended.
No sessions revoked, credentials read, cross-account library data inspected, source requests,
code changes or deployment. Checks: read-only SQL/session/audit queries and filtered Docker
request logs; documentation diff checks. No additional test suite for this docs-only update.

Branch `codex/shared-login-investigation`, docs only. Investigated reported empty library
on another device using the same Football Memories login. Existing hosted design already
stores each service in `/data/.secrets/<service>.sealed` on the library's persistent capture
volume, encrypted with its own key. Gateway routing and service permissions use user ID,
not browser identity. The reported account has a saved Veo file (0600), 288 cached matches,
56 available videos; no saved Hudl file and zero cached Hudl matches. Both permissions are
recorded server-side. GET status through the account's web proxy agrees with direct helper
GET status. No secret contents read, source requests, credential changes or deployment.

Second-device root cause remains unconfirmed pending URL/account identity/prompt location.
Follow-up phone screenshot shows the public domain and Library's generic connection panel.
Its condition is absent/falsy permission-query data for both services; filters/hidden sources
alone cannot display that panel. Inspected running gateway permission-route source and session
loading: response uses server-side user permissions and session access is not IP-bound.
Aggregated gateway logs since 08:00 UTC contain five permission GETs, all HTTP 200; these
cannot be attributed to the pictured browser, so do not establish its response or identity.
Found misleading hosted Keychain wording and always-present credential form; Library treats
pending/failed permission lookup as an unconnected account. Browser visibility and age/season
filters remain local. These are diagnostic leads, not a reproduced second-device failure.

Verification: backend `uv run pytest tests/connectors/test_sealed_file_store.py
tests/connectors/test_hosted_capture.py -q`: **26 passed**. Frontend `npm test -- --run
src/api/hosted.test.ts src/api/hostedFlag.test.ts src/pages/SettingsPage.hosted.test.tsx`:
**6 passed across 2 files** (`hostedFlag.test.ts` does not exist; no test collected there).
Full SQLite/PostgreSQL/frontend suites and builds not rerun: documentation-only checkpoint.

## Separate original Hub / private preview tabs (spec 480, 2026-11-23)

Branch `codex/separate-player-lab-tab`, merged/pushed main and deployed to admin. My Player opens
its original saved-player hub (or existing chooser); admin Player Lab has its own
main-nav entry and `/player-lab` route, with independent active state. Legacy lab
bookmarks redirect. Removed the global preview shortcut. Existing Hub/PlayerPage
implementations, stored selections and profile data were not changed.

New navigation tests observed red, then green; five regressions include real
PlayerPage → PlayerHubPage navigation/card/timeline, chooser round-trip, legacy
bookmark and ordinary-user denial. No existing tests edited. Frontend **733**
across 141 files; types/default+hosted builds pass. SQLite backend **780**, Ruff,
format, mypy and schema drift pass; PostgreSQL backend **780** passes. Synthetic
1440/375px browser checks confirm separate active tabs, original hub and no page
width overflow. No source login/refresh/stream. Read-only profile metadata check:
hosted admin initially had zero profiles; local primary existed. Owner approved copy
in chat. Copied display name, shirt/position/club/card style and photo via existing
profile APIs into the empty admin library, setting primary there. Verified all target
fields/photo/selection; source local selection, profile fields and photo SHA-256 are
unchanged. No derived match totals, match history or footage were copied. Hosted
navigation rollout complete: host updater built `6ce6cffe625e104082a3b01f78f4978ac434c9e7`;
gateway moved only the admin library. Backend health/Nginx pass; served
`index-UflPUTLq.js` matches hosted build. Target fields/primary/photo checked after
restart. Before/after image snapshot: only admin web/backend/capture changed;
admin DB, other hosted libraries and owner local app unchanged. Existing hosted
update preferences govern later rollouts. No source account accessed.

## Admin player lab (spec 470, 2026-11-23)

**Built on `codex/admin-player-lab`, merged/pushed to `main`; admin hosted library deployed.**
Admin-only route/lazy loading and shortcut, recent performance, selectable charts,
coverage/averages, same-source ten-game comparisons and matched-position teammate rates.
Manual attempts/outcomes are validated, with weighted percentages and unknown/zero preserved.
Browser-scoped notebook includes coach feedback, clip-linked development goals, import/export,
season PNG and an actual selected-moment handoff to the existing reel studio.
No source refresh/action, credential edit, archive write or source account access.

Verification: new model/access tests observed red then green (including confirmed-zero and
keeper-minutes negative controls). Final `cd frontend && npm test`: **728 passed / 140 files**;
`npm run typecheck`, default build and hosted build pass (existing main-bundle size advisory).
`cd backend && uv run pytest`: **780 passed**, SQLite; same command with documented
`TEST_DATABASE_URL`: **780 passed**, PostgreSQL. Ruff check/format, mypy and `alembic check`
pass with no schema drift. No existing test edited. Desktop 1440px and phone 375px synthetic
browser review: document width equals viewport; no console errors. Season PNG downloaded and
visually inspected. Real footage playback/reel rendering not exercised; handoff uses existing
studio contract. New drafts persist in the browser only and are not in normal server backups.
No GitHub Actions workflow exists in this repository.

Deployment: host updater built `a71458a71a576f56b846aa363d5f811b05a6ab45` successfully;
gateway `updates._move` moved only the admin library after both capture sources reported
idle. Backend `/api/health` ok, `nginx -t` passed, served `index-DXngnT3I.js` matches hosted
build. Before/after image-ID snapshot confirms only admin web/backend/capture changed;
admin database, other hosted containers and owner local stack were untouched. No real
source login/stream/refresh was triggered. Existing automatic update preferences remain
in effect for later hosted rollouts; ordinary users remain denied the lab.

## Incremental Veo checks (spec 460, 2026-11-22)

`done`, branch `codex/veo-incremental-check`: Connect and automatic checks reuse
finished available account/shared matches; fresh account listing still controls expiry.
New/unavailable entries read normally, explicit Refresh updates existing details.
Prior resume fix only kept unfinished runs. Offline regression observed red/green;
verification passed; frontend/helper deployed locally. No real source account accessed.

## Position-specific performance (spec 450, 2026-11-21)

`done`, branch `codex/position-player-performance`: explicit My Player position
selects one role across hub/season/report; removes two requested involvement/attack
sections. Milestones now show career football totals and positive count targets,
with conceded as context. Additional keeper appearances/clean sheets/penalty saves/
best saves/per-game stats; named outfield penalty goals. Source/coverage notes are
included in report exports. Crest is positioned over the photo in a shared wrapper.

## Season performance story (spec 440, 2026-11-21)

`done`, branch `codex/season-performance`: Season story uses goalkeeper/outfield
whole-season stats and football summary text, replacing monthly moment picks.
Mixed-role seasons keep both; bars/ring show totals and weighted save percentage.
Twenty outfield categories include fouls, defensive/attacking 1v1 encounters,
assists, key passes, tackles, interceptions, blocks, clearances, dribbles and more.
Action aliases survive the existing parser/cache allowlist; labels appear on the
next normal match read. Missing stays unknown; sources and sample coverage remain.

## Player football records (spec 430, 2026-11-21)

`done`, branch `codex/player-record-stats`: replaces four moment-volume cards with
outfield goals/shots/chances/passes or keeper saves/conceded/shots faced/save percentage.
Shares match action/scorer/keeper sources and saved corrections; labels uncertainty,
partial match coverage and team-tag involvement. Unknown stays a dash. Keeper ratios
use one consistent known-save sample; explicit profile position overrides inference.
The old panel expectations were replaced for the owner's requested four-card change.

## Player label filter (spec 420, 2026-11-21)

`done`, branch `codex/player-label-filter`: shared `looksLikePlayer` excludes
Period Start plus administrative clip/focus and set-piece phrases. Match whole
phrases rather than banning potential name words. Applies to match player rows,
goal inference, Library counts, Insights and display casing. Keep source tags intact.

Read-only local metadata audit: 230 nonempty matches, 406 distinct categories;
actual app predicate changed 168 candidate labels to 160, excluding exactly:
Period Start (64 matches), Analyst Clip (27), Analyst Clips (17), Analysts Focus (4),
Coach Clip (3), Yellow Set Piece (2), Physical Focus (1), Bib Set Piece (1).
These are labels/match counts, not a verified roster. Goal inference already guarded
analyst/coach/focus independently, while other consumers could still accept them.
Defensive variants include Period End, Coach Clips, Technical/Tactical Focus and
Set Pieces; not claimed as observed source labels. No source account requests.

Verification: 14 predicate/display regressions observed red initially; integration
also red with the exclusion disabled, then green. Existing assertions unchanged.
Frontend **680 passed**, typecheck/build pass. Backend **771 passed each** on
SQLite and dedicated PostgreSQL (`memories_labels_test`, then removed). Ruff
check/format, mypy and Alembic no drift pass. Existing warnings remain; no CI workflow. Audit over actual cached labels checked the
production predicate, without persisting raw metadata or real roster names.

Deployment: merged/pushed main `2f81736`; frontend rebuilt/recreated locally.
Health ok, Nginx config pass, served `index-CL2U0gIr.js` includes period-label
exclusion. Backend/helper left running. No UI restyle or live account check needed.
Hosted libraries follow existing update preferences. Deployment record docs-only.

## Player action profile (spec 410, 2026-11-21)

`done`, branch `codex/player-action-profile-ui`, managed worktree
`/Users/simon/.codex/worktrees/player-action-profile/Football Memories`.
Owner selected mockup 2: identity/minutes sidebar, horizontal count bars, compact
zero counts, expandable missing stats and sources. Common maximum across players
and selected metric group, independent of search/sort. Explicit count/source labels,
likely goals and clip seeking retained; numerical counts open their clips too.
Estimates/confirmed minutes unchanged, compact explanation disclosure added.

Verification: new shared-scale and numeric-count interaction tests observed red,
then green. Existing tests unchanged. Final `npm test`: **658 passed** after
incorporating keeper fix `70bbc49` and deployment docs `6bc541e` from main;
frontend typecheck/build pass. Backend **771 passed SQLite**, **771 passed dedicated
PostgreSQL**; ruff check/format, mypy and Alembic no drift pass. Existing warnings remain.
Initial shared checkout full frontend run caught the other task’s in-progress keeper
test, so feature edits were moved out and the other task’s files preserved. Initial
shared PostgreSQL run: 2 failed/2 errors as another suite dropped shared tables.
Dedicated `memories_profile_test` retry passed, then database dropped. No gate weakened.
Desktop/375px synthetic browser review against selected mockup: bars, estimate detail,
source disclosure and Passes clip review. Screenshot `/tmp/football-action-profile.png`.
No live account accessed; no source or library writes. Temporary preview files/servers
removed. No CI workflow exists.

Deployment: feature branch pushed, main advanced to `89144c3` without changing the
other task’s checkout. Built/recreated only frontend from the isolated worktree using
the owner’s existing Compose environment. Health ok, Nginx config pass; served
`index-DYcDAzFm.js` contains Recorded contributions / Sources and unrecorded stats.
Backend/helper left running; keeper fix included. Hosted updates follow existing settings.

## Goalkeeper attribution (spec 400, 2026-11-21)

`done`, branch `codex/keeper-attribution`, merged to `main` at `70bbc49`: weight pre-kick tags without discarding
plausible candidates, include long tags, infer each period independently, retain
returning keepers, reject ties/single-kick guesses and deduplicate kick ids. Use
ball-in time for conceded goals. Explicit goal assignments win; multiple confirmed
keeper names without timing no longer default to the first. Unknown goals/saves
remain visible. Closing END HALF padding retains the final shot with its keeper.
Shared spell consumers (player stats and estimated minutes) use the corrected spells.

Manual metadata-only audit over local cache: 229 nonempty matches across available
ages/seasons; 180 with named spells, 281/965 conceded goals unassigned. Coverage
only, not a ground-truth accuracy claim. Reference game resolves to owner-named
keepers alternating over four periods, three conceded each, saves estimated 0/5.
Owner clarified that the first name in the cached tags is correct. No roster or
source payload committed; no account requests or footage/cache edits.

Verification: frontend `npm test`: **656 passed**; typecheck/build pass.
Backend `uv run pytest -q`: **771 passed** on SQLite; PostgreSQL equivalent with
`memories_test_keepers`: **771 passed**. Ruff check/format, mypy and Alembic schema
check pass. Existing jsdom/Starlette/chunk-size warnings remain. No CI workflow.
Deployed locally: `docker compose build frontend` then
`docker compose up -d --no-deps frontend`; health returns ok, Nginx config passes,
served `index-DgovPcoI.js` contains the new unknown/estimate explanations. Backend
and helper left running. No live source account opened. Hosted libraries follow
existing update preferences. This deployment record is docs-only. New regressions observed red before fixes (rotation,
ambiguous evidence, unsupported periods, manual assignment, UI unknown option,
timing-overlap aggregation, final padded shot, unknown saves, duplicate kicks).
Original tests unchanged. Synthetic desktop and 375px iframe review complete.
First PostgreSQL run collided with another chat's tests (shared tables dropped);
serial rerun on a dedicated disposable database passed; that database was removed.
Work moved into a managed worktree after another chat switched the shared branch.

## Estimated minutes and presentation exploration (spec 380, 2026-11-21)

`done`, branch `codex/estimated-player-minutes`: automatic approximate outfield
minutes from first/last touch in each tagged period, subtracting known keeper spells.
Clearly labelled with method and uncertainty. Confirmed minutes override; sorting
uses the displayed value. No reliable lineup/substitution metadata exists in the
cached shape. Sparse tags may miss edges or absences; missing period markers may
include breaks. Single isolated touches stay unknown. Three conversation mockups:
Compact summary, Action profile, Comparison rows, using only supplied screenshot
counts. No production layout replacement; recommend comparison rows + expanded bars.
Finishing has no current app definition/mapping; advise clip category, not quality score.

Verification: new behavioral tests observed red with null stub (not merely missing
module), then green. `npm test`: **645 passed**, `npm run typecheck` and build pass.
`uv run pytest -q` and PostgreSQL equivalent: **771 passed each**; ruff check/format,
mypy and alembic check pass. Existing jsdom/Starlette/bundle warnings remain.
Minutes explanation reviewed in a synthetic 375px browser frame. Mockups reviewed
at desktop and phone widths. No source account accessed or library files changed.
No existing tests changed; only new cases appended. No CI workflow configured.

Deployment: merged/pushed main `0ee9991`; rebuilt/recreated frontend only. Health
and Nginx config pass; served `index-64qTA5xo.js` contains estimate explanation.
Backend/helper left running; no source account read. Synthetic preview servers stopped
and temporary source files removed. Design alternatives remain inline conversation content.

## Individual player actions and full comparison (spec 370, 2026-11-21)

`done`, branch `codex/player-individual-actions`: preserve allowlisted Individual
action labels on the original player moments through parser/cache/normal library;
prefer these to overlapping team events. Added all requested action metrics, grouped
stats filter, explicit source labels and confirmed minutes edit/clear/sort. Minutes
live in backed-up preferences, independently per player/match; no schema migration.
Generic Defensive action / ATT or DEF 1v1 / Dribbling & RWTB are not relabelled as
specific actions or successful dribbles. Existing goal and keeper logic retained.

Verification: new tests observed red before implementation. Backend **771 passed**
each on SQLite and development PostgreSQL; frontend **638 passed**. Ruff check/format,
mypy, schema check and frontend typecheck/build passed. Existing Starlette/jsdom and
bundle warnings remain. Offline desktop/375px reference 02 review: group filtering,
minutes editing/save, action counts and source-bearing clips. Owner signed into Chrome
for requested read-only Cardiff 9v9 inspection: 181 Passing-filter results, 19 with one
player selected. No source roster/payload/session data committed. No CI workflow exists.

Deployment: merged/pushed to `main` at `49b5820`; backend/frontend rebuilt/recreated
locally. Health, Nginx, minutes API GET and served bundle `index-BYrNKJL3.js` verified.
Helper gracefully stopped/started under launchd after both services were checked idle;
one normal Cardiff stream/metadata read completed. Live cache and `/library` now preserve
181 Passing-labelled source clips (also Crossing/Regain). Pure app comparison over the
served match confirms all 13 outfield players' pass counts equal their attached labels.
The initial expectation of an outfield row with 19 was wrong: that source-selected player
is an inferred keeper and correctly excluded. No saved goal/keeper overrides on Cardiff.
No full match downloaded or footage overwritten; ordinary source playback requests only.
Other caches update on next match open. Hosted libraries follow existing preferences.
This deployment record is a docs-only checkpoint; source suites were already green.

## Player goals and offsides (spec 360, owner request 2026-11-21)

`done`, branch `codex/player-goals-offsides`: add Goals/Offsides and sort options,
with eight metrics arranged four across on desktop, two on phones. Goals reuse
confirmed/likely scorers (visible likely marker); overlapping teammates do not
also receive the goal. Untimed owner-added goals count without a seek button.
Offsides count our tagged events overlapping the player's outfield windows.

Verification: six new tests observed red, then green; existing tests unchanged.
Full frontend **631 passed**; backend **758 passed** each on SQLite and development
PostgreSQL. Ruff check/format, mypy, schema check, frontend typecheck/build passed.
Existing Starlette/jsdom and bundle warnings remain. Browser checked offline with
synthetic data at desktop and 375px against reference 02 styling, including clip
review. No manual real-account verification or footage changes. No CI workflow.
Merged/pushed to `main` at `e27c6b7` and deployed locally on 2026-11-21 with
`docker compose up -d --build --no-deps frontend`. Health returns ok; Nginx config
passes; served `index-Cx_eLs_S.js` verified with Goals/Offsides wording. Backend
and helper left running. Hosted libraries follow existing update preferences.
Deployment record is a docs-only checkpoint after the green source checks.

## Match player comparison (spec 350, owner request 2026-11-21)

`done`, branch `codex/match-player-stats`: Player stats tab between Goals and
keepers and Insights on Hudl/Veo match pages; searchable/sortable outfield players,
six tagged-involvement metrics, inline clip drill-down and video seek. Missing
codes show a dash; no pass or shooter attribution invented. Keeper spell windows
excluded while retaining outfield tags. Veo absence explained. Owner approved two
exact tab-order expectation edits; other existing assertions unchanged.

Verification 2026-11-21: new panel/integration tests red first; keeper-boundary
regression red then fixed. `uv run pytest -q`: **758 passed** on SQLite and
**758 passed** on development PostgreSQL (collected count independently confirmed).
Ruff check/format, mypy and Alembic check all passed. `npm test`: **625 passed**;
`npm run typecheck` and `npm run build` passed. Existing Starlette deprecation,
jsdom media/canvas and bundle-size warnings remain. Offline browser checked at
desktop and in a 375px phone frame against reference 02, including inline shot
clips and exact timestamp seek. No real account used, no footage changed, no
Docker/deployment changes. No CI workflow exists.

Deployment checkpoint 2026-11-21: feature fast-forwarded to `main` at `3aa8ee8` and
pushed. `docker compose up -d --build --no-deps frontend` completed. Local health
endpoint returns ok; `nginx -t` passed; served `index-DZGNBRir.js` contains Player
stats, Outfield players and the attribution wording. Backend/helper not restarted.
Hosted libraries not manually moved; their existing update settings govern rollout.
Docs-only checkpoint after deployment; no source changes or additional suite run.

## Public runtime hardening (spec 330, owner request 2026-11-20)

`partial`, branch `codex/public-runtime-hardening`: Dockerfile changes and new tests committed
at `4ac2237`; hosted builds/rescans and isolated import/Nginx smoke checks complete. Deployment
pending safe integration validation or an owner verification exception. Python runtime pinned;
available apt security updates installed; pip removed after dependency/browser installation;
Nginx moves from 1.27 to pinned current stable 1.30.7. No application code or user data changes.

Verification 2026-11-20: three new Dockerfile tests red first, then green. `uv run --directory
backend pytest`: **682 passed**; same with `TEST_DATABASE_URL` for development PostgreSQL:
**682 passed**. Ruff check/format, mypy and `alembic check`: clean/no new upgrade operations.
`npm --prefix frontend test`: **599 passed**; typecheck/build passed (existing bundle-size and
jsdom media/canvas warnings). `npm audit`: zero findings. Production app Python audit found
only pip 25.0.1 findings, which the new Dockerfiles remove; OS/media findings tracked in the
Gateway report. No real Hudl/Veo account used. The image-build script correctly refused an
uncommitted tree, then built all three hosted images at `4ac2237`. Rebuilt web has no high/
critical scan entries; backend/capture retain unfixed media/system advisories. Images are not
deployed; no existing library or owner app/helper changed. Gateway fixes at `b4bec39`: 305
ordinary tests, four real-Caddy tests, portal 61 and provisioner 64 passed. The owner approved
the tunnel fixture subnet relocation after the original production-overlap failure. Full
integrated runner and provisioner Docker test remain guarded against production. No app CI
workflow exists.

## Match page summary strip and tabs (spec 320, owner request 2026-11-16)

`done`: Hudl and Veo match pages put a momentum timeline (playhead, click to watch) and
a summary strip (possession, chances/attempts, on target, corners, who was in goal)
under the video, then tabs Moments | Team stats | Goals and keepers | Insights, Moments
first; empty tabs are left out. Tag rail sticks beside the page. Tests:
`matchSummary.test.ts`, `MatchTabs.test.tsx`. Not built from the mockup: Team stats in
two columns, goals in time order with a running score.

## Goals and keepers, season top scorers (spec 270, owner requests 2026-11-16)

`done`: match pages (Hudl and Veo) show goals with a likely or confirmed scorer,
keepers with saves and goals conceded; the owner edits and saves them (preferences
`goals:<id>`). Match report Scorers/Keeper lines; season report top three scorers,
confirmed only. Tests: `test_goals.py`, `goals.test.ts`, `report.test.ts`,
`GoalsPanel.test.tsx`. 2026-11-16: likely scorer = touch nearest the ball going in;
likely keepers = spells from who is tagged at our goal kicks, with changes (snapped to
END HALF), saves and conceded per spell; checked on the 152 cached matches.

## Match recap (spec 310, owner request 2026-11-16)

`removed` 2026-11-16 at the owner's request ("not needed"), with `lib/matchRecap.ts`.

## Reel presets (spec 300, owner request 2026-11-16)

`done`: "Quick reels" on Hudl and Veo match pages: the player's moments, team moments
with the player (our goals/chances overlapping their tags), our goals, every goal, our
goals and chances (Veo: OUR GOAL/OUR SHOT events). Each opens Reel Studio with that
selection. No pre/post-roll change (helper untouched). Tests: `reelPresets.test.ts`,
`QuickReels.test.tsx`.

## Game-state timeline (spec 290, owner request 2026-11-16)

`partial`: the match-page strip ("How the score went") was removed 2026-11-16 at the
owner's request. Season report still adds Scored first, Came from behind, Clean sheets
and Goal times known, counting only matches whose goals are all timed and add up.
Tests: `gameState.test.ts`, `report.test.ts`.

## Veo expiry queue (spec 280, owner request 2026-11-16)

`done`: Downloaded page "Before Veo deletes them": Veo matches with video and no
full-match download, soonest estimated expiry first (match date + 12 or 6 months,
owner decision 010: owner confirmed 12), Veo's `expires-soon` counts as 30 days or less; expired
matches never saved listed. Frontend only, no Veo request. Tests:
`veoExpiryQueue.test.ts`, `VeoExpiryPanel.test.tsx`.

## New matches appear on their own; Veo events filters (owner request 2026-11-15)

`done`: Veo list re-read on opening/returning to the app when over 6 h old (not on
a Veo match page or Clips); Hudl also re-checks on returning; one try per 6 h per
browser. Veo highlights panel filters by highlight type and Veo event. Tests:
`AutoCheck.test.tsx`, `veoAutoCheck.test.ts`, `hudlAutoCheck.test.ts`,
`VeoMatchFullPage.test.tsx`.

## Reel score and team stats cards, Hudl team stats (owner request 2026-11-15)

- done: score tick box on the match title card; team stats card with a chosen
  duration for Hudl and Veo reels (helper places it after the match's moments);
  Team stats panel on Hudl matches. Tests red first; frontend 462, backend 604 on
  both databases. Cards checked in the browser on a real Veo match (not recorded
  into a reel: making a reel was not run).

## Veo clips by range, multi-type rails, Veo head to head (owner request 2026-11-15)

- done: Veo reels/moments read only the needed byte ranges (relay through
  `_client`), progress message for the post-download tagging step, several moment
  types at once on Hudl and Veo rails, Veo record against the opponent. Tests red
  first (one Veo reel test replaced: "downloads the full match first" was the old
  behaviour the owner asked to change). Frontend 456, backend both suites green.

## Veo team events as moments and momentum (owner request 2026-11-15)

- done: team events in the Veo match rail, chosen like highlights (helper accepts
  their ids); momentum chart in Match insights. Tests red first; frontend 453,
  backend 597 on both databases. Checked in the browser on a real match.

## Veo refresh, team totals, club crest; maps and POSTs checked (owner request 2026-11-15)

- done: real Veo Refresh run (285 matches, 57 with video, 14 with team data); it
  showed Veo's sides are "Own"/"Opponent", now read (cache v2 re-reads once).
  Per-side totals (GET `teams/{Own,Opponent}/stats`) on the Team stats table. Club
  crest from the match report saved by the helper, given to club names with no crest.
- checked, not built: heatmaps, passing network, possession and the analytics POSTs
  all refused on this account (403/404/422; no pitch positions). No POST enabled.

## All matches Hudl cards: score and date (owner request 2026-11-15)

- done: each cached Hudl card shows both crests and the score at the bottom right
  of the thumbnail (corrected score, else goal tags; hidden when unknown) and the
  date from the title as "15th November 2026" ("Undated" otherwise), replacing
  "Watch match · Download match or tagged moments". Tests red first; frontend
  446 passed, both backend suites green. Browser-checked on the cached library.

## Veo tick boxes and Veo data research (owner request 2026-11-13)

- done: tick boxes on Veo highlights; Play Tagged, Download selected (video or
  ZIP) and the reel use the ticked ones.
- open: decision 009, a one-off read-only check of Veo's analytics reads.

## Connections switches, Veo reels, crest search (owner requests 2026-11-13)

- done: Show Hudl / Show Veo only choose the libraries listed (Library, Clips);
  the boxes stay on Connections.
- done: Veo highlight reels (spec 260 task 4) through Reel Studio, Veo team name.
- partial: crests: Wikipedia search and Commons added, plus a web image search
  link and paste in Club crests. Decision 008 still open for other sources.
- not checked: a real Veo reel on the owner's account.

## Veo playback fix and Veo match page (owner report 2026-11-13)

- done: Veo video would not play in Safari over the network (stream/poster links
  not rewritten to `/helper`); `veoRequest` now rewrites them. Test red first.
- done: a Veo card opens a full match page like Hudl's, with the stats Veo's
  highlights allow (both teams). Browser-checked on a synthetic stand-in.
- not checked: a real Veo match playing in the owner's Safari (owner to try).

## Owner follow-ups 2026-11-13

| Item | Status |
|---|---|
| Drawing Move tool | done (tests; real mouse drag in the browser) |
| Next / previous tagged moment (buttons, N/B, media keys) | done (tests; browser-checked buttons and N; media keys not tried) |
| Green outline complete, follows the clicked moment | done (tests; browser-checked) |
| Continue watching: last three | done (test) |
| Veo connection and Hudl/Veo show-hide toggles | partial: phase 1 done (save, test, refresh, toggles; spec 250); Test passes on the owner's account |

## Spec 260 Veo Library, playback and download

| Item | Status |
|---|---|
| 1. Connected Veo in All matches, `/veo/:id` page (details, halves, highlights) | done (6 tests; browser-checked desktop and phone on a synthetic stand-in; owner's cache empty until Refresh) |
| 2. Watch (stream through the helper, Range) | done (tests); not yet watched on the real account |
| 3. Full-match MP4 download | done (tests); not yet downloaded on the real account |
| 4. Highlight clips | todo (after 3) |
| Veo in insights / player hub | todo: owner decision 007 (Veo tags are event types, not players) |

## Owner follow-ups 2026-11-13 (after the first Veo download)

| Item | Status |
|---|---|
| Veo posters in the Library (from Veo's thumbnail, saved on Refresh) | done (tests); owner runs Refresh to fill them |
| Grassroots crests: side codes/colours ignored; owner-added crests (Settings) | done (tests); other sources: owner decision 008 |
| Veo download named `<match> <date>.mp4` | done (tests); the earlier download keeps its name |
| Veo match opens in the Clip explorer (`/clips?match=`, `/veo/:id` redirects) | done (tests) |
| Team name per source (Hudl, Veo) in Settings; Downloaded uses it | done (tests) |
| My Player: no Tagged with; Teams narrower; four totals stacked, card height | done (tests; browser-checked on real data) |
| Recent matches: 20 matches, blue gradient bars | done (tests; browser-checked) |
| Connections: Import from folder removed, Veo beside Hudl; Connect; Veo Disconnect and status | done (tests; browser-checked) |
| My Player: Records and streaks (best match, best month, above-average run, next milestone, personal best) | done (tests; browser-checked on real data) |
| My Player: Season story (a few sentences per season, change on last season, match of the month links) | done (tests; browser-checked on real data) |
| My Player: Milestones timeline (first match, seasons, new age groups, moment and match counts, new bests, first team goal with the player on) | done (tests; browser-checked on real data) |
| My Player: Top 5 moments (favourites, then Hudl moments in a team goal, save, chance or shot faced; Make a reel) | done (tests) |
| My Player: Opponent map (clubs played, crests, how often, latest match) | done (tests) |
| Veo match page: Team stats from Veo's match report and events (us v opponent, goals/shots timeline); decision 009 | done (tests); real account on next Refresh |
| Show Hudl off: Library hero, latest match, overview, profile and recent moments from Veo; Clips opens the newest Veo match | done (tests; browser-checked) |
| My Player: Teams narrower, totals 2 x 2 | done (browser-checked) |
| Import: drop or choose a video, saved to the import folder's uploaded/ (never replaces) | done (tests; browser-checked without uploading) |
| Veo Disconnect whenever an account is saved; home-network address on Connections; crest on Your player | done (tests; browser-checked) |
| Release 0.4: version, changelog, README, screenshots (synthetic data) | done |

## Spec 240 drawing board (owner request 2026-11-13)

| Item | Status |
|---|---|
| Toolbar under the video, above Match insights | done (tests; browser-checked desktop and phone width) |
| Ten drawing tools, colours, widths, undo/redo, eraser, keys | done (tests; each tool drawn in the browser) |
| Save drawing as data (moment or any frame) | done (API and page tests; saved and reloaded on a scratch backend) |
| PNG screenshot of frame + drawing | done (poster and playing frame checked in the browser; real Hudl stream not tried) |

## Spec 230 match insights (owner request 2026-11-13)

| Item | Status |
|---|---|
| Duplicate tag spellings merged (entities, spacing, case) | done (helper serves one spelling; cache files untouched; batch by code matches every spelling; tests) |
| Possession % from tag lengths, per match and per Library view | done (tests; browser-checked on real cached tags: 53/47 one match, 52/48 over 119) |
| Momentum timeline, click to seek | done (tests; rendered on real tags; seek not tried on a real stream) |
| Player involvement ("during"), journey by season, partnerships | done (tests; browser-checked on real tags for Pat Example on the dev database) |
| Head-to-head on the match page and an Opponents page | done (tests; browser-checked) |
| Phases of play ("Attacks ending in a chance"), playable/downloadable/reel via the possession tag's id | done (tests; listed on real tags; playback not tried on a real stream) |
| Clip notes and drawings | done (tests; editor not tried over a real stream: needs the live helper) |
| Shareable report (PNG + print to PDF) | done (tests; PNG drawn in the browser from real data) |
| Alerts bell (new matches / new player moments) | done (tests; on the dev database it reported the one match the catalogue refresh added) |
| Continue watching | done (tests; no real watch rows yet) |
| Deployed | merged to main, Docker rebuilt, helper restarted 2026-11-13 (see HANDOFF) |

## Owner request 2026-11-13: opponents and crests

| Item | Status |
|---|---|
| Opponent read from every Hudl title form (nicknames, short forms, cut-off names, "Arsenal v Aston Villa", scores) | done (tests from the owner's real titles; every title in the cached library checked) |
| Crest lookups survive Wikipedia rate limits (429 pauses, not a day-long miss) | done (tests; checked on the live Docker app: all timeline matches show crests except CFT Slovakia) |

## Owner requests 2026-11-12

| Item | Status |
|---|---|
| Downloaded > Delete with confirmation (to Trash) | done (tests; browser-checked layout and dialog on dev data, nothing deleted) |
| Plex-friendly metadata for matches, moments, reels (spec 220) | done (tests; built on the owner's NAS share with copies, since SMB has no hard links: 17 reels, 6.2 GB; not yet tried in Plex/Jellyfin) |

## Spec 210 match scores (2026-11-12)

| Item | Status |
|---|---|
| Tagged score per Hudl match, corrections on the match page | done (tests; browser-checked on the owner's real Hudl list via the dev server, correction saved and cleared on the dev database) |
| Official results from Hudl | not started (needs read-only research on the real account; owner's call) |

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

### 2026-11-22 — Incremental Veo checks (spec 460)

- New Connect regression observed red: four requests for an already saved match,
  expected zero. Automatic hook red: request lacked `only_missing`. Both now green;
  a new match still receives all four detail reads (negative control).
- `cd backend && uv run pytest`: **779 passed**, SQLite (57.10s).
- `cd backend && TEST_DATABASE_URL=postgresql+psycopg://memories:memories@127.0.0.1:55432/memories_test uv run pytest`:
  **779 passed** (81.76s). Added one shared-cache restart test after full collection;
  `uv run pytest tests/connectors/test_veo_shared.py -q` then the same with
  `TEST_DATABASE_URL` above: **35 passed each**, including that additional test.
- `uv run ruff check app tests`, `uv run ruff format --check app tests`,
  `uv run mypy app`: pass. `FM_DATABASE_URL=postgresql+psycopg://memories:memories@127.0.0.1:55432/memories uv run alembic check`:
  no new upgrade operations.
- `cd frontend && npm test && npm run typecheck && npm run build`: **700 passed**,
  typecheck/build pass. Existing jsdom media/canvas and bundle-size notices remain.
- `docker compose build frontend && docker compose up -d --no-deps frontend`:
  local deployment complete. `/api/health` and `nginx -t` pass; served
  `index-CsLn4CZP.js` contains incremental flag. Checked both helper sources idle,
  sent launchd SIGTERM, waited for graceful exit, kickstarted helper; both status
  endpoints healthy/not busy. Backend container unchanged. No source login/read
  or real-account check performed; all behavior checks used synthetic fake Veo.
- No visible layout change; no browser walkthrough needed. No GitHub Actions workflows.
  Hosted copies follow existing update preferences. Existing archive files untouched.


### 2026-11-21 Position-specific performance (spec 450)
- Test-first regressions observed red for profile-role precedence, explicit penalty
  parser/cache outcomes, shared performance totals/strict clean sheets, valuable
  milestones, removed sections, new report rows, and a profile-failure loading hang.
  Negative controls: generic penalty/miss and team penalty-goal overlap do not credit
  a named player; unrelated matches and split/unknown-score keepers are excluded.
- Updated old moment/mixed-role expectations only for the owner's explicit behavior
  replacement. ViewerFeatures report fixture adds the now-required `/api/goals`
  response; every existing assertion in that integration test stays unchanged.
  First full frontend run surfaced that missing response; final run recorded below.
- Crest change verified structurally after implementation and by a synthetic browser
  intersection/hit test (the crest overlaps and paints above the photo). No real
  player photos or source data used in browser fixtures or committed.
- `cd backend && uv run pytest`: **773 passed**, SQLite, 62.53s. Then
  `TEST_DATABASE_URL=postgresql+psycopg://memories:memories@127.0.0.1:55432/memories_test uv run pytest`:
  **773 passed**, PostgreSQL, 81.07s. Network/fixture guards included. Existing Starlette warning.
- `uv run ruff check app tests`, `uv run ruff format --check app tests`, `uv run mypy app`:
  pass. `FM_DATABASE_URL=postgresql+psycopg://memories:memories@127.0.0.1:55432/memories uv run alembic check`:
  no new upgrade operations.
- Offline Playwright/Chrome synthetic 1440px and 375px: goalkeeper-only hub,
  role-specific milestones, both requested sections absent, crest overlap/stacking,
  outfield switching, match 75%/season 83% weighted ratios. No page errors or
  horizontal overflow. Match and season Save image exports generated and visually
  inspected; player source notes fit inside their SVG/PNG bounds.
- Final `cd frontend && npm test`: **699 passed** (24.23s), followed by
  `npm run typecheck` and `npm run build`: pass. Existing jsdom media/canvas and
  bundle-size notices remain. The final rerun includes the new profile-error guard.
- `docker compose build frontend && docker compose up -d --no-deps frontend`:
  deployed locally. Nginx config and `/api/health` pass. Served HTML points to
  `index-c3A1azku.js`; role stats/report/milestone markers present and both retired
  section labels absent. Backend container unchanged (no schema/config update).
- Host helper: locally checked Hudl ready/not busy/not syncing, Veo idle/not busy;
  launchd SIGTERM, waited for graceful exit, kickstarted login item. Both local
  status endpoints healthy; new penalty-action aliases loaded. No source requests.
- Staged diff whitespace/secret scan clean; no footage or real roster/image files staged.
- No real source account accessed or existing archive files changed. Hosted
  libraries retain their existing update preferences. No GitHub Actions workflows.


### 2026-11-21 Season performance story (spec 440)
- Test-first: backend duel/foul parse/cache regression observed red (empty actions),
  frontend 1v1/foul regression red (missing events), five season aggregation tests
  red against the empty new contract, four presentation tests red against a bare
  section. All then green. Old monthly-story assertions replaced for the owner's
  explicitly requested retirement; other existing assertions remain unchanged.
- `cd frontend && npm test`: **688 passed**; `npm run typecheck` and `npm run build`
  pass. Existing jsdom media/canvas notices and bundle-size warning remain.
- `cd backend && uv run pytest`: **772 passed** (SQLite, 68.09s); then
  `TEST_DATABASE_URL=postgresql+psycopg://memories:memories@127.0.0.1:55432/memories_test uv run pytest`:
  **772 passed** (PostgreSQL, 98.49s). Includes network/fixture guards. Existing Starlette warning.
- `uv run ruff check app tests`, `uv run ruff format --check app tests`,
  `uv run mypy app`: pass. `FM_DATABASE_URL=postgresql+psycopg://memories:memories@127.0.0.1:55432/memories uv run alembic check`:
  no new upgrade operations.
- Offline Playwright/installed Chrome with all requests synthetic: 1440px mixed-role
  season, 375px mixed-role season, older-season switch and missing categories;
  weighted 65% keeper example and 7 older-season passes verified. No page errors or
  horizontal overflow. Count bars/ring and source captions reviewed at both sizes,
  preserving reference 03 hierarchy and the approved shared dark palette.
- `docker compose build frontend && docker compose up -d --no-deps frontend`:
  local frontend deployed. Nginx config, `/api/health` and served HTML/JS
  `index-BozlOEQQ.js` checked for both role panels and new 1v1 labels.
- Host helper status read locally (no source requests): Hudl/Veo ready, not busy,
  no sync. Sent launchd SIGTERM, waited for graceful exit, kickstarted login item;
  both local status endpoints healthy. New parser aliases now loaded. Backend
  container unchanged; no schema/config update needed. Hosted installs follow
  existing update preferences; no source account accessed or archive files changed.
- No GitHub Actions workflows exist in this repository.


### 2026-11-21 Player football records (spec 430)
- New aggregation tests observed red (four behavior failures against an empty
  implementation), then green; 7 focused tests pass. Existing panel expectations
  replaced for the explicitly requested four-card behavior change.
- `cd frontend && npm test && npm run typecheck && npm run build`: 685 passed,
  typecheck/build pass. Existing jsdom media/canvas notices and bundle-size warning.
- `cd backend && uv run pytest`: 771 passed (SQLite); then
  `TEST_DATABASE_URL=postgresql+psycopg://memories:memories@127.0.0.1:55432/memories_test uv run pytest`:
  771 passed (PostgreSQL). Network/fixture guards included. Existing Starlette warning.
- `uv run ruff check app tests`, `uv run ruff format --check app tests`,
  `uv run mypy app`: pass; `FM_DATABASE_URL=postgresql+psycopg://memories:memories@127.0.0.1:55432/memories uv run alembic check`:
  no new upgrade operations.
- Offline Playwright with synthetic HTTP routes, installed Chrome: keeper 1440px
  and 375px plus outfield 375px; four cards, 75% example, direct pass count and
  no horizontal overflow. Screenshots visually compared with reference 03's
  hierarchy and current dark-palette design rules. First browser attempt required
  installed Chrome instead of absent bundled Chromium; preview routing corrected.
- `docker compose build frontend && docker compose up -d --no-deps frontend`:
  deployed locally; Nginx config and `/api/health` pass. Served HTML points to
  `index-DcpX92b7.js`; its four-card football records verified. Backend/helper untouched.
- No real account accessed; no library files changed. Hosted instances use existing
  update settings. No GitHub Actions workflows in this repository.


### 2026-11-13 Match insights (spec 230, branch spec-230-match-insights)

- Backend `uv run pytest`: 461 passed on SQLite and 461 on Postgres (sequential);
  ruff check and mypy clean.
- Frontend `npm test`: 72 files / 287 tests passed; typecheck and build clean.
- ruff format --check clean, alembic check: no drift. Network-block test ran (3).
- Browser: dev backend + dev database, with a stand-in helper serving a copy of
  the real cached library (no Hudl client), reached via `app.localhost` so the
  page used the `/helper` proxy. Checked match insights, attacks list, player hub
  panels, Library possession, Opponents, match report PNG, 375px (no overflow).
- Opening the dev app first against the real helper started its normal app-open
  check (catalogue refresh + tag sweep, D-023, read-only). Nothing else touched Hudl.
- Not checked: notes editor and momentum seek over a real stream; alerts and
  continue watching on the owner's own database; Docker deploy.

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

2026-11-24 spec560/10-minute extension checkpoint: frontend789 passed, typecheck and hosted build clean; synthetic browser desktop/375px review/seek/revision flow verified, ten-minute wording confirmed. Backend unchanged:850 SQLite/850 PostgreSQL plus lint/types/schema drift passed earlier this turn. Worker47 passed, ruff clean; real football API E2E355.51s. Owner nominated cached Veo teacher tags and authorized new assertion correction409→404 for completed undeclared artifact. Native ten-minute admin job running; final gateway/deploy pending. No footage/weights/real roster staged.

2026-11-24 admin preview deployed app754aace/gateway94af8cb; gateway CI all3 jobs green. Exactly4/32 containers changed (gateway and admin app), other28 IDs/images preserved. Global latest unchanged, admin auto-updatefalse preserved. Anonymous analytics401, admin backend healthy, deployed review/teacher code loaded. Ten-minute native job continues; Safari ordinary-family session correctly has no lab, no sign-in/session manipulation.

2026-11-24 TEN-MINUTE RUN COMPLETE: native admin job09b509731e6b4ee4a89c46494264c70d,18:00–28:00,45m15s local wall.1799 detector samples,2155 tracklets; legacy same-cache replay16162 births (-86.67%, not identity accuracy).52 unreviewed action suggestions,44 separate Veo records,1 unverified jersey hint,0 identities. No model goal suggestions for either of2 Veo goal tags; ball coverage25.9%.15 hashes, ZIP CRC, full video decode and unchanged original/source/sample hashes pass. Isolated completed-artifact HTTP replay1 passed including206 ranges; actual training remains blocked by unreviewed/single-match data.4800 real feature frames/candidates ready. Worker49 tests, native idle reload done; signed-in admin browser playback still unverified.

2026-11-24 spec570 completed (Codex build, Claude review/fix): frontend799 pass, typecheck/build; backend SQLite+PostgreSQL green, ruff/mypy; gateway424 pass; worker76 pass. Crowd-as-officials fixed (3547→514 real obs). Synthetic desktop/375px review: filters, seek, overlay, no overflow. Not deployed; live worker not restarted.

2026-11-24 spec570 Deployed 2026-11-24 ~11:45 UTC (owner: "Yes, deploy preview"): gateway bcd33f5 recreated with compose.yaml+public+analytics; app 6abd627 built as :hosted-<sha> only, added to updates/status.json built (latest stays 6138b56), admin library alone moved via the gateway updates._move path. 32-container diff: exactly gateway + admin web/backend/capture changed; shared :hosted tags unchanged; admin auto-update stays false. Admin backend health 200, new Video Lab bundle served, anonymous analytics 401. Native worker restarted idle on the new code. Admin capture had a leftover headless browser from a batch that stopped 10:47 UTC (idle: no network over 20s); recreating it cleared that. Signed-in admin browser check not done (no admin session in the embedded browser).

2026-11-24 spec580 Video Lab review workspace: frontend813/typecheck/build, gateway433, worker89; real ten-minute preparation 296s, 9 labels → 406 track suggestions, actions 5 Our/10 Opp estimated. Not deployed.

2026-11-24 spec580 Deployed 2026-11-24 13:12 UTC (owner: "Yes, deploy it"): gateway 8ab2c4b (compose.yaml+public+analytics), admin library alone moved to app a4b50f3 via updates._move (latest stays 6138b56, shared :hosted tags unchanged, auto-update false). 32-container diff: exactly gateway + admin web/backend/capture. Worker LaunchAgent now passes --reid-config models/reid.json (plist backed up first) and was reloaded idle. Deploy waited ~20 min for the admin Hudl/Veo helper to finish an active transfer (~100 MB per 20 s) before recreating anything. No live preparation run queued: the owner clicks Prepare player grouping on a run.
