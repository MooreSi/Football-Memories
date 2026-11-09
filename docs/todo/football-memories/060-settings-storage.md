# 060: Settings: clip timing and storage health

**Status:** Building
**Brief:** section 9 (configurable pre/post buffer), 13 (download location checks:
existence, write permission, free space, accessibility), 22 (missing-file
detection, storage health). **Design:** reference 01 tiles and panels.
**Sensitive:** the storage check writes and immediately deletes one tiny probe
file in each folder; it never touches any other file. The inbox is mounted
read-only in Docker, so it correctly reports "not writable" there (and that is
fine: the app only reads it).

## What changes

- `GET/PUT /api/settings`: `clip_pre_s`, `clip_post_s` (0-60 s each), stored in
  `preferences`. **Defaults stay 8 s / 5 s** (golden rule 5).
- Every place that plays a moment uses the saved values (match page, Clip
  Explorer queue and cards, Player Hub feed, playlist total time).
- `GET /api/storage/health`: for the archive and the import folder: exists,
  readable, writable (archive only required), free/total space, status and
  plain-English messages; archive summary: indexed files, total size, and every
  indexed file that is missing on disk (with its match).
- UI `/settings` with tabs Playback / Storage / Connections.

## What must NOT change

Default timing (8/5), existing tests, the Connections page.

## Test plan

| Test | Asserts |
|---|---|
| settings defaults | 8 / 5 on a new archive |
| settings persist | survive an app restart |
| settings validation | negative or > 60 rejected (422), nothing saved |
| partial update | changing pre keeps post |
| playlist total time | uses the saved timing |
| health ok | both folders exist, archive writable, free > 0, no probe file left |
| health missing inbox | error with a message |
| health read-only archive | error: not writable (skipped when running as root) |
| missing media | listed with match id after the file is removed |
| frontend | clip window preview text; PUT body; storage error rendering |
