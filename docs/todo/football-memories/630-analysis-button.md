# 630: Unlock Analyse after background completion

**Status:** Shipped
**Sensitive:** no

## Problem and change
The jobs list is fetched once. Its queued/running rows keep the Veo Analyse
button disabled after completion, even while another completed run is selected.
Poll the list while unfinished jobs exist. Explain busy and invalid-range states
next to the button so a legitimate refusal is actionable.

## Invariants / non-goals
Keep single-job admission, permission/CSRF/source handling, duration bounds,
existing results and footage unchanged. No source-account operation or new
analysis is needed for verification. Existing admin preview deployment scope.

## Test plan
Synthetic UI regression: background running job disables Analyse; completing it
unlocks without reload, with a different completed run selected (negative control:
before completion it remains disabled). Busy and out-of-range reasons are visible.
Run full project checks; real source-account analysis remains owner acceptance.

## Verification
Backend852 SQLite +852 PostgreSQL; ruff/format/mypy and Alembic pass.
The first mypy run caught a pre-existing Any return in `_folder`; explicitly
typed its existing VeoConnection local without a runtime change; existing
clip tests2 pass. Frontend858, typecheck and hosted build pass. Admin deployment pending.
