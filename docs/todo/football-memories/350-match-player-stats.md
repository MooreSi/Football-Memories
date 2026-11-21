# 350: Match player stats

**Status:** Shipped (main; local app deployed 2026-11-21)
**Sensitive:** no

## What is missing
The match player offers team stats but no comparison of outfield players.

## What changes
A Player stats tab between Goals and keepers and Insights on Hudl and Veo match
pages. Searchable, sortable player rows show tagged moments and involvement in
passes, shots on target, chances, crosses, tackles and regains. Selecting a count
opens its time-ordered clips to seek in the video. Rows wrap into cards on phones.

Counts describe overlaps with our team's event tags, never verified actions by a
player. An event counts once per player even if two player tags overlap it.
Missing event codes show a dash rather than zero. Veo has no named player data:
explain the absence. Exclude player tags during likely keeper spells; owner-named
keepers without timed spells are excluded for the match. Keepers who also play
outfield can appear for their outfield tags.

## What must NOT change / non-goals
No account requests, credentials, media files, scoring, keeper inference, playback
queues or existing controls change. No invented pass totals or action attribution.
Use reference 02's navy panels, blue controls and compact hierarchy.

## Open questions
Owner approved updating the two exact tab-order expectations in chat on 2026-11-21.

## Test plan
| Test | Asserts | Negative control |
|---|---|---|
| Player stats model | Unique event counts, side and time boundaries, name merging | Opposition and non-overlapping events excluded beside included own events |
| Availability | Missing codes yield null | Present codes yield zero for uninvolved players |
| Keepers | Goalkeeping tags excluded | Same player has outfield tags after a spell |
| Panel | Search, sort, drill-down, seek and empty state | Missing stats unclickable; no matching search reported |
| Integration | New tab sits before Insights, keyboard accessible | Existing Moments default and other tabs retained |

## Real-account check
None needed. Use synthetic offline data for tests and browser verification.

## Verification
- Nine new tests; panel and integration observed red before implementation, keeper
  boundary regression observed red before correction.
- Backend `uv run pytest -q`: 758 passed, SQLite and development PostgreSQL.
- Ruff check/format, mypy, Alembic check: passed; no schema drift.
- Frontend `npm test`: 625 passed; typecheck and production build passed.
- Browser: offline synthetic fixture, desktop and 375px iframe, reference 02
  compared; inline clips and timestamp seek checked. Phone controls wrap without
  horizontal overflow. Temporary preview files removed.
- Existing Starlette/jsdom warnings and bundle-size warning remain.
- No real Hudl/Veo account check needed or performed. No library files touched.
- Merged to main at `3aa8ee8`, pushed, and deployed locally with a frontend-only
  rebuild/recreate on 2026-11-21. Health, Nginx and served bundle checks passed.
  Hosted libraries follow existing update settings. No CI workflow exists.
