# {{Feature name}}

**Status:** {{planning | building | shipped}}
**Spec:** [SPEC.md](SPEC.md)
**Sensitive:** {{no | YES: tasks {{0N0}}, {{0N0}}. `/safe-change` governs those; real-account checks are owner-run and read-only.}}

## Before you start

1. Read [CLAUDE.md](../../../../CLAUDE.md) and
   [docs/system/rules/10-golden-rules.md](../../../system/rules/10-golden-rules.md).
2. Read [SPEC.md](SPEC.md), then claim your task's row in [PROGRESS.md](PROGRESS.md).
3. Tests first: each task names them. Watch them fail before writing code.

Gates: `/safe-change` before anything sensitive · `/verify` before every commit.

## What and why

{{Two or three paragraphs: what this delivers, why now, what the user will notice.}}

## Docs

| Doc | Contents |
|---|---|
| [SPEC.md](SPEC.md) | anchor spec |
| [PROGRESS.md](PROGRESS.md) | live status |
| [010-{{slug}}.md](010-{{slug}}.md) | {{one-line summary}} |

## Roadmap

| # | Task | Depends on | Sensitive | Ships with |
|---|---|---|---|---|
| {{010}} | {{name}} | none | {{no}} | none |

## Decisions locked with the user ({{YYYY-MM-DD}})

| Decision | Choice | Source |
|---|---|---|
| {{decision}} | {{choice and why}} | {{user / owner-decisions/NNN / REVIEW.md}} |

## Building blocks we reuse

| Need | Existing code |
|---|---|
| {{capability}} | {{`path/to/file.py:line`: what it already does}} |

## Out of scope

- {{item, and where it lives if deferred}}

## Open questions

- {{question, with the provisional default in use}}
