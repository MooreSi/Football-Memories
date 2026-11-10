# 130: Restore the dashboard and fix connected match discovery

**Status:** Shipped
**Sensitive:** read-only Hudl discovery/cache; safe-change applies. Owner requests
All matches placement, age/season filters and repair of disappearing videos.

## Findings and changes
Refresh from the playback page accepted its Tags navigation link as a video
catalogue, replacing 100 entries with one title Tags; saved U10 then hid it.
Only verified library pages/VideoItem responses may replace the catalogue.
Return to a previously served library route or fresh normal login discovery;
failed discovery preserves the prior cache. No guessed IDs or request replay.

Place Hudl footage within All matches, restore original dashboard grid rows,
filter by age/season, show cache/helper errors with retry instead of hiding all
content, and discard stale filter selections. Infer season only from an actual
valid YYMMDD video-title prefix using the existing July season boundary; label
undated videos Unclassified. Existing archive actions/styles remain intact.

## Verification
Playback cache-preservation, season/date and three placement/error/filter tests
were watched failing before implementation. The later redirect and age-count
checks were validated with deliberately removed guards (both failed), then
restored. A final playback-link contamination regression was watched red then
green. The positive remembered-route test was added after implementation, then failed
with route traversal deliberately disabled and passed after restoration.
Existing tests and assertions were not weakened or rewritten.

Final backend: 256 passed on SQLite and PostgreSQL, ruff check/format and mypy
clean, alembic no drift. Frontend: 97 passed, typecheck and build clean. Docker
rebuilt and health OK. Live read-only normal login/refresh restored 100 videos
with 100 thumbnails and zero Tags navigation entries; refresh after opening a
match retained all 100. U10 + 2025/26 filters 61 videos. Desktop and 375px proof
shows cards within All matches with no horizontal overflow. Screenshot is local
ignored data/unified-all-matches.png. No credential/session storage change or
footage downloads/overwrites. No CI workflow exists.
