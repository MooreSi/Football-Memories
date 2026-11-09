# {{Feature name}}: questions for the owner

Answer inline under each `ANSWER:`. Recommendation first. Answered questions
are annotated, not deleted.

---

## Q1. {{Question in plain language}}

{{One or two plain sentences on why it matters / the trade-off.}}

**Recommended:** {{option}}, because {{reason}}.
**Alternatives:** {{option}}: {{consequence}}.
**Provisional default in use:** {{what the build assumes until answered}}

ANSWER:

---

## Checklist before implementation

- [ ] Every question above is answered or explicitly deferred.
- [ ] Anything that changes credential/session handling, Hudl request rate, or
      could delete/move/overwrite library files is flagged sensitive in the README.
- [ ] User-facing strings are the owner's words.
