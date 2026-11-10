# 003: How fast may the app index tag metadata for every Hudl match?

**Status:** open (feature requested by the owner 2026-11-10; pacing is provisional)
**Raised by:** player-tags/storage session, 2026-11-10

## The question

The owner asked that a player's page list every match where they are tagged,
and that each newly uploaded match records its tag metadata automatically (not
the video). That needs the helper to open each match's normal Hudl playback
page once. How fast may it go through a large library (286 videos today)?

## Why it matters

Golden rule 3: a client Hudl would not notice. A first sweep is roughly one
page per match; after that only new matches are visited.

## Provisional default in use

- Runs after each Test/Refresh, and from "Index remaining matches" on the
  player page. Opening the app (owner request, D-023) re-reads the match list
  when it is over 6 hours old, otherwise indexes matches still lacking tags.
  No server background sync; nothing runs on a timer.
- One match at a time, about 2.5 s pause after each page settles.
- A video whose page or tags cannot be read is saved as unavailable (with the
  reason) and skipped for 7 days. Sign-in or 401/403/429 refusals stop at once;
  five failures in a row stop the sweep (D-024).
- Any user action (stream, download, refresh) pauses the sweep immediately.
- Read-only: metadata and tag ranges only, never video, never changes Hudl.

## What changes if the answer differs

The pause and failure limit live in `BrowserConnection._sync_tags`
(`backend/app/connectors/hudl_browser.py`). A slower answer only means the
first sweep takes longer.

ANSWER:
