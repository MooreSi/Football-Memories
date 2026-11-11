# 200: One highlight reel per match

**Status:** Shipped (not yet run against the real account)
**Sensitive:** no new surface. Hudl requests are unchanged (the same one-match-at-a-time
batch with the 2.5 s pause); the change only writes new files into `reels/` and
never deletes, moves or overwrites a library file.

## What is wrong or missing today

Batch download offers "One highlight reel": every selected match, with animated
title cards, joined into a single MP4. The owner (2026-11-11) also wants the same
format with each selected match saved as its own file.

## What changes

- Batch download gets a fourth "Save as" tile, **One reel per match**, which opens
  the Reel Studio in per-match mode.
- The Reel Studio gets a **Save as** switch: *One reel* / *One reel per match*.
  In per-match mode there is no opening card (each file's match card opens it);
  the match card and the closing card work as before and are used in every file.
- `POST /account/batch` accepts `reel.per_match: true`. The helper fetches each
  match in turn (same pacing) and, after each one, assembles
  `[match card] + moments + [closing card]` into
  `reels/<reel name> - <match title> (<random>).mp4`, verified the same way as a
  single reel, and records it in the download index as a `reel` for that match.
- When it finishes the status says how many reels were saved and points to
  Downloaded; there is no single "Save reel" file.

## What must NOT change

- `reel` without `per_match` (or `per_match: false`) behaves exactly as before:
  one file, same naming, same index entry. Existing tests pass unmodified.
- Files are written beside existing ones with a random suffix; nothing is
  overwritten. A reel is linked into place only after it probes as H.264 at the
  expected size.
- Uploaded cards are discarded after the batch, success or failure.

## Non-goals

- Per-file opening cards or per-file custom names.
- Bundling the per-match reels into a ZIP.

## Open questions (and the provisional default in use)

- Opening card in per-match files: **dropped** (the match card does that job).
- File name: **`<reel name> - <match title>`**, in `reels/`.
- If match 3 of 5 fails, reels 1 and 2 are kept (each is complete and verified)
  and the error is reported; the batch stops, as other batches do.

## Test plan

| Test | Asserts | Negative control |
|---|---|---|
| `test_batch_per_match_reels_saves_one_verified_reel_per_match` | two files in `reels/`, each with its own card + clip + closing card duration, two `reel` index entries with one match each, cards discarded, no scratch left | the existing single-reel test still produces one file for the same inputs |
| `ReelStudioPage` per-match test | switch sends `per_match: true`, no opening card upload, match + closing cards uploaded | default mode test still sends one reel with an opening card |
| `BatchDownload` per-match tile | opens the studio with `per_match: true` in state | existing reel tile test unchanged |

## Real-account check

Owner-run, read-only: in Clips > Batch download pick a player with two matches,
choose One reel per match, make it, and check two files appear in Downloaded.

## Verification (filled in when shipped)
- [x] suite green: backend 367 SQLite + 367 Postgres, frontend 197
- [x] no credential, cookie or token written to the repo, a log or a fixture
- [x] nothing on Hudl modified; no existing library file deleted or overwritten
  (the test keeps an owner file in `reels/` and checks it is byte-identical)
- [ ] real-account check: not done (helper needs a restart onto this code first)
