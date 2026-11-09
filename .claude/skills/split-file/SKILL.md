---
name: split-file
description: Break a file over 800 lines into a package directory without changing its import path. Use when a file passes 800 lines, when asked to "split this up", "break this file down", or when a module has become hard to navigate.
---

# Splitting a big file

Full rationale in `docs/system/rules/70-file-organisation.md`. This is the
procedure.

## The decision, already made

A file that outgrows 800 lines becomes **a package directory in the same
place, keeping its import path**. `__init__.py` holds only the public names;
the pieces are `_private.py` modules. Not sibling files.

## 1. Is it tested?

**A split is only safe when tests can tell you it worked.** If the file has no
tests, writing them is the task: say so and stop. This binds hardest on
`hudl/` and `services/auth/`.

## 2. Check for module-level state

Caches, a shared HTTP/browser session, a configured logger, a throttle's token
bucket. Each must end up in exactly one module. Two copies of a throttle means
twice the request rate, silently.

## 3. Move verbatim

No renames, no fixes, no reformatting. The diff should read as pure moves.

## 4. Check moved code can still see its names

A verbatim move takes the body and leaves module-level imports and constants
behind. Nothing fails until that exact line runs. Check every moved function's
free names resolve in its new module, and run the module's tests.

## 5. Verify and commit alone

`/verify`, then commit the split on its own with no behaviour change. Say so in
the message.
