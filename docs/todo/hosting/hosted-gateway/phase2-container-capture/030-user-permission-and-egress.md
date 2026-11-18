# 030: Per-user permission and egress allow-list

**Status:** not started (sign-off gated)
**Depends on:** 020
**Real-money surface:** no (account-touching: owner sign-off required)
**Leverage:** owner decision 002 wording

## Problem

Hudl's terms forbid automation without permission. The owner's attestation covers the owner only.
And phase 1 instances have no internet at all.

## Decision (proposed, for sign-off)

- Before Hudl/Veo controls appear, the user confirms in their own words that they have permission;
  stored with date in their instance and an audit row in the gateway. Wording drafted for the owner.
- Egress: the user's backend joins a second network whose only exit is an egress proxy allowing
  HTTPS to the Hudl and Veo hosts the connectors already use (list taken from the code, not
  guessed), nothing else. Gateway admin page shows whether a user has connected Hudl/Veo (yes/no,
  never the username).

## Tests first (TDD)

- Proxy config test: allowed hosts pass, any other host refused (negative control).
- Frontend: Hudl/Veo controls hidden until the attestation exists.

## Acceptance

- Owner signs off the wording and host list.
