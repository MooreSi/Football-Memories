# 220: Details for Plex and other media players

**Status:** Shipped (2026-11-12)
**Sensitive:** YES: writes into the download folder, and Downloaded > Delete now
also moves the media library folder of that download to the Trash.
`/safe-change` governs. No Hudl requests change.

## What is wrong or missing today

Owner request 2026-11-12: matches, moments and reels will be watched through
Plex or other media players. Today the files carry no game details at all (only
ffmpeg's encoder tag), nothing sits beside them, and full matches are named
`hudl-<hash>-highest-1080p-....mp4`, so a media player shows a hash and no date,
teams, score or description.

## What changes

1. **Tags inside new files.** Every new full match, moment clip (each clip in a
   moments ZIP, or the combined video) and reel is written with MP4 tags:
   `title`, `date` (YYYY-MM-DD), `description`, `synopsis`, `genre`
   (Football), `artist` (the player), `album` (age group and season), `keywords`
   (tag codes) and `comment`. They are added by the ffmpeg step that already
   creates the file, before it is published; no finished file is rewritten.
   Plex reads these through Local Media Assets (MP4 only).
2. **Media library folder (opt-in).** A switch on Downloaded builds
   `<download folder>/Media library/`, one folder per download:
   - `<Name>/<Name>.mp4`: a **hard link** to the downloaded video (no extra
     disk space; the original is not moved, renamed or changed). `<Name>` is
     readable and sorts by date, e.g. `2026-07-12 Aston Villa vs. Cambridge
     United U11 - Full match`.
   - a moments ZIP is unpacked into its folder (one clip per moment; the ZIP is
     only read).
   - `poster.jpg`: the match's full-quality snapshot when the helper has one.
   - `<Name>.nfo` (one per video): Kodi movie format, read by Jellyfin, Emby,
     Kodi and Infuse. Plex ignores `.nfo`.
   Folder-per-video is what Plex and Jellyfin document; loose files sharing one
   folder do not get per-file posters reliably.
   It is kept up to date after each new download while the switch is on, and
   "Update" rebuilds missing pieces for existing downloads.
3. **Game details come from the app**: the page sends the fixture label
   ("Aston Villa vs. Cambridge United U11"), score (tagged or the owner's
   correction) and player name, which only the app database and the page know.
   The helper keeps the latest copy in its cache for later downloads.
4. **Delete** on Downloaded also moves that download's media library folder to
   the Trash (it is a derived copy; the dialog says so).

## What must NOT change

- Download folder, file names and "already downloaded" detection (golden rule 5).
- No existing video in the download folder is moved, renamed or rewritten.
- In `Media library/` the app replaces only `.nfo` files it wrote (listed in its
  manifest `Media library/.football-memories.json`); it never replaces a file
  it did not write, and never deletes anything there except through Delete.
- Media library is off until the owner turns it on.
- Existing tests pass unmodified.

## Non-goals

- Re-encoding or re-tagging videos downloaded before this change (it would
  rewrite library files). Their media library names, posters and `.nfo` carry
  the details instead.
- Plex-specific `.nfo` agents; official Hudl results.

## Open questions (and the provisional default in use)

See [owner decision 004](../../owner-decisions/004-media-library.md): whether
the media library should be on by default and where it lives. Provisional: off,
inside the download folder.

## Test plan

| Test | Asserts | Negative control |
|---|---|---|
| details from title + context | label, date, season, score, codes in title/plot/tags | title without a date gives no date tag |
| ffmpeg tags on exports/reels | probe shows title/date/genre | file made without tags shows none |
| sync builds folders | link shares the inode, poster, nfo XML parses; ZIP unpacked | original bytes and mtime unchanged |
| sync idempotent / safe | second run creates nothing; a foreign file with the same name is not replaced | |
| delete with media folder | folder in Trash with the video | another download's folder untouched |
| switch off | no folder created after a download | |
| page | switch, Update posts context | |

## Real-account check

None needed: metadata is local. Owner to try one folder in Plex (Other Videos,
Plex Personal Media agent, Local Media Assets on) and Jellyfin.

## Verification (filled in when shipped)
- [x] suite green: backend 429 (SQLite and Postgres), frontend 218, typecheck, build, ruff, mypy
- [x] no credential, cookie or token written to the repo, a log or a fixture
- [x] nothing on Hudl modified; no existing library file deleted or overwritten
  (checked on real data in a scratch folder with hard links of two real reels:
  real titles and 1920x1080 posters, originals' link count back to 1 afterwards)
- [x] real-account check: not needed. Not yet tried in Plex or Jellyfin; the
  media library has not been turned on in the owner's real folder.
- Five existing tests' fakes copy `export_from_segments`'s exact signature, so
  details reach it through a context variable instead of a new keyword; no test
  was edited.
