# 680: Review a stitched pitch once and apply it across camera views

**Status:** Implemented and verified; admin deployment pending
**Sensitive:** no; cached footage only, append-only worker artifacts and existing review guards.

## What is wrong or missing today
Per-frame turf masks and chained motion can drift; neither gives the owner a single
left/centre/right view of the observed pitch to correct.

## What changes
Camera preparation stitches overlapping cached views into one source-bound panorama,
with bounded canvas, masked people/overlays and robust feature registration. Revisit
matches anchor camera poses to the same map. Automatically propose an editable turf
polygon. The owner explicitly accepts it; optionally marks the four physical pitch
corners on the panorama for metre calibration. Project accepted geometry into all
registered times, including independently re-registered views after cuts. Report
coverage and abstain on unmatched views. New analyses include this preparation;
old runs gain it through an explicit preparation action.

## What must NOT change
No account access, media overwrite, hidden model/dependency download, promoted
predictions, weakened tests, changed source/revision/owner/CSRF/MFA controls or other
library deployment. Existing four-corner/local boundary reviews remain supported.

## Non-goals
No invented unseen grass or physical touchlines; no automatic metre calibration
from green pixels, independent accuracy claim or expansion of the current10-minute
analysis limit. Whole analysed video is covered only where registration succeeds;
a full match outside that window is not silently analysed or downloaded.

## Open questions (and provisional default)
Unseen ends/camera changes: show incomplete coverage and require separate preparation
rather than extrapolate into unmatched shots. Panorama acceptance is bound to source
and exact panorama revision, never transferred to a different clip by title.

## Test plan
Synthetic known panning scene stitches wider than a frame and maps shared landmarks;
cut/unrelated/blank frames do not acquire transforms; finite bounded canvas and no
overwrite. Worker produces manifest/ZIP/source-bound artifacts. API rejects wrong
source/map/invalid polygon and unauthorised access; revision persistence survives
reload. UI does not apply proposals before acceptance, projects accepted polygon and
optional metre corners, refuses stale maps and unmatched views. Desktop/375px against
reference02, cached-footage manual stitch and integrity audit.

## Real-account check
None needed. Use existing cached footage only.

## Verification
See the spec680 checkpoint in HANDOFF.md/PROGRESS.md for exact149 worker,470 gateway,933 frontend and854x2 backend gates, red/green and browser evidence. No production acceptance or independent accuracy claim.

## Design details
The mosaic is a perspective view, not a top-down metric map. Re-centre the complete
registration graph to avoid end-view stretching. Bound image rendering separately
from ground projection; clip the ground polygon in homogeneous coordinates before
dividing by depth. Compose optional panorama-to-metres with each image-to-panorama
matrix directly. A large pan can move distant physical corners behind the current
view while the visible pitch remains measurable. See the worker PITCH_PANORAMA.md
for the contract, actual cached trial and rejected intermediate outputs.
