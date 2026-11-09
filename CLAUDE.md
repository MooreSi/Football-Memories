# CLAUDE.md

**Football Clip Recorder** logs in to the owner's Hudl account and downloads
full games/matches and clips to a local library.

It holds the owner's Hudl credentials and a live logged-in session, and it
writes into a library of footage that may not exist anywhere else once Hudl
expires it. Those two facts drive the rules.

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

```bash
.venv/bin/python -m pytest tests/ -q
```

Everything must pass. As gates are added (lint, import contracts, coverage
ratchet) they join this step and [`/verify`](.claude/skills/verify/SKILL.md)
lists them. **A failing check is not noise.**

Use `.venv/bin/python`, never bare `python`: bare `python` on this Mac is a
different interpreter with a different package set, and its failures read
like findings about your change.

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
