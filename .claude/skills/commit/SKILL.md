---
name: commit
description: Verify, record and commit the current session's work: checks green first, records updated, message via -F. Use when the user asks to commit; if they say "commit and push", chain into /push afterwards.
user-invocable: true
allowed-tools: Bash, Read, Edit, Write, Glob, Grep
---

# /commit: verify, record, commit

## 1. See what actually changed

```bash
git status --short
git diff HEAD --stat
```

If it contains changes you didn't make this session, stop and tell the user.
Never sweep in someone else's work silently.

If anything under `auth/`, `hudl/`, or library file operations changed,
confirm `/safe-change` was followed and say so in the message.

**Look for files that must never be committed:** footage (`.mp4`, `.ts`,
`.m3u8` outside `tests/fixtures/`), `.part`, cookies/storage-state, `.env`,
`*.db`. `.gitignore` covers these; look anyway.

## 2. Prove it green

- **Code, test or tools change** → `/verify` must pass.
- **Docs/skills only** → check links resolve; say "docs-only" in the message.

A failing check stops the commit. Never `--no-verify`, never commit "just this
once" on red.

## 3. Update the live records

- The active plan pack's `PROGRESS.md` (if any): flip task rows, add the
  verification entry (real output, not a claim).
- Non-obvious lesson → the relevant `docs/system/domains/<domain>/README.md`.
- An owner decision made or assumed → `docs/owner-decisions/`.

## 4. Commit, message via file

```bash
git add <files>       # stage selectively; avoid sweeping in stray files
git commit -F <path-to-message-file-in-scratchpad>
git status --short
```

Message shape: one imperative subject line; a body saying why, what was
deliberately NOT done, the checks result, and whether it was checked against
the real Hudl account. Never mention which AI model made the change. Separate
restructuring commits from behaviour commits.

## 5. Offer or chain the push

If the user asked to "commit and push", invoke `/push`. Otherwise tell the
user the commit hash and that `/push` publishes it.

## Never

- commit on a red check, or skip step 2 because "it's small"
- bundle unrelated concerns into one commit
- commit secrets, session files, footage or real roster data
