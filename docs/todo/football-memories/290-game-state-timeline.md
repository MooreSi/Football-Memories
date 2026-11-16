# 290: Game-state timeline

**Status:** Shipped (2026-11-16)
**Sensitive:** no. Pure calculations on cached goals and scores; no Hudl or Veo request.

## What is wrong or missing today

Research (reports/Football Memories improvement ideas.md, 2026-11-16) found game state
(time spent ahead, level, behind; who scored first; comebacks) the most robust analysis
the archive can add: it is exact wherever every goal has a time. The app knows each
match's goals and times (spec 270, `lib/goals.ts`) and its score (`matchScore`) but
never says how the score went.

## What changes

- `lib/gameState.ts` (pure): from a match's goals (spec 270, owner edits included), its
  score and its playing span, the running score after each goal, ahead/level/behind
  segments (stretches with the same state joined) and their share of the span, who scored first, the biggest lead and deficit,
  a story (came from behind to win or draw; led and drew or lost), and the longest run of
  unanswered goals. **Only when complete:** a score is known, every goal has a time and
  the goals add up to the score. Otherwise it says why and gives nothing else.
- Span: Veo's periods when listed (shares count only time inside them); Hudl, the first
  tag to the last tag end; else 0 to the video length. Shares are approximate and say so.
- `GameStateStrip` ("How the score went") under Goals and keepers on the Hudl and Veo
  match pages: coloured strip, goal marks with the score after each (click to watch),
  "Ahead x% · Level y% · Behind z%", the story line; or the reason it can't be shown.
- Season report, when goals are known: "Scored first" (n: won, drew, lost), "Came from
  behind" (won, drew; only if any), "Clean sheets" (from scores), and "Goal times known"
  (n of m matches) so every count says what it comes from.

## What must NOT change

Scores, goals and owner goal entries; existing report lines (season lines are added only
when goals are passed, after the existing ones); every existing test unmodified.

## Non-goals

Half-time to full-time grid (Hudl halves are not reliable), goals by time bins, ratings,
anything about individual players.

## Open questions (and the provisional default in use)

- Hudl span uses the tags' first and last times (video before kick-off would skew shares).
- Owner-added goals have no time, so a match with one is incomplete. No way to add a time yet.

## Test plan

| Test | Asserts | Negative control |
|---|---|---|
| gameState: comeback | 0-1, 1-1, 2-1 -> came from behind to win, first goal theirs, deficit 1 | a 2-0 win in order is no comeback |
| gameState: shares | goals at known times give exact ahead/level/behind shares; time outside Veo periods not counted | |
| gameState: lead lost | 1-0, 1-1 -> led and drew | |
| gameState: incomplete | goals 2-1 vs score 3-1 -> reason, no segments; untimed goal -> reason; no score -> reason | complete case has segments |
| gameState: 0-0 | complete, level 100%, no first goal | |
| gameState: run | 0-1, 1-1, 2-1, 3-1 -> longest unanswered run ours 3 | |
| season lines | scored first counts with results; came from behind; clean sheets; goal times known n of m | no goals passed -> lines unchanged |
| strip | strip, shares, story, goal button seeks | incomplete -> reason, no strip |

## Real-account check

None needed.

## Verification (filled in when shipped)
- [x] suite green: frontend 547 tests (116 files), typecheck, build. Backend not run:
  no backend change.
- [x] no credential, cookie or token written to the repo, a log or a fixture
- [x] nothing on Hudl or Veo modified; no existing library file deleted or overwritten
- [x] real-account check: not needed. Browser-checked on the built app served by a
  throwaway stand-in helper with made-up Hudl and Veo matches (Hudl comeback 3-2, Veo
  1-1 with periods, season report), desktop and 375 px. Known limit: goals a few
  seconds apart put their score labels on top of each other.
