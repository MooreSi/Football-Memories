---
name: verify
description: Run every check before committing Football Clip Recorder work. Use before any commit, and whenever asked "is this ready", "is it green", "can I commit", or "run the checks".
---

# Verify

## The checks

```bash
# backend
cd backend && uv run pytest
cd backend && TEST_DATABASE_URL=postgresql+psycopg://memories:memories@127.0.0.1:55432/memories_test uv run pytest
cd backend && uv run ruff check app tests && uv run ruff format --check app tests && uv run mypy app
cd backend && FM_DATABASE_URL=postgresql+psycopg://memories:memories@127.0.0.1:55432/memories uv run alembic check

# frontend
cd frontend && npm test && npm run typecheck && npm run build

# when Docker files, migrations or config changed
docker compose up -d --build && curl -s http://127.0.0.1:8765/api/health
```

The Postgres runs need the dev database container from DEVELOPMENT.md. If it
is not running, say so in the report; do not quietly skip the Postgres run.

**When a gate is added, add its command here and to CLAUDE.md in the same
commit.** A gate that is not listed here does not get run.

Use `uv run` from `backend/`, never bare `python`.

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
Verified: backend 52 passed (SQLite) and 52 passed (Postgres), ruff/mypy
clean, alembic no drift; frontend 22 passed, typecheck and build OK. Staged-secret scan: 2 hits, both the
word "token" in docstrings. Not checked against the real Hudl account.
```

If you skipped a check, say which and why. A summary that overstates what ran
is worse than no summary.
