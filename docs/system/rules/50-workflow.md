# How to make a change, end to end

> spec → failing test → smallest change → full suite → commit

If a step is skipped, say which one and why, in the commit.

## 0. Understand before you type

Read the file you are about to change **and** its tests. Comments here carry
incident history ("Hudl started returning 403 on segment URLs older than 10
minutes, 2026-12-01"); that context is usually why the code looks odd. If a
comment explains why something is odd, it is odd on purpose.

## 1. Is there a spec?

For anything beyond a one-line fix, write or find a spec in `docs/todo/`: a
standalone `NNN-short-name.md` (`/new-spec`) or a plan pack's `SPEC.md`
(`/spec`). Half a page: what changes, what must not change, how you will know
it worked. A chat transcript is not a record.

## 2. Classify the change

| Kind | What it needs |
|---|---|
| Bug fix | a test reproducing the bug first |
| New behaviour | a spec + tests |
| Refactor | characterization tests before moving anything |
| Hudl changed its site/API | re-recorded, scrubbed fixture + the contract test that now fails, then the fix |
| Login, credentials, session, Hudl request policy, deleting/moving library files | **`/safe-change`**: owner decides; real-account check is owner-run and read-only |

## 3. Write the failing test

See [40-testing.md](40-testing.md). Watch it fail for the right reason.

## 4. Make the smallest change that passes

Resist the tidy-up. A refactor bundled with a fix means neither can be
reviewed, and if it breaks you cannot tell which half did it.

## 5. Verify, all of it

```bash
.venv/bin/python -m pytest tests/ -q
```

Plus every gate `/verify` lists. **A gate that fails is not noise.**

## 6. Commit

Explain **why**, not what; the diff shows what. If the change was subtle, say
what would have gone wrong without it.

```
downloads: verify HLS segment count before renaming into the library

A dropped segment produced a file that played but stopped 40s early, and
it was recorded as downloaded so it was never retried.

Verified: suite 212 passed. Not checked against the real account.
```

Never mention which AI model produced the change.

---

## Things that look safe and are not

**"I'll add a retry."** On a login or a 429, a retry loop is how accounts get
locked. Retries live in the Hudl client's single backoff policy, and auth
failures are never retried.

**"I'll bump the concurrency, downloads are slow."** Request rate is an owner
decision. Record it in `docs/owner-decisions/`.

**"I'll just log the response to debug this."** Responses contain cookies,
tokens and signed URLs. Log through the redacting logger, or not at all.

**"I'll save this real response as a fixture."** Scrub it first: tokens,
signatures, emails, names. The fixture scrub test will catch the obvious ones;
it will not catch a child's name.

**"The test is flaky, I'll rerun it."** Rerun once. If it fails again, it is
not flaky.

**"This file is huge, let me split it while I'm here."** Splits are their own
change. See [70-file-organisation.md](70-file-organisation.md).
