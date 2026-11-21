# 370: Individual actions and complete player stats

**Status:** Shipped (verified feature branch; deployment pending)
**Sensitive:** parser/cache metadata only; safe-change reviewed. Existing account
and footage safeguards, pacing and login behavior remain unchanged.

## Problem and changes
Owner identified Passing under a player's Individual action in the Cardiff 9v9
match. The parser currently retains only HUDL_CODE and drops accompanying labels.
Preserve supported action values on each original moment through parsing, cache
and served library. Keep action values allowlisted; never persist arbitrary source
labels, URLs or account data. Old caches gain actions when a match is opened again,
using the existing read. No new background sweep or request-rate changes.

Add assists, key passes, interceptions, blocks, clearances, fouls won/conceded,
successful dribbles and possession lost. Prefer player-linked actions to team-tag
overlap; identify the count source and retain clip review. Do not infer successful
dribbles from generic Dribbling or assists from proximity to a goal. Group/filter
stats to keep comparisons manageable. Retain existing eight stats and goal logic.

Minutes played is a manually confirmed per-player, per-match number stored in
preferences (backed up); no sum of involvement durations or first-to-last estimate.
A missing value stays a dash; zero is a saved value. Allow saving and clearing it.

## Test plan
- Non-code Individual action values survive parse → private cache → served metadata.
- Unknown/secret-looking values excluded; supported values retained as control.
- Player action count does not credit overlapping teammates or add a team-tag duplicate.
- Supported new metrics, missing-vs-zero, action outcomes and existing fallback.
- Minutes round-trip/restart/isolation, validation and clear; UI save/error/sort.
- Reference 02 desktop/375px review using synthetic fixtures; full verification.

## Real-account check
Owner signed into Chrome for the requested read-only Cardiff 9v9 inspection:
181 Passing results, 19 for one selected player. Verify normal helper metadata
read after deployment; no source roster, raw responses or session data exported.

## Verification
- New behavior tests observed red, then green. Existing assertions unchanged.
- Backend 771 passed on SQLite and 771 on development PostgreSQL. Frontend 638
  passed; lint/format/mypy, schema drift, typecheck and build passed.
- Synthetic desktop and 375px browser review against reference 02 styling:
  group filter, action source/clip review and confirmed minutes editing/save.
- Existing Starlette/jsdom and bundle warnings remain. No CI workflow exists.
- Deployment and live helper metadata read pending.
