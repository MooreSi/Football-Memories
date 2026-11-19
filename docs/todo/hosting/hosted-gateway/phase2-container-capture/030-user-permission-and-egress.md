# 030: Each user's own permission, and an egress allow-list

**Status:** built (2026-11-19, gateway b1b63dd + egress filter). Video hosts to be measured in the owner's read-only check.
**Owner (2026-11-19):** wording approved as written; hosts measured once by the owner, read-only.
**Depends on:** 020
**Real-money surface:** no (account-touching: owner sign-off required before any code)
**Leverage:** owner decision 002 wording; `docker-proxy/haproxy.cfg` (allow-list pattern)

## Problem

Hudl's terms forbid automation without permission, and the owner's attestation covers the
owner's account only. Today every user library has no internet at all.

## Proposed decision

- **Permission:** before the Hudl or Veo controls appear in a user's library, the user ticks
  and confirms, in their own words: *"I have permission from Hudl (or Veo) to access my account
  with automated tools, and I will only save videos my account can already view."* Stored with
  the date in their library; an audit row in the gateway (no username). Wording is the owner's
  to change.
- **Egress:** each user's `capture` container also joins a per-user egress network whose only
  exit is a filtering forward proxy (HAProxy or similar, pinned) that allows HTTPS CONNECT to
  `*.hudl.com`, `*.veo.co`, `*.veocdn.com` and nothing else. Video and signed media addresses
  arrive at run time and are **not in the code**; the extra hosts they need (if any, e.g. a
  CDN) are measured once by the owner, read-only, and added by name, never by wildcard.
- The admin page shows whether a user has connected Hudl / Veo (yes / no), never the username.

## Tests first (TDD)

- Proxy config test: allowed hosts pass, any other host is refused (negative control), a
  CONNECT to an IP address is refused.
- Frontend: Hudl/Veo controls hidden until the confirmation exists; the confirmation is sent
  with the CSRF token through the gateway.
- Security pass extension: a user's `capture` reaches the allowed hosts and nothing else; their
  db, backend and web still reach nothing.

## Acceptance

- Owner signs off the wording and the host list.
