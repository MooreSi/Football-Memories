# Testing

Rules: [docs/system/rules/40-testing.md](docs/system/rules/40-testing.md) and the
`/test` skill. Test first, watch it fail, never edit a test to make it pass.

## Commands

```bash
# backend (from backend/)
uv run pytest                                   # SQLite, fast
TEST_DATABASE_URL=postgresql+psycopg://memories:memories@127.0.0.1:55432/memories_test \
  uv run pytest                                 # same suite on PostgreSQL
uv run ruff check app tests && uv run mypy app  # lint + strict types
uv run alembic check                            # models and migrations agree

# frontend (from frontend/)
npm test                                        # vitest + Testing Library
npm run typecheck
npm run build
```

The Postgres test database: `docker exec fm-pg-dev createdb -U memories memories_test`
once, with the dev container from DEVELOPMENT.md running.

## What the suite guarantees

- **No network.** `backend/tests/conftest.py` blocks every non-loopback
  connection; `tests/test_network_block.py` proves it. Hudl is never contacted.
- **No real footage.** Media tests generate a few seconds of test pattern with
  ffmpeg. Sample data uses invented names.
- **No real folders.** Every archive/inbox path is a pytest `tmp_path`.
- **Secrets never logged.** `tests/test_logging.py`, with a negative control.

## Not automated yet

- Playwright end-to-end tests (planned; the slice was checked by hand in the
  browser and through Docker, see PROGRESS.md verification log).
- Large-library performance, backup/restore, storage exhaustion (later phases).
