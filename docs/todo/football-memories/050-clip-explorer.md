# 050: Clip Explorer and saved playlists

**Status:** Building
**Brief:** section 10. **Design:** reference 02 (filter rail with counts, PLAYLISTS
panel bottom-left with "+", big player, clip bar) and 01 styling for cards.
**Sensitive:** no (read-only over the archive; playlists are local rows).

## What changes

- `GET /api/moments`: tagged moments across all matches. Filters (all
  combinable, each multi-valued): team, season, match, player (any / all),
  event type; date range; favourites only; unwatched only; note text. Sort
  newest/oldest. Paginated with a total.
- `GET /api/moments/facets`: options and counts for the filter rail.
- `GET /api/events/{id}/thumbnail`: a frame at the moment itself (not the match
  poster), made once with ffmpeg and cached under `Thumbnails/moments/`.
- Playlists: `playlists` + `playlist_items` (ordered). Create from a queue,
  rename, reorder, delete. Deleting a playlist never deletes moments or files.
- UI `/clips`: filter rail + playlists panel, queue player that plays moments
  across different matches back to back (pre/post buffers, loop, autoplay next,
  speed, prev/next), results grid (moment thumbnail, player, type, match, date,
  start/end, duration, watched, offline), queue with drag-and-drop and
  up/down reorder, save queue as playlist.

## What must NOT change

Existing APIs and their tests; match playback; Player Hub.

## Not in this step (brief section 10 items deferred)

Notes and custom local tags on moments, export, physical clip download and
compilations: these need the clip editor and job system (phases 5-6).

## Test plan

| Test | Asserts | Negative control |
|---|---|---|
| each filter alone and combined | exact event ids | a filter matching nothing returns [] |
| player all vs any | AND requires every player | |
| date range inclusive | boundary dates included | |
| facets | counts per type/player/team/season | |
| moment thumbnail | JPEG from the event time; second call served from cache (no ffmpeg) | missing media file -> 410 |
| playlists | order kept; reorder; rename; unknown event -> 400 and nothing saved; delete keeps events | |
| queue reorder (frontend) | move up/down/drag indices | moving past the ends is a no-op |
