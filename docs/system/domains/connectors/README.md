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
