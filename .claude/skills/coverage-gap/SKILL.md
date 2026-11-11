---
name: coverage-gap
description: Find untested code in Football Memories and fill the gaps that matter. Use when asked about test coverage, "what isn't tested", "add tests", or before splitting/refactoring a file that may have none.
---

# Finding and filling coverage gaps

## Measure

Requires `pytest-cov` in the project `.venv` (ask before adding a dependency).

```bash
.venv/bin/python -m pytest tests/ -q --cov --cov-report=term-missing
```

## Pick gaps by risk, not by size

1. **Zero-coverage code in `auth/` or `hudl/`.** Secret handling, challenge
   detection, backoff. A gap here can lock the account or leak a password.
2. **Library writes.** `.part` → verify → rename, skip-if-exists, resume. A gap
   here loses footage.
3. **Anything you are about to refactor.** Tests first, then move.
4. **Error paths in `downloads/`**: truncated stream, missing segment, disk
   full, interrupted run.
5. Everything else.

Do not chase the global percentage. Tests on string formatting raise the number
and protect nothing.

## Coverage is not proof

Coverage measures lines *executed*, not behaviour *verified*. A file at 90%
whose tests assert nothing is untested.

## Writing the tests

Follow `/test`:

- write it, **run it, watch it fail**, then make it pass
- every "there are zero X" assertion needs a negative control
- no test reaches the network, the real keychain or the real library

## After adding tests

Report numbers per area in the commit:

```
services/downloads coverage 54% -> 81%: interrupted and truncated HLS paths.
```

If a coverage baseline exists, raising it after a genuine improvement is
correct. **Never** lower it to make a failure go away.
