# Hosted gateway: phase 1, LAN gateway

**Status:** not started
**Gated on:** QUESTIONS 7 (dependencies) answered. Exposed on the local network only; nothing in
this phase opens a router port.

Inside instances in this phase: uploads and tag CSVs only. No Hudl/Veo login, no internet egress.

## Target shape

```
LAN ──443──▶ edge (Caddy: TLS, headers, size + rate limits)        the ONLY published port
               │  net: fm-gw-public
               ▼
             gateway (FastAPI + portal/admin static build)
               ├─ net: fm-gw-internal ─▶ gateway-db (Postgres), provisioner
               └─ net: fm-u-<id> (internal, one per user) ─▶ that user's web (nginx)
                                                              └─▶ backend ─▶ db

provisioner ── net: fm-gw-docker (internal) ──▶ docker socket filter proxy ──▶ /var/run/docker.sock
```

- Only `edge` publishes a port. `gateway`, `provisioner`, socket proxy and every instance container
  publish none.
- `fm-u-<id>` networks are `internal: true`: no egress, no route to the host or other users.
  The gateway joins each one to forward requests; instances never join each other's.
- The raw Docker socket is mounted only into the socket proxy, read-only, never into gateway or
  provisioner.

## Docs

| Doc | Contents |
|---|---|
| [010-repo-and-threat-model.md](010-repo-and-threat-model.md) | Scaffold the gateway repo, CI, threat model, secrets handling |
| [020-edge-proxy.md](020-edge-proxy.md) | Caddy: TLS on the LAN, security headers, limits |
| [030-accounts-and-auth.md](030-accounts-and-auth.md) | Registration, approval, Argon2id, sessions, CSRF, lockout, TOTP |
| [040-provisioner.md](040-provisioner.md) | The only Docker-capable service: create/stop/measure a user's stack |
| [050-routing-to-instance.md](050-routing-to-instance.md) | Forward a signed-in user to their instance only |
| [060-portal-ui.md](060-portal-ui.md) | Sign-in, register, waiting, MFA screens in the app's style, with logo |
| [070-admin-page.md](070-admin-page.md) | Users, disk, last login, status, actions, audit log |
| [080-app-hosted-mode.md](080-app-hosted-mode.md) | This repo: an instance build with no helper, updater or LAN paths, and a quota |
| [090-lan-security-pass.md](090-lan-security-pass.md) | Scan, isolation and abuse checks before any internet exposure |
