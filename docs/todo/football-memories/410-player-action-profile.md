# 410: Player action profile

**Status:** Shipped
**Sensitive:** no

## What is wrong or missing today
Owner selected Action profile (mockup 2): sparse grids obscure recorded counts.

## What changes
Player identity/minutes beside horizontal recorded-count bars; zero counts in a
compact row; missing stats and sources in expandable detail. Common count scale
across the match's players and metrics (never ratings), responsive stacked phone
layout. Existing search, group filter, sort, source labels and clip seeking remain.

## What must NOT change
Stat computation, missing versus zero, likely goals, keeper exclusion, estimates
and confirmed minutes. Existing tests unchanged. No account or library operations.

## Non-goals
New metrics, invented scores/photos, radar ratings, new source requests.

## Test plan
Positive counts get accessible bars on one scale; zero stays selectable; unknown
stats stay in disclosure; clips remain accessible; all existing tests pass.
Offline desktop/375px browser review against selected Action profile mockup.

## Real-account check
Not needed: synthetic data only.

## Verification
Frontend 658; backend 771 each SQLite/dedicated PostgreSQL; all static/type/build/schema
gates pass. New behavior observed red first. Desktop/375px synthetic review completed.
Shared-checkout keeper-test and shared-database collisions resolved by isolation, with
keeper fix integrated before final frontend run. No account/library operations.
