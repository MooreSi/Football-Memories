# 760: Lighting benchmark and light-balanced kit colour

**Status:** Part A built and baseline scored (owner: "Yes, build Part A", 26 November 2026); Part B not started
**Sensitive:** no. Worker team-colour stage and Video Lab kit matching only. No account,
credential, source footage or existing result is touched.

## What is wrong or missing today

Owner aim: accurate recognition first, analytics later, under varying light. Research
(26 Nov 2026, summarised in the video-analytics domain file) found that the field does not
filter whole videos for detectors: pre-enhancement helps only in genuinely dark scenes and
otherwise often lowers detection. Robustness comes from training data, and team assignment
has moved from raw colour to light-tolerant features. So this spec leaves the pixels alone
and fixes the one place where we turn raw pixel colour straight into a decision.

That place is team assignment. Worker `teams.observe_frame` stores each person's median
torso colour as `colour_lab` (OpenCV Lab, turf pixels excluded). Video Lab `kits.ts` learns
kits from labelled samples and matches every sample to them (`kitDistance`: a and b in full,
lightness weighted 0.25 for colourful kits, 0.8 for kits below chroma 15). The colour of a
shirt in shade is not the colour of the same shirt in sun.

Measured on cached runs (read-only probe; grass lightness on the 0-255 OpenCV scale, lower
three quarters of the frame):

| Run | Grass lightness spread within one frame (median) | Correlation, torso vs local grass lightness |
|---|---|---|
| f2ab96a2 (RCW) | 41.5 | 0.52 |
| 2b560278 | 45 | 0.27 |
| 16a49509 | 31 | 0.17 |
| 03964514 (RCW vs CG) | 22 | -0.13 |
| 4ba1987f | 60 | -0.13 |
| 48e74eab (NL) | 32 | -0.34 |

Light is leaking into kit colour on some runs (f2ab96a2 most), but the correlation is
confounded by where each team stands, and only lightness was measured. Shade also tints
(shade is bluer than sun), and that shifts the a/b channels, which `kitDistance` weighs in
full. There is also no benchmark that scores recognition by lighting condition, so neither
this change nor any later detector fine-tune can be shown to help.

## What changes

**Part A: lighting benchmark (worker tool + private runtime data).**
- New `football-video lighting-benchmark` builds a frozen audit from existing completed
  runs: N moments per run, spaced 10 s or more apart, each person box labelled (team kit,
  role, not a player, unsure) and each moment tagged with a lighting condition (sun with
  shade, overcast, floodlit, dusk, frost, indoor, 3G). Labels and tags are written before any
  prediction is scored and are never edited afterwards (a correction is a new version).
- Each label records who made it: `owner` or `assistant`. Reports always show the two
  separately. Assistant labels are not independent evidence.
- Runs are split by match into development and withheld. Thresholds and constants are tuned
  only on development matches. The withheld set is scored once per candidate.
- Scores per condition and overall: team precision AND coverage (assigned / on screen),
  role confusion, sideline leakage, unassigned count, and for the ball, the share of audited
  moments with the match ball found within 0.75 s. Person detection recall is scored against
  labelled boxes, so a detector fine-tune can reuse the same audit later.
- Also measures the a/b shift: median a, b of grass in the brightest vs darkest grass cells
  per frame, so the colour cast is known, not assumed.
- Data lives in `runtime/lighting-benchmark-760/` (private, outside Git).

**Part B: light-balanced kit colour.**
- Worker, same sampling as today: for every observation also store `ground_lab` (median Lab
  of turf pixels in a patch just below the feet, the patch `observe_frame` already samples)
  and `colour_lab_balanced`: the torso colour corrected per channel in linear RGB by the gain
  that maps that local ground colour to the run's median ground colour (a von Kries
  correction, using the grass beside the player as the white reference). With too little
  turf nearby (provisional: under 35% of the patch), fall back to the nearest frame region's
  ground, else `colour_lab_balanced` is null and `colour_lab` is used.
- Fields are additive. `colour_lab` is unchanged, so old readers and old runs behave as now.
- Video Lab: `kits.ts` uses `colour_lab_balanced` for both learning and matching when every
  usable sample in the run has it, else `colour_lab` for the whole run (never mixed within a
  run). Remembered kits carry which colour space they came from, and a kit is not reused
  across the two spaces.
- Old runs get balanced colours through a new output (the existing upgrade pattern), never by
  rewriting `team_assignments.json` in place.

**Adoption gate.** Balanced colour becomes the default only if on the withheld matches team
precision improves or holds, coverage drops by no more than 2 points, and no lighting
condition loses more than 3 points of precision. Otherwise it stays off and the result is
recorded.

## What must NOT change

- Source footage, completed job outputs and owner labels: new runs use new output paths.
- `colour_lab` values and meaning; gateway and worker contracts other than the two new
  optional fields; the Video Lab result for any run without balanced colours.
- Detector, tracker, pitch outline and ball path code paths.
- Every existing worker and app test passes unmodified.
- No new runtime dependency, no weight download, no account access.

## Non-goals

- No filter, enhancement or colour grading of the video seen by any model, or of the
  `sample.mp4` the lab plays.
- No detector fine-tune (follow-up; it will reuse Part A's audit).
- No learned crop-embedding team classifier in this spec (candidate follow-up if balanced
  colour does not pass the gate).
- No change to look-alike (ReID) matching for dark kits.

## Open questions (and the provisional default in use)

1. Which runs make up the benchmark? Default: the six distinct cached matches above plus the
   frost, 3G and overcast games from the pitch work; at least one per condition we have.
   Floodlit and dusk are probably missing: recorded as a gap, not filled with guesses.
2. Who labels? Default: assistant labels marked as such, with the owner asked to spot-check
   20 moments per match. Owner labels are preferred when available.
3. Withheld split? Default: RCW vs CG (03964514) and NL (48e74eab) are development, because
   their labels already steered spec 660 and the referee fix. The rest are withheld.
4. Gate thresholds (2 points coverage, 3 points per condition)? Default as written; owner
   may change them.

## Test plan

| Test | Asserts | Negative control |
|---|---|---|
| Worker: balanced colour on a synthetic frame, left half shaded (gain 0.5 + blue cast), same shirt colour both halves | `colour_lab_balanced` of the two players within 3 Lab units; `colour_lab` differs by more than 15 | Uniformly lit frame: balanced equals raw within 1 unit |
| Worker: player on a white line / no turf nearby | falls back to region ground; with no turf anywhere, balanced is null | A player on turf is not given the fallback |
| Worker: output schema | `colour_lab` byte-identical to before for the same input; two new keys present | Missing ground never writes a fabricated value |
| Worker: benchmark freezes labels before scoring | scoring a run whose labels changed after freezing fails | Unchanged labels score |
| Worker: benchmark splits by match | a run cannot appear in both development and withheld | |
| App: `kits.ts` with balanced fields on every row | learns and matches on balanced colour | Same rows without balanced fields: identical result to today (existing fixtures) |
| App: run with balanced colour on only some rows | uses raw colour for the whole run | |
| App: remembered kit from a raw-colour run | not applied to a balanced-colour run | |

Every new test is watched failing first.

## Real-account check
None needed. All evidence comes from cached runs already on the mini; nothing is read from
Veo or Hudl.

## Part A result (26 November 2026)

Worker branch `codex/lighting-benchmark` (84c9def); app `decisions.ts` + `frontend/scripts/
export-lab-decisions.mjs` export exactly what Video Lab shows. Full record, table and caveats:
worker `docs/LIGHTING_BENCHMARK.md`. v1 is frozen with assistant labels only: 5 matches x 6
moments (dev rcw-cg, nl; withheld racing-ten, veo-trial, villa-stoke-outdoor). veo-3g was
excluded (washed-out kits, no owner labels); veo-trial's outfield side is an assistant
assumption for the owner to confirm. Baseline (current lab, withheld): precision 0.74 overcast /
0.93 low sun, coverage 0.69 / 0.60; matches and conditions are confounded (one or two matches
each), so this is not yet evidence about lighting itself.

Finding that changes Part B: in low sun the shaded grass is blue to the camera (OpenCV HSV
about 105/180/65) and the sunlit grass washes out (about 38/21/181). A green-hue rule finds no
ground at all, so the per-player ground reference must come from the colours actually under
the feet (as `teams.turf_mask` learns them), never from a fixed green range. The frozen v1
`grass_cast` values were taken with the green rule and are missing on racing-ten.

## Verification (filled in when shipped)
- [x] Part A: worker 286 pass, ruff/format/project checks; app frontend 1042 pass on the committed state in a clean worktree, typecheck, build (Part B: pending)
- [~] benchmark report: baseline scored per condition, assistant labels only; raw vs balanced pending Part B; owner labels pending
- [ ] adoption gate: passed / not passed (with numbers)
- [x] no credential, cookie or token written to the repo, a log or a fixture
- [x] no source footage or completed result modified (prepare/export only read job folders; checked by test)
- [x] real-account check: not needed
