---
name: push
description: Push the current branch to origin (never force), verify it landed, and check on CI. Use when the user asks to push, or chained from /commit on "commit and push".
user-invocable: true
allowed-tools: Bash, Read, Grep
---

# /push: publish the branch to origin

## 1. Preflight

```bash
git status --short          # must be clean: uncommitted work does not travel
git status -sb              # branch and how far ahead of origin
git log --oneline origin/<branch>..HEAD
```

If the tree is dirty, that is `/commit`'s job first. Read the commits about to
publish; if any isn't this session's work, say so before pushing.

Scan what is about to leave the machine:

```bash
git diff origin/<branch>..HEAD | grep -niE 'password|passwd|cookie|bearer|token|authorization|set-cookie'
```

A secret that reaches the remote is in its history permanently.

## 2. Push, plain, never forced

```bash
git push origin <current-branch>
```

- **Never `--force` / `--force-with-lease` to a shared branch.**
- Rejected non-fast-forward: fetch, rebase or merge deliberately, re-run the
  checks, then push.

## 3. Verify it landed

```bash
git status -sb    # level with origin, no "ahead"
```

## 4. CI

If `.github/workflows/` has a workflow, a push is not "done" until its run is
green:

```bash
gh run list --branch <branch> --limit 1
gh run view <run-id> --log-failed     # on failure: the real output
```

Diagnose from the real log, never guess. Fix, `/commit`, push again. If the
failure is outside your reach (billing, runner outage, permissions), report
exactly what the log says and stop.

No workflow yet: say so in the report rather than implying CI passed.

## Never

- push with a dirty tree, or force-push a shared branch
- push around a failed local check "to see what CI says"
- declare a push done while its CI run is red or unwatched
