# 010: Gateway repo and threat model

**Status:** done (2026-11-18, gateway 3bc236e)
**Depends on:** QUESTIONS 7 answered
**Real-money surface:** no
**Leverage:** this repo's layout (`backend/` FastAPI, `frontend/` Vite), its `.gitignore`, `logging_setup.py` redaction, `/verify` gates

## Problem

`MooreSi/football-memories-frontend` is empty. The gateway needs a home with the same discipline as
the app (tests first, gates green, no secrets in git) and a written threat model so every later task
is checked against named threats, not a feeling of "secure".

## Decision

Same stack as the app (D-001) so the portal can reuse the design tokens. Layout:
`gateway/` (FastAPI: auth, admin API, forwarding), `provisioner/` (FastAPI, internal only),
`web/` (React portal + admin), `edge/` (Caddyfile), `compose.yaml`, `docs/THREAT_MODEL.md`,
`docs/HANDOFF.md`, `CLAUDE.md` (pointing back to this pack and the golden rules).
Secrets (DB passwords, session key, provisioner shared key) are Docker secrets read from files under
a gitignored `secrets/` created by `scripts/make-secrets.sh` (random, mode 600); never env vars in
compose, never committed.

## Threat model (to write in full in `docs/THREAT_MODEL.md`)

| Threat | Control (task) |
|---|---|
| Password guessing, credential stuffing | Argon2id, per-account and per-IP throttling, lockout, TOTP (030, 020) |
| Session theft | `__Host-` cookie, HttpOnly, Secure, SameSite=Strict, rotate on login, server-side store, idle + absolute expiry (030) |
| CSRF | SameSite=Strict + double-submit token on every state-changing request (030) |
| User A reaching user B | Route from server session only; per-user internal networks; isolation tests (050, 090) |
| Instance reaching host / owner's helper | No `extra_hosts`, internal network, hosted build drops `/helper` and `/stream` (080, 090) |
| Container escape via Docker API | Socket only in filter proxy; provisioner allows a fixed template; cap_drop ALL, no-new-privileges, read-only rootfs, non-root, pids/mem/cpu limits (040) |
| Sign-up abuse filling the disk | Approval before provisioning, user cap, quota (030, 040, 080) |
| XSS / clickjacking | Strict CSP, no inline script, frame-ancestors none, React escaping (020, 060) |
| Admin account takeover | TOTP required, separate admin session lifetime, audit log (030, 070) |
| Secrets in logs | Redaction filter + negative control test (010) |
| Supply chain | Pinned image digests, lockfiles committed, Dependabot (010) |

## Tests first (TDD)

- `gateway/tests/test_logging_redaction.py`: password, cookie, TOTP secret, `Authorization` are
  redacted; negative control: the check flags a planted secret when the filter is off.
- `tests/test_repo_hygiene.py`: `secrets/`, `.env*`, `*.pem`, `*.key` are gitignored; negative
  control plants a file and asserts `git check-ignore` is what makes it pass.
- CI workflow runs pytest, ruff, mypy, vitest, typecheck, build; first run must be seen failing on a
  deliberately broken test before it is trusted (rule 7).

## What to do

1. Write the tests above; run; see them fail.
2. Scaffold the layout, `CLAUDE.md`, `.gitignore`, `scripts/make-secrets.sh`, CI.
3. Write `docs/THREAT_MODEL.md` from the table.
4. Copy the brand assets (favicon, wordmark) from this repo; no new artwork invented in this task.

## Where

- New repo `MooreSi/football-memories-frontend` (clone beside this one, e.g. `~/Football Memories Gateway`).

## Acceptance

- `git ls-files` shows no secret, `.env` or key file; hygiene test green with its negative control.
- CI green on main, and was once seen red.
- Threat model committed, each row names its task.
