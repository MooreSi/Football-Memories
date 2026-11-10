# 190: Owner request batch (2026-11-10)

Sixteen owner requests, delivered in phases. Each phase is committed and
pushed on its own. Status lives in PROGRESS.md; this file is the contract.

## A. Tidy-ups

1. **Settings > Connections**: remove the video player and "Available
   matches" list from the Hudl panel (both live on Library/Clips). The Hudl
   panel sits alongside "Import from folder" (two columns on wide screens).
2. **Player card**: "TM" is replaced by a headline row: moment count with the
   word "Moments" under it, and to the right the number of games played
   (matches the player is tagged in, imported + Hudl).
3. **My Player > Teams > Edit**: new "Plays for" field (club). Saving it shows
   that club's crest on the player card (existing crest lookup,
   `/api/team-logo`). New "Card style" choice: Classic, Gold, Silver, Bronze,
   Emerald, Midnight, Sunset gradient. Styles are crisp CSS gradients with a
   foil sheen; no blurred imagery behind text.
4. **Library hero**: both club crests top left of the snapshot.

## B. Downloads

5. **Moment exports go to `<download folder>/moments/`**, separate from the
   inbox's full matches. Existing files are not moved (golden rule 4). Full
   matches keep their location.
6. **Download index** in the helper cache (`downloads-index.json`): match id,
   title, kind (match / moments / reel), file, size, moment count, codes,
   created time. Only entries whose file still exists are served.
7. **"Downloaded" nav tab** next to Clips: every downloaded match and moment
   file with its metadata and a download link.
8. **Library badges**: each Hudl match card shows icons for "full match
   downloaded" and "moments downloaded".

## C. Picture quality

9. The match page poster and Library snapshots use a full-resolution frame
   grabbed from the highest-quality stream once it has been prepared, instead
   of Hudl's small thumbnail. Until a match is first streamed, the thumbnail
   is shown at its natural aspect ratio (no stretching).

## D. Branding

10. New wordmark and crest-style logo; the header banner spans the full width.

## E. Highlight reels from Hudl and batch download

11. Clips > Tagged moments & players gets **Make Highlight Reel**, opening a
    reel studio with the chosen moments. The duplicate "Saved clips &
    playlists" explorer is removed from Clips; saved reels stay reachable.
12. **Batch download** under Clips: pick matches (filtered by age/season) and
    a player or code; the helper exports each match in turn (paced, one at a
    time) to `moments/`, as a ZIP per match, an MP4 per match, or straight
    into one highlight reel with an opening card per match.
13. **Reel card styles** with animation (opening and closing): several themes;
    cards are animated canvases recorded in the browser and encoded into the
    reel by the helper. Opening cards auto-fill opponent, both crests and the
    UK date (e.g. 8 November 2026).

## F. Install and update

14. `Install Football Memories.command` (macOS) and
    `Install Football Memories.bat` (Windows): check for Docker Desktop and
    install it if missing (Homebrew cask or the official installer on macOS,
    winget or the official installer on Windows), create `.env`, start the
    stack, wait for health, open the app. macOS also installs the host helper
    dependencies (uv, ffmpeg, Playwright Chromium). Both marked executable in
    git.
15. **Settings > Update**: compares the running commit with the newest commit
    on GitHub `main`; the header flashes "Update available"; Update pulls and
    rebuilds through the host helper (the Docker container cannot rebuild
    itself).

## Safety notes

- No change to how credentials are stored or sent.
- Batch export reuses the existing stream/segment path: one Hudl page at a
  time, pause between matches, stops on any access refusal.
- Nothing existing is moved, deleted or overwritten.
