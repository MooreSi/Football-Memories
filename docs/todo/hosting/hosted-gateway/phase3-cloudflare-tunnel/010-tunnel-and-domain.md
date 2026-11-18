# 010: Tunnel and domain

**Status:** built and switched off (2026-11-18, gateway fd7a451). Owner steps: gateway repo docs/PHASE3_TUNNEL.md. Found: Cloudflare Free/Pro refuse uploads over 100 MB.
**Depends on:** phase 1
**Real-money surface:** no (buying a domain is the owner's action)
**Leverage:** phase 1 edge

## Problem

Phase 1 is LAN only. Opening a router port would put the Mac directly on the internet.

## Decision (proposed)

A `cloudflared` container on `fm-gw-public` connects outbound to Cloudflare; the edge stops
publishing ports at all. Certificate from Cloudflare at the edge of their network; Caddy keeps TLS
to `cloudflared` on the inside or moves to plain HTTP on an internal-only network (decide in the
task with the owner). Trust `CF-Connecting-IP` for throttling only when the request came from the
tunnel container. Optional: Cloudflare Access in front of `/_admin/` as a second gate. Tunnel token
is a Docker secret. Upload size: check Cloudflare's request body limit for the owner's plan before
relying on it for large video uploads (to verify, not assumed).

## Tests first (TDD)

- Throttle test: `CF-Connecting-IP` from a non-tunnel source is ignored.
- Rerun the 090 security pass from outside the network.

## Acceptance

- Router has no forwarded ports; the site works at the domain; 090 passes again from outside.
