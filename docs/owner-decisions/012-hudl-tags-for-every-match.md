# 012: Index Hudl tags for every match on first connection?

**Status:** answered 2026-11-20

The owner asked (2026-11-20) that Hudl tags and metadata be read on the first
connection for all users, without pressing Refresh.

Today Connect already lists the library and queues the paced tag sweep (one match
at a time, decision 003 pacing), but only for the age group saved in the Library.
With none saved (any new user) it indexes nothing: spec 180 / D-025 chose "no
automatic account-wide tag sweep", pinned by
`test_empty_scope_does_not_scan_the_entire_account`.

Changing that means one paced match-page visit per video in the whole account
(about 290 on the owner's), per user. Pacing and stop conditions would not change.
For hosted users it is many accounts' sweeps from one home address (the hosting
plan's open risk).

**Provisional default:** unchanged (sweep the saved age group only).
**Options:** (a) sweep every match when no age is saved; (b) sweep the newest N
matches; (c) keep as is and prompt the user to pick an age group after Connect.

ANSWER (owner, 2026-11-20): "Yes, every match" (option a). With no age group saved,
Connect, Refresh and the app's auto-check index every match's tags. Pacing, the
one-at-a-time sweep, the stop-on-refusal and weekly retry rules are unchanged. A saved
age group still scopes the sweep to that age. Replaces the D-025 "no account-wide
sweep" rule; `test_empty_scope_indexes_every_match_one_at_a_time` pins it.
