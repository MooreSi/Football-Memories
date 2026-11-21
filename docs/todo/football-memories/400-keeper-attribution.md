# 400: Reliable goalkeeper attribution

**Status:** Shipped
**Sensitive:** no (cached metadata and app preferences only)

## What is wrong or missing today
Goal-kick overlap can select an outfield player; a global change penalty suppresses
returning keepers across short periods. Missing evidence falls back to the first keeper.

## What changes
Rank plausible pre-kick tags by proximity to the standard four-second player lead;
include longer running tags. Infer independently across END HALF boundaries, require
repeat kick evidence, reject ties and leave unsupported periods unknown. Preserve
explicit goalkeeper-code evidence and owner assignments. Attribute goals at estimated
ball-in time. Multiple confirmed names alone do not establish who conceded.

## What must NOT change
No login/network policy, source metadata, footage, scorer logic or saved overrides change.
Existing tests remain intact. Shared inference applies regardless of age or season.

## Non-goals
No roster inference from other games; no invented name aliases or verified save counts.

## Open questions
Owner confirmed that the cached first name is correct. No alias or source rename.

## Test plan
Synthetic four-period returning-keeper case with overlapping outfield tags; long tags;
ambiguous votes and empty periods; goal spanning a change; multiple confirmed names
without timing; explicit owner goal assignment as positive control. Existing suites.

## Real-account check
Use local cached metadata only; no source account access needed.

## Verification
Frontend 656 passed; backend 771 passed on SQLite and PostgreSQL (dedicated
`memories_test_keepers` database for the successful rerun, removed afterwards).
Ruff check/format, mypy, Alembic schema check and frontend typecheck/build pass.
Synthetic desktop/375px panel checked; 229 cached matches audited read-only.
New regressions observed red; original tests unchanged. No real account read,
source metadata modified, or library file overwritten. No CI workflow configured.
Merged/pushed main `70bbc49`; local frontend rebuilt/recreated. Health and Nginx
pass; served `index-DgovPcoI.js` verified. Backend/helper unchanged. Hosted installs
follow their existing update preferences.
