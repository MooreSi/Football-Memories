# Spec pack structure

Reference for `/spec`. Load when scaffolding or reshaping a pack.

## Shapes

```
docs/todo/<domain>/<feature>/          # flat pack (default)
├── README.md          # the ONLY hub: onboarding, doc index, decisions, roadmap
├── SPEC.md            # the anchor spec
├── PROGRESS.md        # live status log
├── 010-<slug>.md      # task files, stepped by 10
└── 020-<slug>.md

docs/todo/<domain>/<feature>/          # phased pack
├── README.md
├── SPEC.md
├── PROGRESS.md
├── phase1-<slug>/
│   ├── README.md      # phase index + gating condition
│   └── 010-<slug>.md  # numbering restarts per phase
└── phase2-<slug>/
```

- **Domain dirs are permanent; feature dirs are temporary**, deleted by
  `/spec done`.
- **Domain dirs mirror the code:** `auth/`, `hudl/`, `catalog/`, `downloads/`,
  `library/`, `entry/`, `infra/`. Add one only when nothing fits.
- **010-stepped** numbering. No `001-` sequences.
- Feature dir names are short kebab slugs (`hls-resume`, `season-bulk-download`).

## Companion docs (the only files allowed beside README + tasks)

| File | Role | When |
|---|---|---|
| `SPEC.md` | Anchor spec: Problem / Goal / Non-goals / **What must NOT change** / Design / Test plan / Real-account check / Verification | Every pack by default |
| `PROGRESS.md` | One row per task (status / owner / notes), decisions log, blockers, verification log | Anything non-trivial |
| `QUESTIONS.md` | Decisions to confirm, recommendation-first, answered inline with `ANSWER:` | Open decisions exist |
| `SUMMARY.md` | Owner-facing plain-English digest, before → after | Broad or behaviour-heavy work |
| `REVIEW.md` | Evidence: read-only numbers from the local index and logs | "Is this actually a problem?" packs |

`START.md`, `INFO.md`, `OVERVIEW.md`, `PLAN.md` are banned. The README is the plan.

## Evidence rules (`REVIEW.md`)

Read-only. Sources: the local download index, app logs, the library folder
listing. **Never** scrape Hudl to gather evidence. **Never** paste cookies,
tokens, signed URLs, emails or real player names into a pack.

## Sensitive tasks

Any task touching credentials, the session, the login flow, Hudl request
policy (rate, concurrency, retries), access scope, or deleting/moving/
overwriting library files:

- says **`Sensitive: yes`** in its header and is listed in the README header;
- routes through `/safe-change`;
- is not Done on a green suite alone if it needs a real-account check: that
  check is owner-run, read-only, and recorded in PROGRESS.md.

## Ordering

The roadmap's **Depends on** column is hard ordering. Add **Ships with** when
two tasks must land in the same commit (for example, a new naming scheme and
the "already downloaded" lookup that must understand it).
