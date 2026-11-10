# 120: Hudl Library, tagged players and highest-quality downloads

**Status:** Shipped
**Sensitive:** YES: read-only Hudl metadata/media; safe-change applies.

## Missing today
Hudl videos/downloads are hidden in Connections. Library has no remote age-group
chooser/thumbnails. Captured player codes were kept as categories. Playback and
capture have a 720p ceiling, and existing low-quality files can be reused.

## Changes
Main Library shows cached Hudl videos filtered by age labels served in titles,
with cached thumbnails and a dedicated match screen. Open automatically streams
the highest available supported rendition, reads/caches actual Sportscode codes
and moments, and offers full match and selected code/player downloads. My Player
lets the owner explicitly identify a tagged code as a player, including codes
in already imported matches. Downloads preserve source resolution; range exports
copy source streams without transcoding. Existing lower-quality copies remain
alongside a distinct highest-quality capture. Local match page gets visible full
match and selected moment download controls.

## Preserve / non-goals
No guessed team IDs, no inferred player attribution, no auth/session persistence
change, no dependency, no Hudl mutations or access-control bypass. Serial media
requests and existing verification retained. No overwrites of archive files.
Only offered/accessible HLS supported; no claim to recover quality Hudl lacks.
Title-derived mixed ages remain mixed; unknown ages remain unclassified.

## Test plan
Watch failures for maximum rendition choice, metadata cache redaction and
age parsing, explicit tag-to-player mapping, highest-quality capture naming,
Library age filtering and stream/download controls. Existing tests unchanged.

## Real-account check
Authorized read-only: refresh library metadata/thumbnails, open the selected
age group's match, verify maximum rendition stream, inspect tagged codes and
save one selected moment (highest-quality source capture if necessary).

## Verification
- Backend 250 passed SQLite and 250 PostgreSQL; ruff/format/mypy clean,
  alembic no drift. Frontend 94 passed; typecheck/build and Docker health clean.
- Live Library cached all 100 thumbnails; age selector U10 shows 90 videos.
  My Player picker has actual imported/observed code options; no live player
  selection made on the owner's behalf. 375px Library has no horizontal overflow.
- Maximum source full match captured: H.264 1280×720, 5012.24s, 1511015451 bytes.
  Selected goal ZIP validated and downloaded through the app into Downloads.
  Its MP4 is H.264 1280×720, 26.056s; encoded streams copied without re-encoding.
  Older MP4 and CSV SHA-256 unchanged. Full MP4 attachment returned Range206
  with valid MP4 header; reuse selected the new maximum-quality copy.
- Restarted helper on final source, normal Keychain login and maximum-quality
  playback verified (15.43s, 1280×720, readyState4). Same-match Resume retains
  completed download.
- No credentials, source URLs, real roster fixtures or footage in Git; no Hudl
  mutations or existing library overwrites. No CI workflow exists.
- Not separately verified: native Safari HLS, every historical library page,
  very large multi-code ZIPs. Tag cache covers opened videos; age labels derive
  from actual video titles, including mixed/Unclassified.
