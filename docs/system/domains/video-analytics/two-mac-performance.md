# Video analysis across two Macs

26 November 2026. Recommendation: keep the existing native M4 worker as the
baseline, benchmark the second Mac, then prefer assigning whole jobs to separate
machines. Splitting one clip is possible engineering work, but connecting a cable
does not make the current pipeline use both Macs.

## Hardware and connection

Read-only inspection identifies this host as an Apple M4 Mac mini, 10 CPU cores
(4 performance, 6 efficiency), 24 GB memory. Its native LaunchAgent is configured
with detector and ReID profiles. Analysis already runs on this Mac, outside Docker.

`system_profiler` reports no FireWire device and no connected Thunderbolt device.
`ifconfig` shows Thunderbolt Bridge and all three member interfaces inactive,
without a bridge IP address. Thus no usable cable network was visible at inspection;
the cable type, connection state and second Mac specification remain unconfirmed.
Bonjour briefly advertised a MacBook Pro SSH service over Ethernet/Wi-Fi, which
does not establish that it is the owner's intended second Mac. A strict, batch-mode
SSH probe stopped at unknown-host-key verification; no remote command ran and no
trust setting was changed.

Apple supports [IP networking between Macs over Thunderbolt](https://support.apple.com/en-ie/guide/mac-help/mchld53dd2f5/27/mac/27).
A genuine Thunderbolt cable and active Thunderbolt Bridge provide a transfer path;
they do not combine this application's GPU or memory across hosts. Ordinary USB-C
cables must not be assumed to provide that Thunderbolt connection. If the connection
really is legacy FireWire, measure it separately rather than using Thunderbolt rates.

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

1. Confirm the second Mac's model, chip, memory and macOS, and establish which
   cable/interface is active. No remote trust or login change was made here.
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

No new analysis, transfer benchmark, software installation, deployment, account
access or footage modification was performed for this investigation. A numeric
speedup for the second Mac remains unmeasured.
