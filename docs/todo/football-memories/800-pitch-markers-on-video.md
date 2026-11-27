# 800: Adjust the pitch box and halfway line on the playing video

**Status:** Shipped (app branch; not deployed)
**Sensitive:** no

Owner (27 November 2026): "to improve homography allow me to change the box and half way line on
the actual video being played, i can pause it on various parts of the game to make changes so its
accurate, it should then dynamically adjust as the camera pans and zooms by using reference points
from where the pitch markers are set".

## What is wrong or missing today

- The video draws the pitch outline (white dashed box) and halfway line (amber) from the atlas
  (accepted panorama review, else the automatic proposal). Neither can be dragged on the video.
- "Mark pitch here" saves `pitch_keyframes` (corners + optional landmarks), but on every run with
  an atlas they are ignored for the drawn outline (`boundaryAt` returns the atlas boundary first)
  and for metres once the panorama has reviewed corners. Where they are used, they follow the
  camera by chaining `camera_motion.json` steps, which drifts; the atlas poses (`frame_to_world`,
  spec 710 `camera_bundle`) are the better camera model and are not used for marks.

## What changes

- Each saved mark is a set of reference points: image position at that paused moment <-> known
  pitch point (corners, halfway-line ends, centre spot, goal-line midpoints). With an atlas, each
  image point is turned into a ground ray with that moment's registered pose, so the reference is
  fixed on the ground. The pitch then follows pan and zoom through the poses.
- `pitchMarkers.ts` fits one ground-ray -> pitch homography per mark through its own points; only
  when those cannot fix a fit (near-collinear) do other marks' points join at weight 0.02. Between two marks the two
  fits blend by time; before the first and after the last the nearest holds. So each mark is exact
  at its own moment, and registration drift between moments is spread rather than accumulated.
- With marks and an atlas, the marks drive the drawn box (clipped to the frame), the halfway line,
  the "on the pitch" test, metres and the live 2D pitch, ahead of the atlas outline/corners.
- The marking editor opens on the pitch as currently drawn: four corners plus the two
  halfway-line ends as handles (amber), the halfway line drawn between them. Corners come from your
  marks, else reviewed atlas corners, else the outline's rectangle on the level ground (what the live
  2D pitch reads). Corners off the frame start unticked (the nearest are kept until four points
  remain); an off-screen halfway end you never moved is not saved unless needed for four points.
  Saved data stays the gateway's existing `pitch_keyframes` shape (no gateway change).

## What must NOT change

- Runs without an atlas keep the spec 600/620 camera-motion behaviour for marks.
- No mark: the atlas outline, proposal and halfway line are exactly as before.
- Gateway review schema (no gateway change); worker untouched; no source or result file written.
- Normalised pitch convention: near-left (0,0), near-right (1,0), far-right (1,1), far-left (0,1).

## Non-goals

- Penalty-box handles (need the format's box size; follow-up if wanted).
- Automatic line snapping to painted markings.
- Fixing registration where the atlas has no pose (no overlay there, as now).

## Open questions (and the provisional default in use)

- "Box" read as the pitch outline drawn on the video (the dashed box), not the penalty area.
  Default: outline corners. Recorded for the owner.
- Weight of other marks (0.02) and plain linear blending between marks: chosen, not tuned on footage.
- Existing `pitch_keyframes` on atlas runs are now read through the atlas poses instead of the
  camera-motion chain (and now win over the atlas outline). Of 31 cached reviews only 6c216d41 has
  one: the editor's default box and a default centre spot saved at 0:00, never placed. A mark that
  is entirely default placement is ignored, so that run keeps its accepted atlas outline. The
  review itself is untouched; the owner can delete that mark (x in Pitch calibration).

## Test plan

| Test | Asserts | Negative control |
|---|---|---|
| follows pan and zoom | one mark at t=0 puts the corners on their true image positions at t=4 after a yaw and zoom | atlas-free carry (identity poses) misses them |
| drift pinned | two marks disagreeing with the poses are each exact at their own time, blended between | single-fit model is not exact at both |
| image to pitch | true image foot -> its pitch point | |
| unticked corner | a wrong, unticked corner does not move the fit | ticked, it does |
| no pose | a mark in an unregistered view is ignored; none left -> null | |
| camera wiring | labCamera with marks + atlas: boundaryAt/halfwayAt/imageToPitch use marks | without marks they return the atlas values |
| editor start | handles from the current pitch, halfway ends included, off-frame corners unticked | |
| MarkLayer | halfway line drawn between the halfway handles | absent without them |

## Real-account check

None needed (no Hudl access; reads existing run files only).

## Verification (filled in when shipped)
- [x] suite green: frontend 1209 pass (15 new: pitchMarkers 13, MarkLayer 2), typecheck, build, run
  in a scratch worktree of HEAD + only this change (another session's red tests were in the checkout);
  backend unchanged, 870 SQLite + 870 Postgres 17, ruff, format, mypy, alembic check clean
- [x] no credential, cookie or token written to the repo, a log or a fixture
- [x] nothing on Hudl modified; no existing library file deleted or overwritten
- [x] real-account check: not needed
- Browser: hosted build on the read-only harness over 92908cc3 (review in memory only). At 0:30
  the editor opened on the level-ground rectangle (two right corners on screen and ticked, left
  corners and halfway ends off-frame); dragged the far-right corner, saved (corners 1,2 + both
  halfway ends, as four points were needed). Box and halfway line then drawn at 1:30, 3:20 (zoomed
  in) and 6:40; the 2D pitch says positions come from your pitch marks. Not judged for accuracy
  against painted lines: that is the owner's marking to do.
