# 060: Portal UI

**Status:** not started
**Depends on:** 030
**Real-money surface:** no
**Leverage:** `frontend/src/index.css` tokens, `frontend/src/screens.css` charcoal canvas,
`frontend/src/components/ui/`, `frontend/public/favicon.svg`, `docs/design/social-preview.jpg`

## Problem

The front door needs sign-in, registration, "waiting for approval", MFA setup and MFA challenge
screens that look like the app (owner request: stylish, professional, logos and graphics).

## Decision

React 19 + Vite + Tailwind v4 in `web/`, tokens copied from the app's `index.css` (one source; note
the copy in both repos' docs). Reference image: **01-ai-dashboard** (floodlit stadium mood, charcoal
glass panels, periwinkle accents, blue primary CTA), per `docs/design/DESIGN.md`. Layout: split
screen on desktop, a hero side with the wordmark, a subtle pitch-line SVG drawn in tokens and a
floodlight glow; the form in a glass panel on the other side. Single column at 375 px. No stock
photos of children, no invented stats, no third-party fonts or scripts (CSP).

Screens: Sign in, Create account (with the test-service notice and Hudl/Veo note for phase 2),
Waiting for approval, Set up authenticator (QR drawn locally, secret shown once), Enter code,
Recovery code, Signed out, Account locked (generic wording).

## Tests first (TDD)

`web/src/**/*.test.tsx`:
- Sign in shows the same error for wrong password and unknown email (from the API stub).
- Create account enforces 12+ characters client-side and still shows the server's refusal.
- Every form sends `X-CSRF-Token`.
- Password fields have `autocomplete` `current-password` / `new-password`; nothing is written to
  localStorage (spy).

## Acceptance

- Checked side by side with reference 01 in the browser at desktop and 375 px; screenshots in the
  gateway repo's `docs/design/`.
- No horizontal scroll at 375 px; visible focus rings; reduced motion respected.
