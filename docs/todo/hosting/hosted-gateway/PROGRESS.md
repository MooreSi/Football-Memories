# Hosted gateway: PROGRESS

**Shared status log. Any agent picking up a task updates this file**: claim a row (name and date
under Owner), flip its Status as you go, leave a one-line Note (commit / blocker / decision).

_Last updated: 2026-11-18. Answers in; 080 mostly done here (c01338a); 010 scaffolded in the gateway repo (3bc236e). Neither repo pushed._

## Status key
`not started` · `in progress` · `blocked` (say why) · `done` (date + commit)

## Overall
- Phase 1 (LAN gateway): in progress (010, 080)
- Phase 2 (container capture): not started, owner sign-off gated
- Phase 3 (Cloudflare Tunnel): not started, gated on phase 1 passing 090
- **Gates:** QUESTIONS answered? yes, all recommendations (2026-11-18) · phase 2 tasks signed off? no · tests-first honoured? n/a yet

## Tasks

| Phase | Task | Status | Owner | Notes |
|---|---|---|---|---|
| 1 | [010 repo and threat model](phase1-lan-gateway/010-repo-and-threat-model.md) | in progress | Claude 2026-11-18 | gateway 3bc236e (local, not pushed): redacting logger, hygiene test, secrets script, threat model, CI written but never run |
| 1 | [020 edge proxy](phase1-lan-gateway/020-edge-proxy.md) | not started | | |
| 1 | [030 accounts and sign-in](phase1-lan-gateway/030-accounts-and-auth.md) | not started | | |
| 1 | [040 provisioner](phase1-lan-gateway/040-provisioner.md) | not started | | `/safe-change` |
| 1 | [050 routing to the instance](phase1-lan-gateway/050-routing-to-instance.md) | not started | | |
| 1 | [060 portal UI](phase1-lan-gateway/060-portal-ui.md) | not started | | design side by side |
| 1 | [070 admin page](phase1-lan-gateway/070-admin-page.md) | not started | | |
| 1 | [080 hosted mode of the app](phase1-lan-gateway/080-app-hosted-mode.md) | in progress | Claude 2026-11-18 | quota, helper guard, hosted nginx/image done; UI hiding left |
| 1 | [090 LAN security pass](phase1-lan-gateway/090-lan-security-pass.md) | not started | | |
| 2 | [010 secret store in a container](phase2-container-capture/010-container-secret-store.md) | not started | | sign-off gated |
| 2 | [020 headless capture on Linux](phase2-container-capture/020-headless-capture-linux.md) | not started | | sign-off gated |
| 2 | [030 per-user permission and egress](phase2-container-capture/030-user-permission-and-egress.md) | not started | | sign-off gated |
| 3 | [010 tunnel and domain](phase3-cloudflare-tunnel/010-tunnel-and-domain.md) | not started | | |

## Decisions log
- Gateway in separate repo and containers (owner request, 2026-11-18)
- Admin approves sign-ups (interview, 2026-11-18)
- LAN first (interview, 2026-11-18)
- Headless capture in containers, own gated phase (interview, 2026-11-18)
- All QUESTIONS 1-8: recommendations accepted (owner, 2026-11-18): 50 GB quota refused at limit, TOTP admin required / users optional, admin sees metadata only, cap 10 users, owner's app stays separate, no backups (test-service notice), dependency list approved, delete keeps files until Erase data

## Blockers / open
- Pushing both repos needs the owner's go-ahead (auto mode blocked the push on 2026-11-18).
- Gateway clone lives at `~/Football Memories Gateway`.
