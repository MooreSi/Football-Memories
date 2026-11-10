# 180: Consistent library, clips and memories

**Status:** Shipped
**Sensitive:** Hudl metadata scope and new download names; safe-change applies.

## Changes / test plan
- Split over-limit browser module into a package without behavior changes first;
  relocate only mock patch targets, preserving every existing assertion.
- Index only selected age, preserving served memberships, pacing and access stops.
- Remove Library team selector; persist age/season; avoid misleading empty offline
  gap when connected matches exist. Red UI tests for persistence and controls.
- Reference 02 Clips: one heading/workspace, secondary saved-clips/playlist tools,
  no duplicate players; every existing filter/queue/reel feature remains.
- Reference 03 timeline: one chronological season/month stream, compact match
  summaries and expandable moments, consistent offline/Hudl cards.
- New attachments: match + Home/Away + ISO match date, and match + player/type +
  date for clips. Distinct ordinal per ZIP clip. Sanitize every component, no
  overwrite; stable capture lookup still reuses old hashed downloads.
- Check associated bugs within these flows; no unrelated architecture changes.

## Must not change / non-goals
No footage deletion or old-file rename, auth/session policy, quality reduction,
new dependencies, invented match dates, roster attribution or broader retry rate.
Tests use synthetic fixtures with network blocked. No bulk match/video download.

## Verification
Run backend SQLite/Postgres sequentially, frontend, lint/types/build/schema;
check desktop/375px against refs, restart Docker/helper, commit/push checkpoints.

## Outcome / verification
- Behavior-preserving package split checkpoint afa6680 pushed separately; public
  imports unchanged, existing assertions preserved (only mock paths relocated).
- Red regressions covered wrong-age queue/empty scope, premature duration,
  naming/ZIP members/download URLs, Library control/persistence/empty gap,
  secondary Clips workspace, long timeline expansion and progressive match list.
- Backend 318 passed SQLite and Postgres sequentially; frontend 146 passed;
  ruff/format/mypy/schema/types/build green. Docker/helper restarted. Existing
  Vite chunk >500kB warning and jsdom media stubs remain non-failing warnings.
- Live read-only U11 indexing completed 87 checks, not all 286 videos: 57
  tagged matches / 28 without tags / 2 invalid tag timelines, 74,260 ranges.
  Invalid timings remain unavailable, with their explicit reason and weekly retry.
- Live goal export fetched covering segments only; ZIP member friendly fixture /
  type / ordinal / 2026-11-08 name, H.264 1920x1080, 26.04s. 21,178,316-byte
  attachment saved to Downloads with identical SHA-256. No full-match download.
- Library restores U11 + 2026/27 after reload; Teams removed, no offline gap.
  Clips and player timeline checked desktop and 375px, overflow repaired in chart
  and match grids. Screenshots private in ignored data/.ui-review; no roster
  fixture committed. All seven pre-existing archive files retain checksums.
- Full new-match capture was not repeated; preserved stable identity/reuse tests
  cover that path. Unknown imported venue is labelled unknown rather than guessed.
