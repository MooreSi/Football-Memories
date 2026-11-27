# Video analytics

Spec730 adds an admin-only execution selector in Advanced. Local remains default;
Remote runs the whole job on the prepared MacBook, and Split overlaps local
camera reconstruction with remote appearance preparation after local tracking.
The mini alone consumes the queue. Readiness expires after120s, and new admin
requests snapshot the selected mode; ordinary users stay local. SSH profiles,
keys and executable paths stay outside the gateway mount. Source/code/model/hash
checks precede publication; remote failure does not silently fall back. This is
stage distribution, not independent video chunks or a claimed speed improvement.
Split also sends pitch rebuilds (camera-tracking children) of a finished analysis to the
MacBook as whole jobs, like player matching (owner request, 26 Nov 2026).

[Two Mac performance investigation](two-mac-performance.md) (26 November 2026):
current native M4 worker is single-consumer; a second host requires job scheduling
and result transfer, not just a shared runtime mount. Whole-job offload/batch work
is the first candidate. Owner confirms M3 MacBook Pro/18 GB and Thunderbolt;
second-host performance and cable throughput are unmeasured. Follow-up verifies
active Thunderbolt networking, zero-loss ping and reachable existing SSH service;
40 Gb/s is the reported link rate, not measured file-transfer throughput.

The private [worker repository](https://github.com/MooreSi/Football-Video-Analytics)
owns models, local bounded inference and append-only artifacts. The app owns Video
Lab; the gateway owns full-admin/completed-MFA/CSRF/owner guards and review records.
Read specs550–590 under `docs/todo/football-memories/` and worker HANDOFF before work.

Owner priority (24 November 2026): identify players and their correct teams first;
passing/tackling stats have little value without trustworthy attribution. Role,
team, jersey evidence and individual identity are distinct. Similar clothes or a
track ID do not establish a person's identity. No face/voice/gait identification.

Current opt-in worker identification uses source-bound multi-view kit/role
exemplars, timestamped pitch polygons and track consistency; it does not newly
attribute football actions. Referee/goalkeeper/non-player roles need explicit
examples. Do not promote unreviewed model results or Veo tags to confirmed facts.

Learned on real footage: indoor pale-front/grey-back kits defeat one colour;
540p distant torso crops can contain only a few usable pixels. Small-sided pitch
boundaries can be yellow even when an outer white line is visible. Pitch geometry
must follow the actual game/camera; do not interpret one lower line as a complete
pitch. Calibrated appearance and same-match audits are experimental, not evidence
of held-out-match accuracy. Always report precision AND coverage, role confusion,
sideline leakage and unresolved labels. Explicitly distinguish assistant visual
audits from independent human labels, and development frames from withheld ones.

Preserve original source and completed results. New calibrations/runs use new
outputs and verify source/inherited hashes. Footage, roster data, profiles and
weights remain outside Git. No worker public port, hidden model download or new
source account flow. App/gateway deployment is a separate operation.

Full-resolution trial still only55% outfield kit coverage; role accuracy and
sideline errors must be reported separately. A correct kit on an assigned player
can coexist with missed players, wrong-role keepers, sideline team leaks and
unstable IDs. Staff examples are useful but do not replace a learned role model.
Referees can change to a bib mid-recording; opposite keepers need independent kit
and team evidence. Do not credit a third kit or a nearby goal with a club identity.

A fresh output directory initially contains inherited parent files. Wait for the
CLI/owning job to complete before evaluating or serving it; mere file existence
can score the parent's labels as though the new stage had finished. Keep audit
labels frozen before inspecting predictions and source-bound to the sample.

CLI result folders are not automatically visible in Video Lab: it reads the
runtime `samples.json` catalogue and owner-bound completed `jobs/<id>/result`.
The two identification trials were explicitly published there on24 November,
with full copied-file hashes checked, after verifying the existing approved admin
owner from gateway metadata. Do not create a session or bypass MFA to register
local results; normal API access still requires the signed-in full admin. Spec620 replaces the run buttons with a match-named dropdown.


Spec620: pitch keyframes can include extra normalised image/pitch landmarks and
fit_corner_indices, so unseen corners do not bias a fit. Keep at least four
non-collinear correspondences; corrections follow interpolated camera motion and
blend only inside one camera segment. Sparse CPU flow is measured faster than
ORB; ORB is recovery, and failed steps break propagation. This is not a learned
pitch segmentation network. CoreML ALL allows OS-scheduled CPU/GPU/ANE detection;
SportsReID uses MPS. Do not claim hardware placement from allowed units alone.

New player descriptors retain separate full neural views plus torso colour. Direct
human labels refit a per-source exemplar classifier immediately; mixed view votes
abstain and suggestions never become teachers. Gateway streams per-track JSONL
examples (bounded64MB,200KB/line), retaining only reviewed tracks to protect its
512MB memory budget. Human-only per-review model snapshots are independent of
inference artifacts. Old average-only runs can be upgraded without deleting them.

Veo analysis uses the existing helper/action serialization and source range relay,
then imports a hash/duration-verified H.264 derivative through the full-admin,
CSRF and Veo-permission gateway. It accepts an own-helper clip ID, never a URL,
owner selector or host path. Start minute and1–10 minute window retain the worker
600.1s cap. New runs prepare camera/views and skip action/OCR inference. Real
source-account acceptance remains separate from synthetic helper/API/UI tests.

The Video Lab jobs list must refresh while any owned job is queued/running,
including when a different completed run is selected. A one-shot list leaves the
Veo picker disabled after the worker finishes because its busy guard reads stale
rows. Keep admission enforced and show the busy/range reason beside the picker.

Hudl analysis (26 November 2026): the picker adds this season's U11 Hudl games in
their own group. The helper cuts the window from the open stream's segments with
output-side `-ss`: input-side seeking on a mini playlist that starts mid-match came
out short (synthetic 2 s window encoded as 1.4 s). Hudl clips are imported with no
tags because the worker would label them Veo teacher highlights; proper Hudl tag
provenance in the worker is a follow-up. Real-account acceptance is owner-only.
27 November 2026: the window must also fetch each `#EXT-X-MAP` init segment its
segments reference (its own `asset-N.bin`, outside the chosen range). The first cut
fetched only the media segments, so a fragmented-MP4 stream failed every window
with "The analysis clip could not be encoded" (owner hit it on 261108 U11 v Stoke).
The test fixtures were MPEG-TS only; `test_hudl_analysis` now has an fMP4 stream.
27 November 2026 (owner report, Stoke window): the encode step showed no progress for ten
minutes and made a 454 MB clip from about 350 MB of HEVC segments. Hudl serves HEVC and the
worker takes H.264, so a stream copy is not possible. The encode is now step 2 of 2 and
reports ffmpeg's measured output seconds; the analysis clip uses CRF 20 (60 s of real
footage: source 35.8 MB, CRF 20 37.0 MB, CRF 18 50.6 MB). Moment exports keep CRF 18. The
real cost was the capture container's 1.5 CPU cap: 30 s encoded in 21 s capped, 3 s uncapped
(same image, same M4). Hosted containers are now uncapped for CPU (gateway 28dbc64).

Analysis source selection reuses an archived match or the existing private range
relay; input-side `-ss` and output `-t` bound the chosen footage. Range reads also
need the MP4 index, preceding keyframe and bounded read-ahead, so fetched bytes
are not exactly proportional to clip duration. No full-match download fallback.
Synthetic90s source /4s late-window export verifies nonzero reads below60% of
source bytes and no full-download/archive entry. This is synthetic evidence,
not a byte audit of the owner's real transfer.

Preparation progress is ffmpeg output seconds for that selected clip, separate
from worker analysis progress. Connection, verification and gateway import have
no measured total and use indeterminate activity; never fabricate a combined
percentage. Keep ffmpeg stderr/private relay addresses out of status and logs.

Spec650 separates visible playing-area masks (`pitch_boundaries`,3–32 vertices)
from physical four-corner/landmark metre calibration. Automatic colour-based
visible-turf proposals refresh about once a second and are always unreviewed:
green apron/adjacent pitches can be included. Human masks override automatic
ones only within the same shot; explicit absence and1.5s freshness prevent stale
automatic propagation. Require present matching source hashes, never accept
missing==missing as binding. Old runs upgrade through Update camera tracking.

Spec660 (Video Lab teams): tracklets are short and the tracker swaps people, so a label must
not colour a whole tracklet. Teams are decided per sampled detection from `colour_lab` against
kits learned from labels (1 s window vote); dark kits (referee, keeper in black, coats) cannot
be told apart by colour and fall back to the look-alike model with dark views only. One
referee/keeper per team per moment. On RCW vs Kidderminster CG this took same-match assistant
audit accuracy from 15% to about 94% of players on screen; merged two-player boxes remain
wrong. The ball is not in `sample.mp4`: draw it from `detections.jsonl`, choosing one smooth,
central path (Veo follows play) so spare balls by the bags are ignored.
Dark kits share colour, so a dark person takes a labelled dark role only when the look-alike
(ReID cosine) is also 0.58+: on RCW vs CG our keeper's tracklets score 0.73+ to each other and
coats at most 0.66. A keeper holding the ball is undetectable as a ball; a spare that rests,
leaves the picture and returns is still a spare (judge resting over 15 s on the ground).
There is one referee and they work on the pitch (f2ab96a2/6c216d41, 26 Nov 2026): that referee
wore a colourful kit, so shirt colour matched coats and shirts along the far touchline, and the
per-moment "one referee" rule often kept a sideline person instead. A suggested referee (kit or
look-alike, never your label) seen mostly off the marked pitch is now unassigned. "On the pitch"
for this test means feet inside the outline by a tenth of the person's height: the sideline people
stood about 0.5% of the frame height beyond the far touchline, inside the looser half-height margin
used for team suggestions. Off-pitch referee rings on that run: 514 to 37; referee tracks 69 to 13.

Spec680: prepare a perspective panorama and register revisited camera views to it.
Rendering the whole frame needs stricter bounds than projecting observed ground;
use a centred reference, clip the accepted polygon in homogeneous coordinates,
and compose optional panorama-to-metres directly. Rejecting a whole polygon merely
because distant vertices cross the horizon discards known visible ground. Green
union envelopes are suggestions, not physical touchlines. Exact panorama/source
IDs bind acceptance; unknown poses abstain, never inherit by match title. Old local
corrections remain. The analysis window cap is unchanged.
Registration can leave whole stretches unsolved: on f2ab96a2 the atlas had no pose for the first
20.6 s (the legacy panorama never registered them), so the overlay appeared at 0:20. The app now
carries the nearest solved pose in the same shot with `camera_motion.json` (`bridgePoses`, up to
30 s, never across a cut, only when both files share sample times). Hiding the real poses for
20.6-41 s and carrying from 41 s matched them within 0.15% of the frame. The worker still leaves
those poses empty; a worker fix would also give the atlas image those views.

Spec690: a matched-camera percentage does not prove goal-end coverage. Wide pans
need a reversible cylindrical ray atlas: a planar horizon guard can silently drop
an entire end. Goal frames are geometric candidates (spare goals/fences can match),
not semantic ground truth. Four post ground contacts give relative rectification;
only explicitly reviewed physical corners enable metres. Preserve unchanged
vertices on bird's-eye edits: reprojecting an entire boundary can flip unrelated
points across a chart horizon. Atlas images retain the observed ground even when
the goal-guided starting boundary is narrower. Width without two recovered
white touchlines is explicitly estimated and must be corrected by the reviewer.


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


Spec710 (pitch homography, 25 November 2026): two separate faults made the boundary
look skewed. (1) Edges were interpolated in cylindrical atlas pixels in the panorama
and live overlay but straight on the ground in the bird's-eye view, so long edges
disagreed. A straight ground line is the positive span of its two end rays: draw
atlas edges with `groundOutline`, and project only the vertices (homogeneous
clipping keeps them straight) into a frame. (2) A homography through four goal-post
contacts is ill-conditioned (two tight clusters, width extrapolated ~5x) and a false
goal pair collapses it; on 261116 RCW the selected "goals" were mid-pitch. The
bird's-eye now uses the camera's level horizon: every registered frame's x-axis is
horizontal (residual 0.001-0.004 on two real games), so the ground normal is their
smallest scatter eigenvector. Centre circles come out round with no goal input.
Scale is relative; corners still give metres; goals are a fallback only when the
camera never pans. The view is turned by the reviewed boundary's minimum-area
rectangle (never the draft, so it does not spin while dragging). Pixel line-angle
detection was tried and rejected: shadows and far-field radial streaks swamp it.
Near-field offset in live frames (first measured ~3% of frame width) was registration
drift, not the footage: neighbouring Veo frames fit one homography to ~0.2 px with no
lens distortion, but chained/re-localised 8-DOF poses drift in their perspective terms.
A ground-band ECC refit of each 3x3 pose only traded near for far error. The worker now
re-solves every view as one rotating, zooming camera (spec710 `camera_bundle`): cached
games went from 25-60 px to <1 px near-field frame-to-atlas error and atlas seams went
away. Existing runs need "Rebuild complete pitch" (a new child) to get refined poses.

Spec710 follow-up (26 November 2026): on 261116 Racing Club Warwick the automatic outline's
far touchline sits short (through midfield) and is flagged unseen; the real far line
borders a fence/apron and is pale. Tried and reverted, because each regressed another
cached game: (1) a thin-line top-hat plus "grass just below" test (fixed a synthetic
fence case, broke the 600 s 3G game); (2) refining the ground-plane tilt to maximise
perpendicular marking families (fixed a synthetic 3 degree roll, but on real footage it
locked onto false alignments and collapsed or blew up three outlines). A far-side
pixel-distance metric is meaningless here: a 3 degree pose error barely moves it,
because the far field is full of white clutter. Judge far edges visually.
Third attempt (26 Nov): least-squares refit of the centre circle with its centre on
the halfway line, plus a far-edge candidate at the halfway line's observed end. No
change on RCW (the refit converges on the same partial arcs; the halfway line's
detected extent also stops short). Reverted. Root cause: far-field markings on pale,
sunlit grass are too faint at this resolution; a better far-line detector (or
higher-resolution far crops) is the next step, not more fitting heuristics.
Fourth pass (26 Nov, worker `codex/robust-pitch-outline` ed4f18d): the poor bird's-eye on
new matches (NL 260926, run 48e74eab) came from the outline, which frames the view. Replayed
offline on five cached games, only RCW vs CG was right. The detector missed worn/thick near
lines (threshold set by trees and people) and took tree-shadow edges as lines; the fitter let
false circles on short fragments outrank the halfway line. Fixed in the worker: whiteness with
contrast on both sides of a line, turf-noise threshold, halfway candidates beside the camera.
Now NL, frost, RCW vs CG and overcast get whole-pitch outlines; 3G frames a dashed small pitch.
The ground plane (pan axis) stays: a player-height plane was ~1 degree off (oval circle). On a
low camera the far touchline sits 3-5 degrees below the horizon, so the far half of the plan
is approximate and smeared; only confirmed corners give metres. Existing runs need "Rebuild
complete pitch". Deployed to both Macs 26 Nov (code digest a69e712e...).

Spec720: lab entitlements are per-account gateway metadata, separate from app builds.
Only admin can grant/revoke; Video Lab enforces access at every endpoint, retaining
owner checks for jobs/reviews/frame sets/artifacts. Granted users use portal routes
because the edge keeps the admin console LAN-only. Imported sample metadata now
records owner_id; users never receive operator samples or other users' sample lists.
Turning off either lab preserves its saved work. See hosting domain for rollout.

Analysed video export (owner request 26 November 2026): `annotated.mp4` is the worker's
first-pass render (raw detection boxes, burned in before camera tracking, pitch, teams or
reviews), so it is now labelled "raw detections". Download results also offers Export
analysed video: the browser plays the clean `sample.mp4` once, paints each frame with
`overlayAt` (the same per-frame data the player's SVG uses) via `paintOverlay` on a canvas,
and records it with MediaRecorder (H.264 MP4 where supported, else WebM). Real-time only;
the tab must stay open and visible (hidden tabs throttle frame callbacks). Nothing is
uploaded or stored on the server. Gotcha: on macOS a module named `analysedExport.ts`
beside `AnalysedExport.tsx` made `./AnalysedExport` resolve to the `.ts` file (case-
insensitive FS, `.ts` tried first), rendering `undefined`; keep such names distinct.

Pre-analysis (owner request 26 November 2026): a "Pre-analysis" button beside "Analyse selected
match" runs the normal Veo/Hudl analysis on a planned window (`preAnalysis.scanPlan`: 600 s from one
minute after Veo's first-half kick-off in `halves`; without halves 600 s from minute 5); a Veo import already builds the
atlas, outline, bird's-eye and player views, so no extra job is chained. Every completed run shows a
"Pre-analysis check" (`readiness`): panorama registration share, outline sides seen, people per
sampled frame, ball coverage, and teams/referee, which stay "partly" until labelled: look-alike
groups never decide teams on their own. Thresholds are provisional (owner decision 015).

Lighting (spec 760, 26 November 2026): do not filter or grade video fed to the detector;
published studies find enhancement helps only in genuinely dark scenes and often lowers
detection otherwise. Light robustness belongs in training (brightness/saturation, little
or no hue augmentation) and in light-tolerant team features. Grass lightness varies 22-60
(0-255 OpenCV L) across a single frame on cached runs, and torso lightness tracked local
grass on f2ab96a2 (r 0.52). `kitDistance` already weights lightness 0.25 for colourful kits,
so the exposure is greatest for white/grey/dark kits and for the bluer cast of shade on a/b.
The grass under a player's feet is in the same light and is the reference spec 760 uses.


Live 2D pitch (owner request 26 November 2026): the Pitch map now sits directly under the video
and plays with it (`livePitch.ts`, `PitchMap.tsx`). It appears on every analysed run with an
automatic painted-lines outline or an accepted panorama, not only after marking. Exact metres still
need marked keyframes or confirmed corners; otherwise `pitchSource` uses the camera-level ground
plan (`levelCalibration`) framed by the outline's bounding rectangle in plan view, stretched onto the
pitch size: true shape up to scale, labelled approximate, far half least reliable. Until a size is
chosen it draws a 9v9 (73 x 46 m) shape and says so. Positions glide between detections (1.5 s
max gap, 0.5 s hold), steps over 12 m/s are dropped as swapped boxes, close neighbours get a
[1,2,1] average. Distance and top speed stay exact-only (`trackMovement`). Gotcha: tracked ball
points (`ball.ts`) are fractions of the frame and the radius is a fraction of the frame WIDTH, so
the ground contact is `y + r * width / height`. Far-touchline bunching on NL 91f49e12 was
NOT geometry (corrected 26 Nov, first guess was the estimated far outline): person height in
camera-height units is flat at ~0.39 from 8 to 36 m in; the 40-48 m band (half of all
observations, 209 tracks, median 0.43 m/s vs 1.9 on the pitch, ~15% taller = adults) is parents
and coaches lining the far side. `sidelineTracks` (middle within 4 m of a touchline or beyond,
90% of samples within 4 m of it; your labels exempt) leaves them off the map and heat maps unless
Show everyone is ticked. NL: far-band observations ~12k -> 1.4k, 0 of 9 labels hidden; f2ab96a2
refinement: 178 still tracks hidden, 0 of 6 labels. Kit matching had given some of them a team. No shirt numbers exist in the data, so
markers carry shape (our team circle, opponent triangle, referee diamond) and GK/R only.
Low sun (spec 760 Part A, racing-ten): shaded grass is blue to the camera and sunlit grass
washes out to low saturation, so no fixed green range finds the ground; learn the surface
colours from the frame. Red kits read orange in direct sun. The lighting benchmark lives in the
worker (`lighting-benchmark`, docs/LIGHTING_BENCHMARK.md); Video Lab decisions for scoring are
exported with `frontend/scripts/export-lab-decisions.mjs`, which calls the same `decisions.ts`
functions as the page, so a score is of what the lab shows.
Spec 760 Part B (26 Nov 2026): correcting kit colour by the ground beside the feet made teams
worse on the withheld benchmark (low sun precision 0.93 to 0.59). In low sun the feet and the
shirt are often in different light, and sunlit shirts and ground clip near white, so a
per-channel gain cannot recover the kit. The worker writes `colour_lab_balanced` but Video Lab
uses raw colour unless asked. Score any new team-colour idea once against the frozen v1 audit.
First real run (261122 NL vs Bournville Greens, job c8988347, 26 Nov): Veo recordings start long
before kick-off (here 10:00), so a fixed minute-5 start scanned warm-ups. Stitching was excellent
(2957/2997 views, all four sides found). I first read the atlas as the outline framing an empty
near pitch beside the game. CORRECTION (same day): the automatic outline was right. On the ground plane (feet projected with
frame_to_world and the fitter's level ground) it holds 96% of detected feet; the 4-point outline the
owner accepted holds 18% and a fifth of the area, its far edge cutting through midfield. Gotcha: on the
cylindrical atlas a low camera squeezes the far 20+ m into a thin strip and stretches the near few
metres over most of the image, so "players only in a far strip" is perspective, not a wrong pitch.
Judge outlines on the ground plane or on frames, never by atlas rows. Acceptance is not correctness
either. `playShare` now measures it: the share of `central` feet (middle of the view; Veo follows
play, spectators line the far fence) inside the outline in use, on `levelGround`. Judged outlines:
right 92-98% (Bournville automatic, NL 91f49e12), short 23-37% (RMC 6c216d41/bcdbc765 stop before
the right goal; f6d0bcb2 far edge short), broken 1% (old NL 48e74eab). Below 70% the check says
how much play the outline holds and is never Ready, accepted or not. Five outlines, my visual
verdicts: not a held-out accuracy claim. Frame-centre aim points were too weak (inside almost all).
People/ball/look-alike counts do include a neighbouring game (a red-shirted team beside this one).


Shirt numbers (owner request 26 November 2026): the worker's dense reader (worker branch
codex/shirt-number-reading, `shirt_numbers.py`) writes `jersey_candidates.json` per tracklet; the
lab shows them in the pitch markers (fainter = read automatically) and the Selected person panel
lets you set a number, mark "No number" or go back to the reading. Corrections live in the review
as `shirt_numbers` [{track_id, number | null}], sent only once set (older gateways refuse the key).
"Read shirt numbers" queues a `shirt-numbers` child run (gateway `read-shirt-numbers`). Agent-
labelled benchmark, not owner-reviewed: 16/32 right on NL, 5/12 held out on RCW, no wrong numbers;
the old reader read none. Numbers are per tracked stretch (median 6 s), so at any moment only some
players carry one. Gotcha: `useLabData.body` whitelists review fields; a new field must be added
there or it is silently dropped on save.

## Overnight three-match run: lessons (27 November 2026)

- A full Veo match is analysed as consecutive windows of at most 10 min covering each of Veo's
  `halves` (worker and gateway cap one analysis at 600 s). Veo can list a fragment before the real
  first half (261116 RMC: 0:00-3:47); the pre-analysis plan now skips listed halves under 5 min.
- The helper cuts a window at ~0.3x real time from a saved match: the capture container is held
  to 1.5 CPUs. The same `_cut` code in a one-off container of the capture image with 6 CPUs takes
  ~2 min per 10-min window. Downloading the full match first (~20 MB/s) avoids Veo range reads.
- Remembered kits: the page asked the 6 most recent runs; with many windows those were other
  matches, and derived runs (shirt numbers) had no title. Same-match runs now come first and a
  derived run takes its source run's title (`relatedRuns.ts`).
- Low sun, thin figures: the torso colour of a distant referee can read as the grass behind him
  (261109: [98,109,149]), and the referee label then learned a second, grass-coloured "shade", so
  grassy readings became referees (up to 12 per frame). A referee's dark kit has no colourful
  shade now, and a track's overall verdict never makes someone referee or keeper at a moment the
  one-referee rule left unassigned (`LabVideo.tsx overlayAt`). Choose label tracks whose median
  colour is the kit, not grass: check `colour_lab` medians before labelling.
- Sunlit yellow reads near white (261116 RCW: [244,129,131]) and is achromatic, so it never
  decides by colour; the yellow seen further away sits within matching range of RMC's orange.
  Colour alone cannot separate them there; needs a worker-side change (torso pixels without grass
  and highlights) and a re-run.
- Navy adults (coaches in coats) match a pale blue kit with navy shorts: colourful kits weigh
  lightness at 0.25 so sun and shade stay one kit. Most remaining "sideline leaks" are these and
  substitutes at the far end in team kit.
- `playShare` counts spectators behind a rail that the follow-cam keeps in the middle of the view
  (261116: automatic outline right on the atlas and frames, but 54% share).
- Validation: `frontend/scripts/lab-run-summary.mjs` (what the lab shows per run) and the
  worker's lighting benchmark with assistant audits (`runtime/overnight-pre-v1`, splits: eagles
  development, rmc withheld).

## Finished runs archived on the MacBook share (spec 780, 27 November 2026)

- `worker archive-runs RUNTIME ~/Football-Analytics-Share [--days 7] [--apply]` (dry run by
  default) moves finished run families verified by SHA-256 and leaves `runtime/archived/<id>.json`.
  The gateway (`FM_GW_ANALYTICS_ARCHIVE_DIR`, overlay `compose.analytics-archive.yaml`) and the
  worker (`--archive-root`) read a recorded run from the archive; the runtime always wins.
- Gotchas found: Docker will not start a container whose bind source is missing (an unmounted
  `/Volumes/<share>` gives "mkdir ... permission denied"), so the share is mounted onto a local
  folder. `mount_smbfs -N` cannot use Finder's Keychain entry; NetFS can. Docker's VM keeps
  handles on files containers touched, so the mount reports busy and deleted files linger as
  `.smbdelete*` until released: use `diskutil unmount force` only with the gateway stopped.

## Stoke follow-up (27 November 2026): kits, pitch from goals, zoom, placement

- Kit matching must compare a reading with ALL kits and decide by colour only when the nearest is
  colourful: comparing with colourful kits only gave dark-kit players the nearest colourful kit.
  A colourless reading darker than a colourful kit keeps full lightness weight; a lighter one
  (sunlit, washed out) keeps 0.25. "Not a player" is never a colour that claims others.
- One dark team kit against a colourful one (Villa navy v Stoke stripes): dark shirts standing on
  the pitch go to the dark team unless a label or the look-alike model says referee/keeper.
- Worker torso colour: test turf per pixel at full resolution. The frame mask is 1/3 size and
  closed 5x5, which swallowed thin navy torsos on dark 3G (7217 of 47959 samples had no colour).
- Youth games inside bigger pitches: the painted lines can be the big pitch's (Stoke: 9v9 goals on
  the full pitch's penalty-box lines, cones for touchlines). The goals belong to the game:
  `goalPitch` (equal halves, equal width either side of the goals, format shape from the title's
  age group). Side-on goals: the worker's "posts" are front and back of the frame, not two posts,
  so post orientation is not a usable check. Searching goal candidate pairs by play held just
  picks the widest spare goals; only the worker's chosen pair is used, gated by play held.
- Spectators crowd one touchline, so widen a pitch from play only when it spills past both.
- Detector: close far players merge into one box (two kits). A 2x zoom on crowded spots splits
  them for about 2.5x detection time; crops find flat disc cones as balls, so balls stay full-frame.
- Placement: finished runs already record where each stage ran (summary `execution`,
  `detection_sharing`, model device/compute_units, render encoder); live jobs only have the mode
  they started with (gateway job view `execution`, `reid_backend`).
- Do not derive a halfway line from an outline's shape on the level ground: a low camera stretches
  the far side so much that the minimum-area rectangle's long side is the depth direction (tried
  27 Nov 2026, rolled back). Check any pitch line drawn on the atlas image, not by an area ratio.

## Pitch analytics tags (27 November 2026)

Hudl-style tags read from the live 2D pitch (`videoLab/analyticsTags.ts`, scored by
`frontend/scripts/score-analytics-tags.mjs`). Learned on Stoke 92908cc3 against Hudl's tags:
- Hudl event tags (throw, goal kick, corner, free kick, chance, on target, cross, penalty area entry)
  are fixed-length clips (15/20/25/30 s) that start before the event: all five Stoke throw clips
  start exactly 5.0 s before the ball comes back in. Possession, third entries and out-of-play are
  true spans that start at the event. Score clips by overlap, spans by start time.
- A panning camera rarely shows the ball leave. Stoppages show as outfield players standing (median
  speed 0.9 m/s in Hudl's out-of-play vs 2.1 m/s in play) and the ball resting; keepers stand
  anyway, so leave them out of that measure.
- A ball held overhead projects metres off its ground spot (near-side throws looked like free kicks
  9 m in); the holder's feet place it. The far half is approximate, so a ball seen beyond a line is
  better evidence than where it is next seen.
- Veo windows (no keeper labels) transfer only out-of-play; restarts and goals fail there mostly
  because the detector sees no ball while it is in someone's hands or off screen.
- Ball detection is not the cheap lever it looks like (27 November 2026). A 2x ball zoom where the
  players are finds a ball in more Veo frames (138 -> 171 of 300), but the pitch analytics tags got
  no better (Veo) or worse (Stoke: cones and heads join the ball path). Dropping boxes that stay on
  one ground spot removes the real ball at set pieces. Worker branch `codex/ball-recovery` keeps the
  opt-in zoom and its numbers; the next step is a ball model trained on labelled crops.
- Ball training (spec 790): crops for labelling must take the frame whose decoded timestamp the
  detector stamped (`CAP_PROP_POS_MSEC`); the 261108 Stoke clip's timestamps are not a fixed rate,
  so seeking by time x fps put the box beside the object. Only human-reviewed ball labels train;
  evaluation holds out a whole match, never neighbouring frames.
