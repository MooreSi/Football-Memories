# 008: Where grassroots club crests come from

**Status:** partly answered (2026-11-13); Junior Grassroots Hub added (2026-11-23)
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

## Owner's answer so far (2026-11-13)

"Do a better job of searching for grassroots football crests, for example I searched
for norton lindsay fc and found the crest straight away."

What was built: after the exact Wikipedia titles, Wikipedia's own search and
Wikimedia Commons crest files are tried (both allow automated reads, paced 1 s; only
a result naming exactly this club, with a crest/logo/badge or FC image, is used).
Settings > Connections > Club crests now opens an image search for the club in the
owner's browser and takes a pasted or dropped crest.

Still open: the owner found the crest with a web search. Google's terms forbid
automated searches and there is no keyless image-search API that allows it, so the
app does not search Google, FA Full-Time, Pitchero or social media by itself. A
paid search API (owner's key) or a named site whose terms allow reading would be
the next step; the owner decides.

## Junior Grassroots Hub (2026-11-23)

Owner request: look grassroots crests up on https://www.juniorgrassrootshub.com.
Its terms (section 7) forbid scraping or systematic extraction "without written
consent"; robots.txt allows ordinary pages and blocks `/api/`. The agent stopped
and said so. **The owner then stated in chat that they have obtained the site's
consent** ("i have obtained consent so you can do it"). The consent itself is held
by the owner, not in this repo.

What is read, and nothing else: the clubs sitemap (once a day), one club page per
club that matches, and that page's crest image on the site's own storage
(`partner-images/clubs/`). Never `/api/`. Paced one request every 2 s to the site.
If the consent is withdrawn, remove `_jgh_crest` from the source list in
`backend/app/services/team_logos.py` and its hosts from `_HOSTS` and the gateway's
`egress/crests.filter`.
