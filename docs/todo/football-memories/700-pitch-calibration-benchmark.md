# 700: Learned pitch landmarks and camera-aware temporal calibration

**Status:** Building; owner approved the recommended benchmark on25 November2026.
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
Pending implementation and benchmark. Default calibration promotion is gated on
measured evidence, not the number of successfully registered frames.
