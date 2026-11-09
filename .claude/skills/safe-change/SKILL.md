---
name: safe-change
description: The protocol for changing anything that can cost the owner their Hudl account, their password or their footage: login, credentials, the session, the Hudl client's request policy, or anything that deletes, moves or overwrites library files. Use before editing auth/, hudl/, library/ file operations, or anything named login/session/cookie/token/delete/overwrite/retry/concurrency.
---

# Changing account- or library-touching code

Work through this in order. Do not skip to step 4.

## 1. Establish whether it is sensitive

It is, if it touches any of:

| Surface | Examples |
|---|---|
| Credentials | reading/writing the keychain, anything that holds the password |
| Session | cookies, tokens, storage-state files, session reuse/expiry |
| Login flow | form submission, redirects, CAPTCHA/MFA/terms detection |
| Request policy | concurrency, throttling, retries, backoff, user agent |
| Access scope | how Hudl ids and URLs are obtained |
| Library writes | rename-into-place, overwrite, delete, move, "already downloaded" logic |
| Logging | anything that could print a secret or a signed URL |

If yes, read `docs/system/rules/20-account-and-library-safety.md` in full,
plus the affected `docs/system/domains/<domain>/README.md`.

## 2. Decide if you can proceed at all

**Stop and tell the user** if the change:

- changes where or how credentials or session data are stored
- raises request rate, concurrency or retry counts
- needs the real Hudl account to verify
- reacts to a CAPTCHA, MFA, terms page or rate limit in any way other than
  stopping and telling the user
- could delete, move or overwrite an existing library file

Say plainly which part needs the owner, do the rest, and leave that piece. A
user saying "yes, go ahead" to a plan is **not** sign-off for the sensitive
part of it.

## 3. Is it a value? Then it is probably a decision

Concurrency limits, backoff delays, naming schemes and output folders are
owner decisions. If one needs to move, record it in `docs/owner-decisions/`
with a safe provisional default (gentler on Hudl, never destructive to the
library). Defaults never change silently (golden rule 5).

## 4. Write the test first

- Network blocked; `FakeHudl` and `FakeSecretStore` only.
- For credentials/logging: plant a fake secret and assert it never appears in
  logs, exceptions, reprs or files, **with a negative control**.
- For library writes: seed `tmp_path` with existing files and assert they are
  byte-identical afterwards.
- For challenges: a recorded CAPTCHA/MFA page makes the run stop with a clear
  error and zero further requests.
- Watch each test fail before making it pass.

## 5. Make the smallest change

No bundled tidy-ups. If the fix and a refactor ship together and something
breaks, you cannot tell which half did it.

## 6. Verify

Run `/verify`. Then, for this kind of change, also:

```bash
git diff --cached | grep -niE 'password|passwd|cookie|bearer|token|authorization|set-cookie' || echo "no secret-looking strings staged"
```

Read every hit. A hit is not automatically a leak, but every one is looked at.

## 7. Manual check against the real account (owner only)

If the change can only be proven against real Hudl, write down the exact
read-only steps (log in, list one game, download one short clip) and hand them
to the owner. Do not run them yourself unless the owner asks in this session.

## 8. Say what you did

End the report with the standing line, and mean it:

> No credential, cookie or token is written to the repo, a log or a fixture by
> this work; nothing on Hudl is modified; no existing library file is deleted
> or overwritten.

If you cannot say that truthfully, say what happened instead. Also say whether
the change was checked against the real account, and by whom.
