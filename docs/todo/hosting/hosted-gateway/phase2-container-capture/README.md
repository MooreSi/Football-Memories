# Hosted gateway: phase 2, Hudl/Veo capture inside a user's container

**Status:** not started
**Gated on:** phase 1 done and 090 passed; **owner sign-off on each task file before it is built**
(golden rules 1-3, `/safe-change`).

Owner choice (2026-11-18): hosted users connect their own Hudl/Veo inside their own container, with
no visible browser. Each user's account is theirs, not the owner's: the owner's attestation (D-012,
D-035) does not cover them.

What changes from the desktop design: no macOS Keychain, no visible Chrome fallback (D-022 falls back
to a visible window on failure; in a container a CAPTCHA/MFA/terms page must instead stop and tell
the user to finish in Hudl itself), and the instance needs outbound HTTPS to Hudl/Veo only.

## Docs

| Doc | Contents |
|---|---|
| [010-container-secret-store.md](010-container-secret-store.md) | Where a user's Hudl/Veo password lives inside their instance |
| [020-headless-capture-linux.md](020-headless-capture-linux.md) | Run the existing capture in the backend container, headless, on Linux arm64 |
| [030-user-permission-and-egress.md](030-user-permission-and-egress.md) | Per-user permission attestation and an egress allow-list |
