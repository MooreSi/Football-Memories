# 020: Edge proxy

**Status:** not started
**Depends on:** 010
**Real-money surface:** no
**Leverage:** none in the app (its nginx is plain HTTP on localhost)

## Problem

Phase 1 is reachable from the LAN. Traffic must be encrypted, and only one hardened process should
face the network.

## Decision

Caddy as the only container with a published port (443, plus 80 that only redirects). On the LAN it
uses `tls internal` (Caddy's own CA); the owner installs that root once on their devices. Phase 3
replaces this with the tunnel. Caddy forwards everything to `gateway`; it does not route to
instances itself.

Headers on every response: `Strict-Transport-Security`, `Content-Security-Policy` (`default-src
'self'`, no inline script, `frame-ancestors 'none'`, `object-src 'none'`, media and img from self and
`blob:` as the app's player needs; checked against the app's real pages in 080), `X-Content-Type-
Options: nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy` (camera, mic, geolocation
off), `Cross-Origin-Opener-Policy: same-origin`. Remove `Server`. Request body cap equal to the app's
upload cap; rate limits on `/_portal/api/login`, `/register`, `/mfa` (exact Caddy mechanism to be
verified: core Caddy has no rate limiter, so either a pinned plugin build or the limit lives in the
gateway, 030).

## Tests first (TDD)

- `edge/tests/test_caddyfile.py` (runs `caddy validate` and `caddy adapt` in a container, no network):
  only 80 and 443 bound; 80 redirects; every header above present on a sample response from a stub
  upstream; `Server` absent. Negative control: removing one header turns the test red.

## What to do

1. Tests; see red.
2. `edge/Caddyfile`, compose service with `read_only: true`, `cap_drop: [ALL]`, `cap_add:
   [NET_BIND_SERVICE]`, `no-new-privileges`, pinned image digest.
3. Bind to the Mac's LAN address only (not `0.0.0.0`) via `FM_GW_BIND`.

## Where

- Gateway repo `edge/`, `compose.yaml`.

## Acceptance

- `curl -k https://<lan-ip>/` shows the headers; `nmap` from another LAN device shows 80 and 443 only
  (in 090).
