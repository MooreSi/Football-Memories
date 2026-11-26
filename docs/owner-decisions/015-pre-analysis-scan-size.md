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
- Window: 600 s (the worker's per-analysis cap) of first-half play, starting one minute
  after Veo's kick-off (`halves`), shorter if the first half is. Without halves (Hudl):
  from minute 5, earlier for short matches, whole match under 10 minutes.
  Evidence: on 260926 NL a 4-minute window never detected the left goal; on 261122 NL vs
  Bournville Greens (kick-off 10:00) a scan from minute 5 was half warm-up.
- Ready thresholds (frontend `components/videoLab/preAnalysis.ts`): panorama >= 90% of
  views registered (60% partly); outline ready only once you accept it in the stitched pitch review (an automatic outline is at most "partly"; acceptance is not proof either: on 261122 the automatic outline held 96% of feet and the accepted one 18%); any outline holding under 70% of central players' feet on the level ground is "partly"; people
  >= 10 per sampled frame (4 partly); ball >= 50% of frames (25% partly); teams and
  referee ready only once you have labelled both teams / the referee.

## What changes if the answer differs
Only `scanPlan` and `readiness` in `preAnalysis.ts`; a longer scan than 600 s would
need several worker jobs and a worker change to merge them.

ANSWER:
