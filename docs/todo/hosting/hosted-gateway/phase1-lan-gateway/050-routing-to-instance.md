# 050: Routing a signed-in user to their instance

**Status:** not started
**Depends on:** 030, 040
**Real-money surface:** no
**Leverage:** none

## Problem

After sign-in the user must see their own app, and nothing they type in the address bar or send in
a header may reach anyone else's.

## Decision

Same origin. The gateway owns `/_portal/` (portal UI and API) and `/_admin/`; every other path is
forwarded to `http://fm-u-<id>-web/` where `<id>` comes **only** from the server-side session. No
session -> redirect to `/_portal/login`. Implemented as a streaming reverse proxy inside the gateway
(supports HTTP Range for video, uploads, long reel downloads). Before forwarding it:

- removes the `fm_session` cookie and any `Authorization`, `X-Forwarded-*`, `X-Real-IP`, `Host` the
  client sent; sets its own `X-Forwarded-For`/`Proto`;
- refuses paths `/helper/`, `/stream/` (belt and braces with 080);
- strips `Set-Cookie` from instance responses scoped outside the instance and any `Location` that
  points off-origin.

The app keeps working at `/` unchanged; it has no idea it is proxied.

Alternative rejected: a subdomain per user needs wildcard DNS and certificates (phase 3 at best)
and leaks user ids in hostnames.

## Tests first (TDD)

`gateway/tests/proxy/` with two fake upstream instances:
- `test_isolation.py`: user A's session reaches only A's upstream for 100 random paths; headers
  `Host: fm-u-B-web`, `X-Forwarded-Host`, a crafted path `/..%2f`, absolute-URI request lines all
  still land on A or are refused.
- `test_no_session.py`: no cookie, expired cookie, pending user -> redirect to login, upstream never
  called.
- `test_headers.py`: session cookie and client `X-Forwarded-*` never reach the upstream.
- `test_range.py`: a Range request is forwarded and the 206 streamed without buffering the body.
- `test_blocked_paths.py`: `/helper/x`, `/stream/1/2` -> 404 without calling upstream.

## Acceptance

- Two LAN test users each see only their own (empty) library; swapping cookies between browsers
  swaps what is seen, nothing else does.
