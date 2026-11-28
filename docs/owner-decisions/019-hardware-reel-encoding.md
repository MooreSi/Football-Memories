# 019: Use the Mac's hardware video encoder for highlight reels?

**Status:** open
**Raised by:** reel encoding session, 2026-11-28 (spec 840)

## The question
The owner asked for hardware encoding. Measured on the M4 mini (spec 840), VideoToolbox
(`h264_videotoolbox`) needs `-q:v 84` to match today's libx264 CRF 18, and then writes about 3x
the bytes. It is slower than libx264 on real 960x540 Hudl footage (7.2 s vs 6.4 s for six 30 s
clips) and no faster at 1080p once encodes run in parallel (20.4 s both). The hardware encoder
itself is the limit: about 3.4 s per 1080p clip at any quality or bitrate, and running more at
once does not help. Should reels still use it?

## Why it matters
Docker on macOS cannot reach the hardware encoder, and every library renders reels in Docker.
Using it means a native Mac render service that the backends send clips to (the way Video Lab
work goes to the native worker), with hosted families' footage leaving their containers. That is
work across this repo, the gateway and the worker, for reels about 3x bigger and no faster.

## Provisional default in use
libx264 everywhere (unchanged quality), with clips encoded in parallel (spec 840, about 1.3x).
No encoder switch was added: on this hardware it would only make files bigger.

## What changes if the answer differs
- "Yes, for file speed anyway": a spec for the native render service (routing, footage transfer,
  hosted access), then `h264_videotoolbox -q:v 84` there.
- "Smaller files instead": the hardware encoder at a bitrate near libx264's size loses detail
  (SSIM 0.980 at q 65 vs 0.995 now), so that is a quality cut, not a free win.
- A Mac with two media engines (M-series Pro/Max) might change the speed result; re-measure there.

ANSWER:
