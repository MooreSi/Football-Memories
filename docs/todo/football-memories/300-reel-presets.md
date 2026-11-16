# 300: Reel presets on match pages

**Status:** Shipped (2026-11-16)
**Sensitive:** no. Chooses moments already cached; Reel Studio and the helper are unchanged.

## What is wrong or missing today

A reel needs codes picked or moments ticked on the match page first. Research
(2026-11-16): Trace splits a player's reel into "Spotlight" (the player's own moments)
and "Tactical" (team moments around them); Spiideo and Hudl make one-click stories
(team goals, a player's match). The app has the tags to do this but no shortcut.

## What changes

- `lib/reelPresets.ts` (pure): for one match, the presets that have moments:
  - **<player>'s moments** (Hudl): the primary player's tagged moments.
  - **Team moments with <player>** (Hudl): our goal, chance and shot tags that overlap
    one of the player's moments, the player's own tags left out.
  - **Our goals**, **Every goal**: from spec 270's `matchGoals` (owner removals count;
    owner-added goals have no moment, so they are not in a reel).
  - **Our goals and chances** (Hudl: our GOAL, CHANCE, SHOT tags; Veo: OUR GOAL and
    OUR SHOT team events).
  Our goals found by `matchGoals` always count as ours here too, so the team presets
  work when no home club is set (it reads a lone "<club> GOAL" code as ours).
  A preset with no moments, or the same moments as one above it, is not offered.
  Moment ids in match order.
- A "Quick reels" row on the Hudl and Veo match pages (above the moments panel): one
  button per preset with its count; it opens Reel Studio with that selection and name,
  exactly as Make Highlight Reel does today.

## What must NOT change

Reel Studio, the helper's reel cutting (no pre/post-roll change), the existing Make
Highlight Reel buttons and selections, every existing test.

## Non-goals

Pre/post-roll per reel (the helper cuts Hudl tag ranges and Veo moments as they are;
changing what it fetches from Hudl is a `/safe-change` matter for a later spec);
multi-match presets; presets on My Player.

## Open questions (and the provisional default in use)

- "With <player>" means overlapping one of their tags, not minutes on the pitch (Hudl
  has no minutes). Label says "with", not "while on the pitch".

## Test plan

| Test | Asserts | Negative control |
|---|---|---|
| presets: player | player's moments in time order | another player's tags not included |
| presets: with player | our goal/chance overlapping the player; player's tags left out | their goal overlapping the player not included; our goal not overlapping not included |
| presets: goals | our goals; every goal with theirs | removed goal (owner entry) left out |
| presets: Veo | our goals and shots from team moments | opponent shots not in "ours" |
| presets: dedupe/empty | duplicate or empty preset not offered | no player set -> no player presets |
| page | Quick reels button opens studio with the selection and name (Hudl and Veo) | unsynced Hudl / unavailable Veo -> no row |

## Real-account check

None needed (making a reel is the existing flow; not run).

## Verification (filled in when shipped)
- [x] suite green: frontend 557 tests (118 files), typecheck, build. Backend not run:
  no backend change.
- [x] no credential, cookie or token written to the repo, a log or a fixture
- [x] nothing on Hudl or Veo modified; no existing library file deleted or overwritten
- [x] real-account check: not needed. Browser-checked on the built app served by a
  throwaway stand-in helper with made-up matches and player: Hudl and Veo rows, a preset
  opening Reel Studio with its name and moments, 375 px. No reel was made.
