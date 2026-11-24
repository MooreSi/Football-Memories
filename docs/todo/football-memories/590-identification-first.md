# 590: Identification before game statistics

**Status:** Building — experimental worker stage; no promotion/deployment
**Sensitive:** no account/storage change; existing local footage read-only

## What is wrong today

Team and player attribution must precede passing/tackling statistics. Prior
appearance groups mix kits and sideline people can become officials. Tracklets
and raw detection counts are not named identities or accuracy.

## What changes

Private worker `codex/local-pipeline`: source-bound multi-view kit/role examples,
calibrated image-space pitch boundary, track consistency/conflict abstention,
ball evidence, fresh annotated preview and a precision/coverage audit utility.
Explicit goalkeeper, official and non-player examples replace third-colour role
guesses in this opt-in stage. Identification runs do not newly credit actions
or ball proximity to a team. Research follows the stage separation in
[SoccerNet GSR](https://arxiv.org/abs/2404.11335).

Use a different real ten-minute game. Initial indoor 540p trial completed but
failed its withheld assistant visual check (3/51 players assigned, 2 correct;
0/67 sideline team leaks; official0/6). Existing SportsReID full-body comparison
also failed a useful precision bar. Preserve both as rejected evidence. A second
existing local 1080p outdoor Villa–Stoke source has clearer pink/white versus dark
kits; its 18:00–28:00 analysis is running. No new account request/download.

## What must NOT change

Input/archive and completed runs stay intact; calibration is bound to source hash.
Keep full-admin/CSRF/owner/MFA boundaries and source/review/prediction distinctions.
No default/native-worker/app promotion, named-player identity or action reliability
claim. No new runtime dependency or hidden pretrained download.

## Non-goals and next evidence

Do not expand passing/tackling or physical stats while identification is weak.
One match and an assistant visual audit cannot establish match generalisation or
independent human accuracy. Require reviewed team/role/jersey evidence, tracking
metrics and independently held-out matches before promotion.

## Test plan and verification

Synthetic tests observed red first for kit/role examples, sideline exclusion,
conflicting tracks, bounded pitch intervals, source mismatch, source/parent/bundle
preservation, ball jumps/outside candidates and audit error/abstention metrics.
Worker initial103 tests/CI green; measured checkpoint110 tests/CI green. Existing
app/gateway code and deployment unchanged. Final counts and new trial evidence
will be recorded in the handoff and private worker `docs/IDENTIFICATION_TRIAL.md`.
