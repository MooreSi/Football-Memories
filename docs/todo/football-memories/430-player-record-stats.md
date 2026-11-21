# 430: Player records use football stats

**Status:** Shipped
**Sensitive:** no

## What is wrong or missing today
My Player's four records cards measure moment volume rather than football actions.

## What changes
Replace the cards with all-archive totals: outfield goals scored, shots on target,
chances, passes; keeper goals saved, goals conceded, shots faced, save percentage.
Use existing match scorer/keeper corrections and player action attribution. Mark
likely goals/keeper estimates and team-overlap counts; missing metrics remain dashes.
Profile position wins; infer keeper display only when position is unset.

## What must NOT change
No source account access, archive writes, invented actions, or changes to match stats.
Retain the existing four-card layout and Records and streaks section name.

## Non-goals
New action inference, imported tag reconstruction, new streak metrics.

## Open questions (and provisional default)
The two extra keeper metrics are shots faced and save percentage, calculated only
from matches with both known saves and conceded totals. Label sample coverage.

## Test plan
Test action totals versus unrelated/overlapping player tags, corrected scorers and
keepers, missing versus zero data, profile/inferred position and keeper sample coverage.
Replace the old panel expectations because the owner explicitly requests all four cards change.

## Real-account check
None needed; synthetic browser and tests only.

## Verification
Frontend 685; backend 771 each SQLite/PostgreSQL; lint/format/types/build/schema
pass. Synthetic desktop/375px browser review complete. Local frontend deployed,
health/Nginx/served bundle verified. No source account accessed or archive files changed.
