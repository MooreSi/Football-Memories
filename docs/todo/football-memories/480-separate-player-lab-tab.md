# 480: Restore distinct Player Hub navigation

**Status:** Shipped (verified; rollout recorded in HANDOFF)
**Sensitive:** no.

## What is wrong or missing today
The private preview uses `/player/lab`, which highlights My Player; its global
main-area shortcut makes it look like the original Player Hub was replaced.

## What changes
Keep My Player and its original profile/chooser routes intact. Give the admin-only
Player Lab a separate main navigation tab at `/player-lab`, with its own active
state and a Private preview label. Redirect the old lab URL to the new route.
Remove the global preview shortcut above every page. Retain existing admin gate,
notebook storage and lab functionality. Scope its responsive header to its new route.

## What must NOT change
Player Hub layout, data and selection; other users' navigation; source requests,
credentials, downloads and footage. No real source account needed.

## Non-goals
Restyling the hub or changing stored player profiles/preferences.

## Open questions
Separate tab means a separate main navigation entry, not a browser window.
Read-only check found the hosted admin library lacked a profile while the original
local primary existed. Owner explicitly approved copying it: editable fields and
photo copied via existing APIs, selected in admin, verified; original unchanged.
Derived history/totals/footage are not part of a profile copy.

## Test plan
- Admin has distinct My Player and Player Lab navigation links.
- The lab route activates only Player Lab; the original hub activates only My Player.
- Clicking My Player opens the original chooser/profile flow; clicking Lab returns to preview.
- Ordinary users have no Lab tab and direct access remains denied.
- Existing lab URLs redirect to the separate route.
- Full project checks and synthetic desktop/375px review.

## Real-account check
None needed; test fixtures and served-bundle/health checks only.

## Verification
- Frontend 733 tests / 141 files; typecheck and local/hosted builds pass.
- Backend 780 each SQLite/PostgreSQL; Ruff/format/mypy/schema drift pass.
- Five new navigation regressions observed red then green; existing tests unedited.
- Synthetic Hub/Lab desktop 1440px and phone 375px reviewed, no document overflow.
- Target profile fields/photo/primary selection verified after the owner-approved copy.
  Original source selection/fields/photo hash unchanged; no source account accessed.
- Deployment recorded in HANDOFF/PROGRESS. No repository CI workflow.
