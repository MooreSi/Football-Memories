# Video analytics

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

Spec680: prepare a perspective panorama and register revisited camera views to it.
Rendering the whole frame needs stricter bounds than projecting observed ground;
use a centred reference, clip the accepted polygon in homogeneous coordinates,
and compose optional panorama-to-metres directly. Rejecting a whole polygon merely
because distant vertices cross the horizon discards known visible ground. Green
union envelopes are suggestions, not physical touchlines. Exact panorama/source
IDs bind acceptance; unknown poses abstain, never inherit by match title. Old local
corrections remain. The analysis window cap is unchanged.

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
Remaining: per-frame registration fits mostly distant texture, so near-field ground
in live frames can sit ~3% of frame width off the atlas (two-lens seam parallax at
bottom-centre). That is a worker registration limit, not the ground model.
