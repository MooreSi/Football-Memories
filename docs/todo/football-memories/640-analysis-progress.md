# 640: Selected-window analysis progress

**Status:** Shipped
**Sensitive:** bounded source reads; safe-change reviewed. No authentication,
request concurrency/retry, retention or archive policy changes.

## What changes
Keep existing range relay and input-side seek. Prove with synthetic remote media
that analysis exports only the selected interval without full-match download.
Expose actual ffmpeg output seconds during clip preparation, with bytes fetched
when remote. Distinguish connection, encoding, verification and import stages.
Show cyan/blue/violet gradient progress, with an indeterminate bar when a stage
has no measured percentage. Use the same bar for worker analysis progress.

## Invariants / non-goals
Preserve original media, existing results, serialized source actions, exact
H.264/duration/hash verification, source-host/Range validation and all guards.
No fabricated overall percentage or new account request for testing. Do not
restart the helper while the owner's current analysis preparation is active.
Visual style follows reference02 and the existing charcoal picker panel.

## Test plan
Red-first preparation progress and UI tests; actual synthetic MP4 through the
range relay, verifies duration, nonzero bounded bytes, no full-download method,
no full archived match, no leaked address. Existing saved-source negative control.
Run full owning-repo checks and inspect gradient in browser with synthetic data.

## Verification
Backend854 SQLite +854 PostgreSQL; ruff/format/mypy/Alembic pass.
Frontend860, typecheck/hosted build and10 focused UI tests pass.
Deployed admin-only app `f14fc04` after helper preparation completed
(busy=false/state=done). Exactly admin web/backend/capture changed (3/32), other29,
shared tags/global latest6138b56, gateway and worker unchanged. Auto-update remains
false. Health200, new VideoLabPage-C0M4t4WV bundle and measured-progress code loaded.
Owner-submitted worker job remained running throughout; no new analysis queued.
Synthetic browser gradient/stage acceptance passed; no fresh live source run to
verify the new preparation callbacks. Safari was on another page, so it was not
reloaded or interrupted. Refresh Video Lab to load the new gradient bars.
Synthetic gradient preview inspected in browser against reference02: measured
preparation37%, indeterminate import, worker62%; temporary harness removed.
No source-account request or new live analysis was started for validation.
