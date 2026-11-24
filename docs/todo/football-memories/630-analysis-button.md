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
clip tests2 pass. Frontend858, typecheck and hosted build pass. Deployed admin-only app `d2f383c` using the existing updates._move path.
Exactly admin web/backend/capture changed (3/32); other29, gateway/worker,
shared :hosted tags and global latest6138b56 unchanged; auto-update false.
Backend health200 and VideoLabPage-BdRYHb4I served. Helper status before move:
Hudl idle/not syncing, Veo ready, both busy=false; existing media traffic was
present (no claim of a quiet network). Standard move recreated the helper and
its ephemeral streams. Signed-in Safari refreshed; selected the reported match,
start16/duration4: Analyse enabled. Left these selections ready; did not press
Analyse or queue a new source operation. New-run completion was verified with
synthetic fixtures; no new live end-to-end analysis performed.
