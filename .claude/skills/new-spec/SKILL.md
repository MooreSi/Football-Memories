---
name: new-spec
description: Write a spec in docs/todo before building anything bigger than a one-line fix. Use when starting a feature, a change with more than one moving part, or when the user describes what they want but not how it should work.
---

# Writing a spec

Anything beyond a one-line fix starts here. Create `docs/todo/NNN-short-name.md`
using the structure below.

**First, ground it in the knowledge base.** Read the affected
`docs/system/domains/<domain>/README.md`: its constraints and gotchas feed
"What must NOT change" directly. When the spec ships, fold what it taught back
into that domain file.

## Why bother

A chat transcript is not a record. Months from now the spec explains why the
code looks the way it does, and it is where assumptions live, so a wrong one is
findable instead of buried in a diff.

## Template

```markdown
# NNN: <title>

**Status:** Draft | Approved | Building | Shipped | Abandoned
**Sensitive:** no | YES: <which surface: credentials / session / Hudl requests / library deletes>. `/safe-change` governs.

## What is wrong or missing today
## What changes
## What must NOT change
## Non-goals
## Open questions (and the provisional default in use)
## Test plan

| Test | Asserts | Negative control |
|---|---|---|

## Real-account check
None needed | Owner-run, read-only: <exact steps>

## Verification (filled in when shipped)
- [ ] suite green: <numbers>
- [ ] no credential, cookie or token written to the repo, a log or a fixture
- [ ] nothing on Hudl modified; no existing library file deleted or overwritten
- [ ] real-account check: done by <who> on <date> | not needed | not done
```

## The sections that earn their keep

### "What must NOT change"

- Which behaviour stays identical?
- Which defaults must not move (output folder, naming, "already downloaded")?
- Which tests must pass unmodified?

If the change touches a sensitive surface, list it here and note that it needs
the owner.

### "Non-goals"

Be specific: "does not change the folder layout of existing downloads" is
useful; "keeps it simple" is not.

### Test plan comes before the code

If you cannot describe how you would detect the change working, you do not yet
understand the change. Include the negative control for each assertion.

## Keep it to half a page

1. What is wrong today?
2. What changes?
3. **What must not change?**
4. How will we know it worked?

## Status and naming

`NNN` is sequential. Keep the number even if abandoned; mark it Abandoned with
a sentence on why. Move the status as it progresses; a spec left at Draft
forever is a decision nobody made.
