# 005: Possession in the radar, momentum weights, and tag spelling

**Status:** answered 2026-11-13
**Raised by:** spec 230 session, 2026-11-13

## The question

1. The Library's Match Profile radar still has a "Possession" point that counts
   possession *tags*, while the bar above it now shows possession *time*. Should
   the radar drop its possession point?
2. The momentum chart weighs attacking-third entry 1, penalty-area entry 2,
   chance 3, goal 5. Are those the right weights for you?
3. Merged tag codes are shown in upper case ("CHRIS DEMO"). Is that fine, or
   would you rather see names as "Chris Demo"?

## Why it matters

Two possession figures side by side can confuse; the weights decide which
minutes look strongest; the spelling is what you see in every list.

## Provisional default in use

1. The radar keeps the count (a test from D-030 pins it, and tests are not
   changed without you). 2. The weights above. 3. Upper case.

## What changes if the answer differs

1. One line in the Match Profile and its test. 2. `MOMENTUM_WEIGHTS` in
   `frontend/src/lib/insights.ts`. 3. `canonical_code` in
   `backend/app/connectors/hudl_metadata.py` (display only; nothing on disk).

ANSWER: (owner, 2026-11-13)
1. Use possession time: the radar's possession point now shows % of time on
   the ball (`withPossessionTime`); its place among the axes is still by count.
2. Yes: the momentum weights stay.
3. Names like "Chris Demo": the helper still merges spellings in upper case, and
   the page re-cases codes that look like a name (`displayCode` in
   `lib/hudlPlayer.ts`, applied once in `useHudlLibrary`). Situation codes stay
   as written. Hub lookups ignore case, so an existing "SAM EXAMPLE" hub is reused.
