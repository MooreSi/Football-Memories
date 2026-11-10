# 150: Unsynced tags must not block the match video

**Status:** Shipped
**Sensitive:** read-only playback/download; safe-change applies.

## Problem and change
The reported U11 match raises the strict unsynced-tag error before publishing
its stream or capturing the full video. Keep strict tag-sync validation, but
allow account video operations to omit unsynced tags with an explicit warning.
Cache a sanitized tag status and show it separately from video progress. Disable
moment exports without validated ranges. Legacy strict URL capture remains strict.

## Must not change / non-goals
No guessed offsets, false sync flags, Hudl modifications, request-policy or
credential/session changes. No existing footage overwritten; preserve highest
source quality and normal capture verification. Auth/GraphQL errors still stop.

## Verification plan
Watch stream/download continuation and warning regressions fail first; retain
strict parser tests unchanged. Use real tiny media for offline copy verification.
Live read-only: open the reported cached match, inspect its stream/tag outcome,
and check playback; full capture may be verified if disk space permits.

## Verification
Two backend regressions and the frontend warning/download regression were watched
red then green. The GraphQL-error characterization passed initially, then failed
with an intentionally broadened catch; restored narrow handling passes. Existing
strict unsynced-parser tests are unchanged and pass.

Backend 267 passed on SQLite and PostgreSQL sequentially; ruff check/format,
mypy and alembic no drift green. Frontend 99 passed, typecheck/build green.
Docker rebuild/health green. No CI workflow.

Live reported match: stream preparation and 1920×1080 playback succeeded
(readyState 4, advancing time, no media error). Full capture completed as
1920×1080 HEVC/AAC, 6195.52 seconds, 3,721,611,743 bytes. The app's attachment
was downloaded to Downloads and matches the verified inbox source SHA-256.
The tag CSV has zero rows. All 8 pre-existing inbox files remain byte-identical.
No credential/session storage change, guessed timing or Hudl mutation. Host
helper is idle; preview playback is paused. Local proof remains ignored:
data/hudl-unsynced-video-verified.png. No pending live verification.
