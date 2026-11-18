# 090: LAN security pass

**Status:** done (2026-11-18, gateway 33ebdee). Report: gateway repo docs/security-pass-2026-11-18.md, 24/24.
**Depends on:** 010-080
**Real-money surface:** no
**Leverage:** none

## Problem

"Secure" has to be shown, not asserted, before phase 3 puts this on the internet.

## Decision

A scripted checklist in the gateway repo, `scripts/security-pass.sh`, run from another LAN device
or a throwaway container, with its output saved to `docs/security-pass-<date>.md`. Each check has a
negative control (a deliberately weakened config that the check must catch).

| Check | Pass |
|---|---|
| Port scan of the Mac from the LAN | only 80 (redirect) and 443 |
| TLS | TLS 1.2+ only, no weak ciphers (`testssl.sh` or `nmap --script ssl-enum-ciphers`) |
| Headers | every header from 020 on portal, admin and proxied app pages |
| CSP | app pages work under it (video, reels, drawings); no violations in console |
| Enumeration | register/login responses identical for existing and unknown emails |
| Brute force | lockout engages at 5; IP throttle at 20 |
| Session | cookie attributes; replay after logout fails; idle expiry |
| CSRF | cross-origin form post refused |
| Isolation | user A cannot reach B by path, header or cookie tampering; from inside A's backend, B's containers, the gateway DB, the provisioner, the internet and `host.docker.internal:8766` are all unreachable |
| Docker | no user container privileged, root, writable rootfs or with published ports (`docker inspect` loop) |
| Socket proxy | from the provisioner, `exec` and `images/create` refused |
| Dependencies | `pip-audit`, `npm audit` clean or each finding recorded |
| Logs | a sign-in, MFA and admin action leave no password, token or TOTP in any container's logs |

## Tests first (TDD)

N/A for code; each check is itself written to fail against its negative control first.

## Acceptance

- Report committed, all checks pass, owner has read it. Only then is phase 3 unblocked.
