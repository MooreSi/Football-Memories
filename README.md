# Football Memories

A private, local-first archive for football match footage: import matches,
index tagged moments, watch whole matches or only the moments that matter, and
(coming next) follow one player's journey across seasons.

Runs on your Mac with Docker. Nothing is uploaded anywhere.

## Status

Phase 1-2 vertical slice works: **import a match → index → thumbnail → play →
tagged moments** (filter by event type and player, play moments only, event
markers, speeds, frame stepping, keyboard shortcuts). See
[docs/HANDOFF.md](docs/HANDOFF.md) and
[PROGRESS.md](docs/todo/football-memories/PROGRESS.md).

**About Hudl:** authorized users can capture an accessible match and its
Sportscode moments through normal browser sign-in, using the desktop helper
under Settings → Connections. Passwords are entered only into Hudl. The owner
has attested permission for this use; other users need their own permission.
Setup and limitations: [HUDL_INTEGRATION.md](HUDL_INTEGRATION.md).

## Quick start

```bash
cp .env.example .env            # set FM_DB_PASSWORD and your folders
docker compose up -d --build
open http://127.0.0.1:8765
```

Put videos in the inbox folder (`FM_HOST_INBOX`), then use **Import**.

## Documentation

| | |
|---|---|
| [DEVELOPMENT.md](DEVELOPMENT.md) | install, run, migrations, backup, troubleshooting |
| [ARCHITECTURE.md](ARCHITECTURE.md) | components, data model, storage layout, API |
| [TESTING.md](TESTING.md) | how to run and what the tests guarantee |
| [SECURITY.md](SECURITY.md) | privacy and security measures |
| [HUDL_INTEGRATION.md](HUDL_INTEGRATION.md) | what Hudl allows and the import workflow |
| [docs/BRIEF.md](docs/BRIEF.md) | the full product brief |
| [CLAUDE.md](CLAUDE.md) / [AGENTS.md](AGENTS.md) | rules for anyone (human or AI) changing the code |

Only import footage you are entitled to keep, and follow Hudl's terms of service.
