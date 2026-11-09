# Domains

One living directory per part of the app. Each `<domain>/README.md` holds that
part's constraints, known behaviours, gotchas and open questions.

Read the affected domain's README before designing a change. Update it in the
same commit when a change teaches you something non-obvious.

| Domain | Covers | Sensitive? |
|---|---|---|
| `import/` | inbox listing, copy + verify + rename, sidecar CSV, dedup | **yes**: never touch originals or overwrite |
| `library/` | matches, teams, seasons, age groups, search, storage layout | **yes** for anything that moves/deletes files |
| `playback/` | streaming with Range, the player, clip windows and buffers | no |
| `connectors/` | capability reporting; Hudl stays disabled (HUDL_INTEGRATION.md) | **yes**: `/safe-change` |
| `players/` | primary player, player hub, memories timeline (phase 4) | privacy: minimal data about children |
| `jobs/` | downloads, sync, notifications, backups (phases 5-6) | **yes**: idempotency, no duplicate files |

Directories are created when the first code for that domain lands. Do not
create empty ones.
