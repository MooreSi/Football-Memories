# 010: Secret store inside a user's `capture` container

**Status:** design answered by the owner, not built
**Owner (2026-11-19):** design approved: saved, encrypted, per-user key.
**Depends on:** phase 1 (done)
**Real-money surface:** no (account-touching: owner sign-off required before any code)
**Leverage:** `backend/app/connectors/hudl_keychain.py` (the `Keychain` interface and `SERVICES`)

## Problem

`hudl_keychain.py` works only on macOS (Keychain, compiled Swift helper) and Windows
(Credential Manager). The `capture` container is Linux.

## Proposed decision

- A third backend behind the same interface, `SealedFileStore`: the password is sealed with
  AES-256-GCM (`cryptography`, already approved for the gateway) and written to the user's own
  `capture` volume as a 0600 file, one per service (`Hudl`, `Veo`).
- The key is 32 random bytes the provisioner generates per user, keeps in its own data volume
  (like the database password), and passes to that user's `capture` container only.
- The gateway never sees the password: the user types it into their own library's existing
  Save form, which talks to their own `capture` container.
- **Honest limit:** the key must be in the container that signs in, so this protects copied
  volumes and backups, not a taken-over container. That container has no inbound route except
  from its own web container, and its outbound route is the allow-list (030).

## Tests first (TDD)

- `backend/tests/connectors/test_sealed_file_store.py`: round trip; the file never contains the
  password; a wrong key fails closed; a missing key is a clear error with no plaintext fallback;
  file mode 0600; redaction negative control on logs and exceptions.
- Provisioner: the key reaches only that user's `capture` container (spec test), never env of
  db/backend/web.

## Acceptance

- Owner signs off this file. Then: tests green, a fake-account Save and Test round trip in the
  real container, offline.
