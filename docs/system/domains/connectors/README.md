# Connectors

`GET /api/connectors` reports real capabilities. `LocalImportConnector` imports
owner-obtained files; `HudlConnector` currently reports no capabilities. Follow
[the account safety rules](../../rules/20-account-and-library-safety.md) and
the repository's `/safe-change` procedure before enabling account access.

## Hudl login and data research (2026-11-09)

Use `https://www.hudl.com/login` to begin a fresh browser login. A transaction
URL at the identity provider, with its `state` parameter, must never become a
shared configuration. A browser login does not authenticate the app backend.

Owner attests permission for app automation and downloads; D-012 scopes the
desktop helper and supersedes the earlier blanket no-login assumption. Other
users need their own permission. The normal server still has no background
session; its capabilities remain false. Settings separately exposes the host
companion (`hudl_companion.py`, port 8766) and its actual capture progress.

All network/browser access is in `hudl_browser.py`; the parser/local assembler
is `hudl_capture.py`. Observe only match-served HLS and read-only tagging
responses, never copy cookies or guess match IDs. Auth stays in an incognito
context, not in disk storage. Serial transfers, 0.5s pause, no retries/redirects.
The companion restricts browser Origin/Host and startup output directory.

Observed tag contract: synced Sportscode session, moments with millisecond
start/end times and `HUDL_CODE` values. Code labels may be players or categories;
explicit player mappings are required. Do not infer attribution from overlap.
Playback prefetches can be cancelled; only successfully read manifests count.
Clip padding can extend beyond video boundaries; the source adapter clips it
to the playable interval before strict parsing. ffmpeg 8 checks both permitted
extensions and segment-type extension matches: local opaque asset filenames
need the local-only HLS options used by the assembler, with protocol `file` only.

Evidence, sources and missing account/export checks:
[HUDL_INTEGRATION.md](../../../../HUDL_INTEGRATION.md). Pending owner answers:
[002-hudl-access.md](../../../owner-decisions/002-hudl-access.md).

## Saved account helper (D-014, 2026-11-10)
Settings uses the host companion separately from server capability flags.
`hudl_account.py` sanitizes metadata; `hudl_keychain.py` compiles a small native
Security bridge with swiftc into the user's cache. JSON credentials go through
stdin, never argv; no third-party backend dependency or persistent cookies.
`BrowserConnection` serializes login/discovery/media on one Playwright worker.
Account and manual capture share a gate; disconnect before manual capture.
The chooser's cache is private mode 0600 and contains only IDs/titles/canonical
watch links, cleared on account replacement. Streams expose only registered
local nonce/asset paths; manifests contain no signed source URLs. Transfers use
the existing strict HLS parser/host checks and serial fetch policy.

The modern library renders cards from GraphQL VideoItem nodes, so DOM anchors
alone can miss matches. Observe successful normal UI responses and extract
`data.library.edges[].node` with `__typename == VideoItem`, `id`, `title`;
exclude deleted nodes/PlaylistItem and all playback credentials. The served
encoded VideoItem ID maps to the canonical watch URL. `app.hudl.com` DOM links
normalize to the same canonical www host. Discovery is bounded, so a very large
or differently structured library may need the owner to open it and Refresh.
Live saved-account verification is pending owner form entry; prior manual URL
capture/import/playback was verified. Do not describe discovery as live-proven.
