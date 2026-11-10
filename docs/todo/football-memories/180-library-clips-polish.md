# 180: Consistent library, clips and memories

**Status:** Building
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
