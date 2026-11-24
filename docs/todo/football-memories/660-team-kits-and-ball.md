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

## Limits
Kit colour separates teams only when kits differ in colour; same-colour kits need the
look-alike model. Merged boxes stay wrong until detection improves. Remembered kits rely on
run titles. No neural-weight training; "learning" is per-label kit prototypes and exemplars.
