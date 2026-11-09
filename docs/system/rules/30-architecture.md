# Architecture: the shape and the boundaries

**Status: provisional.** No application code exists yet. This is the intended
shape; the stack choice is open in
[../../owner-decisions/001-stack.md](../../owner-decisions/001-stack.md).
When the code lands, update this file to match it, and add the structural
tests that enforce it.

## The layers

```
entry/        CLI and/or UI. Parses input, shows progress, renders errors.
  │           Knows nothing about HTTP, browsers, cookies or file layout.
  ▼
services/     All the behaviour. One package per domain:
  │             auth/       credentials (secret store) + session lifecycle
  │             catalog/    what games/clips the account can see
  │             downloads/  fetch, verify, resume
  │             library/    where files go, naming, "already have it"
  ▼
hudl/         The ONLY code that talks to Hudl (HTTP + browser automation).
              Throttling, backoff, challenge detection, redaction live here.
storage/      Local index (what was downloaded, from which Hudl id, verified
              how). The only code that writes the index.

utils/, config/   Bottom of the stack. Import nothing above themselves.
```

## What each layer may not do

| Layer | Must never |
|---|---|
| `entry/` | import `hudl/` or `storage/` directly, hold credentials, touch library paths |
| `services/` | import an HTTP or browser library directly; bypass `hudl/` |
| `hudl/` | write to the library or index; expose any write/modify call to Hudl |
| `storage/` | talk to the network |
| `utils/`, `config/` | import anything above themselves |
| anything | log a secret, or construct a Hudl resource id it was not given |

Each row becomes a structural test with a negative control (the scanner is
shown a planted violation and must find it) as soon as the layer exists.

## Why one Hudl choke point

Rate limiting, backoff, challenge detection and secret redaction only work if
every request passes through them. A second module that "just does one quick
request" with its own client silently skips all four. The structural test
that forbids importing the HTTP/browser library outside `hudl/` is what keeps
the choke point real.

## Where a helper lives

- Used by **two or more services** → `utils/`
- Used by **one service** → inside that service's package
- Used only by the entry layer → `entry/`

## Long-running work

Downloads are slow and interruptible. Model them as jobs with explicit state
(queued, downloading, verifying, done, failed) persisted in `storage/`, so a
crash or Ctrl-C resumes instead of starting over or leaving a half-file under
its final name.
