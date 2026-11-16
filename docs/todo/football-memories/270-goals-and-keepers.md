# 270: Goals and keepers per match, top scorers on the season report

**Status:** Shipped
**Sensitive:** no (local preferences only; nothing new is asked of Hudl or Veo)

## What is wrong or missing today
Owner requests 2026-11-16: "for each match add details who and how many goals were
scored; also how many goals were saved and conceded and by which keeper" and "in the
season report add details of the top three goal scorers". Neither source names a
scorer or a keeper. Hudl tags a goal for the team ("ASTON VILLA GOAL"); player tags
overlap it, usually 3 or 4 per goal. Hudl has no save tag; it has "OPPOSITION ON
TARGET". Veo gives goals and shots per side with times, no names, no on-target.

## What changes
Owner choice "Both": an automatic guess marked "likely", which the owner confirms or
changes per match.
- `lib/goals.ts` (pure): each match's goals (Hudl goal codes by side, or Veo's GOAL
  team events), the Hudl players tagged at each goal (most overlap first: the likely
  scorer), a likely keeper (the player most often tagged with a "GOAL KEEPER" code),
  likely saves (Hudl opposition on-target tags not overlapping an opposition goal),
  merged with the owner's entries.
- Owner entries kept in `preferences` as `goals:<match id>` = JSON (as spec 210 keeps
  scores: in every backup, no schema change). `GET/PUT /api/goals`.
- A "Goals and keepers" panel on the Hudl and Veo match pages: each goal (ours with a
  scorer, theirs with the keeper beaten), add a goal the tags missed, remove one the
  owner added, keepers with saves and goals conceded.
- Match report: Scorers and Keeper lines. Season report: Top scorers (top three, by
  confirmed goals only) and how many goals still have no confirmed scorer.

## What must NOT change
Scores (tags, corrections, Veo's own) stay as they are; existing report lines and
tests unchanged; no request to Hudl or Veo; nothing in the library touched.

## Non-goals
No player tracking, no automatic save count for Veo (it has no on-target data),
no change to Hudl tags.

## Open questions (and the provisional default in use)
- Which overlapping player is the scorer: most overlap with the goal tag (unverified
  against a match the owner knows).
- Season top three counts confirmed scorers only, so a guess never reaches the family
  report; likely ones count once the owner confirms them.

## Test plan
| Test | Asserts | Negative control |
|---|---|---|
| goals.test: Hudl goals | sides, times, candidates most-overlap first | goal kicks and player tags not counted as goals |
| goals.test: Veo goals | own/opponent GOAL events, no candidates | SHOT not a goal |
| goals.test: merge | owner scorer replaces likely; owner-added goal counts | removed added goal gone |
| goals.test: keepers | likely keeper, saves, conceded per keeper | no keeper code: no likely keeper |
| report.test | match lines; season top three by confirmed, ties by name | likely scorer not in top three |
| test_goals (backend) | PUT stores, GET returns, null clears, bad shape 422 | other preferences untouched |
| GoalsPanel test | confirm likely, change scorer, saves keeper | Cancel stores nothing |

## Real-account check
None needed.

## Verification (filled in when shipped)
- [x] suite green: backend 623 (SQLite and Postgres), frontend 529, ruff, mypy, typecheck, build
- [x] no credential, cookie or token written to the repo, a log or a fixture
- [x] nothing on Hudl modified; no existing library file deleted or overwritten
- [x] real-account check: not needed. Browser-checked on the dev app with the real
  caches (read only): Hudl match 12 scored / 9 conceded with likely scorers; a saved
  keeper round-tripped and reached the season report's top three; Veo match 1 / 4 as
  Veo's score. The test entry was cleared from the dev database afterwards.
