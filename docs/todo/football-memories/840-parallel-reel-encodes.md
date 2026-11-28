# 840: Encode highlight-reel clips in parallel

**Status:** Shipped (main; admin library moved, families update themselves)
**Sensitive:** library writes (Compilations/ only, unchanged rules); Veo reads at once (owner-approved).

Owner (28 November 2026): "parallelise the clip encodes and use hardware encoding". Answers:
parallel now for every library; hardware encoding only where ffmpeg offers it, with a spec
for a native Mac renderer later; hardware quality should match today's libx264 CRF 18.

## Measured first (M4 mini, ffmpeg 8 from Homebrew, 6 clips of 30 s)

| Source | libx264, one at a time | libx264, 3 at once | VideoToolbox, one at a time | VideoToolbox, 3 at once |
|---|---|---|---|---|
| Real Hudl 960x540 | 6.4 s | 4.8 s | 7.2 s | 6.7 s |
| Same clip upscaled to 1080p | 26.9 s | 20.4 s | 21.5 s | 20.4 s |

- Running clips in parallel is about 1.3x faster. Gains flatten after 2-3 at once; capping
  each ffmpeg's threads made it slower, so the threads are left to ffmpeg.
- VideoToolbox (`h264_videotoolbox`) needs `-q:v 84` to match CRF 18 (SSIM 0.9949 vs 0.9946 at
  540p) and then writes about 3x the bytes (12.6 MB vs 4.0 MB). It is slower than libx264 at
  540p and no faster once encodes run in parallel. The hardware encoder itself is the limit
  (same 3.4 s per 1080p clip at q 60, q 84 or 6 Mb/s; adding parallel encodes does not help).
- libx264 peak memory per encode (default threads): 236 MB at 540p, 740 MB at 1080p. Hosted
  backends have a 1 GiB memory cap, so 1080p must stay one at a time there.

Hardware encoding is therefore not part of this change: it would make reels 3x bigger for no
speed gain. Put back to the owner with these numbers: owner decision 019.

## What changes

- `services/reels.py` encodes the title cards and clips of a reel on a small thread pool.
  Segment names are fixed before any encode starts, so the joined reel keeps the planned order.
- Pool size: at most 3, at most one per 3 CPUs, never more than the parts, and limited by the
  container's memory limit (cgroup `memory.max`) using the measured per-encode memory scaled
  by output pixels. No limit known means only the CPU and 3-at-once caps apply.
- Progress still counts finished parts; a failed part cancels the parts not started and the
  reel fails exactly as before.

## What must NOT change

- Output format and quality (libx264 fast CRF 18, AAC 192k), the order of clips, the
  replace-only-on-success rule, no partial files, sources never touched. Every existing test
  in `tests/api/test_reels.py` passes unchanged.
- Hudl requests: none added. Hudl batch reel assembly only re-encodes files already saved.

## Part 2 (owner, 28 November 2026: "enable Veo reels to make more simultaneous requests")

- `hudl_batch.assemble_reel` (Hudl batch reels and Veo reels) encodes its parts on the same
  pool; the join keeps the given order.
- `veo/_reels._cut_all` cuts every highlight at the same time (sized as above, Veo footage
  assumed 1080p). From a match not saved here, the relay reads Veo's host at most 3 reads at
  once (`VEO_PARALLEL_READS`), replacing one at a time; a refusal still stops every cut and
  saves nothing. Sizing moved to `services/encode_pool.py`.

## How we know it worked

- New tests, each red first: pool sizing (CPU, part count and memory caps; 1080p in 1 GiB is
  one at a time), cgroup memory reading, encodes overlapping in a real render with the joined
  order checked, and a failing middle clip leaving the reel failed with no work folder.
- Full backend suite, ruff, mypy.
