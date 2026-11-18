# 010: Secret store inside a user's container

**Status:** not started (sign-off gated)
**Depends on:** phase 1
**Real-money surface:** no (account-touching: owner sign-off required)
**Leverage:** `backend/app/connectors/hudl_keychain.py` (Keychain / Credential Manager interface, `SERVICES`)

## Problem

`hudl_keychain.py` works only on macOS and Windows. A Linux container has neither.

## Decision (proposed, for sign-off)

A third backend for the same interface: the secret is encrypted with AES-256-GCM (Python
`cryptography`, a new dependency to approve) under a per-user key that the provisioner writes as a
Docker secret into that user's backend only (`/run/secrets/fm_secret_key`, 0400). Ciphertext lives
in the user's database. The gateway never sees the Hudl password; the user types it into their own
instance's existing Save form. Rejected: storing it in the gateway (one breach exposes every user's
Hudl account).

## Tests first (TDD)

- `backend/tests/connectors/test_container_secret_store.py`: round trip; ciphertext never contains
  the password; a wrong key fails closed; missing key file -> clear error, no fallback to plaintext;
  redaction negative control.

## Acceptance

- Owner signs off this file; tests green; a user can Save and Test their own Hudl login.
