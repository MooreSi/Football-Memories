# Video analysis across two Macs

26 November 2026. Recommendation: keep the existing native M4 worker as the
baseline, benchmark the second Mac, then prefer assigning whole jobs to separate
machines. Splitting one clip is possible engineering work, but connecting a cable
does not make the current pipeline use both Macs.

## Hardware and connection

Follow-up verification on 26 November: the Thunderbolt connection is now active.
System Information identifies a connected MacBook Pro and reports a 40 Gb/s link
(negotiated link rate, not measured application throughput). Existing manual IPv4
settings on both hosts use the same dedicated subnet. Bonjour resolves the peer on
`bridge0`; four ICMP packets returned with zero loss and 0.659 ms average round trip,
and the peer's existing SSH port accepts TCP connections over that bridge. The
internet default route remains Ethernet. System Settings still displays “Unknown
state”, despite its member interface showing Active and successful network tests.
No settings change, host trust acceptance or remote login was necessary. Private
addresses are deliberately omitted from the committed report.

Read-only inspection identifies this host as an Apple M4 Mac mini, 10 CPU cores
(4 performance, 6 efficiency), 24 GB memory. Its native LaunchAgent is configured
with detector and ReID profiles. Analysis already runs on this Mac, outside Docker.

At the initial inspection, `system_profiler` reported no FireWire device and no
connected Thunderbolt device. `ifconfig` showed all bridge member interfaces inactive,
without a bridge IP address. Thus no usable cable network was visible at inspection;
the connection state was not verified. The owner subsequently confirmed a
Thunderbolt cable and a MacBook Pro with an M3 chip and 18 GB memory. The exact
chip variant, macOS and measured analysis performance remain unconfirmed.
Bonjour briefly advertised a MacBook Pro SSH service over Ethernet/Wi-Fi, which
does not establish that it is the owner's intended second Mac. A strict, batch-mode
SSH probe stopped at unknown-host-key verification; no remote command ran and no
trust setting was changed.

Apple supports [IP networking between Macs over Thunderbolt](https://support.apple.com/en-ie/guide/mac-help/mchld53dd2f5/27/mac/27).
A genuine Thunderbolt cable and active Thunderbolt Bridge provide a transfer path;
they do not combine this application's GPU or memory across hosts. Ordinary USB-C
cables must not be assumed to provide that Thunderbolt connection.

For this pair, keep the M4 mini as the baseline and use the M3 MacBook Pro as a
candidate for independent jobs. Its 18 GB is a separate memory budget, not an
addition to the mini's 24 GB. A whole-job move could also free the mini for hosting
and interactive work, but faster completion depends on stage timings and transfer
cost. The supplied specifications do not justify ranking the two machines without
a representative benchmark, especially before confirming the exact M3 variant.

## Existing performance evidence

These are historical measurements from the worker repository, not fresh benchmarks
or a complete timing breakdown of today's Video Lab pipeline.

| Worker evidence | Observation | Implication |
| --- | --- | --- |
| `docs/DETECTOR_TRIAL.md`, 24 November | Old Faster R-CNN detection 430–760 ms/frame; selected widescreen YOLO11l CoreML about 69–71 ms/frame | Detection has already received a substantial speed improvement. |
| Same trial | 120-second full analysis without action spotter took 167 seconds; remaining work largely decode, annotation/re-encode and camera-motion estimation | Faster neural inference alone cannot remove all remaining time. |
| Same trial and `lookahead.py` | Local detection/tracking overlap improved speed only 3–5% | Existing pipeline already overlaps some CPU and detector work. |
| `docs/HANDOFF.md`, 25 November | Refined pitch atlas build around 230 seconds for a 240-second clip | Pitch reconstruction is a substantial separate cost. |
| `docs/TEN_MINUTE_TRIAL.md`, 24 November | Older full ten-minute run took 45m15s, including 699s T-DEED inference | This used the old detector and action/OCR stages; it is not a current Video Lab estimate. |

The current detector uses CoreML `ComputeUnit.ALL`; Apple documents this as allowing
the OS to choose CPU/GPU/Neural Engine execution, not proof that every operation
runs on the Neural Engine. See [Apple MLComputeUnits](https://developer.apple.com/documentation/coreml/mlcomputeunits.md).
ReID selects MPS when available. More RAM or more GPU cores on another Mac will
therefore benefit stages differently; chip names alone cannot establish total speed.

## Options

| Option | Benefit | Required work |
| --- | --- | --- |
| Continue on this Mac | Known working native acceleration; no transfer delay | Establish a fresh end-to-end baseline. |
| Run the entire job on the second Mac | Faster turnaround if its measured compute gain exceeds transfer and startup time; frees this host for the app | Matching code/models/dependencies, private file transfer, isolated output and verified result import. |
| One independent job per Mac | Best initial approach for increasing batch throughput | Scheduler with atomic job claims, per-worker workspaces, failure handling and controlled publication. |
| Split one clip between Macs | Could reduce time for a single clip | Ordered detection results, timestamp handling, stateful tracking, cross-chunk identity reconciliation, camera overlap and global atlas fitting; substantially more work. |
| Different stages on different Macs | May overlap independent branches | Explicit dependency graph and profiling; current camera then ReID stages run sequentially and both inherit full result folders. |

The worker `watch()` takes an exclusive `.worker.lock`; it is intentionally a
single-worker queue. `process_one()` changes queued state without a distributed
claim protocol and treats a discovered running job as interrupted. The gateway's
`video_analytics.py` and `video_analytics_veo.py` also reject a second active job.
Simply mounting the same runtime folder on two Macs and launching another worker
is not a supported way to add capacity.

For independent jobs, two equally fast workers have an ideal ceiling near twice
the throughput, before transfer, scheduling and contention. A worker half as fast
adds at most about 50% throughput. Neither result makes one unchanged job finish
twice as fast. For splitting a single job, an illustrative 60% parallelisable
fraction yields at most 1 / (0.4 + 0.6/2) = 1.43 times speed before communication;
60% is an example, not a measured fraction of this pipeline.

Transfer time matters when offloading complete results: bundles contain source and
annotated videos, and some stages copy inherited artifacts. At a hypothetical
measured 100 MB/s, each 1 GB transferred adds about 10 seconds; at 1 GB/s it adds
about 1 second. These are arithmetic examples, not observed link speeds.

## Recommended next measurement

1. Confirm the MacBook Pro's exact M3 variant and macOS. Active Thunderbolt
   networking is now verified; application throughput still needs measurement.
2. Copy one already archived representative 2–4 minute clip into a new private
   scratch directory on each host. Use identical code revisions, model hashes,
   resolution and sampling; leave existing footage/results untouched.
3. Measure source transfer, cold model load, detection/tracking/render, camera/atlas,
   ReID, packaging, returned result transfer and total time separately. Repeat warm
   runs with comparable machine load; report median and variation. Check artifact
   hashes, duration and equivalent output quality.
4. Offload whole jobs only if remote total time is better. For a backlog, prototype
   independent workers before investing in splitting one clip. Keep source-account
   access on its existing helper and retain owner/admin checks at result publication.

No new analysis, bulk transfer benchmark, software installation, deployment, account
access or footage modification was performed for this investigation. A numeric
speedup for the second Mac remains unmeasured.
## Measured on 26 November 2026 (evening)

Both hosts idle at start, same code (worker 5a74a19, code digest matched) and
same pinned detector/ReID hashes. Read-only scripts in a private scratch runtime;
no production queue, source or result touched.

**Compute units, one 1920x1080 frame / 64 player crops (median):**

| Stage | M4 mini | M3 Pro (5P+6E, 18 GB, macOS 26.6.2) |
| --- | --- | --- |
| Detector CoreML `ALL` | 75 ms | 72 ms |
| Detector `CPU_AND_NE` | 70 ms | 72 ms |
| Detector `CPU_AND_GPU` | 155 ms | 114 ms |
| Detector `CPU_ONLY` | 277 ms | 297 ms |
| ReID ViT-B/16 MPS | 1157 ms | 836 ms |
| ReID CPU | 1977 ms | 2168 ms |

`ALL` already lands on the Neural Engine on both hosts; ReID's MPS default is
right on both. The M3 Pro GPU is 1.39x faster for ReID; the two Neural Engines
detect at the same speed. No compute-unit setting change is justified.

**Containers:** Docker on macOS runs a Linux VM with no CoreML/Neural Engine or
PyTorch MPS. A containerised worker would run near the CPU-only rows (about 4x
slower detection, 1.7-2.6x slower ReID). Analysis stays native on both Macs; the
app and gateway remain containerised. The MacBook node is a native venv reached
over SSH bound to the Thunderbolt bridge (route verified via `bridge0`).

**End to end, 60 s cached clip, prepare_lab, two repetitions each:**

| Mode | Wall time | Stages |
| --- | --- | --- |
| Local | 108.9 s, 112.2 s | detect/track/render 51 s, camera/pitch 38-40 s, appearance 19 s |
| Remote (whole job on M3 Pro) | 106.0 s, 107.7 s | includes transfer both ways |
| Split | 89.7 s, 102.5 s | local detect 53/67 s, then local camera 35-36 s overlapped with remote appearance 18-19 s |

All six completed with 21 files, matching source hash, source unchanged. Split
was fastest in both reps (8-18%); rep 2's slower local detection was unexplained
machine load. Remote is roughly equal to Local because detection dominates and
both Neural Engines match. Two reps on one clip: indicative, not a throughput
benchmark. The biggest remaining lever is the sequential detection stage (Neural
Engine and GPU are separate units that could share frames) or one whole job per
Mac for a backlog; neither is built.

**Incident found:** remote had been silently unavailable because the MacBook
still ran 70f44ac after the mini moved to 5a74a19; the digest check failed closed
as designed. Fixed by syncing the two changed source files (no dependency
change); prior tree kept as `src.70f44ac` on the MacBook. Deploy worker code to
both hosts together.

## ReID on the Neural Engine via Core ML (measured 26 November 2026)

Scratch-only conversion of the pinned SportsReID ViT-B/16 (sha256 a78d265b...) with
coremltools 9.0 via `torch.export` (the `jit.trace` path fails on torchvision ViT
shape casts with torch 2.11), FP16 ML program, fixed batch 1/16/64. Nothing in the
repos, models folder or production worker changed. 128 real person crops from 8
frames of a cached clip; reference is FP32 PyTorch on CPU. Time per 64 crops,
model only (identical preprocessing excluded), median:

| Backend | M4 mini | M3 Pro |
| --- | --- | --- |
| PyTorch MPS (current) | 1152 ms | 817 ms |
| PyTorch CPU | 2291 ms | 2161 ms |
| Core ML batch 1, `CPU_AND_NE` | 573 ms | 533 ms |
| Core ML batch 16, `CPU_AND_NE` | 387 ms | 365 ms |
| Core ML batch 16, `ALL` | 380 ms | 548 ms |
| Core ML batch 64, `CPU_AND_NE` | 480 ms | 359 ms |
| Core ML batch 64, `CPU_AND_GPU` | 764 ms | 560 ms |

Batch 16 on `CPU_AND_NE` is about 3.0x (mini) and 2.2x (M3 Pro) faster than the
current MPS path. Ask for `CPU_AND_NE` explicitly: on the M3 Pro `ALL` sometimes
scheduled batch 16 off the Neural Engine. Neural Engine first load compiles the
model (8-10 s at batch 16, 25-27 s at batch 64) once per process.

Accuracy: per-crop cosine to the FP32 reference min 0.99989, mean 0.99997; pairwise
similarity differs by at most 0.005. No pair in this crop set reached the 0.95
merge threshold in the reference, so "zero decision flips" here is weak evidence:
only pairs within ~0.005 of 0.95 could change grouping. Effect on the whole
appearance stage (19 s per 60 s clip, which also includes crop decoding) is
unmeasured. Not integrated: needs a pinned mlpackage hash in the ReID config, an
`appearance` Core ML path with tests, and a before/after grouping comparison.

### Core ML ReID in the worker (built, not enabled)

`ReidEmbedder` uses a pinned Core ML export when the ReID config has
`"coreml": {"model", "sha256"}` (tree hash, like the detector), loaded with
`CPU_AND_NE`, fixed batch with padding dropped. Without that entry the PyTorch path
is unchanged. The node probe reports `reid_coreml_sha256`; readiness requires it to
equal the coordinator profile's optional `reid_coreml_sha256` (both absent is
fine), so the two Macs can never mix backends in Split. Build the export with
`tools/convert_reid_coreml.py` (refuses an existing output, prints the entry).

Whole `prepare_review` on six cached games (outputs in scratch, bases unchanged):

| Game | Tracks | MPS s | Core ML NE s | Adjusted Rand vs MPS |
| --- | --- | --- | --- | --- |
| 03964514 | 1100 | 99.4 | 44.0 | 0.996 |
| e6e2c61a | 618 | 69.3 | 34.7 | 0.685 |
| f2bb7aac | 5175 | 239.2 | 91.8 | 0.996 |
| 09b50973 | 2106 | 241.2 | 140.7 | 0.983 |
| c880cae0 | 2199 | 187.1 | 87.5 | 0.896 |
| cbd21303 | 973 | 88.0 | 35.5 | 0.975 |

The stage runs 1.7-2.6x faster. Control: MPS run twice gives identical groups
(Rand 1.0) on e6e2c61a and c880cae0, so the e6e2c61a (16.5% of tracks relabelled)
and c880cae0 changes are caused by FP16 Core ML, not run-to-run noise. Which
grouping is better is unknown (no reviewed truth). Owner decision needed before
enabling; until then no config carries a `coreml` entry.
