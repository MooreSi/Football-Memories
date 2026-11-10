# 150: Unsynced tags must not block the match video

**Status:** Shipped (live full-match capture running)
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

Live reported match: stream preparation succeeds, UI displays unsynced warning
and disables moment export; full source capture is running at the served 1080p,
6195.48-second duration. No full live completion/playback claim yet. Offline
4-second real-video capture verified identical SHA-256 and empty tag CSV. All 8
pre-existing inbox files remain byte-identical. Keep the helper running; no new
credential/session storage, guessed timing, Hudl mutation or existing-file write.
Local proof: ignored data/hudl-unsynced-video.png.
