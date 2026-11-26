# 015: How much of a match should Pre-analysis scan, and when is it "ready"?

**Status:** open
**Raised by:** Video Lab pre-analysis session, 2026-11-26

## The question
Pre-analysis (Video Lab, "Pre-analysis" button) scans one window to build the stitched
pitch, outline/bird's-eye, people, ball and look-alike groups. Is ten minutes from
minute 5 the right amount, and are the readiness thresholds right?

## Why it matters
Longer scans see more of the pitch and more of each kit, but take longer on the Macs
(10 min of footage is about 18 min of processing) and fetch more from Veo/Hudl.

## Provisional default in use
- Window: 600 s (the worker's per-analysis cap) from minute 5; starts earlier when the
  match is shorter than 15 minutes; the whole match (whole minutes) when under 10.
  Evidence: on 260926 NL a 4-minute window never detected the left goal.
- Ready thresholds (frontend `components/videoLab/preAnalysis.ts`): panorama >= 90% of
  views registered (60% partly); outline ready only with all four sides found; people
  >= 10 per sampled frame (4 partly); ball >= 50% of frames (25% partly); teams and
  referee ready only once you have labelled both teams / the referee.

## What changes if the answer differs
Only `scanPlan` and `readiness` in `preAnalysis.ts`; a longer scan than 600 s would
need several worker jobs and a worker change to merge them.

ANSWER:
