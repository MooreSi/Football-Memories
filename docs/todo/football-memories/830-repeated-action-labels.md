# 830: Count every action label, and five more action stats

**Status:** Shipped (app branch; helper not restarted, old matches not re-read)
**Sensitive:** yes (Hudl tag parsing and the tag cache). No new Hudl request.

Owner (27 November 2026): "Yes, do both": find why most Passing labels never reach the pass
counts, and add the five unused labels as player stats.

## What the census showed (spec 820)

| Match | PASSING labels | clips with `passes` cached | CROSSING labels | clips with `crosses` |
|---|---|---|---|---|
| 12 Jul Ipswich Town | 274 | 59 | 8 | 7 |
| 12 Jul Cambridge United | 192 | 43 | 8 | 8 |
| 13 Jun Notts County | 14 | 14 | 3 | 3 |

No moment in these matches has more than one code (no split ids), so the gap is not shared-code
moments. Payloads are not duplicated (crosses and Notts County match one for one). The cause:
`player_actions` keeps a set per moment, so a player clip labelled Passing four times counts as one
pass. Sportscode lets a label repeat on one instance; the coach does this on the busier matches.

Also: DRIBBLING & RWTB, DEFENSIVE ACTION, RECEIVING, BALL PROTECTION AND TURNING and FINISHING are
among the most used labels and are not on the allowlist.

## What changes

- `player_actions` keeps one entry per label occurrence (a tag's matching values each count; the
  tag key counts only when no value matched). Order of first appearance is kept.
- The cache keeps repeated supported actions instead of collapsing them.
- New actions: `dribbling` (DRIBBLING & RWTB / DRIBBLING AND RWTB), `defensiveActions` (DEFENSIVE
  ACTION(S)), `receiving` (RECEIVING), `ballProtection` (BALL PROTECTION AND/& TURNING), `finishing`
  (FINISHING). Plain DRIBBLING stays unmapped (no assumed outcome, spec 440 test).
- Player stats: a clip whose label repeats counts once per occurrence and is listed as
  "(1 of 4)", "(2 of 4)" ... so the count matches the labels and each entry still seeks the clip.
- Labels shown as the coach tags them ("Dribbling & RWTB", not expanded).

## What must NOT change

- Existing tests (plain Dribbling, shared-code moments, penalties, allowlist-only cache).
- Matches indexed before this change keep their collapsed counts until re-read (owner decision
  017): no automatic re-read of the 296 matches.

## Tests

Backend: repeated labels survive parse and cache; key + value not double counted; the five new
labels map; plain Dribbling still does not. Frontend: a clip with four Passing labels counts 4 and
lists four entries; new metrics appear under the right groups.
