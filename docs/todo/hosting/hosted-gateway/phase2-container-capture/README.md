# Hosted gateway: phase 2, each user's own Hudl and Veo inside their library

**Status:** ready for the owner's sign-off, **not built**.
**Gated on:** phase 1 done (yes, 2026-11-18: 050 forwarding, 090 security pass 24/24) and the
**owner's sign-off on each task file** (golden rules 1-3, `/safe-change`). A general "keep
going" is not sign-off for this part (CLAUDE.md): it changes how other people's Hudl and Veo
passwords are stored and sent, and what reaches Hudl from this Mac.

Owner decision (2026-11-18): every hosted user enters their own Hudl and Veo credentials.
Until this phase ships, a hosted library shows one note ("coming to hosted libraries", with
Import) instead of Hudl/Veo panels (app commit 39096e4).

## What the code does today (read 2026-11-18)

- Hudl and Veo capture is the **desktop helper** (`backend/app/connectors/hudl_companion.py`,
  `main()` at line 681), a host process on 127.0.0.1:8766, started by the installer. The Docker
  backend never talks to Hudl.
- It drives **Google Chrome** through Playwright (`channel="chrome"`):
  `hudl_browser/_account.py:262` (hidden login), `hudl_browser/_capture.py:153` (visible),
  `veo/_client.py:184` (hidden). Playwright 1.64.1 is in the backend's lock file, but the image
  has no browser installed.
- Credentials live in the macOS Keychain or Windows Credential Manager
  (`hudl_keychain.py`); neither exists in a Linux container.
- Fixed hosts in the code: `www.hudl.com`, `app.hudl.com`, `app.veo.co`, `assets.app.veo.co`,
  `c.veocdn.com`. Video and signed media addresses arrive at run time and are not in the code.

## Proposed shape (for sign-off)

A **fourth container per user, `capture`**, runs the helper code for that user only. It is the
only one of that user's containers with any internet access, and only through a filtering
egress proxy. Their db, backend and web stay offline as today. The hosted web image's nginx
gains `/helper/` and `/stream/` routes to **their own** `capture` container (never the owner's
Mac); the gateway keeps refusing those paths until this ships.

| Task | What | Needs from the owner |
|---|---|---|
| [010](010-container-secret-store.md) | Where a user's Hudl/Veo password lives in `capture` | sign-off on the storage design and its honest limit |
| [020](020-headless-capture-linux.md) | The helper headless on Linux in `capture` | sign-off; a read-only check with the owner's own account |
| [030](030-user-permission-and-egress.md) | Each user's own permission, and the egress allow-list | the permission wording; the host list measured read-only |

## Risks the owner should weigh first

1. **Many Hudl accounts from one home address.** Every hosted user's capture would reach Hudl
   and Veo from this Mac's single internet address. If Hudl sees many accounts automating from
   one address, it may flag or lock them, **including the owner's own account**, which is the one
   the golden rules protect most. Options: keep per-user pacing gentle and capture one user at a
   time (proposed default); ask Hudl; or keep Hudl/Veo out of hosted libraries.
2. **Each user's permission is their own.** The owner's attestation (D-012, D-035) covers the
   owner's account only. 030 asks each user to confirm theirs and records when.
3. **Encryption limit.** A user's password is sealed with a key the `capture` container must
   hold to sign in. That protects against copied volumes or backups, not against someone who
   has taken over that container (see 010).

## Owner's answers (2026-11-19)

1. **One home address:** one capture at a time across the whole Mac, at decision 003's pace.
2. **Passwords:** saved, encrypted (AES-256-GCM, a key unique to each user, in their own
   library only), as in 010.
3. **Permission wording:** as proposed in 030.
4. **Allow-list:** the owner checks once, read-only, with their own account in a test library;
   the hosts video actually comes from are added by exact name.

Still needed before any code: the owner's go-ahead to build (these answers settle the design).

## Docs

| Doc | Contents |
|---|---|
| [010-container-secret-store.md](010-container-secret-store.md) | Where a user's Hudl/Veo password lives inside their library |
| [020-headless-capture-linux.md](020-headless-capture-linux.md) | Run the existing capture headless on Linux in a per-user `capture` container |
| [030-user-permission-and-egress.md](030-user-permission-and-egress.md) | Per-user permission attestation and an egress allow-list |
