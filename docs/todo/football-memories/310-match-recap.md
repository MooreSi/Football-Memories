# 310: Written match recap

**Status:** Shipped (2026-11-16)
**Sensitive:** no. Text from data already in the app; no request to Hudl or Veo, no AI service.

## What is wrong or missing today

Hudl (AI Insights, 2025) and GameChanger write match summaries; the research report
(2026-11-16) proposed the same offline, from templates, with every claim backed by data
the app holds. The match pages show the facts in panels but nothing a parent can read
or paste to family in one go.

## What changes

- `lib/matchRecap.ts` (pure): sentences from a match's facts, each written only when
  its data exists:
  1. Result: "<Club> won 3-2 at home against <Opponent> on 1 November 2026." (drew /
     lost; away at; against when the venue is unknown). No score: says so.
  2. How it went (spec 290, only when complete): came from N down to win or draw; led
     and drew or lost; scored first; and the half-time score when the half-time is known
     (Veo first period end; Hudl first END HALF tag).
  3. Scorers and keeper (spec 270): **confirmed only**, so a guess is never written.
  4. The primary player (Hudl): "<Name> was tagged in 6 moments, including 2 of the 3
     goals we scored." Goals counted from the players tagged at each goal.
  5. Veo's counts: attempts and corners, own v opponent, said to be Veo's.
  A closing note says what it is written from and that likely scorers are left out.
- "Match recap" panel on the Hudl and Veo match pages, after How the score went, with a
  Copy button (clipboard).

## What must NOT change

Goals, scores, owner entries, reports, existing tests.

## Non-goals

A local language model rewording it (owner decision, not asked); the recap on the
PNG/PDF report; season recaps.

## Open questions (and the provisional default in use)

- The player is named, never given a pronoun; the team is "They" after the first sentence,
  or "We" throughout when no club name is set (never "Us won").

## Test plan

| Test | Asserts | Negative control |
|---|---|---|
| recap: result | won/drew/lost, home/away/unknown venue, UK date | no score -> "score is not known", no result words |
| recap: story | comeback from 2 down, half-time score | incomplete game state -> no story or half-time |
| recap: scorers | confirmed scorers and keeper saves | likely scorer not written |
| recap: player | moments and goals featured | no player tags -> no player sentence |
| recap: Veo | attempts and corners as Veo's counts | no Veo rows -> none |
| panel | text shown; Copy writes it to the clipboard | |

## Real-account check

None needed.

## Verification (filled in when shipped)
- [x] suite green: frontend 567 tests (120 files), typecheck, build. Backend not run:
  no backend change.
- [x] no credential, cookie or token written to the repo, a log or a fixture
- [x] nothing on Hudl or Veo modified; no existing library file deleted or overwritten
- [x] real-account check: not needed. Browser-checked on the built app served by a
  throwaway stand-in helper with made-up matches (Hudl 3-2 comeback with the player,
  Veo 1-1), desktop and 375 px. Found and fixed there: "Us won" with no club set, and
  "1 attempts". The panel also waits for the primary player (a test caught it rendering
  before the player loaded).
