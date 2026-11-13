# 230: Match insights, player journey, notes, alerts and continue watching

**Status:** Shipped (main, deployed 2026-11-13)
**Sensitive:** no. Reads the helper's existing tag cache only; no Hudl request,
credential, session or library file changes. Batch selection by code (helper)
changes comparison only.

Owner request 2026-11-13, after the metadata research report. Eleven items.

## What is wrong or missing today

- The same code arrives in several spellings ("REGROUPING &amp; COMPACTNESS" /
  "REGROUPING & COMPACTNESS", "CHRIS DEMO" / "Chris Demo"), so counts split.
- Possession is shown as a count of possession tags, not time on the ball.
- Moment durations, timing and overlaps are unused: no momentum, no
  "what was he involved in", no partnerships weighted by shared moments, no
  season-by-season development, no attacking phases.
- No head-to-head record, no notes on clips, no shareable report, no
  new-footage alerts, no continue watching.

## What changes

1. **Tag spellings merged** where the helper reads its cache
   (`hudl_metadata.canonical_code`): HTML entities decoded, whitespace
   collapsed, upper case. Files on disk stay verbatim; every consumer
   (library, exports, batch by code) sees one spelling. Player hub matching
   is case-insensitive so a hub named "Chris Demo" still finds its tags.
2. **Possession %** from summed possession durations (ours / theirs /
   contested), per match and for the selected age group/season.
   The count radar keeps its possession point for now (an existing test pins
   it); owner question 005.
3. **Momentum timeline** on the Hudl match page: per-minute bars, ours above,
   theirs below (attacking-third entry 1, penalty-area entry 2, chance 3,
   goal 5), halves split at END HALF, goals marked; clicking a minute seeks
   the stream to its first weighted moment.
4. **Involvement**: player moments overlapping situation codes, grouped as
   attacking / defending / set pieces / other, worded "during".
5. **Journey**: per season, moments per match and attacking vs defending
   share, charted on the player hub.
6. **Partnerships**: other player codes ranked by overlapping moments and
   matches together.
7. **Head-to-head**: record against the opponent on the match page
   (W/D/L, goals for/against, last meeting) and an Opponents page.
8. **Phases of play**: our possession ranges that contain a chance or goal,
   using the possession tag's real id so Play Tagged, downloads and reels work
   unchanged. Filter "with this player".
9. **Clip notes and drawings**: text note plus arrows/lines drawn over the
   video at a moment, shown when that moment plays. Stored in `preferences`
   (`note:<sha of moment id>`), so backups include them with no schema change.
10. **Shareable report**: match or season summary as an image (PNG, drawn as
    SVG in the browser) or Print / Save as PDF.
11. **Alerts**: header bell lists new matches and new moments of the primary
    player since last read; snapshot kept in `preferences` (`alerts_seen`).
    The first run records the current library silently.
12. **Continue watching**: stream position per Hudl match saved every 10s
    (`watch:<sha>`), Library row of unfinished matches, resume via `?t=`.

## What must NOT change

- Cache files on disk, moment ids, export file naming, download index.
- Score from tags (spec 210) and corrections; backups restore older files.
- No new dependency (front or back). No new Hudl request.
- Existing tests pass unmodified.

## Non-goals

- Merging duplicate spellings in locally imported tag CSVs (backend `events`).
- Browser/OS push notifications (in-app bell only).
- Proving who made an action: overlap only, labelled "during".

## Open questions (provisional default)

- Momentum weights above are a choice, not Hudl's; shown in a footnote.
- Upper case for merged spellings (the majority form in the cache).

## Test plan

| Test | Asserts | Negative control |
|---|---|---|
| canonical_code (py) | entity/space/case variants -> one code | distinct codes stay distinct |
| /library + batch by code | mixed spellings served and selected as one | untouched file content |
| possession (ts) | duration sums, % per side, contested apart | count-heavy short tags do not win |
| momentum (ts) | buckets, half split, weights, seek target | no codes -> empty |
| involvement/partners/journey (ts) | overlap counts, grouping, seasons | non-overlapping moments not counted |
| phases (ts) | possession containing chance becomes a phase | possession without chance is not |
| headToHead (ts) | W/D/L, GF/GA, last meeting | unscored matches not counted as draws |
| notes/watch/alerts API (py) | stored, replaced, cleared, survives restart, hashed keys | invalid bodies 422, other prefs untouched |
| alerts diff (ts) | new matches and new player moments | first run is silent |
| pages (vitest) | panels render real numbers; click seeks | no data -> no panel |

## Real-account check

None needed. Every feature reads the existing cache; streaming and downloads
are unchanged.

## Verification (filled in when shipped)
- [x] suite green: backend 461 (SQLite) and 461 (Postgres); frontend all passing; ruff, mypy, typecheck, build clean
- [x] no credential, cookie or token written
- [x] nothing on Hudl modified; no library file deleted or overwritten
- [x] browser check on real cached data through a stand-in helper (see PROGRESS)
- [ ] notes editor and momentum seek over a real stream: not done
- [x] deployed: Docker rebuilt, helper restarted 2026-11-13
