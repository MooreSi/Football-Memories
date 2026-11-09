---
name: verify
description: Run every check before committing Football Clip Recorder work. Use before any commit, and whenever asked "is this ready", "is it green", "can I commit", or "run the checks".
---

# Verify

## The checks

```bash
.venv/bin/python -m pytest tests/ -q
```

That is the whole list today, because the project is new. **When a gate is
added (lint, import contracts, fixture scrub, coverage ratchet), add its
command here and to CLAUDE.md "Before you commit" in the same commit.** A gate
that exists but is not listed here does not get run.

Use `.venv/bin/python`, never bare `python`. If a third-party module is
"missing", check the interpreter before concluding anything:
`head -1 "$(command -v python)"` versus `.venv/bin/python`.

## What must be true before you commit

- test suite: **0 failed**
- the network-block test and the fixture-scrub test are among those that ran
  (if they exist yet); a suite that silently stopped collecting them is not green
- no secret-looking strings staged:
  ```bash
  git diff --cached | grep -niE 'password|passwd|cookie|bearer|token|authorization|set-cookie'
  ```
  every hit read and explained
- no footage, `.part`, storage-state or `.env` file staged (`git status --short`)

And two things no tool checks:

- **Did this change teach something non-obvious?** Then the relevant
  `docs/system/domains/<domain>/README.md` gets that fact in the same commit.
- **Did this change invalidate a number or claim a skill quotes?** Then fix
  that skill in the same commit.

## When something fails

**Do not** work around it. Never:

- delete, skip or `xfail` a failing test
- loosen an assertion so it passes
- lower a baseline to get green

Each converts a signal into silence.

A failing **contract test** over Hudl fixtures usually means Hudl changed. Re-
record the fixture (scrubbed), see the test fail for the new reason, fix the
client, and say what changed upstream in the commit.

## Reporting

State the real numbers:

```
Verified: suite 212 passed, 0 failed. Staged-secret scan: 2 hits, both the
word "token" in docstrings. Not checked against the real Hudl account.
```

If you skipped a check, say which and why. A summary that overstates what ran
is worse than no summary.
