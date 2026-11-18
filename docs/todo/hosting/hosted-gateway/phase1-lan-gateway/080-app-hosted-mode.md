# 080: Hosted mode of the app (this repo)

**Status:** in progress (2026-11-18: quota, helper guard, hosted nginx and image done; remaining UI hiding listed below)
**Depends on:** none (can start in parallel with 010)
**Real-money surface:** no (`/safe-change`: it decides whether an instance can reach the owner's Hudl helper)
**Leverage:** `frontend/nginx.conf`, `frontend/src/api/helperBase.ts`, `docker-compose.yml`,
`backend/app/config.py`, `backend/app/connectors/app_updater.py`, `lan_address.py`

## Problem

The app as built assumes it is the owner's desktop app. Its nginx forwards `/helper/` and
`/stream/` to `host.docker.internal:8766`, the owner's capture helper, which holds the owner's Hudl
and Veo sessions (`frontend/nginx.conf:37`). A hosted user's instance with that config could ask the
owner's helper to act on the owner's account. It also has an app updater, LAN address discovery,
and no storage limit.

## Decision

A build-time and run-time **hosted mode**, `FM_HOSTED=1`, default off so the owner's install is
unchanged (rule 5):

- Separate nginx config for hosted images with no `/helper/` or `/stream/` location and no
  `host.docker.internal`; image tagged `football-memories-*:hosted-<sha>`.
- Frontend: when `/api/hosted` says hosted, the helper base is never used; Hudl/Veo panels, the
  updater and the LAN address card are hidden (no dead controls).
- Backend: hosted mode disables the updater, git adopt, LAN address and helper routes (404), and
  enforces `FM_QUOTA_BYTES` on uploads and imports (413 with a clear message) by summing the archive
  and inbox volumes.
- Backend logs to stdout only; no access to any host path.

## Tests first (TDD)

- `backend/tests/hosted/test_hosted_routes.py`: with `FM_HOSTED=1` the updater, LAN and helper
  routes return 404; without it they behave as today (existing tests unchanged).
- `backend/tests/hosted/test_quota.py`: an upload that would pass the quota is refused before any
  byte is written to the archive; a `.part` is never left behind.
- `frontend/src/api/hosted.test.ts`: in hosted mode no request is made to `127.0.0.1:8766` or
  `/helper/` (fetch spy), and Hudl/Veo controls are not rendered.
- `frontend/tests/nginx-hosted.test` (script running `nginx -t` plus a grep in CI): the hosted config
  has no `helper`, `stream` or `host.docker.internal`; negative control on the desktop config finds
  them.

## Acceptance

- `docker run` of the hosted web image on an internal network: `curl /helper/` -> 404 and
  `getent hosts host.docker.internal` fails inside it (verified in 090).
- Owner's own `docker compose up` behaves exactly as before.

## Done so far (2026-11-18)

- `FM_QUOTA_BYTES` (`Settings.quota_bytes`, default unset): `services/quota.py`; uploads
  (`services/uploads.py`) and imports (`services/importer.py`) refused with 413 before any byte is
  written. Tests: `backend/tests/api/test_hosted_quota.py` (seen red first, negative control).
- `VITE_FM_HOSTED=1`: `api/helperBase.ts` `HOSTED` and `helperFetch`; every helper request
  (`api/hudl.ts`, `api/veo.ts`, `HudlCapture`, `HudlAccount`) goes through it and is refused
  without a request. Settings hides Connections and Update. Tests: `api/hosted.test.ts`,
  `pages/SettingsPage.hosted.test.tsx`.
- `nginx.hosted.conf` and `Dockerfile` `ARG FM_HOSTED=0` (default image unchanged). Test:
  `src/test/nginxHosted.test.ts`.
- Checked by hand: hosted image on a `--internal` Docker network (Docker 29.9): nginx config
  valid, `host.docker.internal` has no address, `/helper/status` returns the app's own
  `index.html` (SPA fallback, nothing proxied). The gateway (050) refuses those paths anyway.

## Still to do

- Hudl/Veo surfaces in a hosted build (Library's Hudl/Veo sections, Downloaded page, Veo expiry
  panel, Hudl match/player routes): the owner wants every hosted user to connect their own Hudl
  and Veo (2026-11-18), so these are not removed for good; phase 2 makes them work inside each
  library. Until then they say "start the desktop helper" with a Retry that cannot work there.
  Owner to choose: hide them meanwhile, or go straight to phase 2.
- Backend image: `FM_HOSTED` has nothing to switch yet (the Docker backend has no helper, updater
  or LAN routes; those live in the host helper process). Keep it that way.
- Quota note: an uploaded video is kept in `uploaded/` after import (owner request 2026-11-14), so
  it counts twice against the quota. Decide in 070 whether hosted imports remove the upload copy
  (that is a library delete: `/safe-change`, owner).
