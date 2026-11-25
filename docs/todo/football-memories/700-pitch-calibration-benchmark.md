# 700: Learned pitch landmarks and camera-aware temporal calibration

**Status:** Built and benchmarked; no calibration candidate promoted. Admin deployment pending.
**Sensitive:** cached local footage and explicit public model preparation only.

## What is wrong or missing today
Spec690 retains both observed ends but its goal-guided bird's-eye shape has an
estimated width. Neither trial recovered two reliable touchlines. Registration
coverage does not establish physical calibration accuracy.

## What changes
Benchmark official PnLCalib keypoint/line detection and calibration against current
geometry on saved games. Use a pinned, separately prepared local runtime and
explicitly downloaded, hashed public weights. Fit pitch semantics with configurable
youth geometry; combine reliable landmark anchors with camera motion, cuts and
revisited views. Retain the full observed atlas and explicit human review. Promote
only geometry that improves independently withheld marking error without concealing
lost calibration/coverage. Publish source-bound evidence and benchmark reports;
surface useful measured quality and corrections in Video Lab.

## What must NOT change
Existing source/results/reviews/labels, source-account access, base runtime deps,
admin/MFA/CSRF/owner guards, physical-corner confirmation and metre safeguards.
Predictions and assistant audit points are not human-reviewed training labels.
No copying external source without recording upstream licence/provenance. Isolate
external model code from gateway-mounted runtime. No implicit model download.

## Non-goals
No universal accuracy claim, global fine-tuning on unreviewed footage, identity or
action changes, or extension of the ten-minute analysis cap.

## Test plan
Synthetic landmark/line projections with known ground truth; missing/incorrect
landmarks and left/right ambiguity; configurable dimensions; cut/unknown refusal;
robust temporal transfer; held-out residuals separate from fitting residuals;
optional adapter/provenance guards; immutable source/artifact publication; app and
gateway source/revision/owner compatibility. Observe new regressions red then green.
Manual cached-game comparisons use new output paths and separate fitting/evaluation
markings, report assistant vs independent-human provenance, runtime and coverage.

## Real-account check
None needed. Existing local saved footage only.

## Verification
Worker187 tests/lint/format/project green; final gateway/backend/frontend release
checks and admin deployment are recorded in HANDOFF/PROGRESS. New geometry,
model, temporal, held-out comparison, immutable publication and UI regressions
observed red then green. Workspace integration was checked after implementation.

## Cached-footage benchmark, 25 November 2026

Completed both official multi-view (MV) and single-view (SV) weight variants on
four locally cached games: 30/40/24/20 prediction frames across 240/600/240/120s.
Thresholds .3434 points/.25 lines, declared before final withheld comparisons.
Initial .7867-line-threshold probes found no lines. No held-out tuning or training.
Every third prediction frame is excluded from temporal anchors. Raw frame fits
still infer model features at evaluation time; check markings never fit any method.
Camera-step transfer expires at20s, refuses cuts and unknown registration.

Only six assistant-marked frames (eight lines,16 endpoints) across three games
have checks; approximate manual clicks scored at native1920×1080. They are NOT
independent human ground truth. The fourth game has overlapping small-sided marks
and spare goals: its active pitch is ambiguous, so it has no accuracy score. All
predictions, automatic goals and assistant checks remain unreviewed. No candidate
passed the declared coverage/accuracy gates; no candidate was promoted or applied.
The current estimate is also visibly inaccurate in some checked views. A lower
median on a smaller surviving subset does not establish improvement.

| Game alias | Weights | Method | Checked views | Median px | P95 px |
|---|---|---|---|---|---|
| rcw | MV | current | 2/2 | 94.1 | 451.4 |
| rcw | MV | pnl_raw | 1/2 | 9.4 | 10.5 |
| rcw | MV | pnl_temporal | 1/2 | 59.4 | 64.9 |
| rcw | MV | relative_temporal | 0/2 | — | — |
| outdoor | MV | current | 1/2 | 23.6 | 33.0 |
| outdoor | MV | pnl_raw | 2/2 | 38.1 | 147.9 |
| outdoor | MV | pnl_temporal | 1/2 | 141.2 | 143.0 |
| outdoor | MV | relative_temporal | 0/2 | — | — |
| grass | MV | current | 1/2 | 263.9 | 445.4 |
| grass | MV | pnl_raw | 1/2 | 1057.6 | 1322.5 |
| grass | MV | pnl_temporal | 0/2 | — | — |
| grass | MV | relative_temporal | 0/2 | — | — |
| multimark | MV | current | 0/0 | — | — |
| multimark | MV | pnl_raw | 0/0 | — | — |
| multimark | MV | pnl_temporal | 0/0 | — | — |
| multimark | MV | relative_temporal | 0/0 | — | — |
| rcw | SV | current | 2/2 | 94.1 | 451.4 |
| rcw | SV | pnl_raw | 0/2 | — | — |
| rcw | SV | pnl_temporal | 0/2 | — | — |
| rcw | SV | relative_temporal | 0/2 | — | — |
| outdoor | SV | current | 1/2 | 23.6 | 33.0 |
| outdoor | SV | pnl_raw | 1/2 | 33.1 | 41.8 |
| outdoor | SV | pnl_temporal | 0/2 | — | — |
| outdoor | SV | relative_temporal | 0/2 | — | — |
| grass | SV | current | 1/2 | 263.9 | 445.4 |
| grass | SV | pnl_raw | 0/2 | — | — |
| grass | SV | pnl_temporal | 0/2 | — | — |
| grass | SV | relative_temporal | 0/2 | — | — |
| multimark | SV | current | 0/0 | — | — |
| multimark | SV | pnl_raw | 0/0 | — | — |
| multimark | SV | pnl_temporal | 0/0 | — | — |
| multimark | SV | relative_temporal | 0/0 | — | — |

Promotion requires independent human checks and verified pitch geometry, at least
80% checked-view coverage with two views, P95≤20px and median≥20% better than the
current baseline. These are eligibility gates for further review, never automatic
acceptance. Current gate failure is retained rather than switching defaults.

Private reproducible observations/checks/results are under
`runtime/pitch-benchmark-700` (ignored, not uploaded). Each report includes model
hashes, thresholds, check-file hash, source window, fit/held-out times and per-view
errors. All eight manifests/artifact hashes and ZIP CRCs verified. Old result and
source files remain unchanged. `benchmark-pitch` requires explicit evidence or a
trusted prepared profile and an explicit source-bound check file, writes a fresh
child, and exports raw landmarks, candidate timelines, checks, report and image.
No weights are loaded by normal worker startup. The optional profile is not enabled
for routine jobs. Production panorama reviews still require owner acceptance.

SV_kp SHA256 7ea78fa76aaf94976a8eca428d6e3c59697a93430cba1a4603e20284b61f5113;
SV_lines SHA256 d72f4ed71734a2e3df9fa084f666e9b8adaef21bf69bac8952d6d3f970ff7455.
These two official v1.0.0 assets have the same sizes as their MV counterparts.
The upstream release has no supplied digests for these four files; observed hashes
pin future preparation. Use `--variant single_view` for explicit SV preparation.

Next scientific step: obtain independent reviewed field-line checks and pitch
size/active-field identity across more camera types before promoting any model.
Fine-tuning or threshold changes require new withheld evidence, not reuse of these
six views as a test set.
