## Hudl analysis windows failed to encode; FIXED and DEPLOYED to admin — 27 November 2026

Owner: "fix this issue" (Video Lab, 261108 U11 v Stoke: "The analysis clip could not be encoded;
nothing was saved."). Cause: fragmented-MP4 Hudl streams name an init segment with `#EXT-X-MAP`
as its own asset; `hudl_browser/_analysis.export_window` fetched only the media segments in range,
so ffmpeg decoded nothing. Moment exports already fetched the map. Fix 50147e7 on this branch (test
red first with the exact message: new fMP4 fixture in test_hudl_analysis; old fixtures were TS only).
Checks: SQLite and Postgres suites, alembic, ruff, mypy green (frontend untouched).
DEPLOYED admin only: 99dfe44 + the fix as 17bda1d (branch codex/hudl-analysis-init-deploy, pushed),
so the three undeployed overnight commits (1af18e9, a9f2983, a52662a) stay undeployed. `built`
updated, `latest` untouched, exactly 3 admin containers changed, helper idle, health ok. The next
admin deploy from this branch must merge 17bda1d's line (live 17bda1d is not an ancestor here).
Not checked against the real account: the owner's retry of the same window is the acceptance.
Pre-existing test hang (NOT fixed, needs owner OK to edit tests): fake clocks in test_team_logos /
test_jgh_crests leave `team_logos._LAST_REQUEST/_LAST_JGH/_LAST_SPORTSDB` at fake times up to a day
ahead; test_shared_crests then sleeps for hours on the real clock when the Mac's uptime < ~1 day.
Workaround: run tests/services/test_shared_crests.py in its own process.

## IN PROGRESS overnight: three Veo matches pre-analysed, then analysed in full — 26-27 November 2026
Status 04:50 27 Nov: Bournville all 6 windows done (each labelled from checked crops, outline
accepted, shirt-number run; sampled shirt checks 26/27, 18/21, 10/12 right). RMC windows 1-5 analysed,
6 running; Eagles 6 queued. Browser pane and Read became unreachable ~02:40 (hook timeouts), so the
driver moved to the shell: scratchpad `driver.py` + `fmctl.py`, which runs the gateway's own handlers
(import_clip, put_review, read_shirt_numbers) as the admin user inside fm-gateway-gateway-1; the
browser driver is paused. Labels wait in `labels/<job>.json` until crops can be checked by eye.
DISK: free space fell to 6 GB at 02:39 (each window ~10.5 GB: analysis-base, bundle, shirt-run copies)
and rmc h1w2 failed (OSError). Freed only tonight's intermediates: analysis-base of completed jobs
(children read parent/result only), byte-identical sample/annotated copies hard-linked (SHA-256
checked), imported helper clips deleted; log in worker runtime overnight-bench-v1/cleanup.log.
Driver floors: no import under 20 GB free, no shirt run under 15 GB. rmc h1w2 re-imported (ffe9c63f).
Scores (assistant audits): Bournville full window (withheld) teams 48/51, coverage 0.93, referee 6/6,
ball 4/5, 38 not-players given a team; Eagles pre teams 54/58 (0.95 coverage, was 0.82 before the
referee fix); RMC pre (withheld) 23/30, coverage 0.58 (sunlit yellow reads white).
App commits since: a52662a one referee (no grass shade, no per-track fallback). Not deployed.


Owner (going to sleep, no questions): pre-analyse the three most recent Veo matches, tag players
to teams, mark the pitch, then analyse each full match (~60 min), tracking ball and shirt
numbers, validate recognition and learn from it. Matches: 261122 NL vs Bournville Greens,
261116 RCW vs Kidderminster RMC, 261109 RCW vs SBITC Eagles (all downloaded to the admin inbox).
"Full match" = both halves (Veo `halves`) in consecutive windows of <= 10 min (the worker and
gateway cap one analysis at 600 s): 19 windows + 2 pre-analyses, each window then a shirt-number
child run. Driver: JS loop in the built-in browser tab on football-memories.co.uk/video-lab
(state in localStorage `fmDriver`, code in `fmDriverCode`). Clips were cut by the helper's own
`_cut` code in a one-off container of the admin capture image with 6 CPUs (`fm-overnight-cut`),
writing the same `analysis/<ticket>` folders the helper writes: the capture container's 1.5 CPU
limit made the helper cut at 0.3x real time (32 min per window). Imports, jobs and checks are
the normal gateway path. Bournville pre-analysis (c8988347): automatic outline accepted (98% of
play) in place of the 22% one, as a new review revision (8).
App fixes so far (committed, not yet deployed): 1af18e9 pre-analysis skips a short Veo fragment
listed before the first half (RMC lists 0:00-3:47); a9f2983 kits remembered from runs of the
same match first, derived runs take their source run's title, check counts remembered kits.

## Video Lab: shirt numbers on the 2D pitch, read automatically and correctable; DEPLOYED — 26 November 2026

Owner: "add shirt numbers" then "improve automatic reading and have the ability to correct/update a
shirt number". Three repos: worker codex/shirt-number-reading f5e55f3 (dense reader + `shirt-numbers`
child mode; 308 pass), gateway codex/shirt-numbers 50bc76e (route + `shirt_numbers` in the review;
522 pass), app (this commit: numbers in markers, Selected person correction, Read shirt numbers
button). Benchmark labels are mine from torso crops (runtime/jersey-benchmark/labels.json in the
worker runtime): NL 16/32 right, held-out RCW 5/12, 0 wrong, 0 on adults; old reader 0/0. Tests red
first (app 8: 3 unit, 5 page). A real bug found by them: review saves dropped unknown fields. Two
of my new test fixtures were corrected before passing (missing detections.jsonl artifact; one text
matcher split across elements). Frontend 1102 pass, typecheck, build. Browser on the read-only
harness with the real reader's NL output: numbers in markers, correction 8 -> 18 saved and shown.
Deploy order: gateway, then worker on BOTH Macs (+ jersey.json `detector_sha256` 4a5efbfb... on
both; rebase onto the deployed worker commit, the branch base carries undeployed camera work), then
admin app from this branch at or after ab3fb8f.
DEPLOYED on the owner's "Yes": gateway fm-gateway-gateway:shirt-50bc76e (gateway only, origin and
analytics mount unchanged, public health 200); worker f5e55f3 on both Macs (digest b3e46b1c...,
heartbeat ready; mini jersey.json + detector_sha256); admin app ab3fb8f -> 99dfe44 from a clean
worktree (1102 pass there), FM_BUILD_LATEST=0, `built` updated (latest untouched), exactly 3 admin
containers changed, capture idle (NetIO flat, no new/.part files), health ok, bundle has the route.
Deployed job code run end to end on a scratch copy of NL with the real config: 25 numbers, 190 s.
No Read shirt numbers run was started in the owner's lab.

## Video Lab: pre-analysis flags an outline that holds few players; DEPLOYED to admin — 26 November 2026

Owner: "Yes" to an app warning when a pitch outline misses the game. New `playShare`
(`components/videoLab/playShare.ts`): share of `central` people's feet (middle of the view) inside
the outline in use (accepted points, else the automatic one), measured on `levelGround`, abstaining
under 200 feet or without a level ground. Below 70% the Pre-analysis check says how much play the
outline holds and is never Ready, accepted or not. Judged outlines: right 92-98%, short 23-37%,
broken 1% (domain README); five outlines, my visual verdicts, not held-out. Tests red first
(playShare 4, readiness 2 of 3, panel 1); one older test's title corrected (it repeated my wrong
"empty pitch" claim), its assertion unchanged. Clean worktree frontend 1072 pass, typecheck, build.
Deploy 0843f40 raced another session's ab3fb8f (Match stats, contains 0843f40): briefly web on mine,
backend/capture on theirs; settled within a minute with all three on ab3fb8f, health ok, bundle has
the check. Live on Bournville (c8988347): accepted outline "Partly, only 22%". The owner's outline
is unchanged; re-accepting the automatic one (98%) is the owner's call.
"Yes, fix the worker" earlier: replay showed the worker outline was right; no worker change made.

## Spec770 camera and pitch stage 2.2x faster, outputs identical; DEPLOYED both Macs — 26 November 2026

Owner: "speed up the camera and pitch stage too". The stage (camera motion, panorama, cylindrical
pitch atlas with goal posts, pitch lines and bird's-eye) took 313 s on the NL base. Worker branch
`codex/faster-camera-pitch` (pushed): the atlas decodes forward once instead of 336 seeks (Veo
keyframes 8.3 s apart), camera steps and per-view atlas analysis run on a 6-thread ordered pool,
refinement decoding overlaps SIFT. Measured 312.7 s -> 142.5 s with every camera/pitch output
byte-identical. 299 worker tests pass.
DEPLOYED on the owner's "Yes" while idle: MacBook backup `src.984da7a`; mini coordinator b45b74e,
worker restarted; code digest 98c3c217... both; heartbeat local and remote ready. Not yet exercised: a real job.

## Video Lab Pre-analysis; first real scan run and checked; DEPLOYED to admin — 26 November 2026

Owner: add a "Pre-analysis" button that decides how much of a match to scan for a proper
panorama/bird's-eye and player, referee, ball, team and pitch identification; run it on a game,
monitor it and check the output. App only (`components/videoLab/preAnalysis.ts`,
`PreAnalysisCheck.tsx`, picker button). Scan: 600 s (worker cap) from one minute after Veo's
first-half kick-off (`halves`), else from minute 5. Every completed run shows a Pre-analysis
check (panorama, outline, people, ball, teams, referee). Thresholds provisional: owner decision 015.
Tests red first (plan, readiness, picker, panel; the halves wiring test was written after and
shown red by removing the wiring). Clean worktree frontend 1064 pass, typecheck, build; backend
untouched. Deployed admin only: bd67d0d -> ee9532b, then (after another session's bfec4f0, an
ancestor) -> d94271e; 3 admin containers each time, latest untouched.
Ran it: 261122 NL vs Bournville Greens (old plan 5:00-15:00), Veo read ~25 min for 10 min of
footage, job c8988347 (Split) 19 min. Stitching excellent (2957/2997 views).
(1) Veo kicked off at 10:00, so half the scan was warm-up -> plan now uses `halves`.
(2) Outline: I first reported the automatic outline as the wrong (empty near) pitch, from the
atlas image. WRONG: on the ground plane (fitter's level ground, feet from frame_to_world) and on
real frames it holds 96% of detected feet, far edge on the far touchline. The low camera squeezes
the far 20+ m into a thin atlas strip. The owner then said "Yes, fix the worker"; a replay showed
there was nothing to fix there, so no worker change was made (empty branch deleted).
(3) The real problem: the 4-point outline the owner accepted holds only 18% of feet (a fifth of
the area; its far edge crosses midfield), so the lab will treat most of the game as off pitch, and
the check shows it Ready because acceptance is all it trusts. Owner's review left untouched.
The "never Ready until accepted" rule stays (four sides found is still not proof).
People (50/frame), ball (100%) and look-alike groups include a neighbouring game. Worker
`pitch_birds_eye.jpg` is still a smear. Next: app check flagging an accepted outline that holds
few feet, measured on the ground plane (atlas rows mislead). Replay tooling for fitter inputs
(segments, ground, feet): session scratchpad `replay/dump.py`, not kept.

## Spec 760 Part B: balanced kit colour built, failed the gate, kept off, 26 November 2026

Owner: "Start Part B". Worker `codex/lighting-benchmark` d63739e adds `ground_lab`,
`colour_lab_balanced` and `ground_reference_lab` (colour_lab unchanged; 292 pass). App 17119d5:
`decisions.ts` can compare kits in balanced colour when asked; the page stays on raw colour
because on the frozen benchmark balanced lowered withheld precision 0.78 to 0.65 (low sun 0.93
to 0.59). Default page behaviour is unchanged from before Part B. Details, cause and follow-ups
in spec 760 and worker docs/LIGHTING_BENCHMARK.md. Nothing deployed. Another session has
uncommitted edits in this checkout (match stats, Veo picker, HANDOFF); none were committed here.

## Video Lab: far-touchline bunching on the 2D pitch fixed (sideline people) — 26 November 2026

Owner: "fix the far half bunching on the far touchline". Measured on NL 91f49e12 first: not a
geometry fault (person height flat across depth), but parents/coaches standing along the far
side (half of all observations, barely moving, adult height, some given a team by kit matching).
New `livePitch.sidelineTracks`; PitchMap leaves them off live and heat views unless Show
everyone is ticked; owner-labelled people always stay. Tests red first (1 unit, 1 page).
Frontend 1077 pass (working copy, includes other sessions' tests), typecheck, build pass;
backend untouched. Browser on the read-only harness: at 1:30 the map went from 36 people with a
far-line row to 17 with none. DEPLOYED to admin only on the owner's "Yes, deploy": 386143d -> bfec4f0, clean worktree (frontend 1054 pass there), FM_BUILD_LATEST=0, added to `built` (latest 8c31cdb untouched), exactly 3 admin containers changed, /api/health ok, served bundle has the change. Capture had the companion's idle headless browser and ~3 MB/s outgoing (library polling from an open tab); inbound flat, no new or .part files, so it was swapped.

## Match stats tab on Veo and Hudl match pages — 26 November 2026

Owner asked for "Match Stats" next to Team stats when a library game is opened, with
charts like four supplied images (now docs/design/reference/04-07). New tab after Team
stats in `MatchSections`, shown whenever Team stats is. `lib/matchStats.ts` (sided events
from Veo team events or Hudl tags, conversion, running attempts, 15-minute spells, half by
half, recent form vs the average of up to 5 earlier dated matches of the same club /
cohort, and rule-based "What stood out" bullets stated only from the numbers) and
`components/match/MatchStatsPanel.tsx` (stand-outs card, headline tiles with form delta,
centre-out comparison bars, conversion rings, gradient attempts chart with clickable goal
markers, spell bars, half-by-half). No passing / pass-network section: the app has no such
data. Tests red first: 15 lib, 4 panel, 1 tab order, 1 Veo page, 1 Hudl page. Real data
showed Veo logs each goal as SHOT then GOAL (~1 s apart), double-counting attempts; folded
in `veoStatEvents` (test red first) and recorded in the connectors domain. Existing tests
changed because the requested tab changes the pinned tab list: MatchTabs expects "Match
stats" after Team stats, and ArrowRight from Team stats now lands on it (one more ArrowRight
reaches Goals). My own new test was changed once before commit: tiles moved from
role=group to figure after they clashed with MatchInsights' /Possession/ group query.
Frontend 1075 pass, typecheck and build pass, excluding another session's untracked
`frontend/src/__probe/far.test.ts` (fails tests and typecheck; left alone). Backend
untouched, its suites not run. Browser: Veo match 261116 RCW vs Kidderminster RMC via the
other session's 5173 dev server, 1440 and 375 px, no horizontal overflow. Hudl page not
seen in a browser (tests only). DEPLOYED on the owner's "deploy it to live" and "deploy to
all families too": admin ab3fb8f (clean worktree, 1094 pass; FM_BUILD_LATEST=0, added to
`built`). Admin move raced another session's move to 0843f40 at 22:08 UTC (mine 502, theirs
200, leaving web on 0843f40 and backend and capture on ab3fb8f). Moved again to ab3fb8f
(contains 0843f40); health ok, bundle has Match stats; that session was told. All families:
cherry-picked onto main as a0befe8 (only the HANDOFF conflicted; frontend 1002 pass,
typecheck, build), pushed, gateway-updater built it as latest, auto round moved all seven
families (helpers idle, no ffmpeg, flat traffic beforehand), each healthy and serving the
tab. Local 8765 Docker app not rebuilt. Backend suite could not be run to the end:
test_jgh_crests' fake clock leaks into team_logos._LAST_REQUEST, and test_shared_crests'
next lookup then sleeps without end (existing bug, backend untouched here); ruff, format
and mypy clean.
Period labels follow the page header, so a 3-period Veo recording shows "Extra time 1".

## Spec 760 Part A: lighting benchmark built, baseline scored, 26 November 2026

Owner: "Yes, build Part A". Worker branch `codex/lighting-benchmark` (84c9def, pushed, own
worktree `~/Football Video Analytics lighting`): `football-video lighting-benchmark
prepare|freeze|score`, 286 pass. App (this branch): the page's team/ball composition moved
unchanged into `frontend/src/components/videoLab/decisions.ts` (page calls it; 4 new tests,
mutation-checked red) and `frontend/scripts/export-lab-decisions.mjs` exports what the lab shows.
Frontend 1042 pass + typecheck on the committed state in a clean worktree; build passes; backend
untouched. Frozen v1 (assistant labels, 5 matches x 6 moments) and baseline score are in the
worker's private runtime; numbers and caveats in worker docs/LIGHTING_BENCHMARK.md and spec 760.
Concurrency note: another session is editing Video Lab files in this checkout (LabVideo,
PitchMap, livePitch, VeoAnalysisPicker). My first commit swept one of its PitchMap lines into
VideoLabPage; 64fdad9/96238f9 restored the original line in the branch, its working copy
untouched. Nothing deployed (no runtime behaviour change). Next: owner spot-check of labels
(and veo-trial's assumed side), then Part B.

## Video Lab: live 2D pitch under the video, built from the automatic outline — 26 November 2026

Owner asked for a 2D pitch with players moving on it during playback (reference: tactical-cam
style dots). Upgraded the existing Pitch map instead of adding a second one, and moved it from
below the setup panels to directly under the video. New `livePitch.ts`: exact source from marks /
confirmed corners, else the camera-level plan framed by the automatic or accepted outline (so a
freshly analysed run gets a map with no marking); glide between detections, sprint filter, light
smoothing, 3 s trail for the selected player, ball ground contact. Map: striped pitch with full
markings, our team circles, opponent triangles, referee diamond, GK/R labels, click a dot to
select (drives the Inspector), heat maps from the same paths, frame-synced via `useFrameTime`
(now exported from LabVideo). Distance/speed remain exact-only. Tests red first: 7 unit + 3 page;
one of my own new unit fixtures assumed ball pixels; real data is normalised, fixture corrected,
seen red, then fixed. Frontend 1053 pass (one full run had a timing failure in
TournamentSquadChoice that passes alone and on rerun), typecheck, build pass. Backend untouched,
its suites not run. Browser: hosted build against a local read-only harness serving cached NL run
91f49e12 (local review, accepted panorama, no corners): map shows 16-36 people moving, ball on the
map when seen, selection + trail work. The pane browser painted only ~3 frames/s, so smoothness
was not judged there. DEPLOYED to admin only on the owner's "Yes, deploy": ee9532b -> 386143d, built from a clean worktree (frontend 1052 pass there; the working copy's extra test is another session's uncommitted edit), FM_BUILD_LATEST=0, added to `built` (latest 8c31cdb untouched), exactly 3 admin containers changed, capture idle before the swap, /api/health ok, served VideoLabPage bundle carries the new map. Worker and gateway unchanged. Known limit: far-half people bunch near the far line on that
run (estimated far side of the outline). Branch codex/local-video-analytics. Uncommitted
VeoAnalysisPicker/launch.json edits and the 750 spec belong to another session and were left alone.

## Spec750 hardware render + shared detection DEPLOYED both Macs — 26 November 2026

Owner: "build shared detection across both Macs", then "Build both" after profiling. The
analysis stage on the 4-minute NL clip spent 223 s of 355 s re-encoding the annotated video
(libx264, 2 threads) and only 50 s detecting. Worker branch `codex/fast-render-shared-detection`
(pushed): single raw-pipe encode on `h264_videotoolbox` (libx264 all cores where missing), and in
Split the MacBook detects the last 60% of sampled frames while the mini does the rest, every
reply checked against the mini's own decoded times, no fallback. Measured: stage 355 s -> 102 s
-> 66 s; whole idle Split job roughly 10 min -> 5 min (camera/pitch, ~222 s, is now the longest
stage). Details and the M3/M4 detection comparison: spec 750 and worker HANDOFF. 293 worker
tests pass.
DEPLOYED on the owner's "Yes, deploy" at ~21:32 UTC, after Split job c8988347 (261122 NL vs
Bournville Greens, old code) completed. MacBook backup `src.1c55193`; mini coordinator 984da7a,
worker restarted idle; code digest 2f34e6a3... both; heartbeat local and remote ready; both Macs
pick h264_videotoolbox. App and gateway unchanged. Not yet exercised: a real Split job via the UI.
Note: another session committed and deployed 1c55193 (pitch rebuilds on the MacBook) in the
same worker checkout during this work; this branch contains it.

## Lighting research done; spec 760 drafted (benchmark + light-balanced kit colour), 26 November 2026

Owner asked whether filtering or colour-correcting the video would help recognition under
varying light. Research: the field does not pre-filter video for detectors (helps only in
genuinely dark scenes, otherwise often hurts); robustness comes from fine-tuning with
photometric augmentation, and team assignment from light-tolerant features. Read-only probe
over six cached runs: grass lightness varies 22-60 (0-255) across one frame; torso lightness
follows local grass lightness on f2ab96a2 (r 0.52) but not on others (confounded by team
positions; a/b cast not yet measured). Owner: "Yes, start spec". Draft
`docs/todo/football-memories/760-lighting-benchmark-and-balanced-kit-colour.md`: frozen
per-lighting audit split by match, then additive worker `ground_lab` + `colour_lab_balanced`
(von Kries gain from the grass beside the player) used by `kits.ts` only when a whole run has
it, behind an adoption gate. Docs only: no code, no tests run, nothing deployed. Branch
codex/local-video-analytics. Next: answer or accept the spec's open questions, then build
Part A (benchmark) in the worker. Untracked 750 spec in this checkout belongs to another
session and was left alone.

## Split now runs pitch rebuilds on the MacBook; DEPLOYED both Macs — 26 November 2026

Owner: "use the MacBook for pitch rebuilds too". Worker 1c55193: with execution Split,
camera-tracking children ("Rebuild complete pitch") go to the MacBook like player matching;
Local keeps them on the mini; no fallback if the MacBook is down. Test red first; 272 pass.
Both Macs at code digest c6ad165d..., worker restarted idle, both ready. Scratch end-to-end
NL rebuild on the MacBook: 185 s, identical outline to the mini's run 91f49e12. App and
gateway unchanged (requests already carry execution: split).

## Pitch outline / bird's-eye fixed in the worker; DEPLOYED both Macs — 26 November 2026

Owner: the bird's-eye view is poor on every newly analysed match (screenshot: NL 260926).
Cause: the automatic outline that frames the view, not the app. Worker branch
`codex/robust-pitch-outline` (ed4f18d, pushed): new line detector (whiteness, contrast on
both sides, turf-noise threshold) and halfway-first fitting. 3 new worker tests red first;
270 pass, ruff/format/project checks pass; no existing test changed. Offline replay of the
five cached games (NL, frost, 3G, RCW vs CG, overcast): whole-pitch outlines on 4 (was 1),
3G plausible but unverified. NL's far half stays approximate (grazing angle). App code
unchanged; app suites not run. DEPLOYED on the owner's "Yes, deploy": both Macs at code
digest a69e712e... (MacBook backup src.3cddeb3), worker restarted idle, both ready. Next:
"Rebuild complete pitch" on each match to get the new outline (owner, in Video Lab).

## Veo signed links read; NL match analysed; pitch run — 26 November 2026

Owner goal: analyse 260926 Racing Club Warwick vs. NL from minute 5 for 4 minutes, then a
pitch analysis. App 1f01047 (admin only, 3 containers, latest untouched): match-video reads
accept a query string on c.veocdn.com only (thumbnails/crests still refuse one); signed links
re-read after 10 min. Owner request changed one existing host-lock assertion (the
`?token=x` c.veocdn.com URL) into a new "reads a signed link" test; every other refusal kept;
3 new tests red first; 852 + crest 15 pass, ruff/format/mypy clean. Images built from a clean
worktree because another session has uncommitted frontend edits in this checkout.
Ran it: helper analysis window (ticket 8ad018c6, ~150 MB read via the signed link) -> gateway
import as admin -> Video Lab job b4f5d244 complete (Split; panorama 1194/1199 frames, atlas
ready, both ends) -> camera-tracking 7b7adeb8 and, after the worker watermark fix, 48e74eab.
The stitched atlas is good; the automatic bird's-eye is not (see worker HANDOFF: Veo
watermark, left goal unseen). Needs the owner's Stitched pitch review to calibrate.
Postgres check still not runnable (port 55432 unpublished).

## Video Lab: one referee on the pitch; pitch overlay from 0:00; DEPLOYED to admin — 26 November 2026

Deployed admin only: ce747d2 -> bd67d0d (contains d4d1231; later commits docs only), built with
FM_BUILD_LATEST=0, added to `built` (latest 8c31cdb untouched), exactly 3 admin containers changed,
/api/health ok, served bundle carries the new pose-bridging code. A Safari tab was polling
/helper/library during the move (GETs only, no transfer). Not yet seen by the owner on f2ab96a2.

Owner, on f2ab96a2 (labels live on its refinement 6c216d41): sideline people tagged as referees
after tagging the referee; overlay only from 0:20 although calibration is right.
Referee: that referee's kit is colourful, so kit matching caught coats and shirts on the far
touchline (69 tracks shown as referee at some point) and the per-moment "one referee" rule often
kept the sideline one. `kitTimeline` takes an optional `onPitch`; a suggested referee (kit or
look-alike) on the pitch for under half its known moments is unassigned. New
`pitch.standingOnPitch`: feet inside the outline by 0.1 x person height. Replayed on the real run:
off-pitch referee rings 514 -> 37, referee tracks 69 -> 13; your referee label is never dropped.
Overlay: the atlas has no pose for 0-20.6 s (worker left them null; also 175.8 s, 224.8 s,
231.8-236.6 s). New `panorama.bridgePoses` carries the nearest solved pose with
`camera_motion.json` (<=30 s, same shot, same sample times); the page applies it before binding,
so overlay, halfway, metres and the off-pitch test all gain those seconds. Real run: overlay from
0:00, no gaps (was 29.3 s missing); a 20 s carry matched real poses within 0.15% of the frame.
Tests red first (kits 3 of 6, panorama 2); pitch.standingOnPitch tests written after it (pass).
Frontend 1024/199, typecheck, build pass; backend untouched, its suites not run. NOT checked in
the browser: the lab needs the gateway admin sign-in. Worker root cause (unsolved opening views) left: a worker fix would also add
those views to the atlas image.

## Reel card themes: 5 broadcast + GTA 6 style; DEPLOYED to admin — 26 November 2026

Owner: "add in additional themes, make them professional, broadcast quality, also add
in a gta 6 theme". New `frontend/src/lib/reelThemes.ts`: Prime Time (glass panels,
light-wipe title, HIGHLIGHTS bug), Studio (red slab wipe, REPLAY bug, scrolling
ticker), Star Night (starfield, ring of stars, silver foil title), Cinematic (2.39
letterbox, anamorphic flare, grain), Stadium LED (pixel mask, racing chevrons) and
Sunset Heist (GTA 6 style: striped sunset, palms, skyline, poster type; original art,
no Rockstar logo, name or font). Shared helpers moved to `reelDraw.ts`; Palette gained
optional `headline`, `overlay` and `shadow`. Pickers (Reel Studio swatches, Reel Builder
select) are grouped Broadcast / Classic / Game style. Tests red first (theme list),
plus a fake-context test drawing every theme x card kind x 6 frames. Frontend 1014/199,
typecheck, build pass; backend untouched, its suites not run. Checked rendered frames
in the browser (opening, match, stats). Owner: "Yes, deploy". Admin moved 1f01047 -> ce747d2
(ancestor checked, FM_BUILD_LATEST=0, added to `built`, `latest` 8c31cdb untouched); exactly
3 admin containers changed, served bundle contains all new theme names, /api/health ok.
The local 8765 compose app was not rebuilt. Not yet exercised: recording a real reel.

## Veo: use the first readable render; DEPLOYED to admin — 26 November 2026

After f6dedc6 the owner's retry of 260926 Racing Club Warwick vs. NL showed the real cause:
"The Veo connection only reads Veo's own match videos" (`_client._video`: not a plain MP4
on c.veocdn.com). `_remember` now keeps the first video passing the new
`_client.video_problem` (standard still preferred); when none passes, `_read_video` says
what Veo offered (host name or file type, never the address). Host lock unchanged.
6 new tests (4 red first, 2 controls); backend 849 + crest file 15 separately, ruff,
format, mypy pass. Deployed admin only (f6dedc6 -> 195b70a, 3 containers, latest
untouched). Unknown until the owner retries: whether this match lists a readable render.
If not, the message now names what Veo offers; supporting it needs an owner decision
(a new host or format to allow).

## Veo analysis window error now says what Veo said; DEPLOYED to admin — 26 November 2026

Owner hit "A highlight could not be cut from the saved match; nothing was saved." analysing
260926 Racing Club Warwick vs. NL (start 5, 4 min). That match is not saved locally, so the
window streamed through the range relay; `export_sample` raised `_cut`'s generic message and
dropped `relay.failure` (reels already surfaced it). Fix f6dedc6: report the relay's error.
New test red first (reproduced the exact message), 843 + 15 pass. Deployed admin only
(0891bb7 -> f6dedc6, 3 containers, latest untouched). The real Veo cause is still unknown
until the owner retries. The deploy changed no backend code before this fix, so it was not the cause.
Found, not fixed: tests/services/test_shared_crests.py hangs forever in `_paced_fetch`
`time.sleep` when run in the full suite (order-dependent pacing state from an earlier crest
test); it passes alone. The documented Postgres run is impossible: the local db container no
longer publishes 55432.

## Core AI player matching DEPLOYED (admin + both Macs) — 26 November 2026

Owner: "Yes, deploy it". Worker 62a61b0 on the mini (coordinator checkout, `uv sync --frozen` added coreai-core) and the MacBook node (src synced, backup `src.ee0b987` + pyproject/uv.lock `.ee0b987`; coreai-core 1.0.0, ml-dtypes 0.6.0, yuvio 1.6, psutil 7.2.2 installed into the node venv with the lock versions, `pip check` clean). Code digest c563ff56... on both. Core AI asset `models/reid_b64.aimodel` (tree sha256 ffca4ff5...) built with tools/convert_reid_coreai.py on the mini and copied to the MacBook (digest re-verified there); `reid-coreai.json` on both; MacBook `node.json` gains `reid_coreai_config` (backup node.json.before-coreai); mini `remote-node.json` pins `reid_coreai_sha256` (backup .before-coreai); LaunchAgent adds `--reid-coreai-config` (backup runtime/launchagent-before-coreai.plist), reloaded with bootout/bootstrap while the queue was idle. Heartbeat: pytorch, neural-engine, core-ai on both Macs, remote_ready true.
Gateway `fm-gateway-gateway:core-ai-f7def11` (live was labs-reid-db6e866, an ancestor), only the gateway container changed; origin correct, public health 200, anonymous /_admin/api/video-nodes 401; live `view()` lists core-ai locally and remotely.
Admin app moved b3e0adc -> 0891bb7 (contains it): built with FM_BUILD_LATEST=0, added to `built` (latest 8c31cdb untouched), exactly 3 admin containers changed, bundle contains the Core AI text. Owner had a Safari tab polling (GETs only, no transfer) during the move.
Saved choice left as Standard (mode split): no job uses Core AI until the admin selects it. Not yet exercised: a real Core AI job through the UI.

## Core AI player-matching option built, NOT deployed — 26 November 2026

Owner: "Yes, add it". Spec 740. App: third radio "Core AI" in Settings > Advanced >
Player matching model; unavailable notes and 409 message name the model. Worker
(`codex/core-ai-player-matching` 62a61b0) and gateway (same branch f7def11) carry the
backend; see their handoffs. 5 new app tests red first; app 1012/199 files, typecheck,
build pass; backend untouched. Browser: synthetic harness over the hosted build, save +
reload, MacBook-missing note, 375 px no overflow. Nothing deployed or installed: to
enable, install the Core AI asset and flags on both Macs (worker NODE_EXECUTION.md),
then deploy gateway and admin app.

## Apple Core AI benchmarked on both Macs, NOT adopted — 26 November 2026

Owner: macOS updated, "install the dependencies and run performance, accuracy and other
tests comparing to existing". Both Macs are on 27.2.1 with CoreAI.framework. Scratch venvs only
(mini scratchpad; MacBook `~/coreai-bench-scratch`, 2.2 GB, safe to delete); nothing in
repos, models, worker or node changed; nothing deployed. Results:
docs/system/domains/video-analytics/two-mac-performance.md ("Apple Core AI").
ReID: Core AI runs the ViT on the GPU (MPSGraph) even when preferring the Neural Engine;
567-774 ms/64 crops vs Core ML NE 359-379 and MPS 848-1199. Whole appearance stage on six
games: MPS 938 s, Core ML NE 438 s, Core AI 682 s; Core AI groups identically to Standard
on 4/6 games (e6e2c61a 0.905, 09b50973 0.977) where Core ML NE changes two games noticeably.
Detector: Core AI NE about 107-112 ms/frame vs current Core ML 72-76 ms. Keep current
backends. Open owner question: whether to offer Core AI as a third "accurate and faster
than Standard" player-matching option (would need a pinned .aimodel, worker path,
tests). Worker 245 tests + ruff pass on 27.2.1. Requires USE_OS_COREAI=1; no Xcode 27.

## MacBook status light on the Video Lab page — 26 November 2026

Owner: "on the video lab page top right of the page show a green/red light to show the
status of the connected mac". App only: `components/videoLab/MacStatusLight.tsx` in the
Video Lab header (top right, next to "Label frames"). Polls the existing
`/_admin/api/video-nodes` every 15 s; green only when `remote_ready === true` (the gateway
already returns false if the worker heartbeat is over 120 s old), red when not ready or
the status can't be read. Admin only: hidden for users with granted access, who must never
call `/_admin/` (the existing LabPermissions test caught this; gated on `VIDEO_LAB_BASE`).
Tests red first (component 4, page 1). Frontend 1007/198, typecheck, build pass. Browser:
hosted dev build at 5174 with stubbed fetch, 800 px (wraps under the title) and 1440 px
(top right); flipped to red on the next poll.
DEPLOYED to the admin library only at ~15:47 UTC as b3e0adc (contains live ba9aefa; the
extra commit is docs only): images built with FM_BUILD_LATEST=0, sha added to status.json
`built` (`latest` untouched), `_move` via docker exec. Exactly 3 admin containers changed of
47; health ok; VideoLabPage bundle contains the light. Admin capture was not idle by
NetIO (~400 MB/min out), but logs showed only an open Safari tab polling /helper/library
(~5 MB every 2 s) to the web container, with no download in the previous 15 minutes.
Gateway and worker unchanged.

## Player matching model DEPLOYED (admin + both Macs) — 26 November 2026

Owner said "deploy it to both macs" and later "Move it now". Worker ee0b987 on the
mini (coordinator checkout) and MacBook node; Core ML ReID `reid_b16.mlpackage`
(tree sha256 f27873dd...) installed on both with `reid-neural.json`; MacBook
`node.json` gains `reid_coreml_config` (backup node.json.before-neural, old src kept
as src.5a74a19); mini `remote-node.json` pins `reid_coreml_sha256` (backup
.before-neural); LaunchAgent adds `--reid-coreml-config` (backup
runtime/launchagent-before-neural.plist). Heartbeat: both backends on both Macs.

Gateway now `fm-gateway-gateway:labs-reid-db6e866` (branch tip: another session's
f0921fd lab switches + db6e866). MISTAKE: an intermediate image reid-0c05abb
(dce0ed3 + mine) briefly replaced that session's just-deployed labs-f0921fd for
about a minute (~13:14 UTC); fixed by redeploying the tip. Always re-read the live
image immediately before `up`. Origin unchanged, public health 200, admin APIs 403
anonymously, lab-switch bundle served.

Admin app moved fc1a36b -> ba9aefa (contains 037582f) at ~14:20 UTC after the
macOS 27.2.1 reboot, on the owner's "Move it now" despite capture streaming
~350 MB/min for 25+ min earlier. Exactly 3 admin containers changed, db and others
unchanged; health 200; bundle has "Save player matching". `latest` untouched.
Default stays Standard: no job uses the Neural Engine until the admin selects it.
Not yet exercised: a real Neural Engine job through the UI.

## Expired Veo matches hidden; Opponents in the Library title bar — 26 November 2026

Owner: "for veo don't show expired matches" and "on the main library page move
Opponents to the title bar". App only: `veoExpired()` (api/veo.ts, same test as the old
"Video expired on Veo" badge: not available or status expired) filters Veo matches out of
the Library page (hero, overview, counts, grouped/automatic tournaments) and the Connected
Veo list, which now says "N expired on Veo, hidden". Other pages (Opponents, reports, Veo
match page, Downloaded) still see expired matches; owner confirmed "Library only". Opponents link moved from the Match
profile links to the page header beside "+ Import a match", same href logic. Requirement
change: the old "marks a match whose video Veo has expired" test is replaced, the "2 of 3"
count became "2 of 2", and the Opponents test now looks in the header; new tests red first.
Frontend 1002/197, typecheck, build pass; backend untouched. Browser: live API at 1025 px
and 375 px, no overflow. Not deployed; owner's 8765 app not rebuilt.

## Player matching model selectable in Settings > Advanced — 26 November 2026

Owner asked for the Core ML ReID to be a selectable option. App: new "Player
matching model" panel (Standard default / Neural Engine) under the analysis location
in Settings > Advanced, admin only. Gateway: `/_admin/api/video-nodes` gains optional
`reid_backend`, offered only where the heartbeat lists it, snapshotted into new admin
jobs (submit, derived runs, Veo/Hudl imports); location-only saves keep it. Worker:
`reid_backend` request field, `--reid-coreml-config`, no fallback; node status lists
backends. Tests observed red first (worker 10, gateway 8 + 1 preserve-model; frontend 3);
gateway's invalid-value and ordinary-user tests passed before as negative controls.
One assertion in a NEW, uncommitted gateway test changed from "location save resets
model" to "keeps model" after the existing UI test showed location saves send only
the mode; resetting would have silently dropped the choice. No existing test changed.
Worker 245, gateway 513 + 4 Docker, frontend 1001/197 files, typecheck, build, lints
pass. Browser: synthetic harness over hosted build, save + reload persist, 375 px no
overflow, matches the location panel (reference 01 styling).

## Other users' lab switches moved to the admin console — 26 November 2026 (gateway deployed)

Owner: under Advanced, keep only the admin account; other users go under their Manage
section in the admin console. App: `AdvancedSettings` now lists only `self` and links to
/_portal/admin. Gateway (same branch name): `admin/LabSwitches.tsx` in `UserDetail` for
approved users, using the existing GET/PATCH /_admin/api/labs (no backend change). The old
app test that toggled another user's switch now uses the admin's own row (requirement
changed); new tests red first in both repos. App 998 and gateway web 74 tests, typecheck,
build pass; backend untouched so pytest not rerun. Owner: "Yes, deploy". Gateway deployed
(see gateway HANDOFF). App images hosted-037582f built (FM_BUILD_LATEST=0) and added to
`built`, but admin was mid-Hudl transfer, so admin was NOT moved. The analytics session
(ba9aefa, contains 037582f) agreed to do one admin move to ba9aefa once idle. Browser
Manage switches browser-checked live; the Advanced page check waits for that admin move.

## Core ML ReID built, NOT enabled — 26 November 2026

Worker: optional pinned `coreml` entry in the ReID config runs SportsReID on the
Neural Engine (CPU_AND_NE); node probe/readiness pin `reid_coreml_sha256` so both
Macs match. Converter `tools/convert_reid_coreml.py`. 8 new tests observed red
(7 behavioural, PyTorch guard control passed) then green; one new-test setup mkdir
fixed before first green, no assertion changed. 235 tests, ruff, format, project
checks pass. Appearance stage 1.7-2.6x faster on six cached games, but grouping
changed on two (adjusted Rand 0.685 and 0.896; PyTorch rerun control = 1.0).
Owner approved deploying "when done"; held because of that grouping change and
asked the owner. Nothing installed or restarted; production configs untouched.

## Library default, Clips nav, NL crest and side-by-side Hudl/Veo DEPLOYED — 26 November 2026

Owner: "Yes, deploy". Families: main `8c31cdb` = e7fee2b + only the UI cherry-pick of
b2598ae (no lab work); updater kickstarted, built it as `latest` (ancestors start
8c31cdb, e7fee2b), and the gateway auto round moved all seven (all auto-update, all
helpers busy=false beforehand). Admin: branch `fc1a36b` (contains c534421; docs-only past
f245075) built with FM_BUILD_LATEST=0, added to `built`, moved via updates._move after
busy=false/no ffmpeg/flat network. Gateway `dce0ed3` image `slot-dce0ed3`, only the
gateway container recreated with its four running compose files.

Live: 8/8 libraries health 200; admin assets contain Norton Lindsey and Export analysed
video; live forward.py has no CaptureSlot; FM_GW_ORIGIN correct, public health 200.
Inventory: 26 of 48 containers changed (gateway, crests, 8x3 app), no db container.
No real Hudl/Veo concurrency exercised. Owner's local 8765 app not rebuilt.

## ReID Core ML / Neural Engine benchmark — 26 November 2026

Owner asked to benchmark it. Scratch conversion of pinned SportsReID ViT-B/16 to
Core ML FP16 (torch.export path). Batch 16 on CPU_AND_NE: 387 ms (mini) / 365 ms
(M3 Pro) per 64 crops vs current MPS 1152 / 817 ms, about 3.0x / 2.2x. Cosine to FP32
>= 0.99989, pairwise similarity diff <= 0.005. Weak threshold evidence (no reference
pair >= 0.95). Not integrated, nothing deployed; whole-stage gain unmeasured.
Details: video-analytics/two-mac-performance.md (app) and NODE_EXECUTION.md (worker).

## Two-Mac analysis: remote restored and measured — 26 November 2026

Remote/Split had been silently unavailable: MacBook node still ran worker 70f44ac
after the mini moved to 5a74a19, so the code-digest check failed closed. Synced the
two changed source files over the Thunderbolt-bound SSH key (no dependency change;
old tree kept as `src.70f44ac` on the MacBook). node-status now remote_ready=true
and the gateway sees it. Deploy worker code to BOTH hosts together.

spec730 was already live: admin app c534421 and gateway hudl-4273a01 contain it.
The isolated Docker gate does not apply (provisioner/updater unchanged since aaecf42).

Measured (details in docs/system/domains/video-analytics/two-mac-performance.md):
detector on Neural Engine ~71 ms/frame on both Macs (`ALL` already picks it); ReID
MPS 1157 ms (mini) vs 836 ms (M3 Pro) per 64 crops. 60 s clip, 2 reps: Local 109/112 s,
Remote 106/108 s, Split 90/103 s; all outputs/source hashes verified. Containers on
macOS cannot use the Neural Engine or Metal, so analysis stays native on both Macs.
No code changed, nothing deployed, no production job/source/result touched. Owner
decided: keep the MacBook node native (DECISIONS.md). Not built: Neural
Engine + GPU shared detection, one job per Mac.

## Library default, Clips nav, NL crest — 26 November 2026

Owner requests: the Library's grouped toggle now opens on All matches (Tournaments
auto-opens its newest event only once that view is chosen); Clips is gone from the top
bar (the /clips route still exists, reached from the Library); `resolveClub` reads "NL"
and "Norton Lindsay" as Norton Lindsey for the crest lookup. New tests red first (3).
Eight existing Tournaments tests now press "Tournaments" in setup because the default
changed by request; no assertion changed. Frontend 997/997, typecheck, build green.
Not checked in a browser and NOT deployed.

Owner then said "remove the restriction": the gateway CaptureSlot is removed (gateway
commit on codex/local-video-analytics, owner-decisions/014, T21 updated). Not deployed.

## Analysed video export + Hudl U11 analysis DEPLOYED (admin only) — 26 November 2026

Owner said "Yes, deploy it". App c534421 (contains d5fe1cb and the Hudl session's
c05ddb7) moved to the admin library only via updates._move; status.json `built` gained
c534421, `latest` stays e7fee2b. Gateway 4273a01 as image `hudl-4273a01`, only
fm-gateway-gateway-1 recreated with compose.yaml + public + analytics + image override;
origin https intact. Before/after inventory: exactly 4 of 48 containers changed (gateway,
admin web/backend/capture); admin DB and other libraries untouched. Admin was idle
before the move (only the helper process, no browser/ffmpeg, flat network counters,
no queued/running Video Lab job). Worker unchanged (Hudl jobs use generic fields).
Live: public health 200, anonymous POST hudl-jobs 401, admin bundle contains Export
analysed video / Analyse a Match / U11 2026/27, helper has hudl_browser/_analysis.py,
admin backend health ok. NOT exercised: a signed-in export, or a real Hudl analysis
window (owner's real-account acceptance with one short U11 window is still open).

## Hudl U11 2026/27 games in Video Lab — 26 November 2026

Video Lab's picker is now "Analyse a Match" with a "Match" select: a Veo group and a
"Hudl · U11 2026/27" group (Hudl library filtered by season_label and age group).
Hudl uses new helper action `analysis` (start_s, duration_s <=600.1): it reuses the
open player stream (or prepares one exactly as Stream/clips do), fetches only the
segments covering the window, encodes with output-side `-ss` and publishes a
verified clip under `.hudl-account/analysis/<ticket>/` (nothing in downloads).
Gateway POST /hudl-jobs (generalised from /veo-jobs) needs CSRF plus the Hudl
permission and imports by 32-hex ticket only; sample `hudl-<id>`, `hudl_match_id`.
Hudl clips carry no tags: the worker imports sample tags as Veo teacher records.
Tests red first (helper3, gateway2, UI1); existing picker tests changed only for the
requested rename. NOT verified against real Hudl (owner: one short U11 window) and
NOT deployed. `hudl_browser/_account.py` is 866 lines (was 851): split is pending.

## Analysed video export — 26 November 2026

Video Lab Download results: annotated.mp4 relabelled "raw detections" (it is the
worker's pre-tracking box render). New Export analysed video records the clean sample
in the browser with the player's own overlay (pitch outline, halfway line, team rings,
ball, your labels, current toggles) via shared `overlayAt` + canvas `paintOverlay` +
MediaRecorder. Tests red first (module missing; Workspace labels/progress/cancel).
Real Chrome check on a synthetic 6 s harness clip: 1280x720 H.264 MP4, 5.99 s, frame
at 3 s shows own/opponent/unassigned rings and caption. Outline/halfway only unit
tested (harness had no camera tracking); audio track in the recording not inspected.
Frontend only; not deployed.

## Spec730 admin execution settings implemented — 26 November 2026

Branch `codex/local-video-analytics`; worker70f44ac and gatewayee2fe28. Advanced
offers Local(default), MacBook Pro and Split with readiness and error handling.
Hidden from non-admin and protected by gateway full-admin/MFA/CSRF; ordinary jobs
remain local. Split keeps continuous local tracking then overlaps local camera
and remote appearance. Matching sources/models prepared on M3 Pro/18GB via strict
SSH with owner-installed dedicated Thunderbolt-restricted public key. No gateway
SSH credentials/paths, public worker port or silent fallback. See
[spec730](todo/football-memories/730-video-lab-nodes.md).

Verified frontend980/194 files, typecheck/hosted build; backend854 SQLite+854 PG,
ruff/format/mypy/Alembic; worker223/all gates; gateway500+4 Docker/lint/format/mypy.
API7 and UI2 new regressions observed red first; third UI test is a passing access
negative control. Worker dispatch tests red on wrong execution; split red on stub;
some archive/transport tests added after implementation, later metadata/link guards
observed red/green. No existing assertion weakened. Browser isolated synthetic
admin1280/375px: Split save verified, phone scrollWidth=clientWidth375, reference01
compared. Actual SSH synthetic2s all three modes hash/source/ZIP verified. Cached15s
Local/Remote/Split smoke also passed source/hash/ZIP/full-decode checks; isolated
MacBook Docker check still pending. No production source access,
old media/results changed or production session fabricated. Deployment pending;
shared release currently remains spec720. External .claude/launch.json untouched.

## Spec720 DEPLOYED to all eight libraries — 26 November 2026

Owner replied "deploy it" after the explicit full provisioner Docker isolation
exception request; this waives that check for this release only. App main/shared
latest is `e7fee2b84396b20ab5468775cf2f5e867c54a9fa` (runtime code identical to
verified `f604877`); gateway main `081a353` / code `aaecf42` deployed from prepared
`spec720-aaecf42` images, gateway CI45778074931 green. Gateway migration0008
applied, release ancestry seeded before replacement, 12 gateway networks restored.
Shared default app tags and crest service follow the release. All eight running
libraries moved through the existing gateway update path and passed health checks.

Live verification: current==latest==e7fee2b, available=false for every account;
admin's two labs on by default, seven ordinary accounts off, no explicit grants
created. Advanced settings bundle served by every library. Anonymous public portal
lab API401; public health200. No production session fabricated and no signed-in
browser/real toggle mutation exercised. Existing test/UI evidence above still applies.

Audit: exactly27/48 containers replaced (gateway, provisioner, crests and8x3 app
containers), other21 unchanged; every user's database container and persistent
mount unchanged. Roles, account status, quotas and automatic-update preferences
match the pre-deploy snapshot. All1225 existing analysis JSON SHA-256 hashes
unchanged. Native analytics worker untouched/idle. Private rollback DB/status and
inventory snapshots in /tmp/fm720-deployment; no secrets printed or committed.

Seven helpers were busy=false/not syncing, no ffmpeg, zero network bytes over12s,
and no queued/rendering reels before their moves. Admin still had streaming traffic
while busy=false; repeated checks found no active capture/export/reel/analysis job,
ffmpeg or open media-file writer. The explicitly requested final app restart ended
that ephemeral stream. Do not claim admin network counters were flat. Saved source
connections/volumes retained; no source login, refresh or footage download performed
for verification, and no existing media or analysis result overwritten.

Refresh the app, then use Settings > Advanced as admin for own/per-user lab switches
and Update all users. Other users remain denied until deliberately granted. App and
gateway workspace branches remain codex/local-video-analytics for ongoing work;
release main references are above. External .claude/launch.json remains untouched.

## Spec720 lab switches and preview-safe updates — 26 November 2026

Code commits app `f604877`, gateway `aaecf42`; gateway CI45778074931 green
(all three jobs). App has no CI workflow. Prepared app images are tagged
`hosted-f604877cb620fed047e0befacc2dc6c3ac80923e`; gateway/provisioner images
`spec720-aaecf42`. These builds changed no running container or shared tag/latest.
Deployment still requires the full Docker isolation check or explicit exception.

Branch `codex/local-video-analytics` in app and gateway repos. Code complete;
NOT deployed or promoted to shared main/latest. Runtime confirmed admin ae13328
is ahead of shared6138b56: the old inequality check offers a rollback. Source
checkout is separate; data volumes are preserved by the existing updater.

Settings > Advanced is admin-only, independent Player Lab/Video Lab switches
for self and approved users (defaults admin-on, others-off), and Update all users.
Gateway migration0008 stores grants. APIs enforce Video Lab entitlement per
request, preserve owner isolation and filter samples. User portal lab routes work
without opening the LAN-only admin console. Turning off preserves saved work.
Batch updates preserve auto preferences; use an idle time (existing restart path,
no new live busy-work guard). Release ancestry prevents preview rollback for
manual, auto and batch updates. Seed ancestry BEFORE rollout; old metadata keeps
legacy compatibility. Old user app images need this release before grants appear.

Verified app backend854 SQLite+854 PostgreSQL, ruff/format/mypy/Alembic; frontend977
in193 files, typecheck and hosted build. Gateway493 tests,2 existing opt-in skips,
4 Docker cases separately, ruff/format/mypy; fresh isolated migration+drift check.
Gateway web72/typecheck/build; provisioner88/lint/format/mypy; updater24/lint/format/mypy.
Provisioner Docker invocation SKIPPED: live gateway exists (88 deselected).
New behavioral failures observed before implementation for grants, UI gates,
admin tab, preview wording, manual/auto rollback, batch action, ancestry and portal
route. Additional own-sample/batch-UI checks added after implementation. Existing
assertions unchanged. Browser synthetic accounts only: desktop1280 and375px iframe,
checkbox save verified; reference01 compared, screenshots /tmp/fm720-evidence.
No production sign-in or source-service/media access. External .claude/launch.json
left untouched and unstaged.

**Deployment gate:** required provisioner real-Docker integration refuses any live
gateway. Do not remove production or bypass the guard. Finish in a separate Docker
environment or obtain the owner's explicit exception before release. See spec720
for gateway-first migration/ancestry and normal shared-app rollout sequence.

## Two Mac analysis investigation — 26 November 2026

Docs-only on `codex/local-video-analytics`. See
[report](system/domains/video-analytics/two-mac-performance.md). Current worker
already runs natively on this M4 mini (24 GB). Thunderbolt Bridge inactive at
initial inspection; owner confirms M3 MacBook Pro/18 GB and Thunderbolt. Follow-up:
bridge now active, peer ping 4/4 (0.659 ms average), existing SSH port reachable;
40 Gb/s link reported, bulk transfer unmeasured. Existing settings correct, no
network change or remote login needed. System Settings shows Unknown state despite
working bridge. Exact M3 variant
and second-host performance unconfirmed. Prefer benchmarking
whole-job offload, then independent-job scheduling; current worker lock and gateway
admission prohibit simply running two consumers. No deployment, media writes or
new benchmarks. Unrelated existing app edits left untouched. Next: confirm exact
M3 variant, then time identical cached clips in separate scratch
directories. Owner clarification recorded in docs-only follow-up; links/whitespace
checked, no runtime suite rerun.

## Spec700 calibration benchmark COMPLETE; admin preview deployed — 25 November2026

App eae7898, gateway bbbdf20 and native worker1af9782 deployed, gateway first.
New completed child76bc3c6bf03542bc9c4e0f42623f72cb ofab208abe6e984da6b8b21664fec9bb8b
ends “Calibration comparison”. Refresh Video Lab and select that run. Copied44
labels/revision39 exactly, same atlas and source. Experimental candidates are
read-only and NOT applied; no real calibration accepted. Full observed atlas and
linked bird's-eye review from spec690 remain available. Routine jobs keep their
existing calibration workflow; optional pinned models are operator-only.

Both official PnLCalib MV/SV variants tested on four cached games (114 frames each).
Only6 assistant-marked frames/8 lines across3 games, not independent human truth;
fourth active pitch ambiguous among overlapping markings/spare goals, excluded
from accuracy. Neither variant met accuracy/coverage gates. On one game MV raw
median9.4px covers only1/2 checked views versus current94.1px at2/2; this is NOT a
whole-pitch improvement. Other views have substantial errors and both methods
need further validation. No universal Veo/Hudl/youth accuracy claim. Full scores,
weight hashes, timing and explicit limitations in worker docs/PITCH_CALIBRATION.md
and app spec700. Independent reviewed checks/verified dimensions remain necessary
before promotion; no silent threshold tuning or training on assistant markings.

Verified frontend958/188 files (--maxWorkers=4), typecheck/hosted build; backend854
SQLite+854 PostgreSQL/lint/format/mypy/Alembic; worker187/lint/format/project; gateway
482 plus4 Docker cases/lint/format/mypy (2 opt-in skips). Code CI worker45605869616
and gateway45605872041 success. App has no CI. New regressions observed behavioural
red then green; workspace integration was added after implementation. No existing
assertion weakened. Final validator null-entry regression also observed red/green.
Browser isolated real cached footage:1280px table/comparison image,375px iframe
wrapped table and controls visually checked; reference02 compared. Desktop actual
scrollWidth=clientWidth1280. No measured375 viewport-override claim; no signed-in
production playback/acceptance exercised. Screenshots retained outside repo.

Deployment audit: exactly gateway+approved admin web/backend/capture changed4/32;
other28, shared hosted tags/global latest6138b56 and auto-update=false preserved.
All400 previously existing job JSON hashes unchanged;27 new artifact hashes and
parent atlas/source/review equality verified, all8 offline report manifests/ZIP
CRCs verified. Helpers idle/not busy/not syncing, unchanged network counters before
move; worker restarted idle and holds processing lock. Admin healthok and new
VideoLabPage-0ZlYg7RG.js served; anonymous jobs/report/image401. No source-account
access, old media/result overwrite or fabricated production session. Explicit
public model preparation used the separate optional environment, leaving base
deps/lockfile unchanged. External .claude/launch.json in app untouched/unstaged.

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

# Handoff

## Spec710 goal-anchored ends + halfway gating (worker 5a74a19, not yet running) — 26 Nov 2026

Outline ends move out to goals detected just beyond both ends (symmetric; one-sided
or unequal extensions ignored). Halfway proposed only when both goal ends were filmed,
fully inside the atlas and within 25 deg of the camera's direction. Fixes a bug in
c783fdc (deployed): on half-filmed games a clipped off-axis halfway piece was drawn
along a touchline (cached games 1 and 3). Five cached games: 4 and 5 (filmed end to
end) get correct ends and halfway; 1-3 get none. Game 3 outline still wrong (ambiguous
overlapping pitches). Worker 227 tests green. The live worker (spec730 checkout) is
moved to 5a74a19 with owner approval (worker restarted idle). Rebuild 6c216d41 (child
of f2ab96a2, RCW 10 min): right end now at the goal line by the near corner flag, far
corner just behind the goal; halfway line unchanged; far touchline still estimated.
Owner then corrected and accepted the boundary in Video Lab (review revision 2: 28
points, halfway saved) and confirmed it now looks correct. Spec710 goal closed.


## Spec710 whole-pitch coverage + halfway line DEPLOYED — 26 November 2026

Owner feedback: the 3 min Racing Club Warwick sample never films the left end, so the
bird's-eye cannot cover the pitch; a goal at each end is the coverage test. The local
10 min sample (veo-racing-ten, 18:00-28:00, same match) covers both ends: camera
tracking child bcdbc765 of 3ebc1a17 (no labels existed), rebuilt as c80ab0d9 with the
halfway line. No Veo access was needed. Coverage now reports which goal end was not
filmed (from the line-based outline's unseen ends) and suggests a longer window.
Halfway line: worker publishes pitch_outline.halfway; app draws it (amber, dashed) in
panorama, bird's-eye and live match, editable, saved with the accepted calibration;
gateway PanoramaReview gains optional `halfway` (2 points inside the panorama).
Deployed: app d5fe1cb (admin only; 3 containers; contains another session's e7fee2b),
gateway e2a95a1 as image spec710-e2a95a1 (only fm-gateway-gateway-1 recreated, same
compose files + an image override like spec730's; origin intact), worker c783fdc
(kickstarted idle; includes another session's 70f44ac). Checks: frontend 983, worker
224, gateway 501 (+2 skips), all lint/type checks green. Far touchline on RCW still
estimated. Three reverted far-line heuristics are recorded in the domain doc.
Owner approved: the LaunchAgent's checkout /Users/simon/Football-Video-Coordinator-730
(spec730, was detached at 70f44ac) fast-forwarded to c783fdc and the idle worker
restarted. Rebuild f2ab96a2 (child of c80ab0d9) has the halfway line: bird's-eye shows
it through the centre circle; live frame near touchline on paint, right end short of
the goal line (owner drags it; whole pitch is now in the image).


## Spec710 line-based pitch outline DEPLOYED — 25 November 2026

App ae13328 (admin only, same route; 3 admin containers changed, latest untouched,
capture idle 45 s before move) and worker e627a7d (kickstarted idle). New worker
`pitch_outline`: whole-pitch outline from painted lines on the camera-level plan,
centre-circle symmetric completion, camera-facing prior; app shows it live
(`pitchProposal`) until a boundary is accepted, below human corrections. Turf-colour
envelopes are never promoted. 5 cached games visually correct (tuned on these 5; no
held-out claim). Worker 203 tests, frontend 968, all checks green. New tests observed
red first. Rebuilt owner run f6d0bcb2 (Racing Club Warwick) outline: near touchline
and halfway on the painted lines; far/side edges flagged unseen (estimated).


## Spec710 production rebuilds verified — 25 November 2026

Queued through the gateway's own queue_child (same code as "Rebuild complete pitch",
owner 2b550815, parents untouched, review/labels copied): b8ed9169 (child of 76bc3c6b,
RCW vs Kidderminster CG) and 16a49509 (child of da671289, Racing Club Warwick vs
Kidderminster RMC). Both complete with registration "refined" (residual 0.09 px).
Painted lines projected from each atlas into 24 live frames: median 0 px, p90 <=0.8 px
near and far. Deployed web build (ff5d96e, read-only local harness; harness review
saves in memory only, production review.json untouched) shows camera-level bird's-eye
and a boundary snapped to halfway line/touchline/goal line following those lines in
live frames. Other cached games checked the same way (scratch): all five consistent.
Independent check, same unchanged projection script for every game (atlas painted
lines -> 24 live frames): 600 s cut-heavy game new near 0 px p90 0.96 / far 0 px p90
0.96 vs old near 5.2 px p90 44 / far 4.3 px p90 11. Acceptance is the owner's review
decision and was deliberately not done by the agent: 16a49509 has no automatic
outline (editing starts from a ground rectangle) and its goal pair is still a false
detection (no longer used by the bird's-eye). Old runs unchanged.
Linked editing on both owner runs, deployed web build, real mouse drags (harness,
nothing saved): 16a49509 bird corner 4 -> halfway/circle point in panorama, panorama
corner 3 -> touchline in bird, untouched corners fixed; b8ed9169 panorama point 18 of
the 24-point outline -> halfway line in bird, only point 18 moved.


## Spec710 DEPLOYED: app ff5d96e admin preview + native worker 95ede4d — 25 November 2026

App: images hosted-ff5d96e built (FM_BUILD_LATEST=0), added to updates built list
(latest 6138b56 untouched), admin library moved with updates._move. Inventory diff:
exactly admin web/backend/capture changed (3 of 36); capture idle (net counters flat,
no ffmpeg/browser) before the move; backend health ok; VideoLabPage-XhgeU3fu.js
serves the camera-level bird's-eye. Gateway unchanged (it only binds panorama_id).
Worker: codex/local-pipeline 95ede4d (rotation/zoom pose solve, see worker
docs/PITCH_PANORAMA.md), CI green, kickstarted while no job queued/running.
Existing runs keep their old atlas: use "Rebuild complete pitch" in Video Lab to
get a new child with refined poses; then edit/accept the boundary. No existing job
or review was modified; no source-account access. Verified on five cached games in
scratch only (runtime untouched): near-field painted-line error frame vs atlas
2.9-12 px -> 0-1.4 px; live overlay with a boundary snapped to the RCW 261116
halfway line/touchline lies on those lines near and far. Not yet exercised: a real
"Rebuild complete pitch" job in production and signed-in production review.


## Spec710 pitch homography fix (app) — 25 November 2026

Branch codex/local-video-analytics. Bird's-eye/panorama/live boundary now agree:
edges are ground-straight (ray-span) in every view, and the bird's-eye uses a
camera-level ground plane from all registered frames instead of four goal
contacts (new `frontend/src/components/videoLab/levelGround.ts`). No schema,
gateway or worker change; existing atlas runs benefit after an app deploy.
Nine new tests observed red then green (one stub-throw, the live-frame touchline
and the start-boundary regression red for the geometric reason). Existing
assertions unchanged. Verified frontend 967/189, typecheck, build; backend 854
SQLite + 854 PostgreSQL, ruff, format, mypy, alembic. Browser: local read-only
harness over cached jobs 76bc3c6b and da671289 (no gateway, no sign-in): game 2
bird's-eye round centre circle/straight lines; bird drags on halfway line and
touchline land on those lines in the panorama. Live overlay follows lines in the
far field but near-field ground is ~3% of frame width off: worker per-frame
registration limit. Offline ECC test (scratch only, no worker change): refining
each pose on the lower ground band raised near-field line correlation ~0.16->0.33
but dropped far-field 0.89->0.12. One 3x3 pose per frame cannot fit both, so the
fix needs non-homographic (mesh) registration across worker, gateway and app.
Not deployed. External .claude/launch.json edit still untouched/unstaged.


## Spec700 calibration benchmark IN PROGRESS — 25 November2026

Owner approved PnLCalib + camera-aware refinement experiment. App branch
codex/local-video-analytics; worker codex/local-pipeline. Pinned official PnLCalib
42088864170f75ea02e76d20e9a9a1db59edb3e3, public MV keypoint/line weights and separate
Python3.12 models/pnl-env prepared explicitly, outside gateway runtime. Base worker
lockfile/deps unchanged. Weight hashes/licenses recorded in private profile and
preparation records. No source-account access or existing result writes.

Worker new pitch_geometry, pitch_template, pitch_models, pnl_inference and
pitch_temporal modules: robust mixed point/dual-line DLT + refinement, degeneracy/
horizon checks, youth-safe outline semantics with explicit extra dimensions,
pinned offline subprocess adapter and camera-step transfer refusing cuts/expiry.
New geometry/profile/template/temporal tests observed behavioural red then green.
Real observations cached for four different games in runtime/pitch-benchmark-700:
30/40/24/20 frames,157/353/73/35 raw keypoints,95/200/86/63 lines at thresholds
.3434/.25. First unmodified .7867 line threshold found no lines in probes. Adult
model assumptions and low fit residuals can yield wrong/collapsed fields; these
predictions are not human labels and have NOT been promoted or deployed.

Next: finish held-out assistant-marking benchmark, CLI and immutable report
publication; compare current/adult-template/temporal candidates; integrate useful
reporting in app, verify/review and publish a new child preserving latest labels.
Global atlas fitting probes are private experiments, not production features.
Actual independent human accuracy remains unverified. Full suite checkpoint
results recorded in worker PROGRESS when complete. External .claude/launch.json
edit in app remains untouched/unstaged.


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


## Detector trained on owner-confirmed Veo frames (spec670, 2026-11-25, building)

[Spec670](todo/football-memories/670-veo-trained-detector.md): owner said yes to ultralytics,
a 300-frame pilot, the match choice and assistant pre-sort.
- **Built in three repos:**
  - worker `codex/veo-detector`: label-frames, train-veo-detector, eval-detector;
  - gateway frame labels (merged and deployed);
  - app `/video-lab/labels` (admin `a7b2933`).
- **Label sets** are written to `runtime/label-sets/<id>/`; an index is in
  `runtime/label-sets-index.txt`.
- **Next:**
  1. The assistant pre-sorts (`presort.json`).
  2. The owner confirms frames.
  3. Run train-veo-detector on CG, f7925 and Norton with base
     `~/Football Analysis Worker/models/yolo11m.pt`.
  4. Run eval-detector on RMC against the current `models/detector.json`, with and without tiles.
  5. Promote only past the spec's gates.

## Teams by kit and the ball (spec660, 2026-11-24)

Branch `codex/team-kits` (worktree `../Football Memories kits`, cut from
`codex/local-video-analytics` de91f29 because another session was editing spec650 files in the
main checkout; merge this into that branch after spec650 lands: expect conflicts in
`LabVideo.tsx`, `VideoLabPage.tsx`, `labTypes.ts`). Frontend only. [Spec660](todo/football-memories/660-team-kits-and-ball.md):
per-moment team from learned kit colours, label/swap handling, one referee/keeper per moment,
kits remembered across related runs, match-ball overlay. Same-match assistant audit on the real
RCW run: 15.1% to about 94% of players correct on screen. Frontend 889 tests, typecheck, build.
Backend/gateway/worker untouched.
Deployed admin-only `a6fbaa1` (24 Nov ~21:48 UTC) after admin capture sent 0 MB over 60 s:
built :hosted-<sha>, added to status.json built (latest stays 6138b56), admin library moved via
updates._move; exactly admin web/backend/capture changed (3/32); auto-update false; health 200;
VideoLabPage-D-Nein6l.js served; anonymous jobs 401. Not signed in here, so no keeper label was
added to the live review: one "Our goalkeeper" label lets the keeper carry. Not merged into
`codex/local-video-analytics` (spec650 in progress there).
Redeployed admin-only `e5f2454` (player-sized kit matches set the far edge; capture idle,
3/32 containers changed, latest unchanged, health 200, anonymous 401). Ball audit every 10 s:
on the match ball 16/24, uncertain 1, no ball shown 7 (detector missed), never a spare ball.
Then `41630cc` deployed admin-only the same way (3/32, health 200, 401): resting spares and
edge balls skipped, 1.5 s glide; ball audit 21/24 right, 1 wrong (0:15 spare), 2 undetected.
Live labels (rev 31, 23 labels): yellow 70/73, red 85/87, pink keeper 5/5, referee 14/15,
our keeper 0/6 (owner chose not to add a keeper label; one "Our goalkeeper" label fixes most).
Detector follow-up: worker `codex/dense-clip` e42d68b `refine-moments --whole-clip`; published
run a4cb99cd (refined child of 03964514, labels copied) for the ball (84% to 88% coverage).
Second match (owner request): Racing Club Warwick vs Kidderminster RMC 18:00-22:00 from the saved
local sample, run 3ebc1a17, no labels; results and limits in spec660. App `280f3ba` deployed
admin-only (3/32, health 200, anonymous 401). Next: exposure/cast-robust colour in the worker.
Tiled ball run published as 8389ebf0 (refined child of 03964514, 23 labels copied; worker
bc5d91a `--ball-tiles`). App `4a2b5d0` (camera-steadied spare filter) deployed admin-only the
same way (3/32, health 200, anonymous 401). Ball audit 22/24 right on that run.
25 Nov goal check (spec660 "Keeper, swaps and ball strays"): dark kits need a look-alike match
too (no more coats as keeper/referee); a plain reading decides a tracklet's first/last sample;
a team kit held 2 s+ on a dark-kit label is a swap (owner's referee label on 200); ball spares
judged over 15 s; strays with no close neighbour dropped at 10/s. Owner rev 34 labels: 180/186
right on screen, 3 wrong (two players in one box at 3:21, a swap at 3:34). The owner was labelling
the live run (8389ebf0 review rev 35 at 08:33 UTC) so the assistant wrote no labels; keeper
tracklets still unlabelled there: 317 (0:35-0:48) and 897 (2:53-3:01), plus 14 more listed in
spec660. Ball 23/24 on the 10-s audit; 2:35 is unseen by every local detector.
App `e0f0796` was deployed admin-only over the other session's `2de8b34` (pitch boundaries)
by mistake; it removed the boundary editor for ~5 minutes while the owner used it. Rolled back to
2de8b34, merged `codex/local-video-analytics` into `codex/team-kits` (008de0f), deployed that.
Then `64e1383` (split-window own colour; not-a-player holds on subs in kit) deployed admin-only:
3/32 changed, latest 6138b56 unchanged, health 200, anonymous 401. Capture moved ~46 MB during
the build; no capture file changed in 20 min and no download was mid-way afterwards.
Assistant labels written to run 8389ebf0 as review rev 39 after the owner was idle 5 min (15
keeper tracklets, 198/199 not players). Live labels: 184/186 on screen, 2 wrong (3:21 overlap).
`codex/team-kits` now contains all of `codex/local-video-analytics`; that branch can fast-forward.
Then `3a39a2c` (ball held for a set piece bridged up to 4 s; corner at 2:35 now shown) deployed
admin-only the same way (capture flat, 3/32, latest unchanged, health 200, anonymous 401).
Ball 10-s audit 24/24 (0:15 none: keeper holding it); shown 93.3% of the clip.
Then `7d09941` (overlapping boxes: the colour seen decides) deployed admin-only the same way
(capture flat, 3/32, health 200, anonymous 401). Live labels 185/186; remaining gaps in spec660.

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


**Read this first.** Then [PROGRESS.md](todo/football-memories/PROGRESS.md) and
[DECISIONS.md](DECISIONS.md). Rules: [CLAUDE.md](../CLAUDE.md) (any agent) and
[60-handoff.md](system/rules/60-handoff.md) (how to leave the work).

## What this is

**Football Memories**: a local-first web app that archives football match
footage, indexes tagged moments, and (next) builds a player's memories
timeline. Full brief: [BRIEF.md](BRIEF.md). Design references:
[design/](design/DESIGN.md).

## Camera-aware Video Lab (spec620, 2026-11-24)

Branches: app/gateway `codex/local-video-analytics`, worker `codex/local-pipeline`.
[Spec620](todo/football-memories/620-camera-aware-video-lab.md) implements extra known
pitch landmarks, visible-corner selection, overdetermined homography and camera
correction blending; exact paused timestamps are anchored between motion samples.
Pitch motion uses forward/backward CPU flow with ORB recovery/cut refusal. User
team/keeper/referee corrections refit a source-bound multiview exemplar model;
gateway saves revisioned human-only prototype banks separately from inference.
No neural-weight fine-tuning or named-identity accuracy claim. New Veo picker uses
the existing own-helper library, start minute and1–10 minute window; bounded verified
H.264 clip imported via admin/CSRF/permission/owner route. New runs prepare camera
and multiple views automatically, skipping action/OCR compute. Named run dropdown;
old runs offer Update camera tracking / Update player view model, retaining labels.

Verified: backend852 SQLite +852 PostgreSQL, ruff/mypy/schema; frontend856,
typecheck/hosted build; worker133 + lint/format/project. Gateway final checks/CI
recorded separately in its handoff. Synthetic1280/375 browser checked against
reference02: selection, extra point, excluded corners, save;375px no overflow.
Real cached120s camera18.508s,599 flow steps,0 rejections;100-pair flow19.33ms
vs ORB87.65ms; real998-track/4296-view preparation111.441s. Hash/ZIP/source checks
pass; no independent accuracy or new source-account acceptance established.
No source credentials, new weights/dependencies, completed-result/input overwrite.
Deployed to the existing admin preview on24 November2026: gateway code2be7fb7
first, app6dd4010 next via updates._move; native worker d70f345 reloaded idle and
owns its watch lock. Gateway/worker code CI green45478769832/45478213369. App
has no CI workflow.32-container comparison: exactly gateway +admin web/backend/
capture changed;28 others, shared :hosted tags and latest6138b56 unchanged; admin
auto-update staysfalse. Admin helper idle and0 network bytes over10s before move.
Admin health200, new VideoLabPage-L1AwBVfV.js and new helper route/schema verified;
anonymous jobs/import401; both published trials still complete. No new live Veo
analysis queued and no authenticated production browser acceptance claimed. The
isolated synthetic browser checks are separate from signed-in playback. Refresh
Video Lab; on older runs use Update camera tracking / Update player view model
once to gain the new stages. Existing labels/results carry forward.

## Identification-first checkpoint (spec 590, 2026-11-24)

Owner follow-up: both completed trials are now registered in the live Video Lab
runtime catalogue and as completed jobs owned by the existing approved admin
(owner ID verified read-only against the gateway database). Outdoor1080p run
`c880cae0` and indoor540p run `cbd21303`, both18:00–28:00; refresh Video Lab and
select the matching completed run. Results were copied into new job directories,
not rerun; sources/previous results preserved. Live gateway job views expose both
videos/team files and reject a different owner404; anonymous jobs401. Every copied
file is byte-identical. No code/image/container/default changes. Signed-in browser
playback unverified: browser attachment requires an app update/network policy.
Further model work is advice only, as requested; no training started.

Owner prioritises correct player/team attribution before passing/tackling. Private
worker `codex/local-pipeline` implements opt-in source-bound multi-view kit/role
examples, pitch polygons, track uncertainty, explicit staff/keeper/referee classes,
ball evidence, fresh annotated preview and precision/coverage audit. See
[spec590](todo/football-memories/590-identification-first.md) and
[domain notes](system/domains/video-analytics/README.md). App/gateway/default worker
and deployment unchanged; no source account request or new weights/dependency.

Two different ten-minute local sources completed. Indoor540p failed; SportsReID
and cached footballYOLO comparisons rejected. Latest1080p outdoor Villa–Stoke
source18:00–28:00: baseline1058.956s, calibrated569.952s. Frozen148-observation
assistant visual audit,100 outfield observations: kit coverage52→55%, all55 assigned
outfield kits correct; overall credit precision94.55→94.83%, but sidelined people
given teams2→3 (worse). Role accuracy35.14→51.35%; keepers3/6, referees0/6; OCR0
accepted numbers/0 named identities. **Quality target not met; statistics deferred.**
These are same-source assistant labels, not independent human or match-disjoint
accuracy. Tracklets are not people. Worker111 tests/lint/format/project gates and
code CI green; final manifest/ZIP/full-decode/source checks pass. Real footage,
profiles/audits/results stay private under worker runtime/identification-hd-20261124.
Worker report `docs/IDENTIFICATION_TRIAL.md` records exact evidence and limitations.
Next: independent reviewed youth role/team data and part-aware model, hard staff/
keeper/referee/kit-change cases, camera calibration and specialised jersey reader.

## Pitch positions in metres (spec 610, 2026-11-24)

"Pitch map" panel (`PitchMap.tsx`, `metres.ts`): pitch size preset/custom saved in the review
(`pitch_size`, gateway validated), live positions in metres, team heat maps, selected
person's distance and top speed. Details: [spec 610](todo/football-memories/610-pitch-metres.md).
Frontend 845, gateway 448 tests. **Deployed 2026-11-24: gateway 52620a1 first, then app d47d7de for the admin library only (latest 6138b56 unchanged); admin health 200.**

## Adjustable pitch outline (spec 600, 2026-11-24)

Owner: other matches and sideline people were still analysed; asked for homography with a
manual adjustment. Built across all three repos (worker 'camera-tracking', gateway
`pitch_keyframes` + `track-camera`, Video Lab "Pitch outline" panel: Prepare, Mark pitch
here, draggable corners incl. off screen, marks list). With marks, only people inside the
outline get rings and team suggestions. Details: [spec 600](todo/football-memories/600-pitch-outline.md).
Frontend 836, gateway 444, worker 128 tests. **Deployed 2026-11-24 ~19:10 UTC (owner: "Yes deploy"): gateway cbb21c4 image recreated first (track-camera, pitch_keyframes live; anonymous 401), then app bfee873 for the admin library only via updates._move (latest stays 6138b56), worker c4a391c kickstarted with no jobs queued. Waited about 40 minutes for the admin helper's transfer to go quiet (12 GB sent). 4 of 32 containers changed; shared :hosted unchanged; admin health 200.**

## Refine moments and off-pitch people (spec 580 follow-up 2, 2026-11-24)

Owner: "build the refine moments step"; rings on people outside the pitch are not wanted;
label stays team only (no shirt numbers: identification trial read 0 reliably).
- **Refine moments** button (`RefineMoments.tsx`) queues a `moment-refinement` run (gateway
  `POST .../refine-moments`, worker `refinement.py`): detector about 10/s inside each moment
  clip, dense tracklets take the sampled track IDs so labels carry over. Overlay merges
  `dense_tracks.json` inside clips (`playArea.ts mergeDense`). Real 120 s trial: 205 s for
  45 s of clips; ten-minute match estimate about 27 min.
- **Off-pitch filter** (`playArea.ts inPlay`): Veo films from the near side, so spectators and
  other pitches sit beyond the far edge of play. The edge is your furthest labelled player on
  screen (fewer than two: the second furthest with any team). People beyond it by more than
  their own height lose their ring; "Show everyone" brings them back. Rejected first: a hull
  around labelled players hid real players outside it on the real run. The worker's
  `pitch_location` is unusable (never "outside"; fence spectators marked inside). Limit: people
  on the near side (coaches at the bottom edge) are not filtered.
- The owner's dashed-box screenshot was the pre-deploy page; the live bundle had rings.
**Deployed 2026-11-24 (owner: "Yes, deploy it"): gateway 4f3d8bd rebuilt and recreated with compose.yaml+public+analytics (refine-moments route live, anonymous 401); app b401611 built as :hosted-<sha>, added to status.json built (latest stays 6138b56), admin library alone moved via updates._move; worker 6ea1910 kickstarted idle with no jobs queued. 4 of 32 containers changed (gateway + admin web/backend/capture); shared :hosted unchanged; admin backend health 200; new Video Lab bundle served.**

## Video Lab player rings (spec 580 follow-up, 2026-11-24)

Owner: boxes lagged behind players and dotted boxes looked unprofessional. Detections are
sampled every 0.36 s and the overlay held the last sample (up to 0.36 s stale) and repainted
only on `timeupdate` (about 4 per second). `LabVideo.tsx` now interpolates each person between
neighbouring samples (no bridging gaps over 0.75 s; a person missing from the next sample
stays put until that sample) and repaints on every video frame via `requestVideoFrameCallback`
(rAF fallback). People are drawn as a ring on the ground under the feet, coloured by team
(blue ours, orange opponent, yellow referee, grey not a player, white unassigned); faint for
suggestions, bold and filled for your labels; the selected or hovered person gets a team-coloured
glow and a label pill. Checked on real run `e11f6aaf` in the browser. **Deployed 2026-11-24 to the admin library only (app bca4687, owner: "Yes, deploy it"): built as :hosted-<sha>, added to updates/status.json built (latest stays 6138b56), admin moved via updates._move. Exactly the admin web/backend/capture changed of 32 containers; gateway and worker unchanged; admin capture idle beforehand; backend health 200, new VideoLabPage bundle served, anonymous analytics 401.**
Remaining limit: motion between samples is a straight line, and merged detections (tackles)
stay one ring; tighter tracking needs denser detection in the worker (for example every frame
around moments), not overlay work.

## Video Lab review workspace (spec 580, 2026-11-24)

Owner found the spec 570 preview hard to use. Rebuilt `/video-lab` as a desktop workspace
(`frontend/src/components/videoLab/`): moments rail with play-through and previous/next,
clickable people on a clean video, an inspector to approve/reject/retype actions with a
team, label people (team, goalkeeper, referee, not a player), and look-alike groups. Worker
0.4.0 `review-preparation` adds SportsReID groups, shirt colours and actor candidates;
gateway accepts team/role labels and queues preparation. Details and calibration numbers:
[spec 580](todo/football-memories/580-video-lab-review-workspace.md). Removed the old
sidebar, colour picker, overlay and review panel components with their tests.

Verification: frontend 813 passed, typecheck/build; gateway 433; worker 89; backend
unchanged. Logic tests red first; workspace UI tests written after the components and
proved by mutation (each broke when its behaviour was removed). Real-data browser check
on a local server with the prepared ten-minute run. **Deployed 2026-11-24 13:12 UTC (owner: "Yes, deploy it"): gateway 8ab2c4b (compose.yaml+public+analytics), admin library alone moved to app a4b50f3 via updates._move (latest stays 6138b56, shared :hosted tags unchanged, auto-update false). 32-container diff: exactly gateway + admin web/backend/capture. Worker LaunchAgent now passes --reid-config models/reid.json (plist backed up first) and was reloaded idle. Deploy waited ~20 min for the admin Hudl/Veo helper to finish an active transfer (~100 MB per 20 s) before recreating anything. No live preparation run queued: the owner clicks Prepare player grouping on a run.**

## Team segregation and Video Lab metadata rail (spec570, 2026-11-24)

Codex built this; Claude reviewed, fixed and completed it. App branch
`codex/local-video-analytics`, gateway branch of the same name, worker
`codex/local-pipeline`. Video Lab adds a library-style metadata rail (Veo highlights,
Our/Opponent Veo tags, analysed actions, people/teams; filters, counts, seek to
clip time), team statistics (analysed kit groups separate from Veo counts;
unknown actors never credited to a team), an optional team/role overlay on the
video, and "Tag team jerseys", which queues a new run from cached detections with
the chosen colours. Previous runs label tagging runs ("jersey tagging of <parent>").
Old jobs without team files still show Veo/model metadata.

Real cached ten-minute check exposed far-side spectators labelled referee
candidates (117 tracks). Fixed in the worker (max 3 concurrent third-kit people);
re-run 3547→514 official observations, teams unchanged, parent unchanged. Players are
still often unassigned (6.8% player-candidate observations) and all 52 actions are
unassigned. Experimental only; worker trial notes in its docs/HANDOFF.md.

Verification: frontend 799 passed, typecheck/build; gateway admin 104 passed;
worker 76 passed; gateway full 424 passed; backend unchanged, SQLite and PostgreSQL re-run green with ruff/mypy.
Synthetic browser desktop and 375px: filter, seek to 0:12, overlay labels, no
horizontal overflow. **Deployed 2026-11-24 ~11:45 UTC (owner: "Yes, deploy preview"): gateway bcd33f5 recreated with compose.yaml+public+analytics; app 6abd627 built as :hosted-<sha> only, added to updates/status.json built (latest stays 6138b56), admin library alone moved via the gateway updates._move path. 32-container diff: exactly gateway + admin web/backend/capture changed; shared :hosted tags unchanged; admin auto-update stays false. Admin backend health 200, new Video Lab bundle served, anonymous analytics 401. Native worker restarted idle on the new code. Admin capture had a leftover headless browser from a batch that stopped 10:47 UTC (idle: no network over 20s); recreating it cleared that. Signed-in admin browser check not done (no admin session in the embedded browser).** Owner should tag real jersey colours from a paused frame.

## Active football training extension (spec560, 2026-11-24)

Owner now requests the remaining tracking/training/actions/attribution work.
See [spec560](todo/football-memories/560-football-model-training.md). Private worker
checkpoint a0ef724: temporal/global camera association, detector fine-tuning,
reviewed temporal action trainer/evaluator, source-bounded identity and CLI export.
Same-box replay5248→1130 track births, not identity accuracy. Real detector pilot
103 source-filtered images/120 steps; weak roles/ball and visual giant false box
keep it experimental, not selected as live default. Real960-frame action features
extracted. Owner nominated a tagged Veo match and requested10-minute analysis. Private
source/tags downloaded through the existing helper;18:00–28:00 analysed.
Native admin-owned job09b509731e6b4ee4a89c46494264c70d is complete,600.1s cap
covered red→green. Veo teacher tags preserve9 event types without inventing
human confirmation/background negatives; one match cannot span evaluation splits.
Pinned offline T-DEED and torso OCR are integrated. Private worker trial report:
`/Users/simon/Football Video Analytics/docs/TEN_MINUTE_TRIAL.md`.45m15s local
queue wall time;52 unreviewed suggestions,44 separate Veo records,1 OCR hint,0
named identities. No model goal suggestions for either of2 Veo goal tags.
Ball coverage25.9%; reliable football actions remain unproven. Same-box legacy
replay16162→2155 births (-86.67%) is not an identity metric.
Full decode,15 hashes, ZIP CRC and input/archive integrity pass; completed-result
HTTP replay1 passed with206 byte ranges.4800 real feature frames and44 weak
candidates prepared; no real supervised action fine-tune or fake split/negatives.
Native worker reloaded idle with duration-scaled bounded encode timeout.

App/gateway working changes add private revisioned admin reviews and player
assignments, preserving original inference results. New API/UI tests observed red
then green. Frontend789 pass/typecheck/build; backend850 SQLite+850 Postgres,
ruff/mypy/Alembic pass this turn (backend unchanged). Worker49 pass. Real full
football API E2E355.51s passed; synthetic desktop/375px UI checked, seeking,
review and revisions work. Gateway417+4 Docker and CI pass; portal72/provisioner86 gates pass (provisioner
Docker test skips via existing populated-stack guard). Admin preview app754aace
and gateway94af8cb deployed.32-container comparison: exactly gateway/admin
web/backend/capture changed; all other28 unchanged, global latest unchanged.
Admin auto-update staysfalse. Safari is unlocked but its existing session is an
ordinary family without lab access; no session/MFA bypass or sign-out performed. No new app/gateway runtime dependency, AWS, biometric identity or input overwrite.
New match download used the authorized existing Veo helper; no auth/storage changes.

## Local admin video analysis (spec 550, 2026-11-23)

Branch `codex/local-video-analytics`, based on latest main `6138b56` (including
the current crest release). Owner asks for a private worker repository, local
two-minute Veo trial and admin-only access. New private
`MooreSi/Football-Video-Analytics`, native local worker at
`/Users/simon/Football Video Analytics`, `codex/local-pipeline`. New `/video-lab`
screen follows reference02 workspace and reference01 panels. Gateway branch of
the same app name adds full-admin/CSRF/owner guarded local job/artifact API;
default disabled without `compose.analytics.yaml` runtime mount. No worker port.

Already downloaded Veo match supplies a separate 05:00–07:00 sample. Native
MPS Faster R-CNN completed in268.659s:360 sampled frames,3596 decoded, annotated
H.264/AAC, JSON/CSV,5248 fragmented tracklets and manifest/ZIP. Full derivative
decodes cleanly; artifact hashes/ZIP and unchanged original full-match hash checked.
Counts are predictions, not accuracy or unique players; no confirmed goals/passes/
tackles, named players, teams or physical metrics. AWS remains future work.

Admin preview deployed: only the admin library uses app f70eef51; gateway uses
its optional analytics mount. Only gateway and that admin's web/backend/capture
container IDs changed; the32-container inventory and every other ID were preserved. Global
updater latest/default app tags unchanged. Admin automatic updates paused
(previously true); restore when preview retired or released generally.

Verification: worker14; frontend785; gateway405 plus4 real-Caddy; portal72 and
provisioner86. Backend850 SQLite +850 PostgreSQL; lint/format/types/build/schema
drift clean. New component behaviours observed red first; assertions unchanged.
Provisioner Docker test skipped by existing populated-live-stack guard.

Opt-in real integration passed in256.62s using an isolated synthetic full-admin:
API submission→native model→completed status→all artifact downloads; hashes,
ZIP/source bytes and206 video Range checked. Live anonymous sample/job/video/ZIP
routes all401. This does not establish signed-in browser playback.

Blocked acceptance: Mac locked; embedded browser redirects to sign-in and has
no admin session. Need owner unlock/sign-in for live desktop/phone playback and
download review; do not claim browser acceptance complete or bypass MFA. Private
worker [trial report](https://github.com/MooreSi/Football-Video-Analytics/blob/codex/local-pipeline/docs/TRIAL.md).
No source login/download, source/schema/dependency change, AWS or footage overwrite.

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

## Current change (2026-11-23)

- **Automatic tournament/squad tagging (spec 500), branch `codex/tournament-library`,
  pushed and deployed locally.** Supersedes manual-first discovery: Library reconciles
  cached date/title/player evidence automatically, including imported DB metadata.
  Date/club/age scopes, named events, numbered games and multiple fixtures; duplicate
  views/halves do not fabricate a tournament. Explicit home-side team labels win;
  conservative roster clusters get stable provisional Squad numbers, sparse/ambiguous
  tags stay Team unassigned. Cards show Auto/Review + explanation + Correct; stats allow
  tournament rename/whole-squad correction. Manual assignments/removals persist and
  cannot be undone by detection; corrected labels seed comparable event rosters.
  Known-club placements reject late unknown-club snapshots, and emptied obsolete
  automatic groups are removed without losing corrected names. No raw rosters stored
  with inference evidence; preference backups/schema unchanged. Backend **806** on each
  SQLite/PostgreSQL, frontend **745**; lint/format/types/build/schema pass. Real temporary
  API + synthetic helper browser review: automatic grouping, two rosters, correction,
  rename/reload and 1440/375px no overflow. Local rollout health/API/nginx and served
  `index-C4zqzSZt.js` verified. Actual local tournament list still empty before the owner
  reloads Library; no demo records written. Read-only local cache audit: 289 matches,
  latest dated 15 Nov; screenshot's 22 Nov games absent locally. No source requests,
  helper restart, hosted rollout or footage changes. No CI workflow exists.

- **Tournament groups (spec 490), branch `codex/tournament-library`, pushed and deployed locally.**
  Match Library cards now have bottom-right selection boxes for imported/Hudl/Veo games.
  The batch dialog creates/reuses a tournament and entered home team; a floating action
  follows selections while scrolling. Saving opens that tournament/team. Library filters
  and per-team Games/W/D/L/GF/GA/GD/score-coverage panels support several entered teams.
  Reassign by saving again; remove selected memberships without deleting matches.
  Namespaced preference records survive restarts/backups; no schema migration. Whole
  tournament stats ignore card search/age/season, exclude missing scores and read only
  member games (imported tags via bounded local metadata reads). Backend **784** on each
  SQLite/PostgreSQL; frontend **741**, lint/format/types/build/schema checks pass.
  Synthetic 1440/375px selection/dialog/save/stats reviewed against reference 01 and
  supplied card image; document width equals viewport. Local backend/frontend rebuilt,
  health, empty tournament GET, nginx and served `index-CK7ERQhM.js` feature verified.
  No real source account accessed or existing footage changed. No hosted rollout or
  helper restart; no CI workflow exists. Owner can start grouping their real games.

- **Shared-login investigation, branch `codex/shared-login-investigation` (docs only).**
  Hosted credentials already use per-library AES-GCM sealed files on persistent capture
  volumes; all sessions for the same gateway user route to the same library. Read-only
  inspection of the reported account found Veo configured, 288 cached matches (56 with
  available video), and no saved Hudl credentials or Hudl matches. Both gateway permissions
  exist. Container and web-to-helper status agree. No credential values read, source login,
  refresh, deployment or data change. Exact second-device cause remains unconfirmed: awaiting
  its URL, displayed account identity and location of the prompt. Browser-local visibility/
  filters can hide matches; permission loading/errors currently show the generic connection
  prompt; Settings always renders credential fields and incorrectly describes hosted storage
  as Mac Keychain. See [hosting notes](system/domains/hosting/README.md). Focused offline
  checks: 26 backend tests and 6 frontend tests pass; full suites not rerun for docs only.
  Follow-up phone screenshot confirms the generic Library connection panel on the public
  domain. That panel tests absent/falsy permission-query data, not saved credentials;
  browser-local filters alone cannot trigger it. Source/runtime session loading does not
  bind access to IP. Exact browser permission response and displayed identity still needed.
  **Further audit:** excluded the IP hash shared by the owner's two working test logins at
  10:55/10:59. Three other historical IP groups remain. The 08:57 login and session active
  at 09:16 belong to a separate newly registered account with neither permission, matching
  the screenshot at 09:17; Lambro has no recorded activity then. Strong evidence of a wrong
  account session, pending identity confirmation on the pictured phone. Raw IPs and historic
  browser identities cannot be recovered from retained logs; do not claim a proven browser bug.

- **Restore separate Player Hub / private Lab tabs (spec 480), branch
  `codex/separate-player-lab-tab`, merged/pushed main and deployed to admin.** My Player retains its
  original chooser/profile/card/memories flow. Admin Player Lab is now its own main
  tab at `/player-lab`; the old `/player/lab` bookmark redirects there. Only the
  selected tab highlights. Removed the main-area preview shortcut; admin headers
  wrap without changing family navigation. Existing hub implementation and player
  data untouched. Read-only check found the hosted admin library has no saved
  profiles, whereas the owner's local app retains its primary player. Owner explicitly
  approved copying it: editable identity fields/card style and photo copied through
  existing APIs; hosted selection and all fields/photo verified. Source local selection,
  editable fields and photo SHA-256 unchanged. No match/footage/history copied or totals
  fabricated. No source account accessed. Frontend 733/typecheck/local+hosted builds pass;
  backend 780 each SQLite/PostgreSQL, lint/format/types/schema pass. Synthetic 1440/375px hub
  and lab navigation reviewed, document widths match the viewport. Hosted code build
  `6ce6cff` deployed via gateway updater/provisioner; capture idle beforehand. Health,
  Nginx and served `index-UflPUTLq.js` verified. Copied fields/primary/photo rechecked
  after deployment. Snapshot: only admin web/backend/capture image IDs changed;
  its database, other hosted libraries and owner local stack unchanged. Later hosted
  rollouts retain existing update settings; Lab remains admin-only.

- **Admin player lab (spec 470), merged/pushed `main`, deployed to the admin library.**
  `/player/lab` and an admin-only main-area shortcut require the gateway's full admin
  identity; local installs, ordinary accounts, partial login and failed checks fail closed.
  Lazy feature loads use only that account's own existing library APIs. Reference 03/shared
  charcoal-periwinkle theme; recent five games, metric chart, disjoint five-v-five comparisons,
  coverage ring/averages, evidence links, personal bests/career targets, same-position teammate
  comparisons, optional manual outcomes, coach notes and clip-linked development goals.
  Browser notebook is explicitly experimental, per admin, with validated merge import/export;
  existing saved stats are not rewritten. Season PNG and selected-moment reel handoff work.
  No tracking, success rate or rating invented. Keeper minutes do not reuse outfield estimates;
  keeper save totals do not fabricate timed evidence. Frontend **728**, backend **780** each
  SQLite/PostgreSQL, lint/format/types/build/schema pass. Synthetic desktop 1440 and phone
  375 widths equal viewport; PNG downloaded and inspected. No real source account accessed.
  Hosted code build `a71458a` deployed through the gateway updater/provisioner to only
  the admin library; capture was idle before/after. Backend health/Nginx and served
  `index-DXngnT3I.js` verified. Only its web/backend/capture image IDs changed in the
  deployment snapshot; database, other hosted containers and owner local stack untouched.
  Later hosted rollouts retain existing update preferences; the lab stays admin-only.
  No CI workflow exists in this repository.

## Current change (2026-11-22)

- **Incremental Veo checks (spec 460), branch `codex/veo-incremental-check`.**
  Owner reported showing Veo rereads all 57 active matches. The earlier fix only
  resumed unfinished reads; automatic checks now reuse finished available matches,
  and Connect does the same. New/unavailable matches are read; account expiry follows
  the current listing. Explicit Refresh still updates existing metadata/highlights.
  No full footage download is triggered. Offline regression reproduced the four
  redundant requests for a saved match and now asserts zero while a new match reads
  normally. Backend 779 full tests on each SQLite/PostgreSQL plus 35 shared-link
  tests on each (including one added after full collection); frontend 700, lint,
  format/types/build/schema checks pass. Local frontend deployed and helper gracefully
  restarted while both sources idle; health/Nginx/served `index-CsLn4CZP.js` flag
  verified. No source account accessed. Hosted copies follow existing update settings.


- **Position-specific performance (spec 450), branch `codex/position-player-performance`.**
  Explicit profile position now selects the only hub/season/report role (supersedes
  mixed-role display). Removed On the pitch during and Attacks he was in. Milestones
  are career football totals/next targets. Keeper extras include games, penalty saves,
  clean sheets with consistent score/confirmed sole keeper, best saves and per-game
  averages. Outfield adds explicit penalties scored. Match/season My Player report
  rows use shared named stats and wrap source notes into exports. Crest overlaps and
  paints above photo. No real names/images committed or source account accessed.
  Frontend 699/typecheck/build pass; backend 773 each SQLite/PostgreSQL,
  lint/format/types/schema pass. Offline desktop/375px and both PNG report exports
  reviewed, including crest hit test. Frontend deployed locally; health/Nginx and
  served `index-c3A1azku.js` verified. Helper gracefully restarted while Hudl/Veo
  idle, both local status endpoints healthy. Backend container unchanged. Hosted
  installs follow existing update preferences.


- **Season performance story (spec 440), branch `codex/season-performance`.**
  Replaces monthly moment picks and prose with season totals, separate Goalkeeping
  and Outfield panels, shared-scale count bars and a save-percentage ring. Mixed-role
  seasons retain both. Outfield includes all twenty supported metrics, adding generic
  fouls and defensive/attacking 1v1 encounters (never assumed wins). Saved corrections,
  likely/overlap/estimate labels, missing-versus-zero and known-save sample coverage
  are preserved. New action aliases survive the normal parser/cache path; existing
  matches gain discarded labels on their next normal read. No source account accessed.
  Focused tests observed red/green; frontend 688/typecheck/build pass, desktop/375px
  synthetic browser review passed. Backend 772 each SQLite/PostgreSQL; lint,
  format, types and schema checks pass. Local frontend rebuilt/recreated; health,
  Nginx and served `index-BozlOEQQ.js` verified. Helper gracefully restarted with
  Hudl/Veo idle; both local status endpoints healthy. Backend container unchanged.
  Hosted installs follow their existing update settings.


- **Player football records (spec 430), branch `codex/player-record-stats`.**
  My Player replaces all four moment-volume records with position-specific totals.
  Outfield: goals scored, shots on target, chances, passes. Keeper: goals saved,
  goals conceded, shots faced, save percentage. Reuses match scorer/keeper edits
  and action sources; likely/overlap/estimated counts stay labelled. Missing data
  stays a dash. Shots faced/percentage use only the same matches with known saves;
  coverage appears on each card. Explicit profile position wins; unset position
  can use keeper evidence. Imported moment counts alone cannot supply action totals.
  Synthetic desktop/375px review passed; no source account accessed. Frontend 685,
  backend 771 each SQLite/PostgreSQL; lint/format/types/build/schema pass. Local
  frontend rebuilt/recreated; health/Nginx and served `index-DcpX92b7.js` verified.
  Hosted installs follow their existing update preferences.


- **Player label filter (spec 420), merged/pushed `main` at `2f81736`.** Owner reported
  Period Start as a player. Metadata-only audit: 230 nonempty cached matches,
  406 distinct categories. Eight administrative/set-piece labels passed shared
  detection: Period Start (64 matches), Analyst Clip (27), Analyst Clips (17),
  Analysts Focus (4), Coach Clip (3), Physical Focus (1), Yellow Set Piece (2),
  Bib Set Piece (1). Shared predicate now excludes these phrases and close variants,
  keeping actual names with Start/Period words valid. Tests observed red/green;
  all eight rejected by actual app predicate in local-cache audit. Frontend 680;
  backend 771 each SQLite/dedicated PostgreSQL; lint/format/types/build/schema pass.
  Frontend deployed locally; health/Nginx and served `index-CL2U0gIr.js` exclusion verified.

- **Action profile layout (spec 410), merged/pushed `main` at `89144c3`.** Owner
  chose mockup 2. Player identity/minutes sit beside horizontal contribution bars;
  zero counts remain clickable, missing stats/sources are in expandable detail.
  Match-wide scale makes counts comparable; no ratings. Desktop and 375px phone
  synthetic browser review complete; frontend 658/typecheck/build green.
  Worktree: `/Users/simon/.codex/worktrees/player-action-profile/Football Memories`.
  Isolated because another chat is changing keeper attribution in the shared checkout;
  that task’s new keeper test failed in the initial shared-tree full suite. It has
  since landed on main and is included in the final 658-test run. Backend 771 each
  SQLite/isolated PostgreSQL; lint/format/types/build/schema pass. Shared PostgreSQL
  first collided with another suite; dedicated temporary DB retry passed and was removed. Frontend deployed locally;
  health/Nginx and served `index-DYcDAzFm.js` profile markers verified.


- **Goalkeeper attribution (spec 400), merged to `main` at `70bbc49`.** Fixes
  outfield overlap, suppressed returning keepers across short periods, and first-name
  fallback for unresolved goals. Weighted pre-kick evidence, independent periods,
  repeated support, tie/empty-period abstention; ball-in timing and unnamed totals.
  Coventry reference now finds the owner's two keepers alternating over four periods,
  three conceded each (estimated), and retains the final likely save. Owner confirms
  the first name in the cached tags is correct. No real names/data committed.
  Manual local-cache audit: 229 matches across ages/seasons, 180 with spells;
  281/965 conceded goals remain unassigned rather than attributed without evidence.
  No real source account accessed; source cache/footage untouched. Verification: frontend 656, backend 771 each on SQLite/PostgreSQL;
  lint/format/types/build/schema pass. Deployed locally: frontend rebuilt/recreated;
  health/Nginx pass and served `index-DgovPcoI.js` verified. Backend/helper untouched.
  Hosted installs follow their update preferences. Separate managed worktree avoided
  concurrent stats edits.


- **Estimated player minutes (spec 380), merged to `main` at `0ee9991`.**
  Owner now requests automatic estimates: first-to-last approximate player touch per
  END HALF-delimited period, subtracting known keeper spells. Visible estimate/method/
  uncertainty; manual confirmed values still override, sorting uses the same value.
  Three presentation alternatives delivered in conversation; production stats layout
  unchanged pending a choice. Finishing is not a defined app metric; advise clip category
  rather than a quality score. Frontend 645; backend 771 on each database; lint/format/types/build/schema pass.
  Synthetic phone review complete. No real account accessed. Frontend rebuilt/deployed
  locally; health, Nginx and served `index-64qTA5xo.js` estimate text verified.

- **Individual player actions and full stats (spec 370), merged to `main` at `49b5820`.**
  Confirmed in the owner-selected Cardiff 9v9 Hudl UI: Passing is a label on player
  moments (181 source clips, 19 for one selected player), which the old HUDL_CODE-only
  parser discarded. Supported actions now survive parser/cache/library and take priority
  over overlapping team tags. All requested stats added, grouped/filterable; missing
  values stay unrecorded. Minutes played is explicitly confirmed, saved per match/player
  in preferences, clearable, sortable and backed up. Frontend 638; backend 771 each on
  SQLite/PostgreSQL; lint/format/types/build/schema all pass. Synthetic desktop/375px
  browser review complete. Deployed locally: backend/frontend rebuilt, helper restarted
  gracefully while Hudl/Veo idle. Live Cardiff read preserves 181 Passing-labelled source
  clips; all 13 outfield passing counts match their own labels. The 19-clip example is an
  inferred keeper and excluded from outfield rows. Health/Nginx/minutes API/served bundle
  checks pass (`index-BYrNKJL3.js`). Other matches gain labels on next normal open;
  hosted libraries retain their update preferences.

- **Player stats Goals and Offsides (spec 360), merged to `main` at `e27c6b7`.**
  Goals reuse saved/likely scorers from Goals and keepers, with a visible likely
  marker and reviewable clips. Untimed owner-added goals count without a seek
  button. Offsides use own-team tag overlap. Eight metrics laid out four across
  on desktop, two on phones. Frontend 631; backend 758 on each database; all checks
  green. Deployed locally 2026-11-21 by rebuilding/recreating only the frontend;
  health and Nginx checks passed, served `index-Cx_eLs_S.js` verified. Hosted libraries
  follow their existing update settings. Full verification in PROGRESS.

- **Match Player stats (spec 350), merged to `main` at `3aa8ee8`.** New tab after
  Goals and keepers, before Insights, on both connected match pages. Search/sort
  outfield players, compare six event counts, open clips inline and seek the video.
  Counts are explicitly team events overlapping a player's tags, never verified passes
  or shots made by that player. Missing own-team codes show a dash; Veo explains it
  supplies no named player stats. Goalkeeping spells excluded, with outfield activity
  retained after a keeper change. Owner approved the two tab-order test expectation
  updates in chat. Browser checked offline at desktop and in a 375px phone frame;
  no real account used. Verification recorded in PROGRESS. Deployed to the owner’s local
  app on 2026-11-21: frontend-only rebuild/recreate, health and Nginx checks passed;
  served bundle `index-DZGNBRir.js` verified to contain the new tab. Backend/helper
  left running. Hosted rollout follows existing update preferences; not manually moved.

## Current state (2026-11-20)

- **A stopped Veo read carries on where it left off (owner report 2026-11-20, lambro's new
  hosted account).** Each match read is saved to `.veo-account/progress.json`; the next
  Connect/Refresh skips those and reads the rest; Reset/Disconnect delete it. Unexpected
  errors now name type and line, and say how many matches were kept. Backend 758 (SQLite and
  PostgreSQL). **Deployed 2026-11-20:** five hosted libraries (lambro included) moved to
  `3246859` by the automatic round at about 18:12; fm-simon (automatic updates off) moved at
  20:55 through the gateway's own `updates._move`, health ok; the owner's Mac helper restarted
  under launchd at about 20:57. Lambro's own read finished at 17:37 (286 matches, 56 with
  video); the earlier failure's cause was lost when the container was recreated.

- **Veo clubs, crests and reels (owner report 2026-11-20), live on the owner's app.** Each Veo
  match names its own club (learnt from titles: NL, RCW, squad codes, spellings); a Wikipedia
  429 no longer blocks TheSportsDB crests (Redditch United now found); Veo reels keep picked
  team events. Hudl reels checked live: fine. Norton Lindsey, Olton Ravens, Kenilworth
  Sporting and Solihull Academy Blue still have no crest online that the app can see.

- **Hosted libraries can update themselves (spec 340, owner decision 013).** Settings >
  Update in a hosted library: version, Update now, "Update automatically"; title-bar "Update
  available" when not ticked. Gateway side (host updater, provisioner, portal API) is in the
  Gateway repo (GitHub football-memories-frontend), merged to its main 2026-11-20, deployed. All three hosted libraries
  moved to `9910cd9`. Not yet clicked through by a signed-in family.

- **Helper starts at login on a Mac (owner request 2026-11-20).** The installer writes the
  launchd login item `com.footballmemories.helper` (`scripts/mac/helper-login-item.sh`,
  RunAtLoad only, no KeepAlive so it never races the updater's in-place restart) and starts
  the helper through it; the old `nohup` start stays as the fallback. Already installed by
  hand on the owner's Mac (identical file) and running under launchd. **Windows:** the
  installer saves a Startup-folder shortcut (`scripts/windows/helper-login-item.ps1`) that
  opens the usual minimised helper window at sign-in. Checked as text only: no Windows or
  PowerShell here, so it has not run yet; first real check is the next Windows install.

- **Veo Connect reads at once, shared Veo match links, Veo in the Library (owner requests
  2026-11-20), on `main`.** Connect lists then reads the
  matches in one sign-in. Settings > Connections > Veo has "Shared match links" (add, delete),
  read signed out (check: a public match's JSON answers 200 in an empty browser). Library
  hero/Overview/count include shown Veo matches beside Hudl. Backend 725 (SQLite and
  PostgreSQL), frontend 606, lint/types/build pass; live Library checked against the running
  app. Owner decision [012](owner-decisions/012-hudl-tags-for-every-match.md) answered: with
  no age group saved, Hudl indexes every match's tags (same pacing). Backend 725 / frontend
  607 after it. Live on the owner's Mac 2026-11-20: helper restarted (now under launchd),
  frontend container rebuilt (the 8765 page had an 18 Nov build until then). The owner's
  first Connect read was interrupted by a helper restart (Veo list last saved 06:59); press
  Connect once to finish it. Not yet checked end to end against the real accounts.

- **Public security review (owner request 2026-11-20).** This repo's part merged into `main` at the
  owner's request (2026-11-20) from `codex/public-runtime-hardening`; Gateway work (merged to the Gateway repo main 2026-11-20) is in
  `~/Football Memories Gateway`. Spec 330 pins Python/Nginx runtime images, installs available
  system updates and removes pip after builds. New tests observed red first; backend 682 on
  SQLite and PostgreSQL, frontend 599, lint/format/types/build/schema drift all pass.
  Hosted images built from `4ac2237`, rescanned and import/Nginx-smoke checked with synthetic
  upstreams; report in the Gateway repo's `docs/security-review-2026-11-20.md` (code `b4bec39`).
  **Next:** an isolated integrated security pass or an owner verification exception before
  rollout of the hosted gateway. Installs pick up the new images on their next Update. The owner's local app/helper and all library volumes are
  untouched. Gateway audit found an MFA throttle reset, missing private cache protection,
  unbounded portal bodies, reflected validation inputs and unbounded Argon2 memory use;
  fixes tested offline. Further finding: quota checks do not cover backup/generated-file
  writes, so an approved user can threaten the shared disk. Internet ports 8443 and 6881 still open (unrelated services);
  IPv6 reachability remains unverified. Do not claim complete hardening. The old full-stack
  security runner and provisioner Docker test cannot safely run beside production.
  Owner approved moving the legacy tunnel fixture to its own subnet; **all four real-Caddy
  tests now pass**. Gateway ordinary suite 305, portal 61, provisioner 64 also pass. Remaining
  upstream advisories are documented; rebuilt web/egress have no high/critical scan entries.

- **"Hudl stopped part-way" on every Refresh (owner report 2026-11-19).** The hosted capture
  container hit its 1.5 GB cap, the kernel killed Chromium, and the helper kept reusing the dead
  browser. This repo: a disconnected browser now counts as no session (Refresh signs in once),
  and the generic error logs its type and line. Gateway: capture cap 2.5 GB plus `Init: true`.
  Needs the capture image rebuilt and the family's capture container recreated before it shows.

- **Owner's phase 2 check, first round of fixes (2026-11-19).** This repo: the hidden Hudl
  page is parked between jobs (it held 1.1 GB and pegged the capture container's CPU, then
  crashed, which is why Refresh failed); a crashed page counts as no session, so Refresh signs
  in once. Hosted crests come from one shared crest service (`app.crest_service`,
  `FM_CREST_SERVICE`), since a hosted backend has no internet. Dropdowns draw their own
  chevron in Chrome. Hosted header gains an account button. Gateway repo: families sign
  straight into their library; Docker Desktop groups each family's containers; crest service
  and crest-only filter; admin shows each family's container prefix. **Next:** Telegram admin
  (owner asked for: new-request alerts with Approve/Decline, reports, suspend/resume/restart),
  then the owner finishes the read-only check on https://localhost (Safari needs https).

- **Hosted gateway phase 2 built and tested offline** (owner sign-off 2026-11-19). This repo:
  sealed per-user Hudl/Veo store (`SealedFileStore`), one browser-launch rule (headless
  Playwright Chromium in a hosted library, never a visible window, through the egress proxy),
  hosted-only route refusals and storage limit in the helper, `backend/Dockerfile.capture`, and
  a hosted page that talks only to its own `/helper` after the user confirms permission.
  Gateway repo a503461: capture container per user, egress filter, permission gate,
  one-family-at-a-time slot, security pass 27/27. The owner's install is unchanged.
  **Next, owner only:** the read-only check in the gateway repo's docs/PHASE2_OWNER_CHECK.md.

- **Hosted gateway, phase 1 done; phase 3 built and switched off; phase 2 ready for sign-off.**
  Gateway repo at 391158a: security pass 24/24 (it found and fixed TLS failing for visits by
  IP address), registration limited to 5 per address per hour, Cloudflare Tunnel in
  `compose.tunnel.yaml` (off; owner steps in its docs/PHASE3_TUNNEL.md), CI actions on Node 24.
  This repo at 39096e4: a hosted copy shows one honest Hudl/Veo note instead of panels that
  could not work, and no Downloaded page. Phase 2 task files rewritten with what the code does
  today and the risks to weigh (many Hudl accounts from one home address; each user's own
  permission; the encryption limit): `todo/hosting/hosted-gateway/phase2-container-capture/`.
  **Needs the owner:** sign-off on phase 2's task files; a domain and tunnel token for phase 3;
  how to handle uploads over Cloudflare's 100 MB limit.

- **Hosted version for other users (owner request 2026-11-18, planning only):** plan pack
  [todo/hosting/hosted-gateway/](todo/hosting/hosted-gateway/README.md) and owner decision
  [011](owner-decisions/011-hosted-instances.md). A separate gateway (repo
  `MooreSi/football-memories-frontend`, still empty) with registration, admin approval, sign-in,
  admin page; one internal-network Docker stack per approved user; LAN first, Hudl/Veo in containers
  as a gated phase 2, Cloudflare Tunnel phase 3. Found while planning: the app's nginx forwards
  `/helper/` to the owner's desktop helper, so user instances need a hosted build without it
  (task 080). Owner answered QUESTIONS.md: all recommendations.
  Task 080 mostly done (c01338a): `FM_QUOTA_BYTES` quota on uploads/imports, `VITE_FM_HOSTED`
  build refuses every helper request, `FM_HOSTED=1` image uses `nginx.hosted.conf` (no helper
  route). Default install unchanged; live app not rebuilt or redeployed. Left in 080: hiding the
  remaining Hudl/Veo screens in a hosted build. Task 010 scaffolded in the gateway clone at
  `~/Football Memories Gateway` (3bc236e). Both pushed.
  Gateway tasks 020 (Caddy edge) and 030 (accounts and sign-in API) done at fc70e7b: 76 tests
  plus a real-Caddy test, every control broken on purpose and caught; stack run locally on
  127.0.0.1 and taken down again. Owner approved adding `cryptography`. Task 060 (portal
  screens after reference 01, served by the gateway) done at gateway 5e764c5; checked in the
  browser at desktop and 375 px; owner approved `qrcode`. Task 070 (admin page: approve, suspend, quotas, delete/erase,
  activity; screen at `/_portal/admin`) done at gateway aff5fca; disk and library figures show
  "not measured" until the provisioner exists. Task 040 (provisioner + our own Docker
  allow-list proxy; real-Docker tested) done at gateway e4f3976; this repo's 50b020f makes the
  backend image's /archive and /inbox writable in new volumes (owner's install unaffected; live
  app not rebuilt). Task 050 (forwarding to each user's own library; browser-checked end to
  end) done at gateway d96e78e. Owner: every hosted user enters their own Hudl and Veo
  credentials (phase 2). Next: 090 security pass, phase 2.

## Earlier (2026-11-17)

- **Next/Previous during Play Tagged (owner report 2026-11-17):** on the Hudl and Veo
  match pages, Next moment (button, N, media key) and Previous (B) during Play Tagged
  ended the queue, so the match just played on. They now move within the queue and
  playback carries on to the following moment; past either end of the queue they step
  through the moments shown as before. After a Next/Previous the queue waits until the
  video reaches that moment before counting its end (`arrived` in `lib/taggedPlayback.ts`),
  so a stale time from before the seek cannot skip it. Tests pass; not checked in a
  browser after the fix (the helper's stream had moved to another match the owner opened,
  and reopening ours would have taken it). Deployed 2026-11-17 at b7ed9e6 (frontend container only; health ok).
- **Match report scorers (owner request 2026-11-17, D-036):** the match report's Scorers
  line now names the likely scorer too, "(likely)" after a name none of whose goals is
  confirmed, and "N unknown" for goals with no scorer (`matchGoalLines`). Keepers stay
  confirmed only. Checked in the browser on a real 6-4 match: six goals, all likely.
  Deployed 2026-11-18 at 4c6c034 (frontend container only; health ok).
- **Season report top scorers and plays alongside (owner request 2026-11-17, D-036):**
  TOP SCORERS now counts the likely scorer for goals not yet confirmed; the note reads
  "N goals by a likely scorer, not yet confirmed · N goals with no scorer". "Plays
  alongside" removed from the season report (the player hub's "Plays alongside most"
  panel is untouched). On the real cache the top three have 23, 20 and 19
  goals; 62 likely, 8 with no scorer. Checked in the browser. Deployed 2026-11-17 at b7ed9e6 (frontend container only; health ok, live bundle has the new note; live app not opened).
- **"Two green boxes" on the moments grid (owner report 2026-11-17, open):** not
  reproduced. In Chromium, on the real match, the page only ever marks one tile
  (`aria-current`, `border-ok`) and only one is drawn; no duplicate moment ids in any of
  the 288 cached matches; no other CSS outlines a tile. Likely a stale repaint in the
  owner's browser (Chrome and Safari both run here). Needs: which browser, and the clicks
  that led to it. Same report on 2026-11-13 was put down to a focus ring.

## Earlier (2026-11-16)

- **Match page tabs (spec 320, owner request 2026-11-16, "implement option A" from
  layout mockups):** Hudl and Veo match pages now put a compact momentum timeline
  (playhead, click to watch) and a summary strip (possession, chances/attempts, on
  target, corners, who was in goal) under the video, then tabs Moments | Team stats |
  Goals and keepers | Insights, Moments first (`components/match/MatchSections`,
  `lib/matchSummary.ts`). Inactive panels stay mounted, hidden by CSS. Tag rail is
  sticky. Checked in the browser on a real Hudl and Veo match via the new
  `frontend-live-api` launch entry (`FM_API_PROXY`). Not built from the mockup: Team
  stats in two columns, goals in time order with a running score. Deployed 2026-11-16
  at 2b09b47 (frontend container only; health ok, live bundle has the tabs; live app
  not opened after the deploy).

- **Keepers from goal kicks, with changes (owner request 2026-11-16):** the old keeper
  guess needed a GOAL KEEPER code, which only 2 cached matches have. `lib/goals.ts` now
  votes at each of our goal kicks (the player whose tag is running at the kick, started
  up to 12 s before) and finds keeper spells, a change costing 2.5 votes, snapped to an
  END HALF tag. Saves and conceded go to whoever was in goal then (also for confirmed
  keepers when the owner did not name one). Panel shows "In goal to/from" when there was
  a change. On the cache: a keeper on 143 of 152 matches, a change on 47, 57 of 62 at an
  END HALF. Deployed 2026-11-16 at 6855cbe (frontend container only; health ok, live
  bundle has the keeper spells; live app not opened). Open for the owner: whether the
  spells match games they remember.

- **Likely scorer and panels removed (owner request 2026-11-16):** the owner said
  scorers were wrong. `lib/goals.ts` now picks the player whose touch is nearest the
  ball going in (goal tag end minus 5 s; touch = player tag end minus a third, at most
  5 s), measured on the cached tags (see interface domain notes); most overlap is the
  fallback. "How the score went" (GameStateStrip) and Match recap removed from both
  match pages, with `lib/matchRecap.ts` and `matchSpan`; season game-state lines kept.
  Deployed 2026-11-16 at b0696ee (frontend container only; health ok, live bundle has
  neither panel; live app not opened). Open for the owner: whether the new guess
  matches goals they know.

- **Goals and keepers (spec 270, owner requests 2026-11-16, owner chose "Both"):**
  Hudl and Veo name no scorer or keeper (checked on the real caches: Hudl goal tags are
  team-only with 3 to 4 player tags overlapping each goal; no save tag; Veo has goal
  times by side, no names, no on-target). `lib/goals.ts` guesses ("Likely"): the player
  tag overlapping a Hudl goal most, the player most often tagged with our GOAL KEEPER
  codes, saves = opposition ON TARGET tags not overlapping their goal. A Goals and
  keepers panel on the Hudl and Veo match pages lists goals (seek), keepers, saves,
  conceded; Edit lets the owner set scorers, add/remove goals, keepers, saves, keeper
  beaten. Saved as `preferences` `goals:<match id>` JSON (`GET/PUT /api/goals`). Match
  report: Scorers and Keeper lines; season report: TOP SCORERS (top three) and goals
  still unconfirmed. Reports use confirmed names only. Open for the owner: whether the
  "most overlap" guess matches a game they know.
- **Full app check (owner request 2026-11-16):** every gate green before and after;
  no file over 800 lines (largest `hudl_browser/_account.py`, 773). Three defects fixed,
  each test watched red first: one Veo match's odd report/details shape (a list where an
  object was expected) raised AttributeError and stopped the whole Refresh (`_parse`
  now reads it as missing); `media_range` accepted a Veo answer longer than the range
  asked for, which the range relay would forward past its promised length (now
  refused); a crest slower than 4 s stayed uncropped for the whole visit (`crestTrim`
  now keeps a late crop for the next badge). Verified on a clean copy of main with only
  these changes, because other sessions had uncommitted work in this checkout. The live
  app was not opened (it can start a Hudl/Veo refresh).

- **Match recap (spec 310, owner request 2026-11-16):** `lib/matchRecap.ts` (pure
  templates) and `components/match/MatchRecap` after How the score went on both match
  pages, with Copy. Half-time: Veo's first period end, Hudl's first END HALF tag. Only
  confirmed scorers/keepers are written. No local LLM (owner decision not asked).
  Deployed 2026-11-16 at 1f35c4a (frontend container only; health ok, live bundle has
  Match recap; live app not opened).

- **Reel presets (spec 300, owner request 2026-11-16):** `lib/reelPresets.ts` and
  `components/match/QuickReels` above the moments panel on both match pages; buttons
  navigate to `/clips/reel/new` with the same state Make Highlight Reel sends. Hidden
  for unsynced Hudl tags or a Veo match without video, and until the primary player
  and goal entries load. Pre/post-roll per reel not built: it would change what the
  helper fetches from Hudl (`/safe-change`). Deployed 2026-11-16 at 55a52eb (frontend
  container only; health ok, live bundle has Quick reels; live app not opened).

- **Game-state timeline (spec 290, owner request 2026-11-16):** `lib/gameState.ts`
  from spec 270's goals and `matchScore`; `components/match/GameStateStrip` under Goals
  and keepers on both match pages; season report lines via `seasonGameLines`. A match
  counts only when every goal has a time and they add up to the score (owner-added
  goals have no time, so such a match says why instead). Span: Veo periods, else first
  to last Hudl tag, else the video.
- **Deployed 2026-11-16** (owner yes): `docker compose up -d --build` at f93f8a0;
  health ok, live bundle has the expiry panel and the game-state strip. No migration
  change; helper not restarted (unchanged). The live app was not opened in a browser
  (it can start a Hudl/Veo refresh); the owner has not looked yet.

- **Veo expiry queue (spec 280, owner request 2026-11-16):** Downloaded page panel
  "Before Veo deletes them" (`components/downloads/VeoExpiryPanel`,
  `lib/veoExpiryQueue.ts`): Veo matches with video and no full-match download,
  soonest first, days left estimated as match date + 12 months (picker: 6; owner
  decision 010: owner confirmed 12), Veo's `expires-soon` counts as 30 days or less; expired
  matches never saved in a collapsed list. Frontend only, no Veo request.
  Deployed with spec 290 (see that entry). Research report behind
  it: `reports/Football Memories improvement ideas.md` (notes in `research_notes/`).

- **Veo Opponents and fuller crests (owner requests 2026-11-15):** with Hudl hidden and
  Veo shown, `/opponents` is built from Veo matches, one club at a time (Club picker,
  `?club=` from the Library match profile's new Opponents link; Season or all seasons).
  Opening an opponent shows Veo's stats summed over the meetings that have them (Shots
  on goal, Corners, Fouls, Free kicks, Penalties) and links each game to `/veo/<id>`.
  Across all seasons the Club list is long: older Veo titles put the home side first
  ("Redditch United vs RCW"), so opponents appear as clubs. Owner answer 2026-11-16:
  leave as is (first-named side stays the club). Crests: `lib/crestTrim.ts` crops a crest file's plain margin in the browser
  (canvas; the file is never changed); a round crest then fills 94% of the badge, a
  square or shield one 74%; the report uses the same crop. No canvas (the test DOM)
  shows the crest as before; a load that never finishes falls back after 4 s.
- **Reports and crests (owner request 2026-11-15):** a Veo match report shows Veo's
  team stats (attempts as "Shots on goal", Penalties always, 0 - 0 when none); the
  season card lists games Won / Drawn / Lost with scores (`Report.results`). Crests
  fill their circle (clipped). Crest lookup (`team_logos.py`): lower-case words are
  capitalised for the page title ("Bolehall swifts"), a football club page's PNG/SVG
  counts as its crest whatever its file name (short description says football club;
  JPEG never), and a search hit may add Athletic/Juniors/Youth/JFC. `resolveClub` no
  longer turns "AFC Birmingham" into Birmingham City. Wikipedia rate-limits after
  about a dozen quick requests (429); the 1 s pacing and pause handle it.
  **TheSportsDB added (owner: "Yes, add it"):** free public team search (key 123)
  after the Wikipedia search, before Commons; football teams only, named as the club,
  badge only from r2.thesportsdb.com (`/small`, PNG). Asked at most every 2.5 s (free
  tier: 30 a minute). Two older crest tests' fakes now answer its URL with "no team"
  (owner-approved test change). `_same_club` now ignores generic words ("club") on
  both sides, so "Racing Club Warwick" can match at all. Live: found Racing Club
  Warwick, Tamworth, Solihull Moors, Coleshill Town; not Bolehall Swifts (Wikipedia
  has it). The Veo account crest (Racing Club Warwick's) had been saved as Norton
  Lindsay's by `useVeoClubCrest`. Owner answer 2026-11-16: move it to Racing Club
  Warwick and stop saving it under the Veo team name. Done: hook removed and deployed;
  Norton Lindsay's copy moved from TeamLogos to the macOS Trash ("Norton Lindsay crest
  (Veo account copy) 8d0b5ec6.png"). Racing Club Warwick's file held the identical
  image, as does `.veo-account/crest.png`. Norton Lindsay now has no saved crest, so
  the app looks one up online or shows initials; the owner can upload one in Settings.

- **Veo season report split by club (owner request 2026-11-15):** the Veo account
  films Norton Lindsay ("NL ...") and Racing Club Warwick ("RCW ...", "Racing ...").
  `lib/veoClubs.ts` gives each Veo match the club its title names first (full name,
  initials or first word, against the Veo team setting and Veo's `team` values);
  Veo's `team` field is only a fallback because it is sometimes wrong. The Veo-only
  season report has a Club picker (Veo team first); the Veo match report and the
  Veo library cards name the match's own club. `lib/useVeoClub.ts` (`useVeoClubOf`)
  does the same for the Veo match pages (label, team stats, momentum, record against,
  now only that club's matches), reels, Downloaded and the Library hero/latest/profile.
  It names a club only from the known list and only when the Veo team is set
  (unset keeps the raw title / "Us", as tests require).
- **Recent moments for Veo (owner request 2026-11-15):** the Library's Recent moments
  panel lists Veo's team events first (match order), then the highlights; the count
  and "See all" include both (`HudlLatestPanel` `teamMoments`).

- **New matches appear on their own (owner request 2026-11-15):** `useVeoAutoCheck`
  (AppShell) refreshes Veo when its list is over 6 h old, on opening the app and on
  coming back to the tab (`useReturns`), never on `/veo/` or `/clips`.
  `useHudlAutoCheck` now also re-checks on coming back (list re-read only; the tag
  sweep stays once per load). Each browser waits 6 h after a try
  (`fm.{veo,hudl}.autocheck.tried`). Decision 003 records it; owner answer 2026-11-16:
  keep 6 hours. Veo highlights panel also has Highlights / Veo events filters.

- **Reel score and team stats cards, Hudl team stats (owner request 2026-11-15):**
  reel studio "Show the score" (match card shows the score instead of VS; Veo score,
  Hudl `matchScore`) and an opt-in "Team stats card" after each match's moments,
  on screen for 4 to 20 s (`statsCard`, `recordCard(..., seconds)`). Helper: Hudl
  batch items take `stats_card_id`, Veo reels `stats_card`. Hudl match page has a
  Team stats panel (`lib/hudlTeamStats.ts` from `teamProfile`; possession % first);
  the table is shared (`TeamStatsTable`).

- **Veo clips by range, multi-type rails, Veo head to head (owner request 2026-11-15):**
  Veo reels and moment downloads read only the parts they need through a private
  local relay (`veo/_ranges.py`), no full download. Hudl and Veo match rails pick
  several moment types at once (`aria-pressed`; reel name joins them). The Veo
  match's Match insights shows the record against this opponent from the Veo
  library (`HeadToHeadRecord`, shared with Hudl).

- **Veo team events as moments, momentum (owner request 2026-11-15):** the Veo match
  rail has a "Team events" group (OUR/OPPONENT goal, shot, corner, foul...) that can
  be played, ticked, downloaded and made into reels; Match insights has the Hudl
  momentum chart from Veo's team events. No possession (Veo gives none).

- **Veo team data fixes, totals and club crest (owner request 2026-11-15):** the first
  real Refresh found Veo writes sides as "Own"/"Opponent" (sides were all None; fixed,
  cache version `team_data.v = 2` re-reads once). Per-side totals from
  `teams/{Own,Opponent}/stats` (missed shots, penalties, out of play) on the Team
  stats table. Club crest from the match report saved once by the helper
  (`/veo/club`, `/veo/crest`); no longer given to any club by the app (owner answer
  2026-11-16); Veo's report names are unreliable (see connectors). Maps and POSTs: Veo refused them all on this account (403/404/422, no
  positions), so none were built or enabled; see decision 009 follow-up.

- **All matches Hudl cards (owner request 2026-11-15):** crests and score pill at the
  bottom right of each thumbnail (`ScoreBadge` in `HudlLibrary.tsx`, `matchScore`;
  hidden with no score) and the date as "15th November 2026" (`ordinalDate` in
  `lib/hudlFixture.ts`). LibraryPage passes the club to `HudlLibrary`.

- **Release 0.4 (owner request 2026-11-14):** versions 0.4.0, CHANGELOG 0.4, README
  with Veo, drawing board, My Player and import; new screenshots `reel.png`,
  `veo-match.png`, `connections.png`, `import.png`, refreshed `library.png` and
  `player.png`, all from made-up data (player "Sam Example", club Riverside,
  drawn pitches, invented crests) served by a throwaway stand-in helper and a
  separate throwaway database, both removed afterwards. Also: Veo Disconnect
  whenever an account is saved; Connections shows the home-network address
  (helper `GET /network`, `connectors/lan_address.py`: Bonjour name and private
  IPv4, read locally); the Your player card shows the club crest; My Player
  totals are centred, larger numbers.

- **Veo-only Library and Clips, Teams panel, Import upload (owner requests 2026-11-14):**
  with Show Hudl off and Show Veo on, the Library's hero (poster), latest match
  (Veo's score), overview, match profile and recent moments use Veo matches
  (`lib/veoAsHudl.ts`, links to `/veo/:id`); Clips opens the newest Veo match.
  My Player: Teams is narrow and the four totals are a 2 x 2 grid (Teams spans
  both when editing). Import: drop a video on the box or Choose a video; `PUT
  /api/imports/upload` streams it to `<import folder>/uploaded/` (`.part`, then
  `publish_new` with a ` (2)` name if taken; never replaces). Docker mounts only
  that subfolder writable; `/inbox` stays read-only. nginx streams it (50 GB cap).
  Browser-checked on the live app except a real upload (no file was written into
  the owner's import folder).

- **Veo team stats (owner yes 2026-11-14, decision 009):** `_client` now also allows
  `GET /api/mes/v2/<uuid>/match-events` (nothing else under `/api/mes/`). Refresh
  reads the match report and events once per match with video and keeps
  `team_data` (own v opponent stats, events with side and time; no names or
  addresses) in library.json, reused on later refreshes; a 400/403/404/405 keeps
  None and is not asked again, 401/429/5xx stop the refresh. The Veo match page
  shows a Team stats panel (us v opponent table, goals/shots timeline that seeks).
  Not yet run on the real account: the next Refresh makes 2 extra GETs per match.
  The event `team` value was not recorded by the check; the parser accepts
  own/opponent or home/away (matched to `own_side`); if Veo uses something else,
  sides show as unknown and the page counts nothing for them.

- **Veo data check run (decision 009, owner yes 2026-11-14):** match report and
  `/api/mes/v2/<id>/match-events` answer on the owner's account with team-sided
  events (101 on the match checked: shots, goals, corners, fouls, free kicks,
  throw-ins...) and own-v-opponent key stats; paid analytics and AI insights 403.
  Nothing uses them yet; next would be allowing those GETs in `_client` and
  showing team-split stats on the Veo match page.

- **Veo tick boxes and Veo data research (owner request 2026-11-13):** Veo
  highlights have tick boxes; Play Tagged, Download selected moments (helper action
  `moments`: one video or ZIP, cut from the saved match) and the reel use them.
  Research (public web-app code only, nothing sent to the account) found many
  unused Veo read paths, analytics included; listed with a proposed one-off
  read-only check in owner decision 009, waiting on the owner.

- **Connections switches, Veo reels, crest search (owner requests 2026-11-13):**
  Show Hudl/Show Veo now only choose the libraries listed (Library and Clips),
  never the Connections boxes. Veo match page has Make highlight reel → Reel
  Studio (`source: "veo"`, Veo team name on cards; note when unset). Helper
  `veo/_reels.py` cuts from the saved full match, downloading it first if needed.
  Crests: Wikipedia search + Commons fallbacks (`team_logos.py`), and Club crests
  has "Find the crest on the web" plus paste/drop. Decision 008 partly answered.
  Not tried on the real account; the owner's Veo team name is not set yet.

- **Veo playback fix and Veo match page (owner report 2026-11-13):** the owner
  uses Safari at `http://192.168.0.53:8765`; Veo's stream and poster links were
  left as 127.0.0.1:8766 (Hudl's are rewritten to `/helper`), so the helper refused
  them. Fixed in `api/veo.ts`. Veo cards now open `/veo/:id`, a full match page
  like Hudl's (`VeoMatchFullPage`, stats from `lib/veoInsights`, both teams). Helper
  restarted twice during the check (ends in-memory Hudl/Veo sessions; it now runs
  the unchanged code). Frontend redeployed. Not yet tried by the owner on a real
  Veo match. Posters: the owner's last Refresh (21:15) predates the poster code,
  so Refresh matches once.

- **Owner follow-ups after the first Veo download (2026-11-13):** Veo posters saved
  on Refresh; crests ignore side codes/colours and the owner can add crests
  (Settings > Connections > Club crests; decision 008 open on other sources);
  Veo downloads named `<match> <date>.mp4`; Veo matches open in the Clip explorer;
  team name per source (`/api/settings/home-teams`, used by `useHomeClub` for Hudl
  and `useVeoTeam`); My Player restacked (Tagged with removed), Recent matches 20
  bars in a blue gradient; Connections: Import card gone, Connect, Veo Disconnect.
  Deployed (Docker rebuilt, helper restarted). Owner to set the Veo team name and
  run Refresh matches for posters.
  Then **Records and streaks** on My Player (`lib/records.ts`, `RecordsPanel`): from
  moments per match only (imported + Hudl); a run is matches at or above the average.
  Then **Season story** (`lib/seasonStory.ts`, `SeasonStory`): July-June seasons,
  the player's first name (no guessed pronouns), match of the month per month.
  Then **Milestones** (`lib/milestones.ts`, `MilestonesTimeline`): badges along a
  scrolling timeline; Hudl age groups and team goals overlapping the player's moments
  (`involvement`). A new best counts only after five matches.
  Then **Top 5 moments** (`TopMoments`, `lib/hubExtras.rankHudlMoments`: overlap with
  GOAL > SAVE > CHANCE/SHOT > opposition shot; Make a reel goes to the Reel Studio, or
  `/api/reels` for imported favourites) and **Opponent map** (`OpponentMap`).

- **Spec 260, Veo Library and playback ([260](todo/football-memories/260-veo-library-and-playback.md)):**
  task 1 built: "Connected Veo" section under All matches (`components/veo/VeoLibrary`,
  same filters, expiry badge, hidden by Show Veo off via `lib/connections`) and
  `/veo/:id` (`pages/VeoMatchPage`: score, halves, highlights). Veo items stay
  out of Hudl's `/library` on purpose. **Tasks 2-3 built:** Watch (helper
  `/veo/stream/<token>`, Range 206, video address in memory only; after a helper
  restart Watch signs in once and reads that match's `/videos/`) and Download full
  match (`.part`, length + ffprobe, hard link, never overwrite, download index).
  The CDN is public (owner-approved check). Not yet tried by the owner. Task 4
  (highlight clips) todo; decision 007 open. Owner's Veo cache is empty until they
  select Refresh matches.

- **Veo Test fix (owner report 2026-11-13):** first real Test said "Veo signed
  this session out". Two owner-approved read-only sign-in checks showed Veo
  authorizes reads with a token header from localStorage, not a cookie.
  `_client` now copies the page's own `authorization` header (`signed_in_header`,
  `token_http`), in memory only, and still waits for the form and the app
  (`confirm_signed_in` names a 401). Helper restarted. **Owner's Test passed
  2026-11-13:** 284 matches in 3 clubs, 56 with video, 228 expired, 7 expiring.
  Refresh matches not yet run.

- **Next-moment fix (owner report 2026-11-13):** Next/Previous now step from the
  outlined moment in match order (ties keep list order), not from the video's
  play position; the clicked tile releases focus so its focus ring is not taken
  for a second highlight; the list scrolls to keep the new moment in view.

- **Veo connection, phase 1 (spec 250, D-035, owner decision 006 answered):**
  helper routes `/veo/account|credentials|action|library`, package
  `backend/app/connectors/veo/` (`_client` is the only module that talks to Veo:
  GET-only `/api/app/` JSON, 1 s apart, no retries, one sign-in attempt),
  Keychain item / Credential Manager target per service, cache
  `.veo-account/library.json`. Settings > Connections: Veo card and Show Hudl /
  Show Veo switches (localStorage). What Veo exposes is in
  `docs/system/domains/connectors/README.md`. **Phase 2 open:** Veo matches in
  Library and match page, streaming and MP4 download. Real-account check: the
  owner saves the account in Settings and selects Test, then Refresh.

- **Owner follow-ups 2026-11-13:** drawing Move tool (V); next/previous tagged
  moment (buttons, N/B, media keys via `navigator.mediaSession`) within the codes
  shown; green outline now an inset ring (the list's scroll box clipped the old
  outer shadow) and follows the clicked moment too; Continue watching capped at 3.
  **Veo connection not built**: waiting on owner decision 006 (permission,
  credentials, scope); nothing signed in to Veo. Browser-checked via the stand-in.
  Deployed 2026-11-13 (Docker rebuilt, health ok; helper unchanged, not restarted).

- **Drawing board (spec 240, D-034, owner request 2026-11-13):** toolbar under the
  match video (above Match insights): Draw on video, Note / draw on a moment,
  Screenshot, saved drawings. Ten tools, colours, widths, undo/redo, eraser, keys.
  Saved as vector data with the note in `preferences` (moment id, or
  `frame:<match>:<seconds>`); PNG export of frame + drawing. Browser-checked
  through the synthetic stand-in helper and a scratch SQLite backend (no Hudl,
  no owner data): every tool drawn, saved, reloaded, PNG made from the poster and
  from a playing frame, phone width. Deployed 2026-11-13 (Docker rebuilt;
  helper not restarted, unchanged). Not tried on a real Hudl stream.

- **Release 0.3 (2026-11-13):** versions 0.3.0, CHANGELOG, README rewritten for
  the new features, ten screenshots in `docs/screenshots/` taken from made-up
  data (club Riverside, fictional opponents, synthetic players and tags, a drawn
  pitch) served by a throwaway stand-in helper; nothing real or from Hudl.
  Fixed while shooting: "END HALF" and other plain-word codes were shown as names.

- **Opponents by team, report crests (owner request 2026-11-13, D-033):**
  Opponents, head-to-head and the season report follow one team across seasons
  (U11 2026/27 = U10 2025/26 = U9 2024/25), each club split by season with every
  game; match report shows both crests; season report values wrap instead of
  overlapping; header nav labels no longer wrap at 1280px. Browser-checked on
  real cached data through the stand-in helper (no Hudl).

- **Match insights (spec 230, branch `spec-230-match-insights`, owner request
  2026-11-13):** duplicate tag spellings merged where the helper serves its
  cache; possession % from tag lengths (match page, Library); momentum timeline
  (click to seek); player hub "On the pitch during", football journey by season,
  "Plays alongside most", attacks he was in; head-to-head on the match page and
  `/opponents`; "Attacks ending in a chance" as playable/downloadable clips;
  notes and arrows over the video; `/report/match/:id` and `/report/season`
  (PNG or print to PDF); alerts bell; Continue watching. See
  [230-match-insights.md](todo/football-memories/230-match-insights.md).
  **Deployed 2026-11-13:** merged to `main` (0b0947e), Docker frontend and
  backend rebuilt, helper restarted on the new code (PID 38416, log
  `data/helper.log`; that ended its in-memory Hudl session). Live helper serves
  320 codes, none with "&amp;" or lower case; download folder still
  `/Volumes/SMB_Share/Football`. Not tried over a real stream: notes editor,
  momentum seek. Owner question [005](owner-decisions/005-insight-choices.md)
  answered (D-032): radar possession uses time, weights kept, names shown as
  "Chris Demo"; the owner's hub (id 4) renamed from upper case to match.

## Earlier state (2026-11-11)

- **Opponents and crests (2026-11-13, owner report):** Chelsea, Manchester City,
  "The Hammers", "Bluebirds" and others showed initials. Two causes: Wikipedia
  answered 429 when a page asked for many crests at once and the app kept that
  as "no crest" for 24 hours; and Hudl titles use nicknames and short forms the
  app did not know. `frontend/src/lib/clubs.ts` resolves nicknames, short forms
  and cut-off names to full clubs; `fixtureParts(title, ourClub)` also reads
  "Arsenal v Aston Villa" and "Barcelona 3-0 Aston Villa". The backend now
  paces Wikipedia (1s), honours Retry-After and only keeps a real "no crest" for
  a day; the badge retries after 30s and 90s. Docker app rebuilt and checked:
  every match on the player timeline shows the right crest. **CFT Slovakia has
  no public club page or crest**, so it keeps initials; a way for the owner to
  pick a crest for such clubs would be a separate feature.

- **Saving to a NAS share (2026-11-12, owner report):** the owner's download
  folder is `/Volumes/SMB_Share/Football` (SMB, TrueNAS). Reel Studio stopped with
  `OSError in hudl_exports.py:293`: the share has no hard links (`ENOTSUP`). All
  publishes now use `app.services.publish.publish_new` (no-replace fallback);
  export + reel verified on the real share in a throwaway folder. Helper
  restarted on the new code. The media library now copies videos on a drive
  without hard links (symlinks and clones were probed on the share and do not
  help) and the panel says how much: the owner's library was built on the NAS,
  17 reels, 6.2 GB of copies. Plex (LXC 102 on the owner's Proxmox,
  192.168.3.225; Football mounted read-only at `/mnt/Football`) showed Hudl-style
  titles and two junk collections from the "/" in "2026/27": copies now carry the
  app's details (rewritten in place, frames identical) and seasons are written
  2026-27 in file tags. The owner must refresh metadata in Plex. The two
  12 July reels got today's date in Plex; files now also carry a binary
  recording time and copies are file-dated on the match day; the owner
  confirmed after a refresh that Plex now orders them correctly.

- **"The batch stopped" now names its cause (2026-11-12, owner report):** a Reel
  Studio batch failed with the generic message right after the helper was
  restarted for spec 220. An offline replay (real titles, cached moments and
  cards, fake stream) completed both reel modes with correct tags, so the
  failure was in the live Hudl part; its exception was swallowed. Unexpected
  batch/export errors now show and log the exception type and file:line, never
  the message (it can hold signed URLs; tested with a planted fake). **Cause of
  the owner's failure still unknown:** needs the owner to retry. The 17 reels
  that were in `data/inbox/reels` are in the Mac's Trash (seen through Finder),
  moved there by the owner (confirmed 2026-11-12), not by the app.

- **Media player details (spec 220, 2026-11-12, owner request):** new downloads
  carry MP4 tags (title, date, description, player...), and an opt-in
  Downloaded > Media library switch builds `<download folder>/Media library/`:
  one folder per download with a hard link to the video, `poster.jpg` and a
  `.nfo`, using the club/player/score the page sends. Delete takes that folder
  to the Trash too. Off by default ([owner decision 004](owner-decisions/004-media-library.md)).
  Helper restarted on the new code (ended its in-memory Hudl session) and the
  Docker frontend rebuilt. **Not yet tried in Plex/Jellyfin and not turned on
  in the owner's real folder;** verified on real data in a scratch folder.
  New downloads' embedded tags not observed on a real Hudl download.

- **Downloaded > Delete (2026-11-12, owner request):** a third button under
  Save opens a confirmation, then `POST /downloads/remove` moves that one file
  to the Trash (Recycle Bin on Windows) via the same never-replace rename as
  Settings > Storage. Only a file the download index lists can be removed;
  a full match's `.tags.csv` stays. Play/Save/Delete are 24px with 3px gaps so
  the stack stays 78px and rows keep their height (browser-measured on dev
  data, dialog opened and cancelled only). Deployed with spec 220.

- **Match scores (spec 210, owner request 2026-11-12):** score from goal tags,
  or the owner's correction (match page editor, `/api/scores`, kept in
  `preferences` so backups still restore). Hero pill, Latest panel and match
  page. See [210-match-scores.md](todo/football-memories/210-match-scores.md).

- **Update now restarts and reloads (2026-11-12, owner request):** after a
  successful update the helper restarts (Mac in place; Windows in a new console
  window that waits for port 8766) and Settings reloads the page once
  `/update/version` shows the new commit and `/api/health` answers. Tests with
  fakes and real sockets; **not run as a real update** (this checkout is on
  latest) and not on Windows.

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
  panel (U11 Stoke, Pat Example moments). **Not live-verified:** minimized
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

Public-security release comes first: see the Gateway report. Finish the isolated integration
check or obtain an explicit owner exception before deployment, address cumulative quota
enforcement, resolve public ports 8443/6881, and verify IPv6 firewall exposure.

0. **Spec 230:** with the owner, try a note and a momentum click on a real
   stream.
1. **Phase 4 leftovers:** calendar and card-gallery views of the timeline;
   "season highlights" shortcut once playlists exist.
2. Per-clip timing override (brief section 9). (Playback history on the server: done in spec 230 for Hudl matches; not for imported matches.)
3. Clip Explorer leftovers: notes on imported moments (Hudl moments have them, spec 230) and custom local tags; crossfade
   transitions. Single-clip export now uses the reel renderer with one item.
4. Playwright e2e for import → play → filter → playlist.
5. Phase 5/6: persistent jobs, clip export and highlight reels with ffmpeg,
   backup/restore, storage health.

## Blocked on / waiting for the owner

- Public hardening deployment: safe full-stack security validation needs a separate Docker
  environment (the populated production stack must not be torn down), or an owner exception
  to that pre-release check. Port 8443/6881 intent still pending. Existing hosted libraries
  continue using their old image IDs; rebuilding tags alone does not patch running services.

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
