# 600: Adjustable pitch outline (homography)

Status: Deployed to admin preview (2026-11-24, app bfee873, gateway cbb21c4). Owner: "Yes, build it".

## Problem

On multi-pitch sites other matches sit as far from the camera as ours, so the far-edge rule
(spec 580 follow-up) keeps their players, and look-alike suggestions give them teams.
Sideline people are also kept. The worker's `pitch_location` is unusable (never "outside").

## Design

- **Owner marks the pitch.** Paused on any frame, "Mark pitch" shows four draggable corner
  handles (near-left, near-right, far-right, far-left), allowed outside the video when a
  corner is off-screen. Saving stores a keyframe `{time_s, corners}` (normalised image
  coordinates, -2..3) in the review (`pitch_keyframes`, revisioned like other labels).
  More keyframes fix drift; each can be deleted.
- **Worker follows the camera.** New child mode `camera-tracking` (button "Prepare pitch
  outline" when a run lacks it) writes `camera_motion.json`: frame-to-frame homographies at
  5 per second in normalised coordinates, estimated from ORB features with RANSAC. Veo's
  follow-cam is a virtual pan/zoom of a fixed panorama (pure rotation), so one homography
  maps the whole scene. Steps with too few inliers are marked as cuts; an outline never
  crosses a cut without a keyframe on that side. Parent untouched, hashes verified.
- **Browser propagates and filters.** Cumulative homographies give the outline at any time
  from the nearest keyframe in the same segment, interpolated between steps. With an
  outline: rings only for people whose feet are inside it (plus half a body height); tracks
  mostly outside it get no group/similar team suggestion and so drop out of action team
  estimates and statistics. Your own labels are kept. Without an outline (or beyond a cut)
  the far-edge rule still applies. "Show everyone" and "Show pitch outline" toggles.
- Later (not now): corners give pitch coordinates in metres for heat maps.

## Tests first

Worker: recovered homographies on a synthetic panning/zooming video; cuts on a scene
change; parent untouched; worker mode dispatch. Gateway: keyframe validation, route.
App: propagation maths, on-pitch filter, suggestions skip off-pitch tracks, marking UI saves
a keyframe.

## Result (2026-11-24)

- Worker `camera_tracking.py`; gateway `pitch_keyframes` + `track-camera`; app `pitch.ts`,
  `MarkLayer.tsx`, `PitchPanel.tsx`, outline/filter in `LabVideo.tsx`, `offPitch` in
  `propagateTeams`. The review save body (`useLabData.ts body()`) lists fields explicitly; a
  new review field must be added there or it is silently dropped (a test caught this).
- Real 120 s multi-pitch run: camera tracking 54 s, no cuts, chained steps line up static
  features over 36-44 s. In the browser, marking at 0:10 (near corners off screen) and
  scrubbing to 0:46 kept the outline with the pan; people outside it lost their rings.
- Not done: metres/heat maps from the corners; the worker's own team statistics and actor
  candidates still ignore the outline (the app's moments, estimates and counts use it).
