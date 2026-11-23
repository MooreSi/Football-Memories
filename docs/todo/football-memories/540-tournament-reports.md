# 540: Tournament reports

**Status:** Shipped
**Sensitive:** no

## What is missing
Tournament squad stats have no event report to review, print or share.

## What changes
An action inside the expanded tournament opens a dedicated report, with all squads
or one selected squad. Include played/W/D/L, GF/GA/GD, clean sheets, win rate,
score coverage, squad breakdown and every result. Reuse the existing report card,
image export and print/PDF flow. Keep unassigned games in a separate review list;
their results cannot contribute to an entered squad or combined squad totals.

## What must NOT change
Original Library cards/layout, automatic/manual assignments, source score orientation,
connection permissions and unknown-versus-zero scores. Read cached metadata only;
no source refresh/index/stream, schema change or dependencies. Existing tests unchanged.
Follows reference 01 panels and existing shareable match/season reports.

## Non-goals
No invented standings, tournament winner, player attribution or match durations.

## Open questions
None: report scope is full event membership, independent of Library filters.

## Test plan
| Test | Asserts | Negative control |
|---|---|---|
| Mixed sources | Qualified keys, known 0-0, WDL/GF/GA, coverage | Same bare ID, outside match, duplicate row |
| Squad scope | One squad only | Other squad and unassigned excluded |
| Unknown metadata | Every linked game retained, no invented result | Known zero included |
| Report page | Event/squad navigation, shared rename, error/missing states | Unrelated games absent |
| Layout | Long event name wraps; export/print controls | Phone viewport overflow check |

## Real-account check
None needed. Synthetic metadata and temporary tournament API for browser checks.

## Verification
SQLite 825 passed (69.11s); PostgreSQL 825 passed (127.74s). Ruff lint/format,
mypy and Alembic no drift pass. Frontend778 passed in156 files (36.73s); typecheck/build pass. New report/link/data
cases observed red before implementation; additional missing/deleted metadata controls.
No existing tests changed. Chromium desktop1440/phone375 no horizontal overflow;
actual PNG saved at1080x2248, embedded crest verified. Native Safari saved PDF checked
by rasterizing all pages; initial SVG page split and blank-page layout fixed. Final
sample is one clean text page. Fixtures are synthetic; no real source operation.

Released main `dfd84ec`: normal updater, all four hosted libraries and local frontend.
Health/nginx/routes/served report assets verified, exactly14 intended containers changed;
all database/local backend/helper/other container IDs and update preferences preserved.
Deployment details in HANDOFF/PROGRESS; final record is docs-only.
