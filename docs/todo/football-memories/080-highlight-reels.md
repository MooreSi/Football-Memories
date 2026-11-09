# 080: Highlight reels (compilations) with per-clip trims

**Status:** Shipped 2026-11-09 (branch highlight-reels)
**Brief:** sections 17 (adjust start/end, export MP4, quality tradeoffs, never
overwrite source) and 18 (select, reorder, preview, opening/ending titles,
transitions where practical, export via FFmpeg); section 9 per-clip buffer
override; "persistent database-backed jobs with retry and recovery".
**Sensitive:** writes new files only under `Compilations/`; never reads beyond
the archive, never changes a source video.

## Decisions

- **Title cards are drawn by the browser** (canvas, the app's own fonts and
  colours) and uploaded as PNG. The Homebrew ffmpeg on the owner's Mac has no
  text rendering (no libfreetype), the Docker one does; drawing in the browser
  works identically everywhere. The server re-encodes the PNG through ffmpeg
  (validation, fixed size).
- **Quality:** every clip is re-encoded once (H.264 CRF 18, AAC 48 kHz stereo)
  so clips from different matches join cleanly; stream copy cannot join
  different sources or cut on exact frames. Output height = the tallest source
  in the reel (no upscaling, no downscaling), 16:9 frame, other sources fitted
  with black bars. Frame rate = the highest source rate (max 60).
- **Transitions:** a short fade through black at each cut (0.25 s). Crossfades
  are a later improvement.
- **Jobs:** status draft / queued / rendering / done / failed with progress,
  stored in the database; one background worker; on start, a reel left
  `rendering` by a crash goes back to `queued` and renders again. A failed
  render leaves no partial file and keeps the previous good output.

## Test plan

| Test | Asserts |
|---|---|
| create | items in order; windows from settings; per-item pre/post override; unknown moment 400 |
| render | output in Compilations/, duration = sum of windows (+ 3 s per card), height = tallest source, has audio, sources unchanged |
| silent source | a clip whose source has no audio still renders (silence added) |
| failure | missing source -> failed with message, no partial file, previous output kept |
| recovery | `rendering` -> `queued` on startup |
| editing while rendering | 409 |
| re-render | replaces the previous output (one file) |
| video | Range 206; download as attachment |
| delete | removes reel, output and cards; sources untouched |
| cards | non-image 400; image stored at fixed size |
