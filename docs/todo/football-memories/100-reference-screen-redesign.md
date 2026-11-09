# 100: Three distinct reference-led screens

**Status:** Shipped
**Sensitive:** no; presentation only, existing APIs/actions unchanged.

## What is missing
The shared dark navy treatment flattens the three references into one style.
The owner requests separate screens that visually follow the supplied mockups.

## What changes
- Library: charcoal glass dashboard, warm pitch atmosphere, overview left,
  tall footage hero centre, latest match and recent moments right.
- Match: compact dark analysis workstation, narrow scrollable tag rail, large
  video, tight header/controls and yellow event timeline.
- Player: white/lime profile, shield card, teams/numbers/roles and teammates,
  tag charts and a dark vertical moments feed. Keep each at its existing route.
- Navigation remains visible and useful at desktop and phone widths.

## What must NOT change
Existing tests, routes, real data, media playback, filtering, exports, imports,
Hudl capture and archive operations. No mock statistics or player images.

## Non-goals
New analysis metrics, ratings, social features or live-match functionality.

## Open questions
None required. Use existing real thumbnails/photos and honest empty states.

## Test plan
Presentation-only changes: retain all behaviour tests unchanged, check build,
and compare each screen in the browser with its reference. Check 375px layout
and keyboard-visible focus; correct clipped controls or horizontal overflow.

## Real-account check
None needed; use local app data only, no Hudl access.

## Verification
- Backend: 220 passed on SQLite and Postgres; lint/format/types clean, no schema drift.
- Frontend: 88 existing tests passed unchanged; typecheck and production build clean.
- All three screens compared in desktop Safari and 375×812 responsive previews.
- Docker rebuilt and healthy; real archived-match Library opened.
- No Hudl access, credentials/session changes or archive operations for this task.
- Actual uploaded photos retain their existing rendering; no new photo was uploaded.
- Physical mobile devices and other browsers were not checked.
