# 240: Drawing board on the match video

**Status:** Shipped (main, deployed 2026-11-13)
**Sensitive:** no. Draws over the app's own stream; stores vector drawings in
`preferences` (spec 230 notes). No Hudl request, credential or library file.

Owner request 2026-11-13: a drawing button under the video, above the match
insights, in the space that is already there (nothing resized); professional,
stylish drawing tools; download a screenshot of the drawing; save the drawing.

## What changes

1. **Toolbar row under the video** (above Match insights), always there while
   the stream plays: *Draw on video* (the frame now on screen), *Note / draw on
   <moment>* (as before, when a moment is chosen), *Screenshot* (PNG of the frame
   with whatever drawing is showing), and the count of saved drawings with a
   jump to each.
2. **Tools**: pen (smoothed freehand), arrow, dashed arrow (run without the
   ball), curved arrow (bends through the swoop you drew), line, spotlight
   (glowing ring under a player), zone (shaded area), text label, numbered
   player marker, eraser (click a mark). Six colours, three widths, undo, redo,
   clear. Keys: P A R C L S Z T M E, Cmd/Ctrl+Z, Shift+Cmd/Ctrl+Z, Esc.
3. **Saved as data, not pixels**: each drawing is the list of marks in 0..1
   frame coordinates, saved with the note (`note:<sha>` in `preferences`).
   A drawing on a tagged moment keys on the moment id (unchanged); a drawing on
   any other frame keys on `frame:<match id>:<seconds>`. Backups carry them; they
   replay over the video at their time and redraw sharp at any size.
4. **Screenshot**: the video frame (letterboxed exactly as shown) plus the marks
   and note, drawn to a 1920x1080 PNG and downloaded as
   `<match title> <mm-ss> drawing.png`. If the browser refuses to read the frame,
   the PNG keeps the drawing over a plain background and says so.

## What must NOT change

- Existing notes (arrow/line, colour only) load and save byte-for-byte as before.
- The video size and the page layout above and below the toolbar.
- Existing tests pass unmodified.

## Why data and not Hudl metadata or a burnt-in image

Hudl must not be changed (golden rules), so nothing is written there. A PNG
alone cannot be edited or replayed; vector marks can, and they are tiny. The PNG
is an export of the saved data, not the record.

## Test plan

| Test | Asserts | Negative control |
|---|---|---|
| shapes API (py) | every new kind round-trips; old arrows unchanged | pen <2 points, points out of 0..1, >400 points, text without label, width 4, unknown kind: 422 |
| drawing geometry (ts) | arrow head at the end, dashed, curve through swoop, pen smoothing, spotlight, zone normalised, marker, label escaped | zero-length drags dropped |
| frame ids / file name (ts) | frame key per match and time, safe file name | moment notes keep their id |
| toolbar (vitest) | Draw saves a frame drawing at the paused time; eraser removes; undo/redo | moment note body unchanged |

## Verification (filled in when shipped)
- [x] suite green: backend 464 (SQLite) and 464 (Postgres); frontend 324; ruff, mypy, alembic, typecheck, build clean
- [x] browser check through the stand-in helper and a scratch SQLite backend: all tools, save, reload, PNG from poster and from a playing frame, phone width
- [ ] real Hudl stream: not tried
- [x] deployed: Docker rebuilt 2026-11-13, health ok, served bundle and API schema checked
