# 140: Use Hudl team libraries for age groups

**Status:** Shipped
**Sensitive:** YES: read-only discovery/access scope; safe-change applies.

## Problem and change
Age labels in video titles are not the Hudl team selector. Discover all served
team context links from that selector, visit each serially, and attach its age
group to the videos in that actual library. Cache sanitized memberships so shared
videos remain visible under each applicable group. All matches retains its
layout and exposes U10/U11/U12 from the accessible team libraries.

## Must not change / non-goals
No guessed IDs, replayed GraphQL queries, new request limits, credentials/session
storage changes, footage writes or Hudl mutations. Existing tests unchanged.
Legacy caches retain title fallback until refreshed; new memberships override it.

## Test plan and real-account check
Watch regressions fail first: served context-link validation; persistent scoped
memberships with unclassified/misleading titles and shared videos; serial
three-library discovery; filtering a U11 library video named U10 in the app.
Owner authorizes read-only investigation/test: normal login, open team selector,
list the three libraries, refresh cache, select U11 and verify real thumbnails.
No new footage download required.

## Verification
- Eight backend regressions and the frontend membership filter test were watched
  failing for the missing behaviour, then passing. Existing tests unchanged.
- Backend 264 passed SQLite and PostgreSQL sequentially; ruff check/format, mypy
  and alembic check green. Frontend 98 passed, typecheck/build green. Docker
  rebuild/health checked. No CI workflow exists.
- Live authorized read-only normal login/discovery cached 286 unique videos and
  286 thumbnails: U10 100, U11 87, U12 99. All three All matches filters were
  selected in the app and showed those counts; U11 cards/loaded images verified.
  Repeat refresh retained all three groups. Proof stays in ignored local data.
- Temporary diagnostics contained counts only and were removed before final
  verification; no credentials/session persistence changes or footage operations.
  Bounded discovery does not prove exhaustive historical enumeration.
