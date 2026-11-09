# Handoff: any agent can pick up at any time

**Owner rule, 2026-11-09:** progress is saved to GitHub and to this folder so
that another AI tool (Claude Code, Codex, Cursor, Copilot) or a human can take
over at any moment without asking what happened.

## The three files a newcomer reads, in order

1. [`docs/HANDOFF.md`](../../HANDOFF.md): where things stand right now, how to
   run it, what is next, what is blocked. One page. Always current.
2. [`docs/todo/football-memories/PROGRESS.md`](../../todo/football-memories/PROGRESS.md):
   phase-by-phase task table with status, plus the verification log.
3. [`docs/DECISIONS.md`](../../DECISIONS.md): the decision log, newest first.

`AGENTS.md` at the repo root points non-Claude tools at the same files.

## Rules

1. **Commit and push at every working checkpoint**, not only at the end: after
   each task that leaves the suite green, and before the session ends for any
   reason. Unpushed work does not exist to the next agent.
2. **Never end a session with uncommitted changes and no note.** If work is
   half-done and red, commit it on the working branch with a subject starting
   `WIP:` and say in HANDOFF.md exactly what is broken and why. Never push red
   to `main`.
3. **Update HANDOFF.md and PROGRESS.md in the same commit as the work they
   describe.** A HANDOFF that disagrees with the code is worse than none.
4. **Decisions go in DECISIONS.md** (made by the agent, with reasoning) or
   [`docs/owner-decisions/`](../../owner-decisions/README.md) (needs the owner).
5. **Name the branch** in HANDOFF.md. Work happens on a branch; `main` only
   receives green, verified work.
6. **State verification honestly** in PROGRESS.md's log: the real command and
   its real output summary, and what was not checked (for example "not tested in
   Docker", "not checked on a tablet").
7. **Do not depend on chat history.** Anything the next agent needs (an
   assumption, a gotcha, a half-finished idea) goes in the repo.

## End-of-session checklist

- [ ] suite green (or WIP commit with the failure explained)
- [ ] HANDOFF.md "Current state", "Next steps" and "Blocked on" updated
- [ ] PROGRESS.md rows and verification log updated
- [ ] new decisions logged
- [ ] `git push` done and `git status -sb` shows nothing ahead
