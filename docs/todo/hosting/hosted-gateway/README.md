# Hosted gateway: one private app instance per user

**Status:** planning (pre-implementation)
**Domain:** hosting
**Created:** 2026-11-18
**Gateway code:** private repo `MooreSi/football-memories-frontend` (empty at creation).
**Owner decision:** [011-hosted-instances](../../../owner-decisions/011-hosted-instances.md)

## Picking this up (agents start here)

1. **Read the plan**: [SUMMARY.md](SUMMARY.md) for the plain-English digest; this hub for the
   index and decisions; [QUESTIONS.md](QUESTIONS.md) for what the owner still has to settle.
2. **Check [PROGRESS.md](PROGRESS.md)**: what is done, in progress or free.
3. **Claim your task** in PROGRESS.md (`in progress`, your name and date).
4. **Do the work** from the task file: tests first, then the acceptance list.
5. **Update PROGRESS.md** as you go, `done` with the commit, or `blocked` with why.

Gates: tests first (`/test`); `/safe-change` for anything touching credentials, sessions, the
Docker socket, or deleting a user's volumes; **phase 2 (Hudl/Veo in containers) is owner sign-off
gated**, task by task. No task in this pack may reach the owner's own instance, archive or desktop
helper.

## What we're building and why

Today Football Memories runs only on the owner's Mac, with no login (D-008, D-028): anyone who can
reach port 8765 sees everything. The owner wants other families to use it without installing it.

The shape: a **separate gateway** (its own repo, its own containers, its own database) sits in front
of many **per-user app instances**. The gateway is the only thing anyone can reach. It handles
registration, login, the admin page and routing; it never serves footage itself. Each approved user
gets their own copy of the app (db + backend + web) in its own Docker network, with its own volumes,
no published ports and, in phase 1, no internet access. After login the gateway forwards that
user's requests, chosen by the server-side session and never by anything in the URL, to their
instance only.

Why separate: the app itself has no authentication and trusts whoever reaches it. Bolting accounts
onto it would put the login code next to the footage and next to the owner's Hudl helper. Keeping
the gateway apart means a bug in the app cannot expose another user, and a compromised instance
cannot create containers or read other users' data. The one component that can touch Docker (the
provisioner) has no published port, accepts only a user id from the gateway over an internal
network, and reaches Docker through a filtered socket proxy, never the raw socket.

Phases: **1** the gateway on the local network (owner choice), uploads only inside instances;
**2** headless Hudl/Veo capture inside each user's container (owner choice, separately gated);
**3** a Cloudflare Tunnel and domain, no open router ports.

## Doc index

| Doc | Contents |
|---|---|
| [PROGRESS.md](PROGRESS.md) | Live shared status log |
| [SUMMARY.md](SUMMARY.md) | Plain-English digest of the whole plan |
| [QUESTIONS.md](QUESTIONS.md) | Decisions to confirm before or during the build |
| [phase1-lan-gateway/](phase1-lan-gateway/README.md) | Gateway, accounts, provisioner, routing, portal and admin UI, hosted mode of the app, LAN security pass |
| [phase2-container-capture/](phase2-container-capture/README.md) | Hudl/Veo login and capture inside a user's container (sign-off gated) |
| [phase3-cloudflare-tunnel/](phase3-cloudflare-tunnel/README.md) | Domain, tunnel, real certificate, no inbound ports |

## Decisions locked with the owner (2026-11-18)

| Decision | Choice | Source |
|---|---|---|
| Where the gateway lives | Separate private repo `MooreSi/football-memories-frontend`, separate containers and database | owner request |
| One instance per user | Each approved user gets their own db + backend + web stack, own network, own volumes | owner request |
| Who can sign up | Anyone can register; nothing is created and they cannot sign in until the admin approves | interview |
| Exposure for phase 1 | Local network only, then internet later | interview |
| Hudl/Veo for hosted users | Headless capture inside each container, as its own gated phase | interview |
| QUESTIONS 1-8 | All recommendations: 50 GB quota, TOTP admin required / users optional, metadata-only admin, 10 users, owner's app separate, no backups, dependency list approved, delete keeps files until Erase data | owner, 2026-11-18 |
| Routing | Same origin, by server-side session; portal under `/_portal/`, admin under `/_admin/` | design (task 050) |
| Gateway stack | FastAPI + React 19/Vite/Tailwind v4 (same as the app, so the style is shared), Caddy at the edge | design, D-001 |

## Building blocks we reuse (do not rebuild)

| Need | Existing code |
|---|---|
| Design tokens, colours, glass panels | `frontend/src/index.css` (`@theme`), `frontend/src/screens.css` (charcoal canvas) |
| UI primitives | `frontend/src/components/ui/` (Button, Badge, PageHeader, Spinner, EmptyState) |
| Logo / favicon | `frontend/public/favicon.svg`, `docs/design/social-preview.jpg` |
| Secret redaction in logs | `backend/app/logging_setup.py` (copy the pattern and its negative-control test) |
| App images for instances | `backend/Dockerfile`, `frontend/Dockerfile`, `docker-compose.yml` (template for the per-user stack) |
| Headless Hudl sign-in (phase 2) | `backend/app/connectors/hudl_browser/_account.py:257` (D-022 hidden login) |
| Veo sign-in (phase 2) | `backend/app/connectors/veo/_client.py` |
| Secret store interface (phase 2) | `backend/app/connectors/hudl_keychain.py` (macOS / Windows only today) |

## Out of scope

- Billing, payments, email delivery (approval is shown on the admin page; no email in phase 1).
- The owner's own instance moving behind the gateway (it stays as it is; see QUESTIONS 5).
- Admin access to users' footage (the admin page shows metadata only; QUESTIONS 3).
- Multi-machine hosting, backups of user instances off this Mac (QUESTIONS 6).

## Open questions

All answered 2026-11-18 (owner: go with the recommendations); see [QUESTIONS.md](QUESTIONS.md).
