# Account, credentials and library safety

What can cost the owner their account, their password or their footage, and
how each surface is protected. `/safe-change` is the working procedure; this is
the reference.

## The sensitive surfaces

| Surface | What can go wrong | Protection |
|---|---|---|
| **Credentials** | password leaks into git, logs, a fixture, a crash report | keychain only; redacting log filter; a test that plants a secret and proves the filter catches it |
| **Session** (cookies, tokens, storage state) | a token in a URL or log; a stale session reused after logout | ephemeral browser memory only for the desktop helper; never printed |
| **Login flow** | automating around CAPTCHA/MFA; locking the account with retries | one attempt, then hand to the user; no retry loop on auth failure |
| **Hudl requests** | hammering the API, tripping rate limits, account flagged | bounded concurrency, backoff on 429/5xx, a single choke point that every request goes through |
| **Access scope** | downloading something the account is not entitled to | only follow links/IDs Hudl itself served to this session; never construct or guess IDs |
| **Downloads** | truncated or corrupt file presented as complete | `.part` file, verify, then atomic rename; failures reported with what is left on disk |
| **Library** | overwrite, delete or move the user's existing files | append-only by default; any destructive operation needs an explicit per-file request |
| **Personal data** | team rosters and player names (often minors) end up in the repo | fixtures use synthetic names; no footage, thumbnails or rosters committed |

## Credentials and session

- The password is read from the secret store at the moment it is needed and
  not kept in a long-lived variable, object attribute or cache.
- Nothing that holds a secret is passed to `repr`, `str`, an f-string that is
  logged, or an exception message. Give secret-holding types a redacting
  `__repr__`.
- A storage-state or cookie file, if one exists, is covered by `.gitignore`
  and created with user-only permissions. A test asserts both.
- Logging goes through one configured logger with a redaction filter. A test
  plants a known fake secret, logs it, and asserts it does not appear (the
  negative control: the same test asserts the unfiltered string *would* have
  contained it).

## Talking to Hudl

- **One module talks to Hudl.** Every HTTP request and browser navigation goes
  through it, so throttling, backoff, user agent and redaction live in one
  place. A structural test proves no other module imports the HTTP or browser
  library.
- **Read-only.** The client exposes no method that edits, deletes, shares,
  uploads, comments or changes settings. If Hudl's UI needs a click that
  *could* change state (a modal, a "share" menu) to reach a download, stop and
  ask.
- **Challenges stop the run.** A CAPTCHA, MFA prompt, terms acceptance,
  "unusual activity" page or 429 is surfaced to the user with a clear message
  and the run halts. It is never retried in a loop or solved automatically.
- **Hudl will change.** Selectors, endpoints and stream formats are an
  external contract we do not control. Keep them in the client module, pin
  them with tests over recorded fixtures, and when Hudl changes, re-record the
  fixture (scrubbed) and say so in the commit.

## Downloads and the library

- Write to `<name>.part`, verify, then rename. Verification is defined per
  media type in the downloads domain file (expected byte length, `ffprobe`
  duration within tolerance, segment count for HLS).
- "Already downloaded" is decided by a stable identifier from Hudl, not by
  filename, so renaming a scheme does not trigger a mass re-download.
- Never overwrite: if the target exists, skip or write a suffixed sibling.
- Deleting or moving library files is a separate, explicit, user-initiated
  command with a dry-run first. Nothing else does it.
- Disk full, permission denied and interrupted downloads are tested paths, not
  afterthoughts. An interrupted run leaves `.part` files and a resumable
  state, never a half-file under the final name.

## Manual verification against the real account

Allowed, by the owner, read-only. Before doing it:

- say exactly which operations will run (log in, list X, download Y);
- use a single small clip where possible, not a whole season;
- never paste cookies, tokens, signed URLs or real roster data into a chat,
  issue, commit or fixture.

## The standing line

Every change touching these surfaces ends its report with:

> No credential, cookie or token is written to the repo, a log or a fixture by
> this work; nothing on Hudl is modified; no existing library file is deleted
> or overwritten.

If you cannot say that truthfully, say what happened instead.
