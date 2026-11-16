# 280: Veo expiry queue

**Status:** Shipped (2026-11-16)
**Sensitive:** no. Reads only the helper's cached Veo library and the download index; no Veo request, no library file touched.

## What is wrong or missing today

Veo deletes match video 12 months after the match (6 on its Starter plan; Veo support
article 23485386875921, research 2026-11-16). 228 of the owner's 284 Veo recordings have
already expired. The app shows "Video expires soon on Veo" on a card, but nothing lists
which matches still have video and are not saved, or how long is left, and nothing
records what was lost.

## What changes

- `frontend/src/lib/veoExpiryQueue.ts` (pure): from the Veo library, the download index,
  a retention in months and today:
  - **at risk**: matches with video on Veo and no full-match download. Estimated expiry
    = match date (title `YYMMDD`) + retention months. Band: `7` (7 days or less, or past
    the estimate), `30`, `60`, `later`. Veo's own `expires-soon` puts a match in at
    least the 30-day band. Matches with no readable date are listed last, band `unknown`.
    Sorted soonest first.
  - **lost**: matches Veo lists as expired and no full-match download, newest first.
    A match Veo has not expired but lists no video for is in neither list.
  - **saved**: count of matches with a full-match download.
- Downloaded page: a "Before Veo deletes them" panel above the downloads when the Veo
  library has matches: at-risk rows (date, title, "about N days left", band colour,
  link to `/veo/:id` where Download full match already is), a retention picker
  (12 or 6 months, localStorage `fm.veo.retentionMonths`, default 12) and a collapsed
  "Expired on Veo before they were saved (N)" list.

## What must NOT change

- No new helper route, no Veo request, no change to downloads or the download index.
- `veoExpiry` card wording and existing Downloaded page behaviour; existing tests pass unmodified.

## Non-goals

- Downloading from the panel (the match page does it, one at a time).
- Two-copy / checksum status (the separate fixity work).
- Recording the date a match was first seen expired (needs helper cache changes).

## Open questions (and the provisional default in use)

- Which Veo plan the owner's clubs are on, so how long Veo keeps video: default 12
  months, picker offers 6. Owner decision 010.
- The estimate ignores Veo's real (unpublished) expiry date; Veo's `expires-soon` overrides.

## Test plan

| Test | Asserts | Negative control |
|---|---|---|
| queue: estimate and sort | match dated 2025-12-01, retention 12, today 2026-11-16 -> 15 days, band 30, listed before a later one | same match with retention 6 -> already past, band 7 |
| queue: downloaded excluded | a match with a full-match entry is not at risk, counts as saved | a moments-only entry does not count as saved |
| queue: lost | expired, not downloaded -> lost | expired and downloaded -> not lost |
| queue: Veo flag | `expires-soon` with a far estimate -> band 30 | `does-not-expire-soon` with the same date -> band later |
| queue: no date | undated title -> band unknown, last | |
| panel | rows, days left, link to `/veo/<id>`, picker changes the days, lost list count | no panel when the Veo library is empty |

## Real-account check

None needed (no Veo request). Owner looks at the panel on the live app.

## Verification (filled in when shipped)
- [x] suite green: frontend 529 tests (114 files), typecheck, build. Backend not run:
  no backend change, and another session had uncommitted backend work in the checkout.
- [x] no credential, cookie or token written to the repo, a log or a fixture
- [x] nothing on Hudl or Veo modified; no existing library file deleted or overwritten
- [x] real-account check: not needed. Browser-checked on the built app served by a
  throwaway stand-in helper with made-up matches (desktop and 375 px), no real helper.
