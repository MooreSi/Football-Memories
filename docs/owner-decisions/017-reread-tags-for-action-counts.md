# 017: Re-read every match's tags to get full action counts?

**Status:** open
**Raised by:** action-label session, 2026-11-27 (spec 830)

## The question
Matches indexed before spec 830 store each action once per clip, even when the coach labelled it
several times (Ipswich 12 Jul: 274 Passing labels, 59 counted). Only re-reading a match's tags
from Hudl fixes its counts and adds the five new stats (Dribbling & RWTB, Defensive action,
Receiving, Ball protection and turning, Finishing). Should all 296 matches be re-read?

## Why it matters
A full re-read is 296 normal playback page loads at the existing pace (one match at a time, 2.5 s
apart), roughly what the first indexing did. It is read-only but is the heaviest Hudl use since the
first index, and Hudl may show a challenge, which stops the sweep.

## Provisional default in use
No automatic re-read. New matches get full counts. Old matches keep their collapsed counts
(never higher than the truth; passes, 1v1s and the new stats are under-counted).

## What changes if the answer differs
A one-off marker per match (cached `tag_status` dropped, as done by hand for spec 820) and the
owner's Refresh re-reads them; or a smaller set (this season, or matches with action tags).

ANSWER:
