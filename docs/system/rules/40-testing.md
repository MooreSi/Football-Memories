# Testing: the protocol

This is the contract. `/test` is the working skill that applies it (rules in
full, layout, anti-pattern table, review checklist). Use `/test` when writing
or reviewing; read this when you want to know why.

## Red, green, then commit

1. **Write the test first.**
2. **Run it. Watch it fail.** Confirm the failure message is the one you
   expected: not an import error, not a typo.
3. Implement the smallest change that passes.
4. Run the test. Watch it pass.
5. Run the full suite before committing.

Step 2 is the one people skip, and it is the one that matters. A test that has
never been red has never proved it can detect anything.

## Every green assertion needs a negative control

If you assert a set is empty, also assert your detector can find a member.

```python
def test_no_module_outside_hudl_imports_an_http_client():
    assert _find_http_imports_outside_hudl() == []

def test_the_import_scan_can_actually_see_an_http_import():
    """Negative control: a zero-offender assertion is worthless if the
    scanner is blind."""
    assert _scan_source("import httpx\n") == ["httpx"]
    assert _scan_source("from clip_recorder.hudl import client\n") == []
```

Both, always.

## The network is blocked in the suite

No test may reach Hudl, or any other host. `tests/conftest.py` carries an
autouse fixture that makes outbound connections raise, and a test proves the
block is live:

```python
def test_the_suite_cannot_open_an_outbound_connection():
    """Guard rail, asserted rather than assumed."""
    import socket
    with pytest.raises(RuntimeError, match="network disabled in tests"):
        socket.create_connection(("example.com", 443), timeout=1)
```

Hudl is replaced by:

- **fakes** for the client interface (a hand-written `FakeHudl` that records
  calls and returns canned catalog entries, playlists and errors);
- **recorded fixtures** (HTML pages, JSON responses, HLS playlists) under
  `tests/fixtures/hudl/`, **scrubbed** of cookies, tokens, signed-URL
  signatures, emails and real people's names before they are committed;
- **tiny generated media** (a few seconds of test pattern made with `ffmpeg`
  at fixture-build time) for download and verification tests. Never real
  footage.

A test that proves fixtures are scrubbed (scans for cookie/token/signature
patterns) has its own negative control: it is shown a planted token and must
flag it.

## Test types used here

| Type | Purpose |
|---|---|
| **Unit / service** | One service function through its public interface, collaborators faked. |
| **Contract** | The Hudl client parses recorded fixtures correctly. Breaks when Hudl changes; fixed by re-recording. |
| **Characterization** | Pins existing behaviour *before* it moves. Written against unmodified code. |
| **Structural** | Pins the shape: layer imports, the single Hudl choke point, no secrets in fixtures. |
| **End-to-end (offline)** | Entry point → services → `FakeHudl` → a temp library dir; asserts files on disk and index rows. |

There is no automated test against the real Hudl. That is a manual,
read-only, owner-run check (see `20-account-and-library-safety.md`).

## Where tests live

Backend: `backend/tests/` mirrors `backend/app/`
(`app/services/importer.py` → `tests/services/test_importer.py`). Frontend:
tests sit next to the file they cover (`EventPanel.tsx` → `EventPanel.test.tsx`). Every test directory has an
`__init__.py`; without it pytest imports two same-named files as one module
and silently runs only one.

## Never do this to a test

- delete it because it fails
- add `@pytest.mark.skip` / `xfail` to get past it
- loosen an assertion (`==` → `>=`, exact string → `in`)
- widen a tolerance
- comment out the assert

The legitimate edits: a **mock-target relocation** (the function moved, the
patch target moves with it) and a **fixture re-recording** after Hudl really
changed. Name either one in the commit message.

## Assert on what landed on disk

For anything that downloads, assert the file under its final name, its size or
duration, the absence of a leftover `.part`, and the index row. A return value
of `True` proves nothing about the library.

For failure paths, assert what is left: the `.part` file (or its absence), no
file under the final name, the job's failed state and reason, and that no
existing file was touched.

## Determinism

- Never build a "now" timestamp at module import; compute it inside the test
  or inject a clock.
- Use `tmp_path` for every library and index location. No test writes outside
  it, and no test reads the owner's real library or keychain.
- Patch `random`, `time.sleep`, `uuid` where the code uses them. Backoff tests
  inject a fake sleep and assert the delays requested, never wait for real.

## Running

```bash
cd backend && uv run pytest                 # SQLite
cd backend && TEST_DATABASE_URL=postgresql+psycopg://memories:memories@127.0.0.1:55432/memories_test uv run pytest
cd frontend && npm test                     # vitest + Testing Library
```

Full command list: [TESTING.md](../../../TESTING.md). **Never run two full
suites at once.** It produces phantom failures.

## Coverage

Coverage is a ratchet, not a target: once a baseline exists it may go up, not
down. It measures lines *executed*, not behaviour *verified*; a file at 90%
with no assertions is untested. Use it to find holes, never to declare
victory.

## Gates fail closed

A check that cannot run must **fail**, never pass quietly. A missing
fixture directory, an empty scan, or absent coverage data is a failure.
**Prove a gate can go red before you trust it green:** plant the violation,
watch it fail, remove it.
