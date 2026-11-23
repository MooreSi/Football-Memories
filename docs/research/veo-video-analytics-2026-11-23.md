# Veo video analytics: feasibility, models, AWS design and cost

Research date: **23 November 2026**. Prepared for Football Memories, branch
`codex/veo-analytics-research`. Implementation proposal: [spec 540](../todo/football-memories/540-veo-video-analytics.md).

## Recommendation

Build a **reviewable, progressively trained pipeline**, starting with the Veo
follow-cam MP4 already obtained by the owner. Use S3 and AWS Batch on ephemeral
EC2 NVIDIA instances in London. Start with team-event suggestions and video/JSON
return, then add shirt-number attribution and fine-grained actions as separate
quality gates. Preserve source metadata and distinguish generated suggestions
from accepted facts throughout the app.

Budget **$2–6 per 60-minute match** for an initial useful automated pass once
models and code exist; **$6–15** for heavier player/action passes. These are
engineering allowances, not measured inference costs or guarantees of Hudl
accuracy. A lightweight event-only pass could be around **$1**. Detailed examples
below include one download and seven days of temporary storage. Training,
labelling, development and human review are separate.

The biggest feasibility issue is the input, followed by identity and event
accuracy. More GPU power cannot recover players outside a downloaded camera crop.

## 1. What the app actually has today

Read the current code rather than assuming the SQL event table is the whole
integration. Connected-match metadata also lives in the companion's caches.

| Existing surface | Contract relevant to this pipeline |
|---|---|
| `backend/app/connectors/hudl_capture.py`, `Moment` | Stable source-event ID, start in video seconds, duration, category, player codes, actions |
| `backend/app/connectors/hudl_actions.py` | Passing, assists, key passes, on-target shots, chances, crosses, tackles, interceptions, blocks, clearances, regains, offsides, attacking/defensive 1v1, fouls, dribbles, possession lost, penalty outcomes |
| `backend/app/connectors/veo/_parse.py` | Highlights; halves; score; team event type, own/opponent side, video seconds and period; per-side totals |
| Veo `team_moments` | Goal, shot, corner, foul, free kick, penalty, throw-in and goal kick become selectable clips, normally starting 10 seconds before the event |
| `backend/app/models.py` | Match, media asset checksum/path, source tag definitions and timed events with player relationships |
| [Connector knowledge](../system/domains/connectors/README.md) | Existing source safeguards, permissions and observed data limitations |

Important semantic traps: the legacy Hudl `shots` action allowlist means **on
target**, not every shot; generic Passing does not necessarily establish a
completed pass; a 1v1 is not a duel win; a chance is not xG. Generated metadata
needs explicit event definitions and outcomes, then a deliberate adapter to
these existing labels. Do not copy misleading semantics into a new model.

The recorded November Veo account checks found team events and totals but null
pitch positions, empty/refused physical/tracking data and no player attribution
in inspected highlights. This is account-specific evidence, not a statement
about all Veo subscriptions. A shared recording may expose less again.

## 2. What the commercial systems use

Public sources describe capabilities and parts of workflows. They do **not**
publish enough to identify their complete neural networks, training sets,
thresholds, infrastructure or per-match costs. The following is what is actually
documented, not a claim that they use the open-source components proposed here.

| System | Documented approach | Lesson for Football Memories |
|---|---|---|
| Hudl Assist / Assist+ | Hudl says most sports rely on trained human analysts. Soccer Assist+ adds player and location detail; its published taxonomy includes passes, receptions, defensive and keeper actions. AI summaries are downstream of match breakdowns. | Our Hudl metadata is not evidence that an off-the-shelf football AI can reproduce it. Plan an event review workflow. |
| Veo | Automated capture and event detection; Player Moments detects shirt numbers, uses involvement rules, and requires correct sides, periods and lineup mapping. Analytics 2 includes player analysis. | Identity needs temporal evidence plus roster mapping. Proximity highlights and accurate action labels are different products. |
| Spiideo | AutoData Advanced is described as analyst-tagged; Activity provides machine-generated tracking. | Treat event coding and physical tracking as separate deliverables and evaluation problems. |
| Pixellot | AI/computer vision capture, full-pitch tactical video and pre-tagged analysis workflows. | Capture geometry and the availability of a full-field view matter as much as detector choice. |
| Trace | Automated player-focused soccer highlights and full-game delivery. Internal model implementation is not disclosed in the checked page. | A useful player highlight product can precede exhaustive event statistics. |

Sources: [Hudl FAQ](https://www.hudl.com/products/assist/faq),
[soccer scope](https://www.hudl.com/products/assist/soccer),
[Hudl AI summaries](https://support.hudl.com/s/article/ai-insights-soccer?language=en_US),
[Veo Player Moments](https://support.veo.com/hc/en-us/articles/27698176364817-Overview-of-Veo-Player-Moments-How-to-track-and-follow-players-in-your-Veo-recordings),
[Veo Analytics 2 update](https://updates.veo.co/announcements/veo-analytics-2-is-here),
[Spiideo Advanced](https://support.spiideo.com/en/articles/9306177-autodata-soccer-advanced),
[Spiideo Activity](https://support.spiideo.com/en/articles/13368675-autodata-soccer-activity),
[Pixellot soccer](https://www.pixellot.tv/sports/soccer/),
[Trace soccer](https://traceup.com/sports/soccer).

## 3. The Veo input constraint

Veo's official documentation says that a full-match download supplies the
**follow-cam MP4**. Panoramic/interactive views and Analytics data are not part
of that download. Access to an online view is not evidence of a supported raw
export. The existing connector's preference for `render_type=standard` also
does not prove panoramic access. [Official download limitations](https://support.veo.com/hc/en-us/articles/4451733961361-How-to-download-your-Veo-recordings).

Therefore make the first version work on a moving, cropped camera view. It can
detect visible action and produce useful suggestions. It cannot continuously
track all players, measure total distance, reliably count every off-ball action
or create complete positional heatmaps. Store visibility/validity intervals;
label any map as observed coverage. Interpolating a short occlusion is different
from inventing a player's position during minutes outside the frame.

If an authorised panoramic/original export becomes available through a supported
route, benchmark it separately. A panoramic view has its own issues: smaller
players/ball per pixel, lens/stitch distortion and potentially non-projective
geometry. Rectify or model the projection before applying a flat homography.

The first inspection should record codec, dimensions, frame-rate/time-base,
variable-frame-rate behaviour, bitrate, black periods, camera height, zoom,
number readability, line visibility, ball pixel size and whether the crop loses
shots near either goal. Check youth 5v5/7v7/9v9 as well as 11v11. Do not assume
a 105 × 68 m adult pitch or two 45-minute halves.

## 4. Which open-source pieces to use

These are complementary components, not interchangeable complete solutions.
Licence notes are deployment screening; audit exact pinned code, weights and
training data separately before shipping.

| Component | Candidate and availability | Recommendation / limitation |
|---|---|---|
| Decode/probe/export | Existing FFmpeg; OpenCV for geometry | Reuse FFmpeg; stream frames rather than saving every full-resolution frame. Use PTS for source alignment. |
| Player detector | [RT-DETRv2](https://github.com/lyuwenyu/RT-DETR/tree/main/rtdetrv2_pytorch), official COCO checkpoints and training/export code | Compare small/medium models on our footage; fine-tune player, keeper, referee and ball classes. Apache-2.0 code; verify checkpoint/data terms independently. COCO ball detection is not proof of tiny football-ball recall. |
| Tracking | [ByteTrack](https://github.com/FoundationVision/ByteTrack), MIT | Good simple baseline on detector boxes; add motion compensation and appearance/number evidence if identity switches require it. Track ID is not player identity. |
| Calibration / role / jersey research | [SoccerNet Game State](https://github.com/SoccerNet/sn-gamestate) / TrackLab | Downloadable baseline with player tracking, role/team/jersey and pitch projection. Excellent benchmark reference; GPL-3.0 code and a complicated older dependency stack, not a drop-in app dependency or ball-action engine. |
| Shirt numbers | [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR) as an OCR baseline, plus dedicated digit classification on our crops | Generic OCR needs football-specific testing. Aggregate high-quality observations across a track, preserve alternative hypotheses and allow roster confirmation. |
| Sparse event spotting | [E2E-Spot](https://github.com/jhong93/spot) and [published checkpoints](https://github.com/jhong93/e2e-spot-models) | Real downloadable SoccerNet weights/configs; useful starting baseline for 17 event types. Does not supply player attribution or every pass. BSD-3 code; no blanket assumption that the separate weight release/data is unrestricted. |
| Player-attributed actions | [FOOTPASS](https://github.com/JeremieOchin/FOOTPASS) | Particularly relevant 2026 reference: predicts frame, team, jersey and action; TAAD, GNN and sequence-refinement baselines. Training/data route exists; no ready Veo-trained checkpoint established. Licence conflict described below. |
| Labelling | [CVAT Community](https://github.com/cvat-ai/cvat), MIT core | Self-host annotations and review; keep children’s footage out of public datasets. Review optional model assets separately. |
| Examples | [Roboflow sports](https://github.com/roboflow/sports), MIT code | Useful geometry/team/ball examples; tutorial code licensing does not automatically cover every dataset, model or dependency it invokes. |
| Deployment | PyTorch initially; ONNX/TensorRT when validated | Keep a reproducible reference before optimising. Verify numerical/event equivalence after export. |

Ultralytics YOLO is a valid benchmark alternative, but its [AGPL-3.0 licence](https://github.com/ultralytics/ultralytics/blob/main/LICENSE)
requires a deliberate distribution/hosting decision or an appropriate alternative
licence. Putting a model behind a worker process is not, by itself, a resolution.
Do not choose it merely because a demonstration notebook uses it.

FOOTPASS has a material inconsistency: its checked `LICENSE` is Apache-2.0,
while the README says annotations **and baselines** are CC BY-NC 4.0. Treat its
deployment rights as unresolved; do not ship it into hosted libraries until
clarified. Public source availability does not resolve noncommercial data terms.
[README](https://github.com/JeremieOchin/FOOTPASS#-license),
[LICENSE](https://github.com/JeremieOchin/FOOTPASS/blob/main/LICENSE).

An RT-DETR weight-licensing clarification request also exists; the code licence
alone is insufficient evidence for all released checkpoints. Record the answer
or choose an explicitly documented artifact. [Upstream issue](https://github.com/lyuwenyu/RT-DETR/issues/685).

Do not make general-purpose Rekognition or a video-language model the event
engine. Object recognition and prose descriptions do not establish a timed,
player-attributed pass/tackle taxonomy. Rekognition Custom Labels documents
image object/concept detection; it is not a pretrained football breakdown
service. [AWS documentation](https://docs.aws.amazon.com/rekognition/latest/customlabels-dg/).

## 5. Exactly how downloading and training would work

**Research performed here:** upstream instructions, configs, available artifact
paths and licences were inspected. No model weights were executed, no match
was analysed, and no training or AWS job ran. Commands below are upstream
entry points and a proposed isolated runbook, not a claim of tested installation.

### Downloaded-model route

1. Build a separate Linux/CUDA worker image with a pinned Python/PyTorch stack.
   Do not install the research stack into the app's Python 3.12 environment.
2. Pin upstream commit, config and weight files; save hashes, source URL,
   allowed use, preprocessing, class order and training-data provenance in an
   artifact manifest. Download at image/model preparation time, not from random
   URLs on every match. Avoid untrusted executable checkpoint contents.
3. For a small detection baseline use the official RT-DETRv2-S COCO artifact
   `rtdetrv2_r18vd_120e_coco_rerun_48.1.pth`, linked from the upstream model table,
   with `configs/rtdetrv2/rtdetrv2_r18vd_120e_coco.yml`. Its published FPS is a
   single-model 640-pixel benchmark, not this pipeline's throughput. Licence
   clearance remains an artifact acceptance gate.
4. For sparse events obtain both `config.json` and `checkpoint_140.pt` from
   `soccer_rny008gsm_gru_rgb` in the E2E-Spot model repository. The config says
   `soccernetv2`, 17 classes, RGB, `rny008_gsm`, GRU, clip length 100; the note
   describes frames downsampled to 224 pixels high. Preserve the repository's
   exact extraction/normalisation and label order. Do not feed arbitrary
   1080p tensors or silently change temporal sampling.
5. Upstream E2E-Spot inference entry point:

   ```sh
   python3 test_e2e.py <model_dir> <frame_dir> -s <split> --save
   ```

   This expects its dataset/split structure. Supporting a new Veo MP4 needs an
   adapter to decode frames, register sequence metadata and map predictions
   back to source PTS; it is not an arbitrary-MP4 command as written.
6. The Game State baseline documents automatic dataset/weight retrieval on
   `uv run tracklab -cn soccernet`; its default run is a validation clip, not
   our match. Its README currently recommends a separate Python 3.9 environment
   and `mmcv==2.0.1`. Configure our sequence and paths, lower module batches to
   fit VRAM and audit model dependencies before containerising. Use as a
   reference experiment before deciding which modules to adopt.

Verified upstream pointers: [RT-DETRv2 model table and exports](https://github.com/lyuwenyu/RT-DETR/blob/main/rtdetrv2_pytorch/README.md),
[E2E-Spot run commands](https://github.com/jhong93/spot#basic-usage),
[checkpoint config](https://github.com/jhong93/e2e-spot-models/blob/main/soccer_rny008gsm_gru_rgb/config.json),
[checkpoint preprocessing note](https://github.com/jhong93/e2e-spot-models/blob/main/soccer_rny008gsm_gru_rgb/README.md),
[Game State setup](https://github.com/SoccerNet/sn-gamestate#quick-installation-guide).

### Training on Veo footage

Start with transfer learning, not random initialisation. Different components
need different labels; training a player detector does not train a pass model.

1. **Agree the ontology.** Define shots/on target, pass attempts/completions,
   receptions, regains/interceptions, tackles, duels, restarts, keeper actions,
   assists and time anchors. Store uncertain and unobservable explicitly.
2. **Collect representative authorised matches.** Starting planning allowance:
   10–20 matches across camera placements, pitches, kit pairs, weather, youth
   formats and halves. Reserve entire matches (and preferably venues/teams)
   for validation/test; adjacent frames split randomly would leak information.
   These sample sizes are a pilot budget, not a sufficiency guarantee.
3. **Label detection.** Start with 2,000–5,000 diverse sampled frames, including
   empty/negative and difficult ball frames. Annotate all visible people/balls,
   roles and visibility consistently. Use a high-resolution/tiled ball path;
   avoid shrinking the whole pitch until the ball vanishes.
4. **Label identity.** Annotate 100–300 short track sequences to start, jersey
   readings, team/keeper/referee roles, substitutions and entry/exit boundaries.
   Shirt number → player is an owner-confirmed roster mapping, scoped per match.
   Reused/duplicate numbers and changed kits must not silently merge players.
5. **Label temporal events.** Fully label a few selected games for target
   classes, not only highlights. Store actor, receiver where visible, outcome,
   timestamp and confidence/ambiguity. Add ordinary play and confusing
   negatives. Use existing Hudl/Veo tags as weak labels only when rights and
   source-video alignment are established; they may be incomplete or use
   different definitions. Owner edits are useful labels, not automatic
   permission to train on everybody's footage.
6. **Train separate heads.** Fine-tune detector on COCO-format labels; fit
   team/jersey components on crops; train a temporal model over ball motion,
   track interactions and video crops. E2E-Spot supports a `soccernet_ball`
   dataset too, but available sparse-event weights do not magically become
   dense pass/action weights. Extend the taxonomy/loader deliberately.
7. **Evaluate before adding complexity.** Detector small-ball recall, tracking
   HOTA/IDF1 and switches, jersey accuracy/abstention, event precision/recall
   per class within declared timing tolerances, and joint event+team+player
   accuracy. Measure whole-match counts, unknown coverage and reviewer minutes.
   Use complete held-out video so missed events are counted.
8. **Iterate with active learning.** Label high-uncertainty/failure examples,
   retrain, compare on a fixed test set, calibrate class thresholds on validation
   and promote only passing model versions. Store model hashes and training
   dataset versions so any result can be reproduced.

For FOOTPASS the documented order is TAAD training, match inference, conversion
to sequence features, then optional DST sequence refinement. Upstream scripts
are `train_TAAD_Baseline.py`, `run_TAAD_on_matches.py`, `NPpreds2HDF5.py`,
`train_DST.py`; GNN has its own training/environment. Exact data locations and
hyperparameters need inspection/configuration. The reference labels do not
cover the entire Hudl taxonomy. [Upstream training workflow](https://github.com/JeremieOchin/FOOTPASS#-getting-started).

SoccerNet's current data route is Hugging Face. Gated video requires the user's
account to accept the dataset-specific NDA and receive approval. Then use the
approved account, e.g. `hf download SoccerNet/SN-BAS-2025 --repo-type dataset
--local-dir <dataset_dir>` for that approved repository. Do not assume approval
for one dataset grants another, or research access grants commercial rights.
No access request or terms acceptance was made in this task.
[Current data access](https://www.soccer-net.org/data),
[official dataset organisation](https://huggingface.co/SoccerNet).

### What the inference engine actually does

Decode once; retain PTS. Run people/role detection at a measured rate (initial
experiment: 10 fps) and the small-ball path at 25 fps around relevant visible
action. Track between observations, re-estimate moving-camera calibration and
reject unstable fits. Use temporal OCR votes and kit appearance for identity.
Use short video windows plus trajectory/control changes to propose events.

A ball nearest a player is **not** proof of possession: include feet/ball
geometry, motion, visibility and temporal consistency. A completed pass needs
a plausible sender, contact/release, receiver and team/outcome; an interception
requires more than a nearest-player swap. Airborne balls cannot be projected
as if they lie on the ground plane. Fouls/offsides/assists often need contextual
review beyond one contact. Keep unknowns when evidence is absent.

Use overlapping 2–5 minute chunks with source time anchors for resilience;
deduplicate events at overlaps. Carry track evidence across chunks or explicitly
reconcile identities; never assume a track ID survives chunking, a crop loss
or a half-time swap. Player confidence, event confidence and side confidence
are separate. Interpolation does not contribute to measured coverage.

Initial release gate proposal: reviewed goals/restarts, ≥90% precision and
≥80% recall for each enabled common event class on held-out matches, reported
with counts/uncertainty; ≥95% joint identity precision on the subset of events
we actually attribute, with attribution coverage also shown. These are proposed
targets, not achieved results. Disable classes with too little test evidence.

## 6. AWS architecture for occasional jobs

```mermaid
flowchart LR
    A[Football Memories and authorised local MP4] --> B[Multipart upload to private S3]
    B --> C[Validate checksum and probe media]
    C --> D[Step Functions Standard workflow]
    D --> E[AWS Batch on EC2 NVIDIA GPU]
    E --> F[Events and tracking in S3]
    F --> G[Validate and package video plus metadata]
    G --> H[Authenticated result and short-lived download]
    H --> I[Local checksum verification and atomic import]
```

- **Control plane:** keep the app local/hosted as today; add a small authenticated
  cloud job API, status store and Step Functions workflow. Lambda handles short
  control/validation tasks; long video work runs in Batch. SQS is optional for
  decoupling, not a second mandatory scheduler. No GPU endpoint runs all month.
- **Upload:** presigned multipart parts directly to S3; backend-authorised
  owner/job/object keys and checksum/size limits. Create a unique immutable key,
  verify completion and do not start from an arbitrary caller-supplied S3 path.
  Abort abandoned uploads. Do not send Hudl/Veo credentials or source URLs to AWS.
- **Compute:** GPU-optimised ECS AMI, pinned container and weights, GPU=1 job
  requirement, `minvCpus=0`, bounded concurrency and job timeouts. Start
  On-Demand to measure deterministically, then separate Spot/fallback queues.
  GPU quotas/capacity can block work; a zero-idle fleet has cold starts.
- **No Fargate GPU assumption:** AWS Batch's Fargate jobs do not support GPUs.
  Use EC2-backed Batch for CUDA; CPU-only jobs may use Fargate or EC2.
- **Network:** same-region S3 and ECR; S3 gateway endpoint. For low volume,
  ephemeral worker public IPv4 with no inbound security-group rules avoids a
  permanent NAT gateway. Private workers require the appropriate paid interface
  endpoints or NAT for ECS/ECR/logging; an S3 endpoint alone is insufficient.
  Do not accidentally turn fixed networking costs into the largest bill.
- **Storage:** local NVMe or bounded gp3 scratch, with no unbounded decoded-frame
  collection. Model artifacts/ECR layers persist for reuse. Retention and deletion
  must cover inputs, outputs, failed jobs, multipart parts and old object versions.
- **Resilience:** content hash + pipeline version + config hash identify an
  analysis; idempotent stage writes, bounded retry/backoff and chunk checkpoints.
  Failed/cancelled jobs cannot publish a success manifest. A completed-but-empty
  event file is distinct from inference failure or unavailable metadata.
- **Isolation:** scoped IAM roles/object prefixes per owner/job, private buckets,
  encryption, short-lived result URLs and redacted logs. API authorisation is
  required before signing any object; a presigned URL is reusable until expiry,
  not intrinsically a one-use download. Keep these URLs out of logs.
- **Cost controls:** admission estimate and hard limits on job count, duration,
  frames, resolution and retry count. Billing budgets notify; they are not an
  instantaneous spending cap. Scale-in overhead is real billed instance time.

Sources: [GPU jobs](https://docs.aws.amazon.com/batch/latest/userguide/gpu-jobs.html),
[Fargate limits](https://docs.aws.amazon.com/batch/latest/userguide/fargate-job-definitions.html),
[compute configuration](https://docs.aws.amazon.com/batch/latest/APIReference/API_ComputeResource.html),
[managed networking/AMIs](https://docs.aws.amazon.com/batch/latest/userguide/managed_compute_environments.html),
[presigned object access](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html).

### Return format and integration

Return a downloadable package containing `match.mp4`, `events.json`, `events.csv`,
`summary.json`, `manifest.json` and optional `tracking.parquet`/highlights. Preserve
the original match stream when no visual overlays are required; analysis does
not require re-encoding it. An annotated MP4 is an optional derivative. Render
selected clips from original-resolution media with the existing export approach.

New result contract should include source video hash, duration/time-base,
schema/model/pipeline versions, event ID, **event timestamp distinct from clip
start**, clip duration, period, side, action, outcome, optional actor/receiver,
confidence components, coordinates/validity, evidence references and review state.
Tracking belongs in compressed files, not millions of SQL event rows. Suggested
event provenance: `source=local_ai`, linked to the original Veo source identity;
name/schema are proposed, not existing supported import fields.

Add an adapter for connected Veo matches as well as imported local matches.
Do not replace Veo cache fields or pretend generated events came from Hudl.
Keep source and generated counts separate; accepted corrections persist across
reanalysis. Current models lack a full prediction/review/version schema, so this
requires real app work beyond merely saving a CSV. Reuse seek/filter/reel UI once
those contracts exist. Local download writes `.part`, checks hash and media
properties, then publishes a new file without overwriting existing footage.

## 7. AWS cost for one 60-minute match

### Verified prices and assumptions

Region **EU (London), eu-west-2**, Linux shared On-Demand, USD excluding tax.
Queried public AWS regional price-list JSON directly during this research:

| Resource | Rate used | Feed publication |
|---|---:|---|
| g4dn.xlarge, NVIDIA T4 16 GB | $0.615/hour | 2026-11-23 |
| g5.xlarge, NVIDIA A10G 24 GB | $1.277/hour | 2026-11-23 |
| g6.xlarge, NVIDIA L4 24 GB | $1.0216/hour | 2026-11-23 |
| c6i.xlarge, CPU | $0.202/hour | 2026-11-23 |
| gp3 provisioned capacity, baseline performance | $0.0928/GB-month | 2026-11-23 |
| S3 Standard, first 50 TB | $0.024/GB-month | 2026-11-21 |
| Internet egress, first paid 10 TB tier | $0.09/GB | 2026-11-19 |
| Public IPv4 | $0.005/address-hour | VPC price page |

Authoritative machine-readable feeds:
[EC2 and gp3 London](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEC2/current/eu-west-2/index.json),
[S3 London](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonS3/current/eu-west-2/index.json),
[data transfer](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AWSDataTransfer/current/index.json).
The EC2 filter was Linux, Shared, preInstalledSw=NA, capacitystatus=Used;
gp3 capacity excludes additional provisioned IOPS/throughput. Egress is ordinary
AWS Outbound London→External, **not** S3 MRAP's extra transfer charge.
[Instance specifications](https://docs.aws.amazon.com/ec2/latest/instancetypes/ac.html),
[VPC/IPv4 pricing](https://aws.amazon.com/vpc/pricing/).

For arithmetic, use an indicative 3 GB input, 3 GB downloadable output and
0.5 GB combined metadata/other small artifacts: **6.5 GB stored for seven days**.
Video size varies: 60 minutes at 4/8/12/20 Mbps is about 1.8/3.6/5.4/9 GB
before container overhead. These are approximate decimal sizes; actual AWS
metered billing units and bytes should drive the implementation calculator.

Internet upload is free on the AWS side; same-region S3↔EC2 data transfer has
no transfer charge. Requests and any NAT/endpoints are separate. AWS provides
100 GB/month aggregated free internet egress; **none of that shared allowance
is credited in the examples**, to avoid understating costs at volume.
[S3 transfer FAQ](https://aws.amazon.com/s3/faqs/),
[EC2 billing/free-egress policy](https://aws.amazon.com/ec2/pricing/on-demand/).
AWS Batch itself adds no scheduler charge; underlying services are billed.
[Batch pricing](https://aws.amazon.com/batch/pricing/).

### Worked standard example

Assume 2.5 **billed GPU instance-hours** including setup and scale-in allocation,
plus 0.75 CPU instance-hours for probing/packaging or a modest derivative render.
This is a workload assumption awaiting measurement, not an inference benchmark.
gp3 scratch: 100 GB attached for 3.25 hours; month approximation: 730 hours.

| Item | Calculation | Cost |
|---|---|---:|
| Upload 3 GB | AWS ingress | $0.00 |
| GPU | 2.5 × $1.277 | $3.19 |
| CPU stages | 0.75 × $0.202 | $0.15 |
| Temporary S3 storage | 6.5 × $0.024 × 7/30 | $0.036 |
| gp3 scratch | 100 × $0.0928 × 3.25/730 | $0.041 |
| One 3 GB download | 3 × $0.09 | $0.27 |
| Worker IPv4 | 3.25 × $0.005 | $0.016 |
| Requests, workflow, short logs | Planning allowance, not a published unit rate | $0.10 |
| **Estimated total** | Rounded sum | **$3.81** |

Illustrative GBP conversion **$1 = £0.78** gives **£2.97**, excluding VAT. This
is an explicit planning conversion, not a live FX quote. Billing currency,
exchange rate and applicable tax depend on the account.

### Runtime sensitivity and practical budgets

Keep the same sizes and retention; vary the billed GPU time and CPU/overhead.
Different rows represent computation effort, **not guaranteed accuracy tiers**.

| Scenario | Assumed billed compute | Approximate total | Planning range |
|---|---|---:|---:|
| Sparse event-only baseline | 0.75 h T4 + 0.5 h CPU, $0.05 control allowance | $0.94 | $0.75–2 |
| Standard detection/tracking/event experiment | 2.5 h A10G + 0.75 h CPU, as above | $3.81 | $2–6 |
| Heavy multi-pass/player/action experiment | 8 h A10G + 1 h CPU, $0.20 control allowance | $11.08 | $6–15 |

Totals include proportional 100 GB scratch, IPv4, seven-day S3 storage and one
3 GB output download. Even 8 hours of compute does not imply accurate passes,
identity or fouls. Model choice, tiling and calibration can push cost above
these ranges. If a larger-memory GPU host is necessary, reprice that instance.

At the standard assumptions: 20 matches/month ≈ **$76**; 100 ≈ **$381**, before
fixed artifacts/control storage and human review. This conservatively charges
all egress; subtract only the account's genuinely available free allowance.

Spot illustration only: at a hypothetical **60% compute discount** and **20%
additional GPU runtime** from interruptions, standard GPU cost becomes
2.5 × 1.277 × 0.4 × 1.2 = **$1.53**, and total is roughly **$2.2** after small
extra scratch/network overhead. This is not a current Spot quotation; prices
and capacity vary by AZ. Checkpointing and On-Demand fallback are required.

### Costs that can change the answer

- Each additional 3 GB download costs about **$0.27** at the paid tier. Streaming
  and ZIPs containing both full video and extra clips add transferred bytes.
- Keeping the example's 6.5 GB for 30 days costs **$0.156**; a year of storage
  for one such match costs **$1.87**, before requests. Accumulating 100 matches
  costs **$15.60/month** of storage once all are retained, not including backups.
- A 9 GB source and 9 GB return raises one egress to **$0.81** and seven-day
  storage of 18.5 GB to about **$0.104**; computation need not scale in direct
  proportion to bitrate, but higher resolution/tiling can increase it sharply.
- A GPU accidentally left on for 730 hours costs **$449 T4 / $932 A10G** before
  disk/network. Verify actual scale-down, not just job completion.
- Persistent NAT gateways, interface endpoints, an ALB, RDS or SageMaker
  endpoints can overwhelm a small ad hoc budget. They are **not included** in
  this architecture's per-match estimate. Neither are support plans, new app
  hosting, CloudFront, backups, cross-region copies, or premium encryption keys.
- Allow a small separate shared budget for ECR/model S3 artifacts and logs,
  e.g. **$1–5/month** for a small retained footprint; size and retention decide
  the actual amount. There is no promise of a zero AWS bill between matches.
- If the finished file is just the source plus metadata, avoid storing another
  identical object or re-encoding. The example deliberately budgets a separate
  downloadable video so it also covers a modest rendered derivative.

### Turnaround time

A 3 GB upload takes about **20 minutes at 20 Mbps** or **4 minutes at 100 Mbps**
under ideal throughput. A 3 GB download at 50 Mbps takes about **8 minutes**.
Add queue/cold start, inference, packaging and any review. The standard example
is roughly **3–4 hours unattended end to end** if stages run mostly sequentially;
Spot capacity can delay it further. This is an estimate, not an SLA.

At 25 fps, 60 minutes contains 90,000 frames. A 10 fps player path sees 36,000;
a 25 fps ball path sees 90,000, before overlapping tiles/windows and OCR crops.
Measure decoder throughput, detector/ball FPS, event-window rate, calibration,
VRAM, packaging and billed instance lifetime separately. Extrapolate from
representative clips, then confirm with a complete held-out match. Detector FPS
from a model table alone cannot establish end-to-end cost.

## 8. One-time training and human costs

On the checked g5.xlarge price, **10–50 GPU-hours** costs **$12.77–63.85**;
**100–300 GPU-hours** of iterative experiments costs **$127.70–383.10**, plus
storage/CPU/restarts. These are budget scenarios assuming models fit in 24 GB
VRAM, not claims about convergence or a reproduction of published training.
Larger batches/backbones may require larger machines or gradient accumulation.

Labelling and review can dominate. Example planning arithmetic: 40–120 hours
of pilot annotation at an assumed £20/hour is **£800–2,400**; a broader dense
event/identity corpus could take 200–600 hours (**£4,000–12,000** at that assumed
rate). Rates/hours are illustrative, not supplier quotes. Semi-automatic labels
reduce effort only after someone verifies the errors. A 10–30 minute per-match
review at the same assumed rate adds **£3.33–10**; detailed Hudl-like coding may
take substantially longer. Compute cost alone is not the delivered cost of
equivalent metadata.

## 9. Delivery sequence and decisions

1. **Feasibility spike:** select 3–5 representative authorised files, with two
   held out; manually establish reference events/identity. Benchmark downloaded
   sparse events and detector/tracker separately. Deliver evidence clips,
   per-class metrics, visibility limits, licence manifest and measured runtime.
2. **Cloud transport MVP:** upload, checksum, Batch lifecycle, cancellation,
   status, result manifest, downloadable original + JSON/CSV and safe local
   import. An empty-analysis control must prove this works without model claims.
3. **Reviewed team-event MVP:** goals/shots/restarts first; class thresholds,
   review queue, durable corrections and existing reel integration. Retain
   available Veo source tags as independent evidence.
4. **Player development:** roster/number confirmation, identity coverage and
   selected player involvement; then passes/receptions and defensive actions
   once joint attribution/event accuracy warrants it.
5. **Spatial/physical extension:** only after calibration and sufficient visible
   coverage. Full-match physical stats require an adequate full-pitch input;
   youth xG would additionally require a suitable calibrated outcome dataset.

Do not begin by promising every Hudl action. The best first go/no-go is whether
a representative held-out follow-cam match yields useful event/player suggestions
with acceptable review effort. Until measured, the research supports a plausible
architecture and budget, not an accuracy claim.

Open owner choices for implementation: initial event scope; full-pitch source
availability; per-job budget; retention/download policy; review expectations;
private versus distributed model licensing; and rights to use selected footage
and imported tags for training. None blocks completion of this research.

## 10. Reproducibility record and verification limits

Upstream commit heads inspected on the research date (future implementation
must pin the specific artifact/config combination actually tested):

| Repository | Commit |
|---|---|
| SoccerNet/sn-gamestate | `1c958345067218297d221e45e1a6405f975f83e0` |
| jhong93/spot | `edec4201471beed631bed374bd0b95fcdc8a2f4f` |
| jhong93/e2e-spot-models | `10d07a4fb01f2eb76785e15552e5648bf0793509` |
| JeremieOchin/FOOTPASS | `f63f37c1a0c6bcebf568a8ce716495a459376af5` |
| lyuwenyu/RT-DETR | `df2a96c8c3a098567a1149bf0248da6efe6d495d` |
| FoundationVision/ByteTrack | `d1bf0191adff59bc8fcfeaa0b33d3d1642552a99` |

Provider discovery was attempted first using the installed Stripe Directory;
the combined football/AWS query returned no matches. Technical findings above
therefore use public primary documentation, research repositories and AWS's
own price feeds. No provider was purchased or provisioned.

Read-only source research and local code inspection only. No account login,
match download/upload, model inference/training, dependency installation,
infrastructure deployment or live accuracy benchmark occurred. Application
tests were not rerun for this docs-only checkpoint; documentation links and
cost arithmetic were checked. This explicitly leaves real throughput, quality
and operational AWS cost to the feasibility spike.
