---
name: spec
description: Scaffold a spec-driven plan pack under docs/todo/<domain>/<feature>/ for a bigger piece of work (setup interview, 010-stepped task files, a README hub, companion docs PROGRESS/QUESTIONS/SUMMARY/REVIEW) and tear it down when the work ships. Use when the user says `/spec`, `/spec done`, "set up a spec for this", or wants a docs/todo planning directory for a larger feature. NOT for a change that fits in one spec file (that is `/new-spec`). NOT for a one-line fix.
user-invocable: true
---

# /spec

Turn a bigger piece of work into a **plan pack**: a temporary directory under
`docs/todo/<domain>/<feature>/` holding a `README.md` hub, 010-stepped task
files and a small set of companion docs. `/spec` sets it up; `/spec done`
retires it when the work ships.

This skill scaffolds and stops. It never starts implementation.

## `/spec` vs `/new-spec`

| | Use |
|---|---|
| `/new-spec` | One change, one file: `docs/todo/NNN-short-name.md`. The default. |
| `/spec` | Work needing **more than one commit and more than one session**: several tasks, ordering, open decisions. |

A pack anchors on `docs/todo/<domain>/<feature>/SPEC.md`, same structure as
`/new-spec`. Full shape: **[references/pack-structure.md](references/pack-structure.md)**.
Read it before scaffolding.

## `/spec`: set up a pack

### Step 1: Gather context (read, don't ask what you can read)

- `CLAUDE.md` and `docs/system/rules/10-golden-rules.md` if not in context.
- Existing specs in `docs/todo/`; extend a related pack rather than forking.
- The affected `docs/system/domains/<domain>/README.md`.
- The code the work touches, enough to name building blocks and layers.
- **Decide the sensitivity question up front.** Does any task touch
  credentials, the session, the login flow, Hudl request policy, or deleting/
  moving/overwriting library files? If yes, those tasks route through
  `/safe-change` and need the owner. Record it in the README header and per task.
- **"Is this actually a problem?" packs: gather evidence** into `REVIEW.md`:
  the local index, logs, counts of failed/skipped downloads. Read-only. Never
  scrape Hudl to gather evidence, and never paste tokens, signed URLs or real
  names into the pack.

### Step 2: Setup interview (structural only)

`AskUserQuestion`, recommendation-first, one or two rounds. Ask only what you
can't infer: domain dir, feature slug, flat vs phased, scope boundary, whether
it is user-facing (plan a docs phase), and whether a `SUMMARY.md` is wanted.
Design decisions go in `QUESTIONS.md`, not the interview.

### Step 3: Draft the breakdown before writing files

List each planned `0N0-<slug>.md` with a one-line summary in dependency order,
which companion docs apply, and which tasks are sensitive. Confirm with the user.

### Step 4: Scaffold

Fill the templates in [templates/](templates/) with real content, never lorem:

- `SPEC.md`: the anchor (Problem / Goal / Non-goals / What must NOT change /
  Design / Test plan / Real-account check / Verification).
- `README.md` from `README.md.tpl`: header carries **Sensitive**.
- `PROGRESS.md` from `PROGRESS.md.tpl`: one row per task.
- Task files from `task.md.tpl`: **every task with a code surface names its
  tests before its steps**, including each negative control. A task whose tests
  can't be named isn't specced; flag it open.
- `QUESTIONS.md` when decisions are open; `SUMMARY.md` for an owner digest;
  `REVIEW.md` for evidence.
- UI strings the user must confirm go in `QUESTIONS.md`: they are the user's
  words, not the builder's.

### Step 5: Hand off

Print the pack tree. If there's a `QUESTIONS.md`, say the user answers it
inline before implementation starts. Name sensitive tasks and say they route
through `/safe-change`. Commit the pack.

**Stop.** The user holds the next move.

## `/spec done`: retire a pack

1. **Verify.** Read every task's `**Status:**` and `PROGRESS.md`. List anything
   not Done or deferred, and stop.
2. **Prove it green.** `/verify`, real output pasted. For sensitive tasks,
   confirm the owner's real-account check happened (or record that it didn't).
3. **Harvest keepers** into permanent homes: domain READMEs, `docs/system/rules/`,
   `docs/owner-decisions/`, reusable scripts. `SPEC.md` goes with the pack.
4. **Refresh stale skills** that quote a fact this pack changed.
5. **Delete** the feature dir (never the domain dir), after confirming with the
   user. Git history is the archive.

## Rules

- **Scaffold and stop.**
- **One hub.** `README.md`; only the allowed companion docs beside it.
- **PROGRESS.md is the live truth.** Claim a row before working a task.
- **Later work extends, it doesn't fork.**
- **Always 010-stepped.** Insert with `015-`.
- **Specs are TDD-driven.** Each task's `Tests first` section is the contract.
- **Sensitive is declared, not discovered.** README header and each task say so.
- **Answered questions are annotated, not deleted.**
- **User-facing copy is the user's.**

## Pairs with

- `/new-spec`, `/safe-change`, `/split-file`, `/coverage-gap`, `/verify`
- `docs/system/rules/40-testing.md`, `docs/system/rules/30-architecture.md`
