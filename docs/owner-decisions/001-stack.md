# 001: Which stack does the app use?

**Status:** answered 2026-11-09 (by the owner's brief, docs/BRIEF.md section 3)
**Raised by:** repo setup, 2026-11-09

## The question

Language, how Hudl is driven (plain HTTP vs browser automation), how video is
fetched, and whether there is a UI beyond a CLI.

## Why it matters

The rules in `docs/system/rules/` are written stack-neutral where possible,
but `/test`, `/verify` and the architecture file name concrete commands and
directories. Those need one answer.

## Provisional default in use

Python 3 in a project `.venv`, pytest for tests, matching the owner's other
projects. The commands in CLAUDE.md and the skills assume this. Nothing is
installed yet: no `pyproject.toml`, no `.venv`, no code.

Login flow and video fetching tools are **not** chosen. Pick them in a spec
after inspecting how Hudl actually serves login and video for this account,
and record the choice here.

## What changes if the answer differs

CLAUDE.md "Before you commit", `/verify`, `/test` (runner commands and fixture
examples) and `rules/30-architecture.md` are updated in the same change.

ANSWER:
React + TypeScript + Vite + Tailwind front end; Python 3.12+ FastAPI +
SQLAlchemy + Alembic + PostgreSQL back end; FFmpeg; Docker Compose. Recorded in
docs/DECISIONS.md D-001.
