# 810: Phase involvement per player

**Status:** Shipped (app branch; not deployed)
**Sensitive:** no (reads cached tags only; no Hudl request, no library write)

Owner (27 November 2026): "implement Phase involvement per player: the share of their clips that
overlap Pressing, Transition def/att, POFTB or QCC. Overlap between spans of time is reliable, so
this is solid."

## What is missing today

The tagger codes team phases as timed clips (PRESSING, TRANSITION DEF, TRANSITION ATT, POFTB, QCC;
median 20 s each, 1.6-89 s) and each player as a named clip (median 15 s). Player stats never relate
the two. Hudl's individual action labels carry no outcome, so passes kept or lost cannot be shown;
phase overlap is the honest involvement figure the data supports.

## What changes

- `lib/phaseInvolvement.ts`: for each phase code present in the match, the union of its clips.
  One of a player's clips counts in a phase when at least half of that clip lies inside the union
  (a zero-length clip counts when its instant is inside). Share = counted clips / player's clips.
- Match > Player stats: each player card shows a "Team phases" block under the action profile:
  per phase present in this match, the share bar, "n of m clips", and a button that lists the
  counted clips (the existing clip list, seekable).
- Codes are matched case- and spacing-insensitively (`codeKey`). Labels are the codes as Hudl
  shows them (POFTB and QCC are not expanded: their meaning is the coach's).

## Provisional default (owner may change)

- "At least half the player's clip inside the phase" decides a clip. Both kinds of clip are padded
  fixed-length windows, so any looser rule (any overlap) would count almost every neighbouring clip.

## What must NOT change

- Existing player metrics, sources and keeper-spell handling.
- Nothing claims the player pressed or transitioned personally: copy says the team was in that
  phase during the player's clip.

## Tests

- Half-inside counts; less than half does not; edges touching do not.
- Overlapping phase clips are unioned (two half-covering clips together count).
- A phase absent from the match is omitted, not shown as 0%.
- Codes match regardless of case and spacing.
- Panel: a player's phase share renders and its button lists the counted clips.

## Follow-ups (not in this change)

- Season / Player Lab view of phase shares across matches.
- Pass outcome labels: need a read-only count of Hudl's raw action labels (the cache keeps only an
  allowlist, so it cannot answer whether outcome labels exist).
