# Development

## Prerequisites (macOS, Apple Silicon)

- Docker Desktop
- `uv` (`brew install uv`): manages Python 3.12 and the backend venv
- Node 22+ (`brew install node`)
- ffmpeg (`brew install ffmpeg`): needed by backend tests and local dev

## Run everything in Docker (the normal way)

```bash
cp .env.example .env        # then set FM_DB_PASSWORD and the folders
docker compose up -d --build
open http://127.0.0.1:8765
```

- Drop match videos (and optional `<same name>.tags.csv`) into `FM_HOST_INBOX`.
- The archive is written to `FM_HOST_ARCHIVE/FootballMemories/`.
- Migrations run automatically when the backend starts.

Update after pulling new code: `git pull && docker compose up -d --build`.
Stop: `docker compose down` (data stays in the `db-data` volume and your folders).

## Run for development (hot reload)

```bash
# database
docker run -d --rm --name fm-pg-dev -e POSTGRES_USER=memories -e POSTGRES_PASSWORD=memories \
  -e POSTGRES_DB=memories -p 127.0.0.1:55432:5432 postgres:17-alpine

# backend (terminal 1)
cd backend && uv sync
export FM_DATABASE_URL=postgresql+psycopg://memories:memories@127.0.0.1:55432/memories
uv run alembic upgrade head
FM_ARCHIVE_ROOT=../data/archive FM_IMPORT_ROOT=../data/inbox \
  uv run uvicorn app.main:create_app --factory --reload --port 8000

# frontend (terminal 2)
cd frontend && npm install && npm run dev     # http://127.0.0.1:5173, proxies /api
```

`.claude/launch.json` has `backend` and `frontend` entries for the Claude
desktop preview with the same settings.

## Database migrations

```bash
cd backend
uv run alembic revision --autogenerate -m "what changed"   # review the file it writes
uv run alembic upgrade head
uv run alembic check                                       # must say no new operations
```

Never edit an applied migration; add a new one.

## Configuration

All backend settings are environment variables with the `FM_` prefix
(`backend/app/config.py`): `FM_DATABASE_URL`, `FM_ARCHIVE_ROOT`,
`FM_IMPORT_ROOT`, `FM_LOG_LEVEL`, `FM_CORS_ORIGINS`. Compose-level variables are
in `.env.example`.

## Importing existing matches

1. Download the match through Hudl's own download/export (see
   [HUDL_INTEGRATION.md](HUDL_INTEGRATION.md)).
2. Copy it into the inbox folder. Optionally add `<same name>.tags.csv`.
3. App → Import → pick the file → fill team, opponent, date, season → Import.

The file is copied and checksum-verified; the original is never changed.

## Backup and restore

In the app: **Settings > Backups**. One backup is made automatically each day
the app runs (14 kept); press **Back up now** before big changes. Backups live in
`FM_HOST_ARCHIVE/FootballMemories/Backups/`, so backing up the archive folder
(Time Machine or an external drive) protects both the videos and the index.

**Restoring on a new Mac:** install as above, point `FM_HOST_ARCHIVE` at the
copied archive folder, start the app, then Settings > Backups and restore the
newest backup (or upload one with **Upload a backup**). If you moved videos
around, run Settings > Storage > **Find moved files**.

A raw database dump is still possible as an extra:
`docker compose exec db pg_dump -U memories memories > db-$(date +%F).sql`.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `port is already allocated` | another app uses the port; set `FM_PORT` in `.env` |
| "The video file is missing" | the file under `FM_HOST_ARCHIVE` was moved or deleted; restore it to the same path |
| Import says "not a readable media file" | ffprobe cannot read it; check it plays in QuickTime/VLC |
| Import 409 "already in the archive" | identical footage was imported before; the message links to it |
| Backend tests fail with `ModuleNotFoundError` | you are not using `backend/.venv`; run `uv run pytest` from `backend/` |
