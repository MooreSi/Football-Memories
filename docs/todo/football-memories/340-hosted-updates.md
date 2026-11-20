# 340: Updates for hosted libraries

Owner request 2026-11-20: a hosted library's Settings gets an Update section with an
"Update automatically" tick box. It checks the Football-Memories GitHub repo for newer
commits; with the box ticked it applies them by itself, otherwise "Update available" shows
in the title bar and opens the Update section. Owner answers: decision
[013](../../owner-decisions/013-hosted-updates.md).

## Shape

1. **Host updater** (Gateway repo `updater/`, a launchd job on the gateway's Mac, hourly).
   The only thing that reaches GitHub, and only `api.github.com/repos/MooreSi/Football-Memories`
   and `github.com/MooreSi/Football-Memories.git`. It reads main's newest commit, checks it out
   in its own clone (never the owner's app folder), builds the three hosted images tagged
   `:hosted-<sha>` with `scripts/build-app-images.sh`, and writes `updates/status.json`
   (latest built commit, when checked, last error). **It accepts no commands**: nothing in the
   gateway, provisioner or a library can ask it to do anything.
2. **Provisioner.** Reads `status.json` (mounted read-only). Keeps each library's version beside
   its database password; a version recreates that library's backend, web and capture
   containers from the `:hosted-<sha>` images (the database and every volume stay). Only a commit
   the status file lists as built is accepted. New signed routes: `GET /v1/updates`,
   `GET /v1/users/{id}/version`, `POST /v1/users/{id}/update`. Docker filter unchanged.
3. **Gateway.** `users.auto_update` (default off). For the signed-in user only:
   `GET /_portal/api/update`, `POST /_portal/api/update/apply`, `POST /_portal/api/update/auto`.
   A background check every 10 minutes updates ticked libraries to the latest build. Audited.
4. **App (hosted build).** Settings > Update shows this library's version and the latest, Update
   now, and the tick box. The title bar shows "Update available" when one is ready and the box
   is not ticked; it opens Settings > Update. The owner's own install keeps its desktop updater.

## Not done here

- No rollback button: a library can only move to the latest build.
- The full security pass (`tools.security_pass`) cannot run beside the live gateway; it must be
  run before phase 3 goes further.
