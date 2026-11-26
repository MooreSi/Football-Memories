# 750: Hardware render and shared detection

**Status:** Deployed to both Macs 26 November 2026 (owner: "Build both", "Yes, deploy"). Worker
branch `codex/fast-render-shared-detection` at 984da7a.
**Sensitive:** no. Worker only; the MacBook node's SSH task gains one task type. No
account, credential, source footage or existing result is touched.

## What is wrong or missing today

The first stage of a Video Lab analysis (detect, track, render) took 455 s on the
4-minute NL clip (job b4f5d244). Profiled on the idle mini (355 s total):

| Part | Time |
|---|---|
| Final `annotated.mp4` re-encode (ffmpeg libx264, `-threads 2`) | 223 s |
| Temporary mp4v video of every frame (OpenCV `VideoWriter`) | 52 s |
| Detection, 720 sampled frames (Core ML, Neural Engine) | 50 s |
| Tracking, team colours, camera motion | 28 s |
| Decoding | 5 s |

Re-encoding the same video: libx264 2 threads 213 s, all threads 99 s,
`h264_videotoolbox` 31 s. In Split mode the MacBook idles during this stage.

## What changes

**Render (all modes, worker `engine.analyse`):**
- Annotated frames are piped as raw BGR straight into one ffmpeg process while the
  analysis loop runs. No temporary mp4v file; the video is encoded once.
- Encoder: `h264_videotoolbox` when a one-frame probe encode succeeds on this host,
  otherwise libx264 (`-preset fast -crf 20`, ffmpeg's default thread count).
  The quality setting is chosen by measurement against today's output (see Test plan).
- Audio, `+faststart`, duration check, source preservation and refusal to overwrite
  are unchanged. The summary records `render.encoder`.

**Shared detection (Split mode, new full analyses only):**
- The mini detects the first part of the sampled frames; at the same time the MacBook
  receives the source over the existing SSH task channel (new task `detect`), decodes
  it with the same sampling rule and detects the remaining sampled frames.
- When the mini's loop reaches the MacBook's part it uses the returned detections.
  Tracking, rendering and everything after stay on the mini, unchanged and in order.
- The sampling rule moves into one shared function used by both sides.
- Every returned detection is checked: source hash, detector hash, first index, and a
  time that equals the mini's own decoded time for that sample (to 6 decimals), with
  no sample missing. Any mismatch or MacBook failure fails the job; no silent local
  fallback (same rule as Split today).
- The summary's `execution` gains `"detection": "shared"`.

## What must NOT change

- Local and Remote jobs detect exactly as before; only their encoder changes.
- Split appearance branch, camera/pitch branch, merge validation and publication.
- Tracking, sampling times, detections format, `tracks.json`, observations.
- Source footage is never modified; result folders are never overwritten.
- Remote readiness (protocol, code digest, pinned model hashes). Both Macs must run the
  same code, so this deploys to both together (deployment is a separate owner step).
- Every existing test passes unmodified.

## Non-goals

- Splitting tracking across Macs, or detecting on the MacBook GPU and Neural Engine at once.
- One whole job per Mac (backlog throughput).
- App or gateway changes: Split already means "use both Macs".

## Open questions (and the provisional default in use)

- The M3 and M4 Neural Engines may return slightly different boxes for the same frame.
  Default: accept if measured differences are small; record the measurement. If tracks
  differ materially from a mini-only run, report it before deploying.
- The detection share. Measured: 0.5 left the MacBook idle at the end, 0.6 met exactly
  (reply 40.8 s after start, ~5 s of it transfer and model load). Default 0.6.
- Whether the 2-thread libx264 cap was deliberate (keeping the mini responsive). No record
  found; the hardware encoder uses little CPU.

## Test plan

| Test | Asserts | Negative control |
|---|---|---|
| Render without a temporary video | analysis never opens an OpenCV `VideoWriter`; annotated video has the input's duration and audio | fails on today's code |
| Encoder choice | probe success uses `h264_videotoolbox`, failure uses libx264; summary names it | fails on today's code (no `render`) |
| Render failure | an ffmpeg failure raises and publishes nothing | |
| Sampling rule shared | shared sampler picks the same times as `analyse` | characterisation, passes first |
| Shared detection equivalence | with a fake MacBook running the same fake detector, results equal a local-only run; local detector only sees the first part | fails before implementation |
| Time mismatch | a shifted remote time fails the job | |
| Missing samples / MacBook failure | job fails, nothing published, no local fallback | |
| Node `detect` task | real archive round trip on a synthetic clip; returns only the asked samples; refuses a wrong source hash | |
| Worker Split | a Split full analysis uses shared detection; Local does not | |

## Real-account check

None needed. No Hudl or Veo access.

## Verification (filled in when shipped)
- [x] worker suite 293 pass, ruff, format, project checks green. Tests red first: render 5,
  shared detection 17; each safeguard mutated once and its test failed.
- [x] quality: on a 30 s piece of real annotated footage, `h264_videotoolbox -q:v 70` PSNR
  43.4 dB / SSIM 0.981 vs libx264 CRF 20 43.2 dB / 0.986; files about 1.5x larger.
- [x] real NL clip (scratch outputs, MacBook scratch node removed afterwards): analysis stage
  355 s -> 102 s (render) -> 66 s (shared, share 0.6). Local detections identical to the
  production run. M3 detections on the MacBook's frames: IoU median 0.979, score diff 0.002;
  tracklets 549 -> 550-555, people detections -0.1%.
- [x] no credential, cookie or token written to the repo, a log or a fixture
- [x] nothing on Hudl modified; no existing library file deleted or overwritten
- [x] deployed to both Macs at 984da7a, code digest 2f34e6a3... on both, heartbeat ready
- [ ] a real Split job through the UI on the new code
