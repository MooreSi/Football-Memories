# 360: Goals and offsides in Player stats

**Status:** Shipped (main; locally deployed 2026-11-21)
**Sensitive:** no

## What changes
Add Goals first and Offsides to the existing Player stats cards and sort selector.
Goals use the scorer saved in Goals and keepers, otherwise the existing likely
scorer (visibly marked likely). Never give every overlapping player a goal.
Owner-added goals without timestamps count but do not offer a false seek target.
Unassigned goals are excluded with an explanation. Offsides use the existing
own-team overlap model, with missing codes shown as a dash. Eight stats use four
columns at desktop and two on phones so the cards remain balanced and readable.

## What must NOT change
No changes to scorer or keeper inference, stored corrections, accounts, footage,
queues or other stats. Veo still explains its lack of named-player data.

## Test plan
- Confirmed scorer receives the goal, another overlapping player does not.
- Existing likely scorer is counted with a visible likely marker.
- Owner-added untimed goals count but cannot seek.
- Offside includes our overlapping event; opposition/non-overlapping tags excluded.
- Missing offside data stays null; sorting and clip seek work through the panel.

## Real-account check
None needed; synthetic offline fixtures only.

## Verification
- Six new tests observed failing for missing Goals/Offsides behavior, then passing.
  Existing tests unchanged; frontend full suite **631 passed**.
- Backend **758 passed** on SQLite and **758 passed** on development PostgreSQL.
  Ruff check/format, mypy and Alembic check passed with no schema drift.
- Frontend typecheck/build passed. Existing jsdom/Starlette and bundle-size
  warnings remain. No runtime dependency or backend changes.
- Offline synthetic browser review at desktop and in a 375px iframe, using
  reference 02 styling: eight metrics, likely label and goal/offside clip review.
  No manual real-account verification; no footage changed.
- Merged/pushed to main at `e27c6b7`, frontend rebuilt/recreated locally.
  Health and Nginx checks passed; live `index-Cx_eLs_S.js` bundle verified.
  Backend/helper left running; hosted rollout follows existing update preferences.
  No CI workflow exists. Deployment record is a docs-only checkpoint.
