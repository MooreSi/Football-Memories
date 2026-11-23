# 500: Automatic tournament and squad tagging

**Status:** Shipped
**Sensitive:** no (cached/local metadata only)

## Missing behavior
Spec 490 requires manual grouping. Owner now requests automatic date/title/player-based
classification with persistent corrections.

## Changes
On Library load and cached metadata changes, send minimal cached match metadata to a
local detector; include all imported match metadata directly from the database. Group
same-date/club/age games using named tournaments, or at least three distinct games
against multiple opponents (D-049). Ordinary same-opponent weekend pairs and format
variants stay separate.
Do not count duplicate source views or first/second halves as separate tournament games.
Use explicit entered-team title labels first; otherwise cluster sufficiently populated
rosters with conservative shared-player thresholds and complete-link compatibility.
Use provisional Squad numbers, never invented real squad names. Missing/sparse/ambiguous
rosters remain Team unassigned. Show automatic provenance, explanation and review status.
Card correction and existing batch tools override automatic membership, including moves;
removal leaves a durable exclusion so later detection cannot re-add it. Rename an entire
tournament without changing stable detection identity. Preserve existing manual groups.

## Must not change
No source login, refresh/index requests, streaming, credentials or footage operations.
No real roster/name in committed fixtures. Keep existing APIs, backup schema, stats,
source namespaces and manual multi-tournament behavior. No external AI calls.

## Defaults / limits
Events are date-specific; multi-day events can be corrected manually. Date-only grouping
is labelled for review. Automatic labels are estimates; confidence is evidence-based,
not a statistical probability. Manual team labels can seed comparable rosters within
the same detected tournament. Missing/partial catalogs cannot erase saved assignments.

## Test plan
Test-first detector coverage for date/title signals, different dates/clubs/ages/events,
duplicate views/halves, roster cohorts, partial/bridge/ambiguous evidence, explicit labels
and stable squad naming. API persistence, idempotence, correction/move/remove protection,
rename and imported database metadata. UI auto invocation, refresh after new player data,
provenance and correction. Full SQLite/PostgreSQL/frontend checks and synthetic desktop/
375px reference-01 browser review before local rollout and commit/push.

## Real-account check
Not needed. Cached metadata may be audited read-only locally; no real source request.

## Verification
Implementation and red/green regressions complete. Full backend: 806 pass on SQLite
and PostgreSQL; lint/format/mypy and Alembic no-drift pass. Frontend 745 tests in 145 files pass;
focused automatic/correction checks, types/build pass. Synthetic real-API browser
review of automatic creation, separate rosters, correction propagation, rename,
reload and desktop/375px layout passed. Local deployment health/API/nginx and served `index-C4zqzSZt.js` verified.
Committed/pushed on `codex/tournament-library`; no hosted rollout or helper restart.

No existing test changed, real source account accessed or footage operation performed.
A read-only date/title audit found 289 local cached matches, latest date 15 November
2026; the screenshot's 22 November matches are absent from that local cache. No cache
or source data changed by that audit; heuristic counts do not establish accuracy.

## Owner clarification (2026-11-23)
D-049 tightens unnamed detection, withdraws fully observed obsolete automatic guesses,
preserves owner confirmations and partial snapshots, scopes dropdowns to selected age/
season and makes Rename available on cards. Full-width input CSS excludes checkboxes;
footer controls wrap on small screens. Owner explicitly approved updating superseded
two-game test fixtures/expectations. See latest PROGRESS/HANDOFF for verification/rollout.
