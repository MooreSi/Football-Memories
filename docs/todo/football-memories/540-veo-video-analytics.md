# 540: Veo video analytics on ad hoc AWS compute

**Status:** Draft — research complete; implementation not started.
**Sensitive:** future cloud upload of match footage; no account/session changes in this checkpoint.
**Research date:** 2026-11-23. [Evidence, model runbook and costs](../../research/veo-video-analytics-2026-11-23.md).

## What is wrong or missing today

The app imports Hudl player actions and Veo team events but cannot generate those
annotations itself. The owner's Veo account has not supplied usable pitch/player
tracking. An independently owned pipeline should analyse an authorised local video,
return reviewable metadata and make the match and highlights downloadable.

## What changes

Proposed stages: (1) benchmark representative Veo follow-cam footage, (2) S3 upload,
AWS Batch GPU worker and verified download, (3) reviewed team-event suggestions,
(4) player attribution and finer actions after measuring accuracy. Keep models in
an isolated worker image, separate from the Python 3.12 app. Choose exact models
after the benchmark and code/weights/data licence review. No AWS resources are
created or footage uploaded by this research task.

## What must NOT change

- Existing source events, account permissions, credentials, request pacing and
  source caches; generated events have independent provenance.
- Existing library files, import naming and verified `.part` publication rules.
- Unknown/off-screen events stay unknown; predictions do not become confirmed
  player statistics without acceptance under an explicit quality policy.
- Owner corrections persist through model reruns. Cloud originals are temporary
  copies; the local archive remains authoritative.

## Non-goals

Full-pitch tracking from unseen follow-cam pixels; downloading Veo proprietary
models; guaranteed Hudl parity; generic LLM match tagging; production deployment
or a source account check during research.

## Open questions and provisional defaults

- Available video: assume authorised follow-cam MP4, not panoramic export.
- Initial scope: reviewed team events, then player actions; no full-match running
  metrics from cropped footage.
- Region: London `eu-west-2`; proposed seven-day temporary cloud retention,
  subject to explicit implementation settings and download acknowledgement.
- First benchmark: 3–5 varied matches; 2 held out untouched. Request actual
  sample selection when implementing, not access to the live account now.
- Model/data licences and training rights must be resolved per artifact before
  deployment; FOOTPASS's README and LICENSE currently disagree.

## Test plan (future implementation)

| Test | Asserts | Negative control |
|---|---|---|
| Media integrity | Same source checksum/duration on return | Truncated/wrong-match output rejected |
| Job isolation | Owner can access only own jobs and objects | Another owner's identifier denied |
| Replay/resume | Duplicate notifications/retries do not duplicate accepted events | Same bytes/new model creates separate analysis version |
| Temporal mapping | PTS and half offsets seek to correct source frames | VFR and edited halves reveal naive frame/FPS errors |
| Unknown coverage | Unseen players/ball stay unknown | No ball or readable shirt cannot create attributed passes |
| Review persistence | Corrections survive rerun | Conflicting prediction cannot replace accepted edit |
| Failure/cost control | Timeout, cancel and retry stop bounded work | Interrupted upload/Spot worker cannot publish success |
| Accuracy | Per-class held-out precision/recall and identity accuracy | Empty predictions cannot pass recall/coverage gates |

## Real-account check

None needed for research. Future benchmark uses owner-selected, already obtained
files and an explicitly costed AWS trial. Do not change source authentication.

## Verification

- Research sources and AWS regional price feeds read; cost arithmetic checked.
- Documentation links checked at the research checkpoint.
- No model inference/training, GPU throughput measurement, footage transfer,
  account access or infrastructure provisioning performed.
- Docs only: application suites not rerun; no code, dependencies or schema changed.
