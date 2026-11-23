# 510: Tournament discovery repair and layout alternatives

**Status:** Fixes verified; layout decision pending
**Sensitive:** no; cached metadata only

## What is wrong
Tournament controls occupy too much Library space. Owner requests interactive mockups
before choosing a layout, including tournament → squad → all squad matches. Rename
popup can close while changing its input; rename must affect every game in that event.
October 26 Liverpool pitch games are absent because titles use U11s instead of U11.

## What changes
Produce three interactive concepts: grouped Library rows, a Tournament Hub and a compact
details drawer. Keep concepts separate from production until owner chooses. Repair
popup dismissal during text-selection drags. Normalize equivalent age spellings and
remove pitch identifiers from opponent identity; preserve conservative weekend rules.
Expose whole-event rename scope in the current dialog. Confirm whole-group rename in API.

## Must not change
No source refresh/login/index/stream, no real roster in tests, no footage change. Manual
corrections, confirmed names and partial snapshots survive. Existing tests unchanged.
The three-game/multiple-opponent threshold is unchanged. No chosen layout is implemented.

## Test plan
Red/green age-alias inclusion plus other-age and single-opponent pitch negative controls;
red/green popup drag dismissal plus deliberate-backdrop control; whole-event rename across
two squads, every membership and stable identity. Full repository gates and synthetic
browser interaction; read cached date/title metadata only for reported October examples.

## Concepts to choose from
- **Grouped Library:** compact expandable event rows; reveal squad cards, then squad matches.
  Ordinary fixtures remain alongside; no permanent tournament settings box.
- **Tournament Hub:** a local Tournaments view with event folders and breadcrumb drill-down.
  Keeps match browsing separate from event/squad summaries.
- **Compact Drawer:** one Tournament control; open contextual squad/match details beside the
  normal match grid (above it on phones). Smallest default footprint, less immediate grouping.

Preview fragment: task visualization `tournament-layout-options.html` (three variants).
It uses illustrative squad splits and omitted scores, local interactions only. No concept
has been implemented in the production layout. The owner chooses after trying the mockups.

## Verification
822 backend tests on SQLite and PostgreSQL, 750 frontend tests; lint/format/types/build/schema
checks pass. Three detector regressions and popup dismissal regression observed red/green;
whole-event rename characterized across two squads. Cached title/age audit includes both
Oct26 Liverpool pitch recordings in U11's six games. Browser drag/edit/save updates all four
synthetic match cards. Concepts inspected at desktop and 375px, no horizontal overflow.
No existing test changed or real source request made. Release/deployment details in HANDOFF.
