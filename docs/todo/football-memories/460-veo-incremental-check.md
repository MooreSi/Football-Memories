# 460: Reuse saved Veo matches on automatic checks

**Status:** Shipped
**Sensitive:** request selection only; account/session storage and media writes unchanged.

## What is wrong or missing today
The interrupted-read fix reuses progress.json only. Completed library entries are
read again on the next automatic check, including after showing Veo again.

## What changes
Connect and automatic six-hour checks list current recordings but reuse completed
active matches by stable ID. Read details only for missing/unavailable entries;
retain current expiry from the listing. Explicit Refresh retains its full metadata
refresh so later highlights/corrections remain discoverable. Shared links follow
the same reuse rule during automatic checks. Resume interrupted new reads as before.

## What must NOT change
No full videos downloaded by a metadata check. No credentials/session changes,
request rate increase, media overwrite, reset/disconnect change, or existing test edits.

## Non-goals
Changing manual Refresh semantics or source toggle visibility rules.

## Open questions
None; explicit Refresh is the way to update already cached match details.

## Test plan
Regression: saved first match gets zero detail requests; a newly discovered second
match gets four (negative control). Reconnect after process restart retains details;
expiry and new availability still update. Automatic hook sends incremental flag,
API carries it to worker, and existing manual full-refresh tests stay unmodified.

## Real-account check
Not required to reproduce; fake API only. No source account accessed.

## Verification
- Backend full SQLite/PostgreSQL: 779 passed each; additional shared-cache regression
  covered by 35 shared tests on each database. Frontend: 700 passed.
- Lint, formatting, types, build and schema drift checks pass.
- Local frontend/helper deployed; health, Nginx, served incremental flag verified.
- No source account accessed; no credentials/session change or archive file touched.
- Explicit Refresh retains existing full-update tests unchanged.
