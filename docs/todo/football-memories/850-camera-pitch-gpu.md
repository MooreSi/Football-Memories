# 850: Camera and pitch on the GPU, with a CPU/GPU choice

**Status:** Shipped (CPU stays the default)
**Sensitive:** no (Video Lab worker, gateway setting, admin-only UI; nothing near Hudl or the library)

## What is wrong or missing today
The camera and pitch stage takes 2-4 min per 10-min window, all on the CPU. Owner (28 Nov 2026):
"Build this ... do a run on both and have a toggle of whether to use cpu or gpu for this analysis".

Measured on the mini, 261122 Wolves (4 min, 720p60), stage wall 119 s:
- atlas 100 s: per-view analysis summed over threads: painted-line filter `_line_strength`
  243 s, goal-post finder 178 s, white segments 13 s; bundle solve `refine_worlds` 29 s wall.
- camera motion ~14 s, panorama 5 s.
- Decoding is not the cost: OpenCV decodes the clip in 3 s; VideoToolbox through ffmpeg 39 s
  (frames copied back), so hardware decode is not used.

## What changes
- `camera_compute` "cpu" (default, today's code) or "gpu": the painted-line filter runs on the
  Mac's GPU through PyTorch's Metal backend (MPS, already installed on both Macs; no new
  dependency). Same maths: OpenCV's own Gaussian and Sobel kernels, reflect borders, bilinear
  sampling with replicated borders. One GPU call at a time (a lock), views stay parallel.
- Goal-post pairing (a Python loop over every segment pair) is vectorised for BOTH modes, with
  output identical to today's.
- Added after measuring: the bundle's brute-force descriptor matching also runs on the GPU in GPU
  mode (padded to fixed shapes, batched); Stoke spent 38 s there.
- Settings > Advanced gets "Camera and pitch: CPU / GPU". The gateway snapshots it into each new
  job like the player-matching model; the worker records `camera_tracking.compute.device`; the
  run's placement panel shows "GPU (Metal)" or "CPU".
- A comparison run of both on the same footage, numbers recorded below.

## What must NOT change
- Default stays CPU, and a CPU run gives the same outputs as before (except speed).
- Goal-post candidates identical to today's on real frames (tested).
- No silent fallback: a GPU job on a Mac without Metal fails, like other compute choices.
- Remote/Split rules: both Macs must run the same code digest.

## Non-goals
- Camera motion (optical flow) and the bundle solve stay on the CPU in both modes.
- No change to how an outline is reviewed or accepted.

## Open questions (and the provisional default in use)
- GPU results differ in the last float digits (MPS maths, OpenCV fixed-point remap). Default:
  CPU stays the default until the owner compares the two runs.

## Test plan

| Test | Asserts | Negative control |
|---|---|---|
| GPU line strength vs CPU on real/synthetic frames | crest masks agree >= 99%, field within tolerance | a shifted image disagrees |
| Goal posts vectorised | identical list on synthetic goal + real frames | removing an upright finds no goal |
| Worker passes `camera_compute` | gpu request reaches track_camera; unknown value fails the job | "cpu" request never touches torch |
| Gateway setting | saved, snapshotted into new and child jobs; invalid refused | ordinary users get none |
| App toggle + placement | toggle saves; GPU run shows "GPU (Metal)" | CPU run shows "CPU" |

## Real-account check
None needed (no Hudl access).

## Verification (filled in when shipped)
- [x] suites: worker 370 pass, ruff, format; gateway 586 pass, 2 skipped, ruff, format, mypy;
  frontend 1257 pass, typecheck, build. Backend unchanged, not run.
- [x] comparison on the mini, stage wall seconds (scratch, sequential, same inputs):

| Match | Live code (CPU) | New CPU | New GPU |
|---|---|---|---|
| 261122 Wolves, 4 min indoor 720p60 | 121.4 | 69.3 | 67.3 |
| 261108 Stoke, 10 min outdoor Veo 1080p | 157.4 | 153.3 | 144.2 |

  New CPU = live outputs exactly (motion/panorama byte-identical, outline IoU 1.0). GPU: motion,
  panorama and bundle solve identical; outline proposal different (IoU 0.82 / 0.24 vs CPU).
- [x] the difference is the outline fit's instability, not the GPU: CPU + 1e-4 grey-level noise
  moves the CPU outline as far (IoU 0.74 / 0.21) and near the GPU's (0.90 / 0.83). Every GPU step
  matches OpenCV to float rounding. Follow-up: make the outline fit stable.
- [x] GPU per-operation (mini): line filter ~30 ms vs 45-68 ms per view (CPU single thread); matching
  2.1 ms per pair batched = CPU 2.1 ms; topk on Metal 3x slower than two min passes; unpadded
  per-pair shapes grew Metal memory to 30 GB (fixed).
- [x] live lab runs on the owner's Wolves run, MacBook: old code 124.7 s, new CPU 66.4 s, new GPU
  67.9 s; camera solve identical; GPU outline IoU 0.82 vs CPU (runs 0a3cc294, c25e3d50, 4cb46faf).
