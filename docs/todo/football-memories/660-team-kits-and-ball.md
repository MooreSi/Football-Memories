# 660: Teams by kit, moment by moment, and the ball back on the video

**Status:** Built, verified offline on the real RCW vs Kidderminster CG run; deploy separate.
**Sensitive:** no. Frontend only; no gateway, worker, source-account or footage change.

## What was wrong
Owner (24 Nov 2026), on the 4-minute RCW vs Kidderminster CG run (`03964514`, our team
yellow, opponents red, their keeper pink, our keeper black): labels did not carry; the same
players had to be labelled again and again; the ball had disappeared.

Measured causes:
- 1,174 tracklets for about 22 people in 4 minutes. A label covers one tracklet.
- The look-alike vote needed 80% of a tracklet's views to agree with a 0.1 margin. Labelled
  tracklets contain views of other people after tracker swaps (labelled opponent 422 becomes
  a yellow player; labelled own 348 and opponent 428 spend stretches on the referee), so most
  people abstained. Against a hand-labelled audit only 15.1% of players/officials were assigned
  correctly; 151 of 186 were unassigned.
- The ball was drawn only into `annotated.mp4`; since spec 580 the lab plays the clean
  `sample.mp4`, so the ball was never drawn.

## What changed
- `kits.ts`: each label you use (team + role) learns a kit from the `colour_lab` of the
  labelled tracklets' samples (densest colour, so shorts and swaps are ignored). Every sampled
  detection is matched to the colourful kits; a ±1 s window on the same tracklet votes. A label
  yields to the kit where the kit belongs to another labelled team (tracker swap) and is not
  applied to samples that plainly show another known kit. Dark kits (referee, keeper in black,
  coats) never decide alone; the look-alike model settles them, seeing only dark views.
  At most one referee and one keeper per team at a moment.
- Kits are remembered across runs from the saved human-only learned models: another window of
  the same match reuses every kit; another match sharing a club name in its title reuses only
  our team's kit. Any label in the new match replaces the remembered kit (away kits).
- Look-alike similarity compares brightness among dark kits (black referee vs grey coats).
- Overlay colours each person per moment; "kit"-matched rings are solid; the person card says
  "matched to the kit of players you labelled". Team setup shows the kits learned and how many
  people each matched.
- Far edge of play: player-sized kit matches count like your labels (tiny kit matches on
  pitches beyond do not), so far-side players are no longer hidden.
- `ball.ts`: one match-ball path from `detections.jsonl` (confident, smooth, nearer picture
  centre because Veo follows play; spare balls by the bags ignored), drawn as a yellow ring
  with a Show ball toggle.

## What must NOT change
Labels, results and source files; gateway/worker contracts; existing test expectations.

## Verification
Assistant hand-labelled audit: 444 detections at 18 moments (13 s apart), crops labelled
before scoring (73 yellow, 88 red, 5 pink keeper, 6 black keeper, 15 referee, 244 not players,
13 unsure). Same-match, assistant labels: not independent or held-out evidence.

| Labels | Correct (players+officials) | Wrong | Unassigned | Shown non-players given a role |
|---|---|---|---|---|
| Before (owner's 19 labels) | 28/186 (15.1%) | 7 | 151 | 0 |
| After (owner's 19 labels) | 171/186 on screen | 4 | 11 | 3 referee, 1 red, 1 yellow |
| After + one keeper label | players only: 161/171 (94.2%) | 4 | 2 (+4 hidden off-pitch) | same |
| + kit matches set the far edge | players+officials 178/186 on screen | 4 | 4 (+1 hidden) | same |

The 4 wrong are two players merged in one detection box (mixed colour). Spectators shown as
referee are touchline adults in dark jackets (faint suggestion rings, never a team).
Ball: spares resting 6 s+ (15+ sightings in one spot) and balls cut off at the picture's side
are ignored; free kicks (4-5 s rest) kept; gaps up to 1.5 s glide. Shown for 83.8% of the clip.
Audit every 10 s (24 moments): match ball 21, wrong 1 (0:15, a spare by the coach that moves
with the camera), no ball detected 2 (2:25, 2:35). Frames every 10 s for all 4 minutes drawn with the app's own
decisions and reviewed by eye. Synthetic page test red before wiring, green after.

Detector follow-up (owner chose it): worker `refine-moments --whole-clip` (branch
`codex/dense-clip`) checks about 10 frames a second and keeps balls and colours. Probe at
2:20-2:40: ball within 0.75 s for 33% of the time at 3/s, 72% at 10/s, 80% at 30/s. Whole clip:
app ball coverage 84% to 88%. Dense people links made team errors worse (4 to 23), so a
whole-clip run feeds the ball only.

Owner chose "try a football model": the cached broadcast football YOLO was already rejected on
Veo footage (worker docs), so first tried tiles with the existing model (no download). Worker
`--ball-tiles` + app camera-steadied spare filter (`stabilise`): ball shown 92.6% of the clip;
10-s audit 22/24 right, 1 wrong (0:15 spare by the coach, resting only ~3 s), 1 unseen (2:35).

## Keeper, swaps and ball strays (25 Nov 2026)
Goal check said our keeper, the "merged" boxes and two ball moments were still wrong.
- Our keeper: assistant crop check found 18 tracklets of him (16, 136, 265, 270, 302, 317,
  319, 380, 435, 502, 519, 614, 745, 890, 897, 1078, 1091, 1105; several swap onto a nearby
  player, which the kit check handles). Their look-alike score to each other is 0.73+, coats and
  spectators at most 0.66. `teams.ts`: a dark view counts towards a dark labelled person only
  when they also look alike (cosine 0.58+); dark kits share colour so colour alone matched coats.
  Swept 0.5-0.65: 0.55-0.6 plateau, 0.5 lets spectators become keeper, 0.65 loses referees.
- "Merged boxes": on inspection 343 (0:58) and 983 (3:34) are tracker swaps whose reading at
  that moment is plain. `kits.ts`: a tracklet's first or last sample that is 25+ nearer one kit
  than any other decides alone (an odd frame mid-tracklet still does not; existing test kept).
  Tried "plain anywhere": broke the odd-frame test and added wrong on the second match; rejected.
- Owner's referee label on 200 covers 2.7 s of a yellow player (0:31-0:34) after a swap; it
  showed that player as referee and, one referee per moment, hid the real referee. A team kit held
  2 s+ on a dark-kit label is now the tracker on someone else.
- Ball 0:15: our keeper is holding the match ball (undetectable); the spare by the coach rests in
  one ground spot 0:03-0:15 with a gap out of view, so the spare look-around grew 8 s to 15 s.
  At ten checks a second a sighting with no close neighbour within 0.3 s (allowing a picture width
  a second) is a stray and cannot carry the ring across a gap (one at 0:14.1, score 0.33).
- Ball 2:35: hidden in a goalmouth scramble ~60 m away. Not found by the YOLO11 tiles nor by the
  owner's three local football models (best.pt, ddp-latest-football.pt, ddp_ddp-simo.pt; offline
  probe, no install or download). Interpolating would place the ring ~190 px off, so it stays
  unshown.

| Labels (RCW vs CG, on screen) | Right | Wrong | Open | Non-players given a role |
|---|---|---|---|---|
| owner rev 31, before today | 174/186 | 4 | 8 | 3 referee, 1 red, 1 yellow |
| owner rev 31, today's code | 175/186 | 3 | 8 | 1 red, 1 yellow |
| owner rev 34 (adds 200 referee, keeper 16, 502) | 180/186 | 3 | 3 | 1 red, 1 yellow |
| rev 34 + assistant's 16 keeper tracklets (not written: owner was labelling live) | 182/186 | 3 | 1 | 1 red, 1 yellow |

Second match unchanged or better: no labels 26 right/1 wrong; one per team 56/8; six 103/2
(was 103/3). Ball 10-s audit: 23/24 right (0:15 correctly shows no ball), 2:35 unseen; shown
91.4% of the clip (stray removal 92.6 to 91.4). Remaining wrong: 982/989 at 3:21 are two players
overlapping in one box; 983 at 3:34 is a mid-tracklet swap. Non-players 198/199 are adults at
the touchline in red and amber coats.

### Follow-up the same morning
- A split window (swap inside it) now uses the sample's own kit before borrowing a neighbour's
  (fixed 983 at 3:34). "Not a player" on someone in team kit holds unless the kit is a later
  minority stretch held 2 s+ (substitutes 198/199 by the bags at 0:19).
- Assistant wrote labels to the live run once the owner had been idle 5 min: review rev 39 on
  8389ebf0 (gateway lock, revision check, reviews/39.json kept): 15 more of our keeper's
  tracklets and 198/199 as not players. Gateway parses all 44 labels and learns 44 examples.
- Live labels (rev 39), on screen: 184/186 right, 2 wrong, 0 open, 0 non-players given a role.
  The 2 wrong are one ~0.3 s moment at 3:21 (982 and 989 overlap; each box covers two people
  and the ring stays with the tracked player). Second match unchanged (27/1, 56/8, 103/2).
- Deploy slip: e0f0796 was deployed over the other session's 2de8b34 (pitch boundaries) for
  ~5 minutes; rolled back, merged, and the merge deployed instead.

### Ball at 2:35 was a corner, not a scramble
Earlier note was wrong: at 2:34-2:37 the ball is in the corner taker's hands at the flag (seen at
2:33.6 and 2:36.9 within ~35 px). `ball.ts`: a gap up to 4 s is bridged when the ball is in the
same spot after (0.03 picture widths) in the picture and, where the camera model is sound, on the
ground (keeper walking with the ball at 0:12-0:15 while the camera pans is not bridged; the
camera model gives 6-8 widths at the far corner, so the picture decides there). Four bridges on
the run, each checked by eye: 0:23-0:25 edge ball, 2:34-2:37 corner taker, 2:37-2:41 ball placed
at the flag, 3:39-3:41 free-kick ball behind the referee. Shown 93.3% of the clip; 10-s audit
24/24 (0:15 shows nothing while our keeper holds the ball).

### What is still not shown (16.1 s of 240 s)
- 0:13.7-0:15.4: our keeper holding the ball after a save.
- 2:26.5-2:33.3: play in the far goalmouth ~60 m away; YOLO11 tiles, a 3x zoom probe on the goal
  area (35 frames, 0 balls) and the owner's three local football models all find nothing.
- 2:57.5-3:05: a restart (keeper walking back, a player waiting at the centre spot); no ball in view.
Players: where two boxes overlap (IoU 0.25+, ~4% of samples) and the colour seen plainly shows a
kit the tracklet vote disagrees with, the seen colour decides (982 at 3:21 fixed). Live labels:
185/186, 1 wrong (989 at 3:21: red and pink overlapping, colour reading ambiguous). Second match
unchanged. Closing these
needs a detector that sees a ball among legs at that distance and separates overlapping players:
a model trained on labelled Veo frames (owner decision: labelling effort, weights, licence).

## Second match: Racing Club Warwick vs Kidderminster RMC (16 Nov, 18:00-22:00)
Owner asked for a 4-minute check on another Veo match. Used the saved local 10-minute sample
(no source-account access); cut 4 minutes, standard analysis + player views (647 tracklets),
published as run `3ebc1a17` with no labels. Low winter sun: blown-out shirts, purple colour cast
(the referee's black reads purple; the vivid-pixel torso measure picks armbands), and RCW amber
vs opponent orange differ mainly in a*. Assistant audit, 407 crops at 18 moments (67 RCW, 59
opponent, 8 pink keeper, 21 referee, 177 non-players, 75 unsure):

| Labels in this match | Players right | Wrong | Unassigned | Non-players given a role |
|---|---|---|---|---|
| none, nothing remembered | 0 | 0 | 155 | 0 |
| none, RCW kit remembered from the CG match (title initials) | 26 | 1 | 128 | 0 |
| one per team | 56 | 8 | 91 | 1 |
| six (2 per team, their keeper, referee) | 103 | 3 | 49 | 3 |

Precision stays high but coverage is limited by the colour measurement under harsh light. Tried
and rejected: single-reading decisions (more right with memory only, but wrong 8 to 15 with one
label per team). Two shades per kit (sun/shadow) kept; no measured gain on these clips. Next step:
worker colour measurement robust to exposure and casts (turf-referenced white balance, ignore
blown-out and armband pixels), then re-measure both matches.

## Limits
Kit colour separates teams only when kits differ in colour; same-colour kits need the
look-alike model. Merged boxes stay wrong until detection improves. Remembered kits rely on
run titles. No neural-weight training; "learning" is per-label kit prototypes and exemplars.
