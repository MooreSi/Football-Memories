# 011: A hosted version for other users

**Status:** answered 2026-11-18
**Raised by:** owner request, 2026-11-18

## The question

The owner wants other people to use the app without installing it: a separate front door with
registration and sign-in, one Docker instance per user on this Mac, an admin page, LAN first, then a
public IP / Cloudflare Tunnel.

## Why it matters

The app has no authentication (D-008, D-028) and its web server forwards to the owner's desktop
helper, which holds the owner's Hudl and Veo sessions. Exposing it, or giving other people copies of
it unchanged, would put the owner's accounts and footage of children at risk. Other users' Hudl and
Veo accounts are covered by their own permission, not the owner's (golden rules intro, D-012).

## Answers so far (2026-11-18)

- Gateway in a separate private repo (`MooreSi/football-memories-frontend`) and separate containers.
- Anyone can register; the admin approves before any instance is created or sign-in works.
- Phase 1 on the local network only; internet later.
- Hosted users get headless Hudl/Veo capture inside their own container, as its own gated phase.
- Disk quota and MFA: no preference. Provisional: 50 GB quota per user, TOTP required for the admin,
  optional for users.

## Provisional default in use

Plan only: [docs/todo/hosting/hosted-gateway/](../todo/hosting/hosted-gateway/README.md). No code,
no containers, nothing exposed.

## What changes if the answer differs

See the pack's QUESTIONS.md (quota, MFA, admin visibility, user cap, the owner's own instance,
backups, dependencies, deletion).

ANSWER: 2026-11-18, owner: go with the recommendations in the pack's QUESTIONS.md
(50 GB quota refused at the limit; TOTP required for admin, optional for users; admin sees
metadata only; at most 10 users; owner's own app stays separate; no backups of users' copies,
test-service notice at sign-up; dependency list approved; deleting a user keeps their files until
Erase data with typed confirmation).
