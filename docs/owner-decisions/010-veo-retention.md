# 010: How long Veo keeps match video on the owner's clubs

**Status:** answered 2026-11-16
**Raised by:** Veo expiry queue (spec 280), 2026-11-16

## The question

Veo deletes match video automatically: 12 months after the match on Team, Club and
Enterprise plans, 6 months on Starter (Veo support article 23485386875921, read via
search 2026-11-16). Veo does not publish each match's expiry date, only a status
(`expires-soon`, `expired`). Which plan are Norton Lindsay's and Racing Club Warwick's
Veo accounts on? If they differ, the app needs a setting per club.

## Why it matters

The Downloaded page's "Before Veo deletes them" list estimates days left as match date
plus this period. Too long an estimate makes a match look safer than it is.

## Provisional default in use

12 months, one setting for all Veo matches, changeable on the panel (12 or 6 months,
saved in this browser as `fm.veo.retentionMonths`). Veo's own `expires-soon` always
counts as 30 days or less, whatever the estimate says.

## What changes if the answer differs

6 months: the default becomes 6. Different plans per club: the setting is kept per club
(the app already knows each match's club, `lib/veoClubs.ts`).

ANSWER: (owner, 2026-11-16, asked in chat) Both clubs keep video 12 months (Team,
Club or Enterprise plan). The provisional default of 12 months for all Veo matches
stays; no per-club setting is needed. The panel's 6-month choice stays available.
