---
name: test
description: Write and review test cases for Football Clip Recorder. Use when creating new tests, reviewing existing tests for correctness, or improving coverage. Enforces rules that stop AI-generated tests from being written to pass rather than to verify. Read alongside docs/system/rules/40-testing.md.
---

# /test: write and review test cases

Use: `/test <target>`: a module, file path, or description of the behaviour to cover.

**The #1 danger of AI-written tests:** when an AI reads implementation code and
generates tests, it mirrors the code's current behaviour back as assertions,
including the bugs. That is **transcription, not validation.** Every rule below
exists to stop that.

Green output is not evidence.

---

## Before anything else

**No test may reach Hudl or any other host.** The network is blocked by an
autouse fixture in `tests/conftest.py`, and a test proves the block is live.
Hudl is a `FakeHudl` that records calls, or scrubbed recorded fixtures under
`tests/fixtures/hudl/`.

**No test may read the real keychain, the real library, or real footage.**
Secrets come from a fake secret store; every path is under `tmp_path`.

If you cannot verify a behaviour without the real Hudl account, stop and say
so. Do not approximate it. That check is owner-run and read-only.

---

## TDD stance

```text
No production behaviour change without a failing test first.
```

Read the implementation to understand dependencies and blast radius. Do **not**
use it as the oracle for expected behaviour. Expected behaviour comes from the
spec, `docs/`, the bug report, or an explicit characterization.

### Red → green → refactor

1. **Red:** smallest test that states the desired behaviour.
2. **Verify red:** run it. It fails *for the reason you expect*: not an import
   error, not a typo, not a fixture that never built.
3. **Green:** smallest production change that passes.
4. **Verify green:** run it again.
5. **Refactor** only while green.

If the test passes immediately it proved nothing. Tighten it or pick a
behaviour that is genuinely missing.

---

## Where tests live

The tree mirrors the source tree. A test's directory is decided by the module
it covers.

```
tests/
├── conftest.py            # network block, fake secret store, FakeHudl, tmp library
├── fixtures/
│   └── hudl/              # scrubbed recorded pages/JSON/playlists + tiny generated media
├── services/
│   ├── auth/  catalog/  downloads/  library/
├── hudl/                  # contract tests over recorded fixtures
├── storage/
├── entry/
└── structure/             # layer imports, single Hudl choke point, fixture scrub
```

- **One test file per source module**, named `test_<module>.py`.
- **Every directory needs `__init__.py`**, or two same-named files import as one
  module and one silently wins.

---

## The rules

### 1. Every test must be capable of failing

Invert the logic mentally: if the code were wrong, would this catch it? For at
least one test per batch, break the assertion and watch it go red.

### 2. Every green assertion needs a negative control

```python
def test_no_log_record_contains_the_password(caplog, fake_secrets):
    run_login(fake_secrets)
    assert FAKE_PASSWORD not in caplog.text

def test_the_redaction_check_would_see_a_leaked_password(caplog):
    """Negative control: proves the assertion above can fail."""
    logging.getLogger("unfiltered_probe").warning("pw=%s", FAKE_PASSWORD)
    assert FAKE_PASSWORD in caplog.text
```

Both, always. The first is the rule; the second makes it mean something.

### 3. Arrange → Act → Assert, one Act per test

```python
def test_downloads_a_clip_into_the_library_under_its_final_name(tmp_path):
    # Arrange
    hudl = FakeHudl(clips={"clip_8f3a2c": TINY_MP4})
    lib = Library(root=tmp_path)
    # Act
    download_clip(hudl, lib, clip_id="clip_8f3a2c")
    # Assert
    assert (tmp_path / "2026-10-18 U14 vs Rovers" / "clip_8f3a2c.mp4").stat().st_size == len(TINY_MP4)
```

Two Acts means two tests.

### 4. Test behaviour, not implementation

Test through the public service function. If a refactor breaks the test while
behaviour is unchanged, the test was coupled to implementation.

### 5. Names describe subject / scenario / expected

```python
# DON'T
def test_download(): ...

# DO
def test_leaves_no_file_under_the_final_name_when_a_segment_fails(): ...
def test_stops_and_reports_when_hudl_returns_a_captcha_page(): ...
def test_skips_a_clip_whose_hudl_id_is_already_in_the_index(): ...
```

The docstring names what the test **protects**, not what it calls.

### 6. Happy path, error path and edges

- **Happy:** the download lands and is indexed.
- **Error:** 401/403 (session expired), 429 (rate limited), 5xx, CAPTCHA/MFA
  page, truncated stream, missing segment, disk full, permission denied,
  Ctrl-C mid-download.
- **Edge:** zero-length clip, a game with one clip, a name with `/` or emoji,
  a target that already exists, a duration exactly at the verification
  tolerance.

In `auth/`, `hudl/`, `downloads/` and `library/` the error paths are the point.

### 7. Assert on what landed, not just return values

For a download: the file under its final name, its size/duration, **no**
leftover `.part`, and the index row. For a failure: no file under the final
name, the job's failed state and reason, and every pre-existing file unchanged.

```python
assert not list(tmp_path.rglob("*.part"))
assert index.get("clip_8f3a2c").verified_by == "ffprobe-duration"
```

**Emissions need a payload assertion.** Progress events, user-facing error
messages, the requests sent to `FakeHudl`: assert their content.

```python
assert hudl.requests == [("GET", "/clips/clip_8f3a2c/manifest")]
```

### 8. Most specific assertion available

```python
# DON'T
assert result
assert len(clips) > 0

# DO
assert result.status == "verified"
assert [c.id for c in clips] == ["clip_8f3a2c", "clip_91bd07"]
```

### 9. No branching logic in a test body

No `if`, `try/except`, ternaries or loops-with-assertions. One test per branch.

### 10. Expect errors explicitly, never swallow them

```python
with pytest.raises(HudlChallenge, match="captcha"):
    client.login(fake_secrets)
```

### 11. Fresh state per test

Use the shared fixtures in `tests/conftest.py` (fake secret store, `FakeHudl`,
temp library). **Do not define local copies.** Duplicated fixtures drift.

### 12. Control all non-determinism

- Never build "now" at module import. Inject a clock.
- Backoff and throttling take an injected `sleep`; assert the delays requested,
  never actually wait.
- Patch `random` and `uuid` where the code uses them.
- Every path is under `tmp_path`.

### 13. Patch precisely, with `autospec=True`

Patch where the name is **used**, not where it is defined. Prefer a hand-written
fake that records calls (`FakeHudl`, `FakeSecretStore`) over a mock: it gives a
real call log and cannot silently accept a call production would reject.

### 14. Mock only the boundaries

| Boundary | Faked as |
|---|---|
| Hudl (HTTP + browser) | `FakeHudl` or recorded fixtures |
| OS keychain | `FakeSecretStore` |
| `ffmpeg` / `ffprobe` | real binary on tiny generated media where possible; fake only for error injection |
| Clock / sleep | injected |

The filesystem is **not** on that list. Use `tmp_path`: a real temp directory
is faster and more faithful than a mocked one.

### 15. Fixtures must be scrubbed and synthetic

Recorded Hudl responses have cookies, tokens, signed-URL signatures, emails and
real names removed before commit. Rosters use invented names. The structural
scrub test scans `tests/fixtures/` for token/cookie/signature patterns, with a
negative control that plants one.

### 16. Realistic data

Use ids, playlist shapes, durations and file sizes the app will actually see.
`id="x"` and a 3-byte "video" hide the bugs that happen with real input.

### 17. Never add a test-only production API

If a method, flag or env var exists only so tests can steer production code,
it belongs in `tests/conftest.py`. `skip_verification=True` and
`allow_overwrite_for_tests` are how a destructive path gets built.

---

## Never do this to a test

- delete it because it fails
- `skip` / `xfail` it to get past it
- loosen an assertion (`==` → `>=`, exact string → `in`)
- widen a tolerance
- comment out the assert
- lower a coverage baseline

If a test fails, the change is wrong or the test knows something you don't.
**Read it.**

Legitimate edits: a **mock-target relocation**, or a **fixture re-recording**
after Hudl genuinely changed. Name either in the commit message.

---

## Anti-patterns: reject on sight

| Anti-pattern | What it looks like | Why it's dangerous |
|---|---|---|
| **Tautological test** | Asserts on a mock's return value | Tests the mock |
| **Testing the setup** | Writes a file then asserts the file exists | Proves the fixture works |
| **Mocking the SUT** | Patches the function under test | You mocked the answer |
| **No assertions** | Body has no `assert` | Passes unless it raises |
| **The Liar** | `assert result is not None` after a download | Coverage without verification |
| **Missing negative control** | `assert leaks == []` alone | A blind detector reports clean forever |
| **Over-mocking** | More patch setup than assertions | Tests the wiring |
| **Import-time now** | `NOW = datetime.now()` at module level | Stale by the time the suite reaches it |
| **Real sleep** | Backoff test that waits | Slow and flaky |
| **Live network** | Any path that reaches a real host | Risks the account; nondeterministic |
| **Unscrubbed fixture** | Real cookie, token or name in `tests/fixtures/` | Permanent leak in git history |
| **Real footage in repo** | `.mp4` from the account committed | Size, privacy, minors |
| **Tests as afterthought** | Implementation first, tests for coverage | Biased by the implementation |

---

## Review checklist

| # | Check | Reject if |
|---|---|---|
| 1 | Calls production code | Only calls mocks and fixtures |
| 2 | Asserts on code output | Asserts on mock return values |
| 3 | Specific assertions | Truthiness on specific data |
| 4 | Would fail on a bug | Inverting the logic changes nothing |
| 5 | Negative control present | A "zero offenders" assertion stands alone |
| 6 | No branching in body | `if` / `try` / ternary |
| 7 | Determinism controlled | Wall clock, real sleep, import-time now |
| 8 | Errors asserted explicitly | Exceptions swallowed |
| 9 | Disk state verified | Only the return value checked |
| 10 | Emissions verified | Request/progress payload unasserted |
| 11 | Name matches assertions | Says one thing, asserts another |
| 12 | One behaviour per test | Unrelated assertions bundled |
| 13 | Shared fixtures used | Local copy of a conftest fixture |
| 14 | Cannot reach the network | Any real host reachable |
| 15 | No secrets / real data | Unscrubbed fixture, real keychain or library path |

---

## Authoring workflow

1. Write expected-behaviour bullets from the spec and `docs/`, not from the code.
2. Write one failing test for the next behaviour.
3. **Run it. Watch it fail for the expected reason.**
4. Smallest production change to pass.
5. Run it. Watch it pass.
6. Add the error path, then the edge. Repeat.
7. Break one assertion on purpose, confirm red, restore.
8. Run the touched directory, then the full suite.
9. Re-read the names: do they still match what is asserted?

## Running

```bash
cd backend && uv run pytest tests/services/        # the directory you touched
cd backend && uv run pytest                        # full backend suite
cd backend && uv run pytest -k duplicate           # by name
cd frontend && npx vitest run src/lib              # frontend, one area
cd frontend && npm test                            # full frontend suite
```

Frontend tests use Vitest + Testing Library; render with
`renderWithProviders` and stub the API with `stubFetch` from
`frontend/src/test/render.tsx` (it fails loudly on an unstubbed path).

**Never run two full suites at once.**

## Related

| | |
|---|---|
| `docs/system/rules/40-testing.md` | The protocol this skill implements |
| `docs/system/rules/20-account-and-library-safety.md` | What can cost the account or the footage |
| `/verify` | Pre-commit checks |
| `/coverage-gap` | Finding and filling untested code |
| `/safe-change` | Anything near login, the session, Hudl requests or library deletes |
