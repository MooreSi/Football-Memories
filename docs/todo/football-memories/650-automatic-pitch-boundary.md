# 650: Automatic editable pitch boundaries

**Status:** Implemented, verified and deployed to admin preview (combined with spec660)
**Sensitive:** no; cached footage only, new result paths.

## What is wrong or missing today
Four physical calibration corners form a quadrilateral that clips angled/curved
Veo views. Extra physical landmarks do not add vertices to that boundary.

## What changes
Camera preparation automatically proposes visible turf boundaries, refreshed
throughout the clip. Store suggestions separately from human corrections. Add a
3–32 vertex boundary editor with insert/remove/drag/nudge controls. Carry human
corrections with camera motion within a shot; keep metre calibration separate.
Conservative turf extent can include apron/adjacent pitches: label as unreviewed,
allow correction and never invent off-screen physical corners or metre accuracy.

## What must NOT change
Original media, completed results, existing manual calibration and labels,
source/owner/MFA/CSRF/revision guards, match library, existing test expectations.
No new dependency or weight download. Existing runs upgrade via camera preparation.

## Non-goals
Neural-weight training, confirmed football statistics, semantic line naming.

## Test plan
Synthetic curved turf/background and no-turf refusal; automatic results declared
and source-bound; arbitrary vertex review roundtrip with invalid bounds refusal;
UI add/remove/save and camera-cut refusal; physical metre fit remains separate.
Read-only cached ten-minute clip diagnostics at 16/30/31/34s and later pans.

## Real-account check
None needed. Deploy only existing authorised admin preview when idle.

## Verification
See the spec650 checkpoint in HANDOFF.md and PROGRESS.md for exact gates and
limitations. Source-hash regression red then green; inherited tests were already
green on resumption. No existing assertions changed or source-service operation.
