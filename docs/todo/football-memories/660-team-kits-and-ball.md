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
