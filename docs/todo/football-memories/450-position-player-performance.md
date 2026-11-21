# 450: My Player performance follows the selected position

**Status:** Shipped
**Sensitive:** no; offline action allowlist only, no account request/session changes.

## Problem and changes
Owner supersedes mixed-role display: explicit profile position chooses the sole
hub/season/report role. Remove On the pitch during and Attacks he was in sections.
Replace moment-volume milestones with career football totals/next positive targets.
Replace report player-involvement rows with named, position-specific match/season
performance. Add keeper appearances, best saves, saves/game, conceded/game, clean
sheets (known consistent score and sole keeper only) and explicit penalties stopped.
Outfield adds explicit penalties scored alongside existing action metrics. Put crest
above and overlapping the photo. Follow reference 03/current palette and attachment.

## Constraints/non-goals
Keep unrelated team report content and playback actions. No invented penalty outcomes,
clean sheets from split keeper spells, missing-as-zero, ratings or moment milestones.
Preserve corrected scorers/keepers, source/estimate labels, weighted percentages and
coverage. Games means recorded tagged/assigned appearances, not verified full games.
No real account requests, automatic tag rereads or existing archive file changes.

## Test plan
Test profile-role precedence in hub/season/report, sources/corrections and weighted
ratios; penalty-label parser/cache and no inference from a generic penalty; strict
clean-sheet eligibility; career goals/conceded/saves/targets by role; removed sections;
crest overlap and stacking in synthetic 1440px/375px browser; both report exports.
Existing expectations for retired moment/mixed-role behavior are replaced to satisfy
the owner's explicit new requirements. Preserve unrelated existing test assertions.

## Verification
Frontend 699; backend 773 each SQLite/PostgreSQL; lint/format/types/schema/build
pass. Synthetic 1440px/375px hub and both PNG exports visually checked, crest
intersection/hit test passes. Frontend deployed locally, health/Nginx/served bundle
verified. Helper gracefully restarted while both services idle; no source account
accessed or existing archive files changed. New action labels arrive on normal match read.
