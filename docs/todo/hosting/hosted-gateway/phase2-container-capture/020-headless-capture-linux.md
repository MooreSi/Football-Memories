# 020: Headless capture on Linux

**Status:** not started (sign-off gated)
**Depends on:** 010
**Real-money surface:** no (account-touching: owner sign-off required)
**Leverage:** `backend/app/connectors/hudl_browser/_account.py:257` (headless login, D-022),
`backend/app/connectors/hudl_browser/_capture.py:153`, `backend/app/connectors/veo/_client.py`

## Problem

Capture runs as a host process on the Mac using `channel="chrome"`. Google Chrome is not published
for Linux arm64 (to verify), so the container needs Playwright's own Chromium, and the capture's
`headless=False` path has no screen.

## Decision (proposed, for sign-off)

Run the capture inside the user's backend container with Playwright Chromium, headless only. Any
CAPTCHA, MFA, terms page or rate-limit stops capture and tells the user to resolve it in Hudl itself;
never a visible-window retry, never disguising HeadlessChrome (D-022). Bounded concurrency of 1 per
user and the existing pacing (decision 003). Chromium runs as non-root with its sandbox; if the
sandbox needs a seccomp profile, that profile is reviewed, never `--no-sandbox`.

## Tests first (TDD)

- Existing capture tests run unchanged on Linux in CI (offline fakes).
- `test_hosted_capture_stops.py`: each challenge page fixture stops capture with the user-facing
  message and no retry.

## Acceptance

- Owner signs off; one consenting test user captures one match of their own, read-only.
