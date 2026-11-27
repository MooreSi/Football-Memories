# 820: Tag label census (do Hudl's tags carry pass outcomes?)

**Status:** Census taken 27 Nov 2026: no outcome labels (see connectors domain README)
**Sensitive:** yes (Hudl tag parsing and the tag cache). No new Hudl request: the census reads the
payloads the normal tag indexing already receives.

Owner (27 November 2026): "Yes, build it", for the read-only label count proposed after the pass
investigation (spec 810 follow-up).

## Why

The cache keeps only allowlisted action names (`hudl_actions._ALIASES`), so it cannot say whether
the coach's tags include outcomes ("Unsuccessful", "Pass ▶ Successful", "Possession lost"). Pass
success/lost figures depend on that.

## What changes

- Tag indexing (`_cache_tags`) stores `label_counts` per match: how often each tag label occurs.
  - Ordinary tags: the group (tag key) once per tag, and `GROUP ▶ VALUE` per value.
  - `HUDL_LABEL` values (`GROUP ▶ VALUE`): the full label, or the group alone when the value fails.
  - Never counted: `HUDL_CODE` values, and any value equal to one of the match's codes (player
    names).
- `safe_label`: at most 40 characters, letters/digits/space/`&'+()` only, no word over 20
  characters. URLs, tokens, long ids and free-text notes fail and leave only their group name.
- The cache re-checks every stored label and keeps at most 300, largest counts first.

## How the owner takes the census

1. Restart the helper so it loads this code (it runs from the shared checkout's working tree).
2. Make one match due for indexing again (drop `tag_status` from its cache file; moments stay until
   rewritten), then Refresh Hudl in the app. Only matches without `tag_status` are re-read, at the
   existing pace, through the normal playback page.
3. Read `label_counts` from that match's cache file. Newly indexed matches get counts anyway.

## Tests (synthetic, network blocked)

`tests/connectors/test_hudl_label_census.py`: counts across moments; a planted URL token, a player
name, a 60-character note and a 36-character id never enter counts or the cache file (with negative
controls); other videos ignored; cache cleaning and cap; `_sync_tags` stores counts end to end.
