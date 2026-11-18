# 070: Admin page

**Status:** not started
**Depends on:** 030, 040, 060
**Real-money surface:** no (`/safe-change` for erase)
**Leverage:** app's Settings tiles/panels styling; provisioner `usage`

## Problem

The owner needs to see who registered, disk per user, last login and the health of each instance,
and to approve or stop people.

## Decision

`/_admin/` (admin role + TOTP, 15 min idle). Overview tiles: users by status, total disk used vs
free on the Mac's Docker disk, instances running / failed, sign-ins last 24 h, failed sign-ins last
24 h. User table: name, email, status, registered, approved, last sign-in, sign-ins in 30 days,
failed sign-ins, disk used / quota (bar, amber at 80%, red at 100%), instance state, started at,
restarts, memory, app version. Row actions: Approve, Suspend, Resume, Set quota, Restart instance,
Reset MFA, Sign out everywhere, Delete account, Erase data (typed email to confirm; QUESTIONS 8).
Audit log tab: every admin action and every sign-in, filterable. Metadata only: no link into a
user's library (QUESTIONS 3).

Disk figures are fetched from the provisioner and cached 60 s; the page says when they were measured.

## Tests first (TDD)

- `gateway/tests/admin/test_access.py`: non-admin, admin without MFA, expired admin session -> 403;
  CSRF enforced.
- `test_approve.py`: approve calls provisioner `create` once and writes an audit row; approving twice
  is idempotent.
- `test_suspend.py`: suspend ends the user's sessions and stops the instance; the user's next
  request is redirected to login.
- `test_erase.py`: erase without the typed email is refused; with it, provisioner `erase` is called
  for that user only.
- `web/src/admin/*.test.tsx`: quota bar colours at 79/80/100%; table renders the measured time.

## Acceptance

- Owner approves a LAN test user, sees their disk rise after an upload, suspends them and sees them
  signed out.
