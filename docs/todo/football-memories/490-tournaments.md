# 490: Tournament groups in the Match Library

**Status:** Shipped
**Sensitive:** no

## What is missing
Games cannot be grouped into tournaments or distinguished by entered home team.

## What changes
Bottom-right card checkboxes select imported, Hudl and Veo games. A library action
opens a dialog to create/reuse a tournament and entered team. Persist groups in the
library database using namespaced preferences (included in existing backups).
Library tournament/team filters constrain cards; a nearby summary shows played,
W/D/L, goals for/against, goal difference and score coverage, grouped by entered team.
Known scores reuse existing corrections/tags/Veo scores; missing scores stay unknown.
A match can belong to multiple tournaments but only one entered team in each.
Assignments can be corrected or removed without deleting games.

## What must NOT change
No source account requests, credentials, footage paths or downloads change.
Existing library layout, source visibility, age/season/search and pagination remain.
Source IDs are namespaced so imported/Hudl/Veo games never collide.

## Non-goals
No inferred tournament standings, points rules, player ratings or winner claims.
No automatic deployment to hosted accounts.

## Open questions / default
Tournament names are entered with an edition/year to distinguish recurring events.
Stats cover the whole tournament independently of card filters; unavailable games
count as missing data rather than being silently scored as draws.

## Test plan
API persistence/reassignment/removal, separate tournaments and rejected malformed
batches (negative control: valid batches persist). Pure stats cover win/draw/loss,
unknown scores, separate teams and source collisions. UI tests cover selection,
submitting a batch, filtering, editing and failure feedback. Review desktop/375px
against reference 01 and the owner's supplied match-card screenshot.

## Real-account check
None needed. All verification uses synthetic data with source access disabled.

## Verification
Backend 784 passed each SQLite/PostgreSQL; frontend 741 across 144 files. Ruff
lint/format, mypy, frontend types/build and Alembic schema check pass. Focused tests
observed red/green. Synthetic 1440/375px browser checks passed against reference 01
and supplied card image; local deployment health/API/nginx/served feature verified.
No existing test changed, real account accessed, hosted rollout, helper restart or
footage change. Detailed commands/results in PROGRESS.md.
