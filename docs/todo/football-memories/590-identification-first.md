# 590: Identification before game statistics

**Status:** Experimental checkpoint complete; identification quality target not met
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
existing local1080p outdoor Villa–Stoke source with clearer pink/white versus dark
kits completed on18:00–28:00 source time (600.04s): baseline1058.956s, calibrated
replay569.952s. No new account request/download.

A frozen148-observation/eight-timestamp assistant audit gives52→55/100 outfield kit
coverage, all55 assigned outfield kits correct. Overall team-credit precision
94.55→94.83%, but sideline people wrongly credited2→3 (worse). Role accuracy
35.14→51.35%, goalkeeper3/6, referee0/6; OCR0 accepted numbers/0 names. These are
modest gains and unresolved failures, not reliable player identification. Keep
passing/tackling deferred. Same-source assistant labels are not independent human
or match-disjoint evaluation.

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
Worker111 tests/lint/format/project and code CPU CI pass. Existing app/gateway code
and deployment unchanged (app docs-only local link/diff checks). Both HD outputs
pass10/12 artifact hashes/sizes, ZIP CRC/JSON payloads and full decode; source/raw/
parent unchanged. Evidence in handoff and worker `docs/IDENTIFICATION_TRIAL.md`.
The worker stage is implemented; individual identity/reliable statistics are not
achieved. No input/archive/result overwrite or hidden model/runtime download.
