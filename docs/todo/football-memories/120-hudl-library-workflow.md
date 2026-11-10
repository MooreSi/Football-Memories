# 120: Hudl Library, tagged players and highest-quality downloads

**Status:** Building
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
