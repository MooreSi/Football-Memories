# 260: Veo matches in the Library, playback and download

**Status:** Building (task 1)
**Sensitive:** YES: requests to Veo and its video CDN (tasks 2-4), files written to the
library (task 3). `/safe-change` governs. Authorized by owner decision 006 / D-035
(scope: list, metadata, stream, download, as Hudl).

Follows [250](250-veo-connection.md) (phase 1: account, Test, Refresh, cache in
`.veo-account/library.json`). Owner request 2026-11-13: "build the other phases".

## What is missing today

Refresh reads the owner's Veo matches (284 in 3 clubs, 56 with video) into the
helper's cache, but nothing in the app shows them, plays them or saves them.

## What changes, in four tasks

1. **Library and match page (no Veo contact).** `useVeoLibrary` reads
   `/veo/library`. All matches gets a "Connected Veo" section like Connected Hudl
   (same filters, cards with an expiry badge), hidden when Settings has Show Veo
   off. `/veo/:id` shows one Veo match: title, score, home/away, halves, expiry,
   and Veo's highlights by type. No player and no download button until task 2/3
   land (no control that does nothing).
2. **Watch (needs the CDN check below).** A `watch` action signs in once, reads
   `matches/<slug>/videos/` for that match (JSON only, no match page, no view),
   and keeps the video URL in memory. The helper serves `/veo/stream/<random>`
   with HTTP Range passed through `_client` (the only module that talks to
   Veo), so the browser's `<video>` seeks. Highlights seek the player.
3. **Download the full match.** Same URL; write `<name>.mp4.part`, verify the byte
   length against Content-Length and the ffprobe duration against Veo's, then
   rename. Never overwrite: an existing file is skipped. Listed in Downloads.
4. **Highlight clips.** ffmpeg cuts chosen highlights from the downloaded file
   (separate files or one video), like Hudl moments.

## What must NOT change

- Hudl: its routes, library, tag sync, player hub and insights. Veo items are not
  mixed into `/library`: Veo highlight tags (GOAL, SHOT...) are event types, and
  the Hudl pages read codes as player names.
- The download folder, Hudl file names and "already downloaded" logic.
- `_client` stays the only Veo module that imports a browser or HTTP library; GET
  only; API reads 1 s apart; one sign-in; no retries.
- The video URL and sign-in header stay in memory; neither is written to the
  cache, a log or a message.

## Non-goals

- Veo matches in insights, player hub, opponents or reports (needs owner
  decision 007: Veo has no player tags).
- Veo's paid "match events" API (`/api/mes/`), which needs another token.
- Expired recordings: listed with their details only; Veo no longer has the video.

## Open questions (provisional default in use)

- **Does c.veocdn.com need the sign-in?** Unknown. Task 2 starts with an
  owner-approved, read-only check of one active match: read its `/videos/` JSON
  and request the first 1 KB of the MP4 with and without the header. Prints
  statuses and header names only.
- **Veo file names.** Default `veo-<date>-<title>-<height>p.mp4` beside Hudl's.

## Test plan

| Test | Asserts | Negative control |
|---|---|---|
| Veo library hook/section | cards from `/veo/library`, filters, expiry badge, hidden by Show Veo off | Hudl section unchanged |
| Veo match page | score, halves, highlights grouped by type; no player or download control | unknown id says not found |
| stream route (task 2) | Range passed through, 206 + Content-Range; unknown id 404 | URL never in a response or log |
| download (task 3) | `.part` then rename; short or wrong-length file stays `.part`; existing file untouched | seeded file byte-identical |

## Real-account check

Task 1: none (owner runs Refresh matches to fill the cache). Tasks 2-3: owner-approved
check above, then the owner plays one match and downloads one.

## Verification (filled in when shipped)

- [x] task 1: suite green (frontend 343, backend unchanged); browser-checked on a
  synthetic stand-in helper, desktop and 375px, no horizontal scroll
- [x] task 1: no credential, cookie, token or video URL written anywhere (no Veo contact)
- [x] task 1: nothing on Hudl or Veo modified; no library file touched
- [ ] tasks 2-4: not built; real-account check not done
