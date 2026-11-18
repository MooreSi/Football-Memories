# 030: Accounts and sign-in

**Status:** not started
**Depends on:** 010
**Real-money surface:** no (but `/safe-change`: credentials and sessions)
**Leverage:** none; new ground

## Problem

There are no accounts. Registration, approval and sign-in must be safe on a network anyone on the
LAN (later the internet) can reach.

## Decision

- **Tables** (gateway DB, Alembic): `users` (id uuid, email unique lower-cased, display_name,
  password_hash, role user|admin, status pending|approved|suspended|deleted, quota_bytes, created_at,
  approved_at, last_login_at, failed_logins, locked_until, totp_secret_enc, totp_enabled),
  `sessions` (id = SHA-256 of a 256-bit random token, user_id, created_at, last_seen_at, expires_at,
  ip, user_agent_hash, is_admin_elevated), `audit_log` (who, action, target, at, ip),
  `instances` (user_id, state, network, created_at, last_started_at, image_tag, last_error).
- **Passwords:** Argon2id (`argon2-cffi`, parameters from its current recommended profile, verified
  at build time), minimum 12 characters, checked against a bundled top-common-passwords list; no
  maximum below 128. Rehash on login when parameters change.
- **Registration:** always answers "Thanks, we'll let you know" whether or not the email exists (no
  account enumeration). Creates `pending`; nothing is provisioned.
- **Sign-in:** generic "email or password is wrong"; constant-time path for unknown emails (dummy
  hash). Throttle: 5 failures per account then exponential lock (1, 5, 15, 60 min); 20 per IP per
  10 min. Pending and suspended users get the same generic message as a wrong password, but the
  pending screen is shown only after a correct password.
- **Sessions:** cookie `__Host-fm_session`, HttpOnly, Secure, SameSite=Strict, Path=/. Token stored
  hashed. New session id on login and on MFA; logout deletes it server-side. Idle 30 min (admin
  15), absolute 12 h. Password change ends all other sessions.
- **CSRF:** every POST/PUT/PATCH/DELETE under `/_portal/` and `/_admin/` needs `X-CSRF-Token`
  matching a per-session value, plus `Origin` equal to the gateway origin.
- **TOTP:** `pyotp`, secret encrypted at rest with a key from Docker secrets; required for the admin
  (provisional, QUESTIONS 2), optional for users; 10 one-time recovery codes, stored hashed.
- **Admin bootstrap:** `gateway create-admin` CLI run once on the Mac (`docker compose run`), prompts
  for the password on the terminal, never via argv or env.

## Tests first (TDD)

`gateway/tests/auth/`:
- `test_register.py`: new email -> pending, no instance row; existing email -> identical response
  body and status; weak/common password refused.
- `test_password_hash.py`: stored hash is Argon2id and never equals or contains the password; rehash
  on parameter change.
- `test_login.py`: right password + approved -> session cookie with all four attributes; wrong
  password and unknown email give identical body; pending -> pending screen only after the correct
  password; suspended -> generic failure; lockout after 5, released after the window (frozen clock).
- `test_sessions.py`: token not stored in clear; idle and absolute expiry; rotation on login; logout
  invalidates server-side (replaying the old cookie fails).
- `test_csrf.py`: state-changing request without token, or with a foreign `Origin`, is 403.
- `test_totp.py`: admin cannot reach `/_admin/api/*` without MFA; recovery code works once.
- `test_logging_redaction` extended: a login request's body never appears in logs (negative control).

## What to do

1. Tests; red.
2. Models and migration; services `auth/passwords.py`, `auth/sessions.py`, `auth/totp.py`,
   `auth/throttle.py`; routes under `/_portal/api/`.
3. `create-admin` CLI.

## Acceptance

- All tests above green, each seen red first.
- Manual: register on the LAN, see "waiting for approval", cannot sign in to the app.
