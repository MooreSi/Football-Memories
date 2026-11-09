# Architecture: the boundaries

Overview, data model and API: [ARCHITECTURE.md](../../../ARCHITECTURE.md).
This file is the rules.

## Backend layers point downward

```
backend/app/api/          routes: validate input, call services, map errors to HTTP
      ▼
backend/app/services/     all behaviour (importer, library, media, sidecar, paths)
      ▼
backend/app/models.py     SQLAlchemy schema  ──▶ PostgreSQL (Alembic)
backend/app/connectors/   footage-source adapters, each reporting real capabilities
```

| Layer | Must never |
|---|---|
| `api/` | hold business logic; open files except via a service; build paths from user input |
| `services/` | import FastAPI; write outside `ARCHIVE_ROOT`; modify anything in `IMPORT_ROOT` |
| `connectors/` | claim a capability that has no working, tested code behind it |
| anything | turn a user-supplied name into a path without `services/paths.safe_join` |
| anything | contact Hudl (see HUDL_INTEGRATION.md) |

## Frontend

- `src/lib/` is pure logic and is unit-tested; components stay thin.
- `src/api/types.ts` mirrors `backend/app/schemas.py`; change both together.
- Colours only from tokens in `src/index.css`.
- A route appears in the nav only when its page works (brief section 19).

## Connector capabilities drive the UI

The UI reads `GET /api/connectors` and shows only what a connector can do. The
mock connector is never registered in production
(`tests/connectors/test_connectors.py`).

## Schema changes

Every model change ships with an Alembic migration in the same commit, and
`alembic check` reports no drift. Never edit an applied migration.

## Long-running work (phase 5)

Imports are synchronous for now (a 2 GB file copies and hashes in seconds on
SSD). Downloads, sync and exports will be persistent DB-backed jobs with
explicit states, so a crash resumes instead of restarting.
