# 690: Both goal ends, complete pitch atlas and linked bird's-eye review

**Status:** Building
**Sensitive:** no; cached local footage, new outputs, existing admin/source/revision guards.

## What is wrong or missing today
The planar rendering guard discarded the left goal end. Matched-camera percentage
was incorrectly presented as a useful proxy for full pitch coverage. The owner
cannot extend a mask into pixels missing from the image.

## What changes
Select views by angular/ground coverage over the complete analysed video, without
letting an early bounded bank discard later goal ends. Render a cylindrical pitch
atlas so large left/right pans do not hit the planar projection horizon. Preserve
per-view ray transforms for reversible boundary/camera projection. Detect reusable
white-post goal-frame candidates with source/time/geometry/evidence, cluster them
across views, and expose both-end coverage separately from registration. Never mark
an unseen end complete. Allow corrections to goal anchors and pitch corners. Show
a linked top-down pitch view whose geometry and image coverage update with the
same reviewed calibration; goal anchors stay available to wider analysis/export.

## What must NOT change
No account request, media/result overwrite, new dependency/weights download,
weakened tests, guessed physical pitch dimensions or changes to owner/CSRF/MFA.
Preserve source/panorama revision binding and legacy panorama reviews. Keep newer
concurrent frame-label work and admin-only deployment scope intact.

## Non-goals and defaults
No universal accuracy claim from a few games. Missing/occluded goals remain
unverified; unseen image areas stay empty. Top-down photogrammetry is calibrated,
not an invented aerial photograph. The current analysis-window cap remains.

## Test plan
Synthetic wide pans include both goal ends and a return view; late novel views
survive the bank limit. White goal-frame positive/negative controls and provenance.
Image↔cylinder↔ray round trips, live masks and shared top-down calibration. Source/
revision/owner safeguards; old review compatibility. Multi-game cached image audit
of both goals/ground extent, artifact/source/ZIP integrity; desktop/375px browser
review against reference02. Record every failure and limitation honestly.

## Real-account check
Not needed: existing cached games only.

## Verification
Pending.
