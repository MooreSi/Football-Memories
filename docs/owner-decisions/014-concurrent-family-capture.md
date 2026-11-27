# 014: Families' Hudl and Veo work at the same time

**Status:** answered 2026-11-26
**Raised by:** owner report 2026-11-26 ("Another family's Hudl or Veo work is running on this
service. Try again in a few minutes." while other people used the app the night before)

## The question

The gateway let only one family's Hudl/Veo work run at a time (`CaptureSlot`, owner decision
2026-11-19, threat model T21), because every family's requests leave from the one home
address. A second family got a 409 until the first family's helper was idle for a minute.
Options offered: queue and start automatically (same traffic), separate Hudl and Veo turns,
a shorter hold, or remove the restriction.

## Answer (owner, 2026-11-26)

"remove the restriction". The gateway no longer refuses one family's Hudl/Veo work because
another's is running. The per-service permission check is unchanged.

## What follows

Several families' helpers can talk to Hudl and Veo from the home address at once. Each
helper still paces its own requests, but nothing paces them together, so the combined rate
from the address rises with the number of families active. The risk the slot guarded (Hudl
or Veo seeing many automated sessions from one address and limiting or flagging accounts)
is accepted by the owner. If a rate-limit, CAPTCHA or account warning appears, stop and
tell the owner; restoring the slot is reverting the gateway change that removed it.
