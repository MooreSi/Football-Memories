# 770: Faster camera and pitch stage

**Status:** Built, NOT deployed (owner: "speed up the camera and pitch stage too", 26 November 2026).
Worker branch `codex/faster-camera-pitch`.
**Sensitive:** no. Worker only. No account, source footage or existing result touched.

## What is wrong or missing today

After spec 750 the camera and pitch stage is the longest part of an analysis: 305 s on the
4-minute NL clip (mini, current code). It works out how Veo's virtual camera moves (camera
motion), stitches the views into a panorama, then builds the cylindrical pitch atlas
(re-solves every view as one rotating/zooming camera, finds pitch lines and goal posts,
paints the atlas image and the bird's-eye view). Profiled:

| Part | Time |
|---|---|
| Camera motion: optical flow between 1,198 sampled frame pairs, one at a time | ~49 s |
| Panorama | ~18 s |
| Atlas: 336 video seeks (keyframes every 8.3 s, so each seek decodes ~125 frames) | ~68 s |
| Atlas: view refinement (SIFT 34 s, two decode passes ~15 s, matching/solve ~12 s) | ~66 s |
| Atlas: pitch-line outline, goal posts, white lines per view | ~29 s |

## What changes

- Atlas candidate and paint views come from one sequential decode instead of seeks; the
  640 px copy each paint view needs is kept from that pass. Measured on real footage:
  240/240 sampled frames identical between seek and sequential decode. A time the
  sequential pass does not find is still read by seeking (identical result either way).
- Camera-motion steps (optical flow, ORB recovery) and each frame's pitch-boundary proposal
  run on a small thread pool, results consumed in order. Measured: 200 steps 5.0 s -> 1.6-1.9 s,
  identical results.
- Atlas per-view analysis (white lines, pitch-line segments, goal posts) runs on the same kind
  of pool, consumed in order.
- View refinement decodes the next frame while SIFT runs on the previous one (SIFT itself is
  already multi-threaded inside OpenCV; extra threads measured no gain).
- One small helper for ordered, bounded thread-pool mapping.

## What must NOT change

- Every output byte: `camera_motion.json`, `pitch_panorama.*`, `pitch_atlas.*`, `goal_posts.json`,
  `pitch_birds_eye.jpg` on the real NL clip must be identical before and after.
- Algorithms, thresholds, sampling, which views are chosen. Parent results never modified.
- Every existing test passes unmodified.

## Non-goals

- Changing the camera or pitch algorithms, or moving this stage to the MacBook (Split already
  overlaps it with MacBook appearance; pitch rebuilds already go to the MacBook in Split).
- Merging the separate decode passes into one (larger refactor; revisit after measuring).

## Open questions (and the provisional default in use)

- Thread count. Default 6 (4 threads 1.9 s, 8 threads 1.6 s on the mini's 10 cores, leaving
  room for the app containers).

## Test plan

| Test | Asserts | Negative control |
|---|---|---|
| Ordered pool | results in input order, bounded in-flight work, errors propagate | fails before the helper exists |
| Atlas never seeks | atlas builds with `VideoCapture.set` forbidden | fails on today's code |
| Camera steps in parallel | steps computed on more than one thread, output equal to one-at-a-time | fails on today's code |
| Refinement overlaps decode | SIFT runs off the decoding thread; refined poses unchanged | fails on today's code |
| Real NL clip | all camera/pitch outputs byte-identical; time before/after | manual, recorded |

## Real-account check

None needed.

## Verification (filled in when shipped)
- [x] worker suite 299 pass, ruff, format, project checks green; new tests red first
- [x] NL base: 312.7 s (deployed 984da7a) -> 142.5 s; camera_motion, panorama json/jpg, atlas
  json/jpg, goal_posts and bird's-eye byte-identical
- [ ] deployed to both Macs (needs the owner's yes)
- [ ] nothing on Hudl modified; no existing library file deleted or overwritten
