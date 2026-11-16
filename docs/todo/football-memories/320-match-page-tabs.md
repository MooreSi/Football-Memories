# 320: Match page summary strip and tabs

**Status:** Shipped (2026-11-16)
**Sensitive:** no. Layout only; no request to Hudl or Veo, no library file touched.

## What is wrong or missing today

Owner request 2026-11-16 ("implement option A", from the layout mockups). On a Hudl
match the page was 3,714 px tall: Team stats, Goals and keepers, Match insights and
Quick reels sat between the video and Tagged moments, so the moment list (which drives
the video) started about 2,780 px down and a click seeked a video out of sight. The
momentum chart, really a match timeline, was far from the video. The Veo page has the
same stack.

## What changes

On both the Hudl and Veo match pages (not the embedded Hudl view on Clips):

1. **Match timeline** under the video: the momentum bars, compact, with goal dots, half
   lines and a playhead at the current time. A click on a bar seeks, as in Insights.
   Shown only when the match has momentum data.
2. **Summary strip**: up to four headline numbers from the team stats rows already shown
   (Possession %, Chances or Attempts, On target, Corners, whichever exist) and who was
   in goal, with the change time when there was one ("Likely" until saved).
3. **Tabs**: Moments (default) | Team stats | Goals and keepers | Insights. Moments holds
   Quick reels and the moments panel. A tab whose panel has nothing to show is left out.
   Arrow keys move between tabs (WAI-ARIA tabs pattern).
4. The tag rail sticks beside the page as it scrolls, its list filling the rail.
5. Insights puts the record against this opponent beside the charts, not under them,
   and on a Veo match says when there is nothing to show (it used to vanish).

Inactive tab panels stay mounted and are hidden with CSS, so an edit in progress in
Goals and keepers survives switching tabs.

## What must NOT change

Every panel's content, labels and actions; scores, goals, owner entries; the embedded
Hudl view; every existing test, unmodified.

## Non-goals

- Team stats in two columns (mocked): one table keeps its column headers for screen
  readers; two tables would repeat them. The table is narrowed instead.
- Goals listed in time order with a running score (mocked): Goals and keepers is
  unchanged in this spec.
- Remembering the chosen tab between visits.

## Open questions (and the provisional default in use)

- Possession still shows as a Team stats row and as the Insights bar (with minutes).
  Kept: they are now in different tabs.

## Test plan

| Test | Asserts | Negative control |
|---|---|---|
| summaryCells | picks Possession %, Chances/Attempts, On target, Corners in that order, max 4 | no rows -> no cells |
| keeperLine | one keeper -> name; two spells -> "A to B" with change time | no keeper -> null |
| Hudl page tabs | Moments selected first; Team stats tab shows its panel and hides Moments | a match with no team stats has no Team stats tab |
| Veo page tabs | same on a Veo match | |
| timeline | a "Match timeline" chart under the video; click seeks | no momentum -> no timeline |

## Real-account check

None needed.

## Verification (filled in when shipped)
- [x] suite green: frontend 573 tests (119 files), typecheck, build; backend 623 passed
  on SQLite and on Postgres, ruff, format, mypy, alembic check clean. Existing tests
  unmodified.
- [x] new tests watched red first (7 page tests failed on the missing tablist/strip/
  timeline; the lib test failed on the missing module)
- [x] in the browser (dev server on the live API, 1440 px and 375 px): a Hudl match
  (1,917 tags) and a Veo match show timeline, strip and all four tabs; page height on
  the Hudl match 3,714 px -> about 2,200 px; no sideways scroll on a phone
- [x] no credential, cookie or token written to the repo, a log or a fixture
- [x] nothing on Hudl modified; no existing library file deleted or overwritten
- [x] real-account check: not needed (opening the pages started the matches' streams,
  as the app does)
