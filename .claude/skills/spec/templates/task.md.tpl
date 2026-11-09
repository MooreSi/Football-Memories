# {{0N0}}: {{Task name}}

**Status:** not started {{| in-progress | Done (YYYY-MM-DD, commit abc1234) | deferred}}
**Depends on:** {{010-{{slug}}.md | none}}
**Sensitive:** {{no | YES: run `/safe-change` first. Real-account check (if any) is owner-run and read-only.}}
**Layer:** {{entry | services/<domain> | hudl | storage | tests/tools}}
**Leverage:** {{existing code/pattern this rides on, or "none: new ground"}}

## Problem

{{What's wrong or missing today, concretely. Cite `file.py:line` where it helps.}}

## Decision

{{The chosen approach in 1-3 sentences, and the alternative it beat.}}

## What must NOT change

{{Behaviour left identical and tests that must pass unmodified. "Nothing: new
code" is a legal answer; say it explicitly.}}

## Tests first (TDD)

{{The failing tests to write BEFORE implementation. Run them, watch them fail
for the expected reason. Every green assertion needs a negative control. No
test reaches the network, the real keychain or the real library.
Pure-docs tasks: "N/A: docs only".}}

- {{`tests/<area>/test_<name>.py::test_<behaviour>`}}: {{what it pins}}
- {{`tests/<area>/test_<name>.py::test_<detector>_can_actually_fail`}}: negative control

## What to do

1. Write the tests above; run them; confirm they fail for the right reason.
2. {{ordered implementation step}}
3. `/verify`.

## Where

- {{`path/to/module.py`}}: {{what changes there}}

## Acceptance

- {{observable criterion}}
- **The killer test:** {{the one offline end-to-end scenario that proves it}}
- `/verify` green, real output pasted into PROGRESS.md.

## Notes

{{Edge cases, Hudl quirks, starting values vs decided values.}}
