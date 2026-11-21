# 420: Exclude administrative labels from player detection

**Status:** Shipped
**Sensitive:** no

## What is wrong or missing today
Owner reports Period Start shown as a player. Two/three plain words are accepted
unless a small football vocabulary blocks them. Local metadata-only audit of 230
nonempty cached matches (406 distinct labels) finds eight administrative/set-piece
labels accepted. Goals already rejects analyst/coach/focus but other consumers do not.

## What changes
Shared player-name predicate rejects explicit period, analyst/coach clip/focus,
physical/technical/tactical focus and set-piece phrases, including plural/spacing
variants. Preserve real name spelling, existing football situations and clip tags.
Report confirmed observed labels separately from defensive variants.

## What must NOT change
Source metadata/footage, source access, actual roster names and existing tests.
No generic ban on Period/Start/Physical as individual name words.

## Non-goals
A verified roster or perfect name classification from arbitrary free-text labels.

## Test plan
Observed labels/variants rejected; genuine synthetic names including Start surname
still accepted; match player stats excludes administrative rows. Full gates before commit.

## Real-account check
Not needed; audit reads only existing local metadata, no account requests.

## Cached-label audit (read only)

| Label | Cached matches |
|---|---:|
| PERIOD START | 64 |
| ANALYST CLIP | 27 |
| ANALYST CLIPS | 17 |
| ANALYSTS FOCUS | 4 |
| COACH CLIP | 3 |
| YELLOW SET PIECE | 2 |
| PHYSICAL FOCUS | 1 |
| BIB SET PIECE | 1 |

Actual app predicate rejects all eight. Comparing every cached category before/after
changes candidate labels from 168 to 160, excluding exactly the eight above; these
are candidate labels, not a verified count of people. Analyst/coach/focus already
had an extra exclusion in goal inference, but other shared consumers did not.

## Verification
Frontend 680; backend 771 each SQLite/dedicated PostgreSQL. All lint/format/types/build/
schema checks pass. New tests observed red then green; existing assertions unchanged.
No real source requests, roster dumps or library changes.
