# 670: A detector trained on the owner's own Veo footage

**Status:** Draft (owner asked for the plan 25 Nov 2026; nothing built)
**Sensitive:** no. No Hudl/Veo requests, credentials or library deletes. Owner decisions below.

## What is wrong or missing today
After spec 660, RCW vs CG is 186/186 on the same-match audit, but the remaining gaps are the
detector's, not the logic's:
- **Ball unseen when it is small or among players:** about 16 s of the 4 minutes. That includes
  the far goalmouth at 2:26-2:33 (~60 m away). Four approaches all saw nothing there:
  - YOLO11 on four zoomed tiles;
  - a 3x zoom on the goal area;
  - the owner's three local football models.
- **Two players overlapping:** they come out as one box, so team colour is mixed. The
  overlap rules in 660 patch the audit, not the cause.
- **The detector is generic:** `models/detector.json` is YOLO11l trained on COCO (AGPL-3.0),
  not on Veo's wide, high, far camera. A pilot Faster R-CNN on 103 non-Veo images had
  ball recall 0.18 (TRAINING.md).

## What changes
1. **Label frames in the Video Lab** (admin only):
   - A "Label frames" mode shows a frame with boxes pre-drawn by the current detector and
     the tiles. The owner confirms, moves, deletes or adds `ball` and `person` boxes.
   - Saved per run as human-reviewed `frame_labels`, through the gateway like `review.json`:
     revisioned, `label_origin: human_reviewed`, and tied to the source by its SHA-256.
   - The app picks the frames that teach most: ball gaps, overlapping boxes, the far
     goalmouth, set pieces, and a random 20% so it is not only hard cases.
2. **Train in the worker:**
   - `train-detector` gains a YOLO11 fine-tune path. It trains on full frames plus the
     0.56 tiles, keeps COCO weights as the start, and exports CoreML at 1920x1088.
   - Splits are by match, never by frame: CG and RMC frames never share a split.
3. **Promote only past the gates** (test plan). A passing model becomes a new
   `detector.json`; the old one is kept for rollback. Each newly labelled match retrains,
   so the detector improves over time, but only on labels a person has confirmed.

## What must NOT change
- **The default detector** until a candidate passes every gate on matches it never saw.
- **Existing work:** results, reviews, labels and source files are never rewritten.
  New runs are new jobs.
- **Training data:** only human-reviewed labels train. This is already enforced in
  `validate_dataset`, and assistant-drawn boxes must be confirmed by the owner.
- **The live app:** no cloud training, no upload of footage, and no Hudl/Veo automation.
- **Spec 660 audits must not regress:** 186/186 players on RCW vs CG, ball 24/24, and the
  second match's numbers.

## Non-goals
- Not team classification. Teams stay with the kit and look-alike logic from 660; the detector
  only finds `person` and `ball`.
- Not action spotting (goals, passes) and not identifying people by name or face.
- Not a hosted labelling service; no new external tool such as CVAT or Label Studio.

## Open questions (and the provisional default in use)
1. **Training framework.** Should `ultralytics` be added to the worker environment?
   - It is AGPL-3.0, the same licence as the current weights. It is installed in your
     Football Analysis v2 environment but not in the worker.
   - The alternative is the existing torchvision Faster R-CNN path, which needs no new
     package but was weak on balls.
   - *Default:* no install until you approve. Plan for YOLO11.
2. **Labelling effort.** About 15-20 s per frame to confirm pre-drawn boxes.
   - *Default:* a 300-frame pilot (about 1.5 h) from 3 matches.
   - If the pilot clears the gates, the target is 1,000+ frames from 6+ matches.
3. **Which matches.** Only matches already in your library.
   - *Default:* train on CG plus 2-4 others. Hold out RMC and one never-labelled match for the
     gates.
4. **Assistant pre-labels.** May the assistant pre-sort frames ("ball visible / not") to save you
   time? The confirmation stays yours. *Default:* yes, marked as unconfirmed until you save.

## Test plan

| Test | Asserts | Negative control |
|---|---|---|
| Frame-label save | Revision rises; 409 on a stale revision; unknown class and off-frame box rejected | Edit an old revision and save: refused |
| Dataset validation | Only `human_reviewed`, source-hashed labels; splits disjoint by match | A frame from the held-out match in train: refused |
| Training smoke | Loss falls on synthetic data; checkpoint reloads; CoreML export loads in `CoreMLDetector` | Corrupt checkpoint hash: refused |
| Ball gate (held-out) | Ball within 0.75 s for 85%+ of visible-ball time; under 1 false ball per minute shown | Current YOLO11 + tiles on the same frames (today's baseline) |
| Overlap gate | Two overlapping players found as two boxes in 80%+ of labelled overlaps | Current detector on the same overlaps |
| No regression | 660 audits unchanged or better on RCW vs CG and RMC; 4-minute run time no more than 1.5x today's | Run the same audits with the old `detector.json` |

## Real-account check
None needed. Footage is already in your library; nothing talks to Hudl or Veo.

## Verification (filled in when shipped)
- [ ] suite green: <numbers>
- [ ] no credential, cookie or token written to the repo, a log or a fixture
- [ ] nothing on Hudl modified; no existing library file deleted or overwritten
- [ ] real-account check: not needed
