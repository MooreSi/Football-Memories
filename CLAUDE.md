# CLAUDE.md

**Football Memories** (repo: Football-Clip-Recorder) is a local-first web app
that archives the owner's football match footage, indexes tagged moments and
builds a player's memories timeline. Brief: [docs/BRIEF.md](docs/BRIEF.md).

**Picking this up? Read [docs/HANDOFF.md](docs/HANDOFF.md) first**, then follow
[the handoff rule](docs/system/rules/60-handoff.md): commit and push at every
checkpoint, and keep HANDOFF.md and PROGRESS.md current. Another agent may take
over at any moment.

The app protects two things: the owner's Hudl account (Hudl's terms forbid
automation without permission; authorized desktop capture is scoped in
[HUDL_INTEGRATION.md](HUDL_INTEGRATION.md)) and a footage archive of a child
that may be the only surviving copy.

**Hudl exception authorized by the owner (2026-11-09, D-012):** normal-user
browser capture may proceed within the owner's attested automation/download
permission. Each user signs into Hudl directly; the local desktop helper uses
an ephemeral browser session, captures only that user's accessible match, and
never persists credentials. This supersedes the blanket no-login assumption;
all account/library safeguards and the offline-only test rule still apply.

Read **[docs/system/rules/10-golden-rules.md](docs/system/rules/10-golden-rules.md)**
before changing anything. It is short and it is not optional.

**A question you can't answer** (what to download, naming, retention, how
hard to push Hudl, anything about the account) goes in
[docs/owner-decisions/](docs/owner-decisions/README.md). The owner answers
those; an agent can't. Choose a safe provisional default, proceed, and record
the open decision.

---

## The five rules that matter most

1. **Credentials and session tokens never leave the secret store.** Not in
   the repo, a log line, a test fixture, a URL, a screenshot or a commit
   message.
2. **No automated test talks to Hudl.** The suite runs on fakes and scrubbed
   recorded fixtures, with the network blocked. Manual checks against the real
   account are read-only: list and download, never change anything on Hudl.
3. **Never edit a test to make a change pass.** A failing test means the change
   is wrong, or the test knows something you don't.
4. **Write the test first and watch it fail.** A test that has never been red
   has never proved anything.
5. **Report what you actually did**, including what you skipped and anything
   that came out worse than intended.

## Before you commit

[`/verify`](.claude/skills/verify/SKILL.md) lists every check. In short:

```bash
cd backend && uv run pytest && uv run ruff check app tests && uv run mypy app
cd backend && TEST_DATABASE_URL=postgresql+psycopg://memories:memories@127.0.0.1:55432/memories_test uv run pytest
cd frontend && npm test && npm run typecheck && npm run build
```

Everything must pass. **A failing check is not noise.**

Use `uv run` (backend/.venv, Python 3.12), never bare `python`: bare `python3`
on this Mac is 3.13 without the project's packages, and its failures read like
findings about your change.

## Stack (decided: docs/DECISIONS.md D-001)

FastAPI + SQLAlchemy 2 + Alembic + PostgreSQL 17 (`backend/`); React 19 +
TypeScript + Vite + Tailwind v4 + TanStack Query (`frontend/`); ffmpeg; Docker
Compose. Layout and data model: [ARCHITECTURE.md](ARCHITECTURE.md).

## The knowledge base: docs/system/

**[docs/system/](docs/system/README.md) is the single point of truth** for
what this app is and what we know about it:

- [docs/system/vision/000-goal.md](docs/system/vision/000-goal.md): what the app is for
- [docs/system/rules/](docs/system/rules/): the non-negotiables
- [docs/system/domains/](docs/system/domains/README.md): one living directory
  per part of the app: constraints, gotchas, open questions

Before changing a domain, read its `docs/system/domains/<domain>/README.md`.
After a change teaches you something non-obvious (a Hudl quirk, a selector
that moved, a stream format), record it there in the same change. If a domain
file and the code disagree, the code is the fact: fix the file and say so.

## Where the rules live

| Topic | File |
|---|---|
| Start here | [docs/system/rules/00-start-here.md](docs/system/rules/00-start-here.md) |
| **Golden rules** | [docs/system/rules/10-golden-rules.md](docs/system/rules/10-golden-rules.md) |
| Account, credentials and library safety | [docs/system/rules/20-account-and-library-safety.md](docs/system/rules/20-account-and-library-safety.md) |
| Layers and boundaries | [docs/system/rules/30-architecture.md](docs/system/rules/30-architecture.md) |
| Testing protocol | [docs/system/rules/40-testing.md](docs/system/rules/40-testing.md) |
| How to make a change | [docs/system/rules/50-workflow.md](docs/system/rules/50-workflow.md) |
| **Handoff between agents** | [docs/system/rules/60-handoff.md](docs/system/rules/60-handoff.md) |
| Splitting a big file | [docs/system/rules/70-file-organisation.md](docs/system/rules/70-file-organisation.md) |

Plain Markdown on purpose, so any tool or human reads the same rules.

## Skills

| Skill | Use when |
|---|---|
| `/test` | writing or reviewing any test: rules, layout, anti-patterns |
| `/verify` | before every commit |
| `/safe-change` | any change near login, credentials, the session, Hudl requests, or deleting/overwriting library files |
| `/new-spec` | starting anything bigger than a one-line fix |
| `/spec` | work needing several tasks and more than one session: a plan pack under `docs/todo/` |
| `/coverage-gap` | find and fill untested code |
| `/split-file` | a file is over 800 lines |
| `/commit` | committing the session's work |
| `/push` | publishing the branch and watching CI |

## Do not

- end a session with unpushed work or a stale docs/HANDOFF.md
- add a nav item, button or control that does not do something real
- build or restyle a screen without following its reference image in
  [docs/design/DESIGN.md](docs/design/DESIGN.md) and checking it side by side in the browser
- show mock/demo data as if it were real footage

- commit credentials, cookies, session/storage-state files, tokens or `.env`
- log, print or screenshot a password, cookie or bearer token
- automate around a CAPTCHA, MFA prompt or any other Hudl access control
- download anything the logged-in account could not already view in Hudl
- change, delete, share, upload or comment on anything in the Hudl account
- delete or overwrite a file in the user's library without an explicit request
- `git push --force` to a shared branch
- run two full test suites at once
- `pip install` a new runtime dependency without asking
- mention which AI model made a change, in any commit, PR or code comment

## Stop and ask when

- the change touches how credentials or the session are stored or sent
- verifying it needs the real Hudl account (say exactly what you would do)
- Hudl shows a CAPTCHA, MFA challenge, terms page or rate-limit warning
- a change could delete, move or overwrite existing library files
- a test would have to be modified to pass
- you are about to say "this should be fine" about the account or the library

**A "yes, go ahead" to a plan is not sign-off for the account-touching part.**
Say plainly which part needs the owner, do the rest, and leave that piece.

## Why this file is strict

These rules come from a sibling project where a refactor was declared complete
when it was not: thousands of lines nothing called, and a guardrail script that
scanned a deleted directory and printed "all good" for months. Nobody had
watched it fail.

Green output is not evidence. That is what these rules exist to fix.
