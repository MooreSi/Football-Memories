# 160: Complete tag metadata independently of video downloads

**Status:** Done
**Sensitive:** read-only tag discovery and metadata caching; safe-change applies.

## Problem / change
Streaming already attempts tag observation, but stops on the first payload and
unsynced sessions can hide all tags. Investigate the actual UI contract, collect
complete available tag metadata without full-media capture, retain labels even
when alignment is unknown, and expose honest completeness/alignment states.

## Must not change / non-goals
No invented sync offsets, guessed requests/IDs, auth/session persistence changes,
Hudl mutations or new full-match download. Existing tests unchanged. Keep highest
quality playback and bounded serial discovery, with access/challenge stops.

## Plan / verification
Inspect only served metadata keys/counts and the normal Tags UI, then write red
regressions for the observed contract and stream-only cache behavior. Check a
previously unopened match, verify cached tags and unchanged footage files, then
run both database suites/frontend/lint/types/build and update the handoff.

## Outcome / evidence
D-019 documents the observed native playback timing contract. Retained modern
Sportscode tags despite legacy false sync flag; legacy strict capture unchanged.
Tag observation waits for later responses. Metadata survives helper restart;
stream-only path cannot invoke capture/save_capture in regression tests. Fixed
native HLS first-action tag seek. UI explicitly separates metadata from export.

Red first: modern native ranges were omitted (4 failures), premature observation
missed the second response (1 failure), cached-state text absent (1 failure),
and native first-seek never loaded media (1 failure). All now green; pre-existing
tests unchanged. Backend 273 passed on SQLite and Postgres; frontend 101 passed;
ruff/format/mypy, TypeScript/build and schema drift checks clean. Docker rebuilt
and /api/health returned ok. One initial frontend run overlapped a backend run;
frontend was repeated after backend finished and passed independently.

Live read-only: native Hudl goal time matched raw milliseconds; app U11 Stoke
2,191 tags/66 codes, 1920x1080 readyState4 with advancing playback after goal
seek. Previously unopened U11 West Brom: 1,927 tags/65 codes, 1280x720 playback
and goal seek, no full-video capture. Both tag lists returned from /library after
helper restart while session_active=false. Ten MP4/CSV files and SHA-256 values
unchanged; no new footage. No raw response or roster fixture committed. Existing
empty CSV not rewritten. Clip export itself was not repeated in this repair.
