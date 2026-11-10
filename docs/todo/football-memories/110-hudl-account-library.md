# 110: Saved Hudl connection, match catalogue and team identity

**Status:** Building
**Sensitive:** credentials, normal login, read-only catalogue/media. Safe-change
procedure applies. Owner explicitly requests app username/password Save/Test,
a cached match chooser and stream/download on 2026-11-09. This supersedes
D-012's no-app-credential-form assumption; automation permission persists.

## Changes
Host companion saves credentials in macOS Keychain, never app DB/browser
storage. Test makes one normal login attempt; challenges require the owner.
Cache only accessible match metadata/links, never cookies or signed URLs.
Select matches to stream or capture/download. Keep normal capture fallback.
Resolve/cache actual club crests for shared TeamBadge; unknown teams retain
initials. Match ages do not become separate club identities. Restyle My Player
with the same charcoal palette/panels/navigation as the Library.

## Preserve
Existing captures, archive files, imports, exports, API contracts, tests and
permission limits. No auth bypass, persistent cookies, bulk downloads, invented
rosters/logos, or library overwrites. No credentials in logs, argv or errors.

## Verification plan
Test secret-store redaction, strict Origin/Host/input handling, discovery URL
scope/dedup and safe cache content, streaming allowlists, known team aliases and
logo fallback. Use offline synthetic data and meaningful failing tests first.
Check browser UI and full repo gates; live login needs owner-entered credentials.

## Open decisions
hls.js runtime dependency approved by owner for Chrome/Edge HLS streaming.
Live Save/Test awaits owner credential entry in the app; no password in chat.
