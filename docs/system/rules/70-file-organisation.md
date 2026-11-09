# File organisation: how to split a big file

## The decision: package directories, not sibling files

When a module outgrows the **800-line** ceiling, it becomes a package
directory in the same location, keeping its import path:

```
services/downloads/hls.py            (900 lines)
        ↓
services/downloads/hls/
    __init__.py        the public names only
    _playlist.py       parse master/media playlists
    _segments.py       fetch + reassemble
    _verify.py         post-download checks
```

`from clip_recorder.services.downloads.hls import download` keeps working. No
caller or test changes.

### Why not `hls_playlist.py` next to `hls.py`

| | package directory | sibling files |
|---|---|---|
| Import path | unchanged | every caller edits |
| Where the pieces live | one obvious place | scattered alphabetically |
| Which file is the entry point | `__init__.py`, always | you have to know |

## The precondition: do not split untested code

**A split is only safe when tests can tell you it worked.** If the file has no
tests, writing them is the task. Say so and stop. The line ceiling is a
code-health heuristic; it does not outrank "can we tell if this broke".

This binds hardest on `hudl/` and `services/auth/`: a split there with no
tests is surgery on the login path with no way to see a mistake.

## Procedure

1. Confirm tests exist and pass. If not, stop (see above).
2. Check for module-level state (caches, singletons, a configured session).
   It must end up in exactly one place, or every importer gets its own copy.
3. Move code verbatim. No renames, no "while I'm here" fixes.
4. Check each moved function can still see the imports and constants it used.
   A verbatim move takes the body and leaves module-level names behind; nothing
   fails until that line runs.
5. Run the suite. Commit the split on its own, with no behaviour change.
