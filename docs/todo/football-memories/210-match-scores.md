# 210: Match scores from tags, with corrections

Owner request 2026-11-12: show each match's score. Hudl's library data has no
result; the coaches' tags do. Measured on the owner's cache: 139 of 286
matches use the "ASTON VILLA GOAL" / "OPPOSITION GOAL" scheme, no goal tagged
twice within 20 s, 71% of goal tags followed by the other side's kick-off.

## Behaviour

- **Tagged score:** the "Goal" axis of `teamProfile` (our club's prefixes vs
  OPPOSITION/OPP). Shown only when the match has at least one goal tag; a match
  with no goal tags shows no score (it may be untagged, not 0-0).
- **Correction:** the owner can set the score on the match page; it wins over
  the tags everywhere and is labelled "Corrected". Clearing it returns to the
  tagged score. Stored server side in `preferences` (`score:<hudl match id>` =
  `ours-theirs`), so it is in backups; no migration, so older backups still
  restore.
- **Where:** Library hero crest pill, Latest/Selected match panel (in place of
  "vs"), match page header (with the editor). Always labelled "From tags" or
  "Corrected" so it never reads as an official result (DESIGN.md: no invented
  data).

## Not in scope

Official results from Hudl (would need read-only research on the real account,
owner's call). Imported (offline) matches: they carry their own tags in the
database; not scored yet.
