# 020: Headless capture on Linux, one `capture` container per user

**Status:** built (2026-11-19, app 6c3a518 + 1db9f40; gateway capture container in the provisioner). Owner's read-only check pending.
**Owner (2026-11-19):** one capture at a time across all users.
**Depends on:** 010
**Real-money surface:** no (account-touching: owner sign-off required before any code)
**Leverage:** `hudl_companion.py` (`main()`), `hudl_browser/_account.py:262` (hidden login,
D-022), `hudl_browser/_capture.py:153`, `veo/_client.py:184`

## Problem

The helper is a host process on the owner's Mac that launches Google Chrome
(`channel="chrome"`), sometimes visibly (`_capture.py:153`). A container has no screen, and
Google Chrome's availability for Linux on this Mac's CPU (arm64) must be checked rather than
assumed; Playwright's own Chromium is the fallback.

## Proposed decision

- A new image `fm-app-capture:hosted` from the app repo: the backend image plus a Playwright
  browser, running `hudl_companion` bound to 0.0.0.0:8766 inside the user's network only,
  with the same Host/Origin checks it has today (values for the user's web container).
- Headless always. Any CAPTCHA, MFA, terms page, "unusual activity" page or 429 **stops** and
  tells the user to resolve it in Hudl/Veo themself. Never a visible-window retry; never
  disguising HeadlessChrome (D-022).
- Pacing per decision 003; **one capture at a time across all users** (a gateway-wide lock), so
  this Mac's one address never runs parallel automation against Hudl (README risk 1).
- Hardening as the other containers (read-only root, no capabilities, limits). **Correction
  (2026-11-19):** Playwright opens Chromium without its own sandbox by default (that is how the
  owner's helper already runs), and that sandbox cannot start in a container with no
  capabilities; the container is the sandbox.

## Tests first (TDD)

- The existing helper test suite runs unchanged inside the Linux image (offline fakes,
  network blocked).
- `test_hosted_capture_stops.py`: each recorded challenge page stops capture with the
  user-facing message and makes no further request.
- Provisioner spec test: `capture` is the only container of a user on the egress network.

## Acceptance

- Owner signs off. Then, by the owner only, read-only: sign in with the owner's own account in
  a test library, list matches, capture one short clip (HUDL_INTEGRATION.md rules).
