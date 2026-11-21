# 380: Incremental Veo refresh

**Status:** Shipped (source; deployment pending)
**Sensitive:** Veo read policy; fewer match requests, unchanged six-hour cadence.

## What is wrong or missing today
Completed library entries are ignored on Refresh; only interrupted progress is
reused. Automatic discovery only runs on app open/return, not while it stays open.

## What changes
List recordings as before; reuse complete cached details by served identity/slug,
including interrupted progress. Read new/unavailable/incomplete matches only.
Update catalogue title/expiry without rereading highlights. Progress counts only
matches needing a read. Recheck eligibility each minute while the app stays open.

## What must NOT change
Six-hour request limit, serial reads, access/challenge handling, ephemeral video
addresses, reset/disconnect isolation, old team-data upgrades and download files.
Shared links retain their access checks because they have no account catalogue.

## Non-goals
Revisiting cached highlights for edits upstream; changing authentication or downloads.

## Open questions
None. Owner approved updating the two conflicting old refresh expectations.

## Test plan
New match read while cached match has zero detail requests (negative control:
new match has four). Repeat completed refresh does no detail reads. Expiry changes
still disable video. Incomplete/unavailable entries retry. Interrupted reads resume.
Automatic check triggers after six hours while open, with no repeat or playback
interruption. Tests use synthetic APIs and fake clocks only.

## Real-account check
Not needed for regression tests; no real account requests during verification.

## Verification
Regression tests observed red then green. SQLite 761 full-suite passes plus
11 resume cases; PostgreSQL 762 passes. Ruff check/format, mypy, Alembic schema
check, frontend typecheck/build passed. Frontend full suite: 634 passed (130 files).
Owner approved the two existing refresh test expectation updates. No credentials,
cookies or tokens written by this work; no upstream changes or footage writes.
No real-account check, Docker deployment or browser layout changes. Deployment
must follow the separate active primary-checkout work (see HANDOFF).
