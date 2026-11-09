# Start here

You are working on **Football Memories**: a local-first app that archives the
owner's football match footage (from Hudl, via Hudl's own downloads), indexes
tagged moments and builds a player's memories timeline.

It holds footage of a child that may be the only copy once Hudl expires it, and
it must never put the owner's Hudl account at risk. That drives everything
below. Current state: [../../HANDOFF.md](../../HANDOFF.md).

## Read these, in this order

| | Document | Read it when |
|---|---|---|
| 0 | [../vision/000-goal.md](../vision/000-goal.md) | to understand what the app is for |
| 1 | **[10-golden-rules.md](10-golden-rules.md)** | **always, before touching anything** |
| 2 | [20-account-and-library-safety.md](20-account-and-library-safety.md) | before any change near login, the session, Hudl requests or library files |
| 3 | [30-architecture.md](30-architecture.md) | before adding a file or an import |
| 4 | [40-testing.md](40-testing.md) | before writing a test, i.e. before writing code |
| 5 | [50-workflow.md](50-workflow.md) | how a change gets made, end to end |
| 6 | [60-handoff.md](60-handoff.md) | **every session**: how to leave the work for the next agent |
| 7 | [70-file-organisation.md](70-file-organisation.md) | when a file is too big |

## The thirty-second version

- Credentials and tokens never leave the secret store.
- No automated test talks to Hudl; nothing ever changes anything on Hudl.
- Never delete or overwrite library files without an explicit request.
- Write the test first, and **watch it fail** before you make it pass.
- Never edit a test to make a change pass.
- Report what you actually did, including what you skipped.

## Why the rules are this strict

These rules were carried over from a sibling project whose refactor was
declared complete when it was not, and whose "guardrail" script scanned a
deleted directory and printed success on every run for months. Nobody had
watched it fail.

Green output is not evidence. A test that has never been red, a checker with
no negative control, and a confident summary are all the same thing: comfort
without information.

## Questions you cannot answer go in `docs/owner-decisions/`

**Simon** owns this app and the Hudl account. He decides what gets downloaded,
how it is named and stored, how hard the app may push Hudl, and anything
about the account. An agent cannot answer those.

When you hit one: do not block and do not silently guess. Choose a safe
provisional default (one that is gentler on Hudl and never removes library
files), proceed, and record the decision as a file in
[../../owner-decisions/](../../owner-decisions/README.md). A provisional default
is never silent: write down what you chose and what changes if the answer
differs.

## Where everything lives

```
docs/system/          the knowledge base: the single point of truth
docs/system/vision/   why the app exists, what success looks like
docs/system/rules/    these rules
docs/system/domains/  one living directory per part of the app
docs/todo/            the work: specs and plan packs
docs/owner-decisions/ questions only the owner can answer
```
