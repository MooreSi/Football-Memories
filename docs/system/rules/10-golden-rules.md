# The golden rules

**Read this before changing anything. It applies to every AI agent and every
human, on every change, without exception.**

This app archives footage of a child that may be the only surviving copy, and
must never put the owner's Hudl account at risk. Hudl's terms forbid automated
access without permission. The owner has attested permission for app automation
and archiving (decision 002, D-012), authorizing the local browser capture helper.
Other users need their own permission; all safeguards still apply. Rules 1-5
protect those. Rules 6-10 keep the codebase honest.

---

## The five that protect the account and the footage

### 1. Credentials and session tokens never leave the secret store

The Hudl password lives in the OS keychain (or an equivalent secret store),
and nowhere else. The same goes for session cookies, bearer tokens and any
browser storage-state file.

The authorized desktop helper does not accept a password: users enter it
directly into Hudl in a visible incognito browser. Its session and media URLs
exist only in memory for that run. Never export browser cookies, capture a HAR,
enable tracing or persist browser state. Closing capture destroys that context.

Never in: the repo, a config file that is committed, a log line, an exception
message, a URL or query string, a test fixture, a screenshot, a crash report,
a commit message or a PR. Logs redact them; a test proves the redaction works
(see rule 7).

### 2. No automated test talks to Hudl, and nobody changes anything on Hudl

The suite runs with the network blocked. Hudl is replaced by fakes and by
recorded responses that have been scrubbed of tokens and real people's names.

Manual verification against the real account is allowed, by the owner's
login, and is **read-only**: log in, list, download. Nothing in this app, its
tools or its tests may edit, delete, share, upload, tag, comment on or change
settings for anything in the Hudl account.

### 3. Be a client Hudl would not notice

- Only download what the logged-in account can already view or download in
  Hudl's own interface. Never bypass DRM, signed-URL expiry or access checks.
- If Hudl presents a CAPTCHA, an MFA prompt, a terms page or a rate-limit
  response, **stop and hand it to the user.** Never automate around it.
- Bounded concurrency, backoff on 429/5xx, no tight retry loops. A request
  rate is a decision for the owner, not a constant to tune upward.

A banned or locked account costs the owner every game they have not yet
downloaded.

### 4. The library is never silently lost or corrupted

- Downloads write to a temporary `.part` file and are renamed into place only
  after they are verified (size, duration and/or checksum as the domain file
  specifies). A file that was not verified is not "downloaded".
- Never delete, overwrite or move an existing library file without an explicit
  request for that file. Re-downloading writes alongside, or skips.
- A failure is reported as a failure, with what was left on disk.

### 5. Defaults never change silently

Output folder, file naming, quality selection, what counts as "already
downloaded": any of these changing on upgrade can duplicate or orphan the
user's library. A setting that becomes configurable keeps its exact previous
value as the default.

---

## The five that keep the codebase alive

### 6. Test-first, and watch the test fail

Write the test. **Run it. See it fail for the reason you expect.** Then
implement. A test that has never failed has never proved anything; it may be
asserting nothing at all.

### 7. Every claim gets a negative control

If you assert "there are zero violations", also assert the scanner can find
one. If you assert logs contain no password, also assert the check would spot
one if it were there. A green check from a broken checker is worse than no
check, because it buys false confidence.

### 8. A failing test is information, not an obstacle

Never delete, skip, `xfail`, loosen or rewrite a test to make a change pass.
Either your change is wrong or the test encodes a rule you did not know about.
Both mean stop and read it.

The one legitimate edit to an existing test is a **mock-target relocation**
(the function moved, so the patch target moves with it) or a **fixture
re-recording** after Hudl genuinely changed its pages or API. Either one is
named in the commit message, and a re-recording says what changed upstream.

### 9. Layers only point downward; delete code, don't comment it out

Only the Hudl client module talks to Hudl. Only the library module writes to
the library. See [30-architecture.md](30-architecture.md). Dead code that
looks live is how a codebase accumulates thousands of unreachable lines. Git
remembers. If it is not called, remove it.

### 10. Say what you actually did, and leave it for the next agent

If you skipped part of the task, say which part and why. If a download was not
verified against the real account, say so. If you are unsure a change is safe,
say that instead of shipping it with confident wording.

Commit and push at every checkpoint and keep `docs/HANDOFF.md` current, so any
agent can take over at any time ([60-handoff.md](60-handoff.md)).

---

## Hard "do not" list

| Never | Because |
|---|---|
| Commit credentials, cookies, storage-state files, tokens, `.env` | they end up in the remote permanently |
| Log or print a password, cookie or token | logs get pasted into issues and chats |
| Automate around CAPTCHA, MFA or a rate limit | that is Hudl's control, not an obstacle; it risks the account |
| Change anything inside the Hudl account | this app is a reader, never a writer |
| Delete or overwrite library files without a request | it may be the only copy |
| Commit footage, thumbnails or real roster data | large, personal, and often of minors |
| `git push --force` to a shared branch | rewrites history others hold |
| Weaken a gate or coverage baseline to go green | the baseline is the record |
| Run two full test suites at once | produces phantom failures |
| `pip install` a new runtime dependency without asking | every dependency ships to the owner's machine |

---

## When to stop and ask

Stop and ask the owner when:

- the change touches how credentials or the session are stored or sent
- verifying it needs the real Hudl account
- Hudl shows a CAPTCHA, MFA, terms page or rate-limit warning
- a change could delete, move or overwrite existing library files
- a test would have to be modified to pass
- you are about to say "this should be fine" about the account or the library

Asking costs a message. A locked account or a lost season of footage costs
far more.
