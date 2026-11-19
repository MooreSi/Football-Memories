# Hosted gateway: PROGRESS

**Shared status log. Any agent picking up a task updates this file**: claim a row (name and date
under Owner), flip its Status as you go, leave a one-line Note (commit / blocker / decision).

_Last updated: 2026-11-18 (night). Phase 1 done (gateway 391158a); phase 3 built and switched off; phase 2 ready for the owner's sign-off._

## Status key
`not started` · `in progress` · `blocked` (say why) · `done` (date + commit)

## Overall
- Phase 1 (LAN gateway): done (080's Hudl/Veo part waits for phase 2)
- Phase 2 (container capture): built and tested offline (2026-11-19); the owner's one read-only check is next (gateway repo docs/PHASE2_OWNER_CHECK.md)
- Phase 3 (Cloudflare Tunnel): built and switched off; owner steps in the gateway repo's docs/PHASE3_TUNNEL.md
- **Gates:** QUESTIONS answered? yes, all recommendations (2026-11-18); `cryptography` added with owner approval (2026-11-18) · phase 2 tasks signed off? no · tests-first honoured? yes, plus deliberate-breakage checks on every control

## Tasks

| Phase | Task | Status | Owner | Notes |
|---|---|---|---|---|
| 1 | [010 repo and threat model](phase1-lan-gateway/010-repo-and-threat-model.md) | done (2026-11-18, gateway 3bc236e) | Claude | CI green once, never seen red (owner skipped) |
| 1 | [020 edge proxy](phase1-lan-gateway/020-edge-proxy.md) | done (2026-11-18, gateway fc70e7b) | Claude | Caddy 2.11.9; throttling in gateway (no Caddy rate limiter) |
| 1 | [030 accounts and sign-in](phase1-lan-gateway/030-accounts-and-auth.md) | done, API only (2026-11-18, gateway fc70e7b) | Claude | no per-address registration limit yet; screens in 060 |
| 1 | [040 provisioner](phase1-lan-gateway/040-provisioner.md) | done (2026-11-18, gateway e4f3976; app 50b020f) | Claude | own HAProxy allow-list instead of tecnativa (its CONTAINERS+POST allows exec); real-Docker test |
| 1 | [050 routing to the instance](phase1-lan-gateway/050-routing-to-instance.md) | done (2026-11-18, gateway d96e78e) | Claude | checked end to end in a browser via compose.dev.yaml |
| 1 | [060 portal UI](phase1-lan-gateway/060-portal-ui.md) | done (2026-11-18, gateway 5e764c5) | Claude | checked vs reference 01 at desktop and 375 px; qrcode 1.5.4 owner-approved |
| 1 | [070 admin page](phase1-lan-gateway/070-admin-page.md) | done (2026-11-18, gateway aff5fca) | Claude | screen at /_portal/admin; provisioner stand-in until 040 |
| 1 | [080 hosted mode of the app](phase1-lan-gateway/080-app-hosted-mode.md) | in progress | Claude 2026-11-18 | quota, helper guard, hosted nginx/image done; Hudl/Veo panels: owner wants per-user credentials (phase 2) |
| 1 | [090 LAN security pass](phase1-lan-gateway/090-lan-security-pass.md) | done (2026-11-18, gateway 33ebdee) | Claude | 24/24; found and fixed TLS for IP-address visits (default_sni) |
| 2 | [010 secret store in a container](phase2-container-capture/010-container-secret-store.md) | built (2026-11-19) | Claude | owner's read-only check pending |
| 2 | [020 headless capture on Linux](phase2-container-capture/020-headless-capture-linux.md) | built (2026-11-19) | Claude | owner's read-only check pending |
| 2 | [030 per-user permission and egress](phase2-container-capture/030-user-permission-and-egress.md) | built (2026-11-19) | Claude | owner's read-only check pending |
| 3 | [010 tunnel and domain](phase3-cloudflare-tunnel/010-tunnel-and-domain.md) | built, switched off (gateway fd7a451) | Claude | owner: domain, tunnel token, 100 MB upload decision |

## Decisions log
- Phase 2 (owner, 2026-11-19): one capture at a time; passwords saved encrypted per user; permission wording as proposed; allow-list hosts measured once by the owner, read-only.
- Every hosted user enters their own Hudl and Veo credentials (owner, 2026-11-18): phase 2, not hidden for good.
- Gateway in separate repo and containers (owner request, 2026-11-18)
- Admin approves sign-ups (interview, 2026-11-18)
- LAN first (interview, 2026-11-18)
- Headless capture in containers, own gated phase (interview, 2026-11-18)
- All QUESTIONS 1-8: recommendations accepted (owner, 2026-11-18): 50 GB quota refused at limit, TOTP admin required / users optional, admin sees metadata only, cap 10 users, owner's app stays separate, no backups (test-service notice), dependency list approved, delete keeps files until Erase data

## Blockers / open
- Owner approved replacing two task-020 edge tests with stricter ones (2026-11-18).
- Gateway clone lives at `~/Football Memories Gateway`.
