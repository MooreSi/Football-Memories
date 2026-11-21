# 440: Season story becomes a football performance overview

**Status:** Shipped
**Sensitive:** no; action parsing only, no request/session/storage behavior change.

## What is wrong or missing today
Season story summarizes monthly tag volume, rather than season football performance.

## What changes
Keep newest-first season selection; replace monthly moments with separate goalkeeping
and outfield graphical totals. Mixed-role seasons retain both. Keeper saves, conceded,
shots faced and weighted save percentage; all supported outfield metrics, adding generic
fouls, defensive 1v1 and attacking 1v1 counts. Summaries describe football totals/coverage.
Preserve supported 1v1/foul action labels through existing parser/cache allowlist.

## What must NOT change
No real account access, request policy, raw-label retention, archive file writes or
invented quality ratings. Reuse shared attribution and corrections. Missing stays unknown,
zero stays zero, overlaps/likely scorers/keeper estimates remain labelled. Keeper ratios
use a consistent known-save sample, never average match percentages.

## Non-goals
Inferring duel outcomes or pass accuracy; changing other moment-based hub sections.

## Open questions and defaults
Show separate panels when role evidence exists. With no role evidence, profile position
chooses the empty panel. Fouls is a generic recorded category; retain won/conceded
separately and never add overlapping foul categories. Undated matches stay Unclassified;
imports with no action data show unavailable stats. July–June dates determine seasons.

## Test plan
Synthetic multi-season/mixed-role fixtures: totals, saved corrections, known-save weighted
ratio, keeper windows excluded from outfield, direct actions preferred over overlaps,
missing versus zero, 1v1/foul parser/cache retention, no assumed wins. Browser at 1440px
and 375px against reference 03 hierarchy/current dark palette; working season selection.
Existing season-story expectations are replaced for the owner's explicitly requested
retirement of monthly-moment stories. Existing unrelated assertions remain unchanged.

## Real-account check
None needed. New action aliases appear on the next normal match read; no automatic reread.

## Verification
Frontend 688 passed; backend 772 passed each SQLite/PostgreSQL. Lint/format/types,
schema drift and builds pass. Synthetic mixed-role desktop/375px browser review and
season switching pass; no overflow/page errors. Local frontend deployed and served
bundle verified; helper restarted gracefully while both sources idle. No source
account accessed or existing archive files changed. Hosted update preferences retained.
