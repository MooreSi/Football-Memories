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

## Saved Hudl connection (macOS desktop helper)
Run the helper outside Docker from `backend/`:
```bash
uv run python -m app.connectors.hudl_companion --output ../data/inbox
```
Chrome, ffmpeg and Apple's Swift command-line tools are required. The helper
compiles its Keychain bridge into `~/Library/Caches/FootballMemories` on first
use. Settings → Connections now has Hudl username/password, Save, Test and
Refresh matches. Save stores credentials only in this Mac's Keychain; Test
opens a visible normal Hudl login and caches available match metadata. Complete
any Hudl verification yourself. No authentication bypass or persistent cookies.

Choose Stream to play in the app (Safari native HLS, Chrome/Edge hls.js), or
Download to produce a verified MP4/tag CSV in the helper inbox, then Import.
Only complete unencrypted muxed HLS is supported. Download defaults to the
existing 720p ceiling. Existing captured files are reused, never overwritten.
The cache contains only match IDs/titles/watch links. Signed media URLs stay in
memory; restarting the helper requires another Test. Discovery is bounded and
may need you to open the correct library in the helper browser, then Refresh.
Disconnect releases the account browser for the manual URL capture fallback.
This is a local desktop feature; server background connector flags stay false.
Each user needs permission for automation and archiving. The owner attests that
permission for this installation. Saved-account live verification is pending;
the earlier manual capture/import/playback flow has been verified.
