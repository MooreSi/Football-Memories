# 008: Where grassroots club crests come from

**Status:** open
**Raised by:** owner follow-ups session, 2026-11-13

## The question

Most Veo opponents are grassroots clubs. The app finds crests on Wikipedia only
(plus two official club images), which covers professional and some semi-pro clubs
("Solihull Moors CB" now finds Solihull Moors F.C.). Grassroots clubs are mostly on
FA Full-Time, Pitchero, club websites or social media. Should the app look crests up
on any of those automatically, and which?

## Provisional default in use

Wikipedia lookups (now ignoring a side code or colour after the club name, e.g.
"CB", "Reds"), plus **Settings > Connections > Club crests**, where the owner adds a
crest image for any club; every side of the club shares it. No other site is
contacted.

## What changes if the answer differs

A named source gets its own paced, cached lookup next to Wikipedia in
`backend/app/services/team_logos.py`, after checking that site's terms allow it.
