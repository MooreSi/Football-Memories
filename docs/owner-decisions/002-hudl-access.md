# 002: How does footage get from Hudl into the app?

**Status:** permission answered; capture implementation and account validation in progress
**Raised by:** phase 1 discovery, 2026-11-09

## The question

1. What is your role on each Hudl team: parent, athlete, coach or admin? Can
   you see a "Download" option on full games in Hudl's own interface?
2. Can you (or the coach) export tag/breakdown data from Hudl? If so, can you
   share one example file with names replaced?
3. Do you want to ask Hudl for permission or an official integration for
   automated access? (Hudl's terms prohibit bots/scrapers without it.)

## Why it matters

Hudl's Terms of Service 3.2(8) prohibit automated access (bots, scrapers,
crawlers). There is no public API for core Hudl video. Automating login and
downloads would risk your account being suspended, which would cost every game
not yet saved. See [HUDL_INTEGRATION.md](../../HUDL_INTEGRATION.md).

## Provisional default in use

The app imports files you have downloaded through Hudl's own features, with an
optional tag CSV. The Hudl connector exists but reports every capability as
unavailable. Everything else in the brief (library, player hub, timeline,
clips, highlight reels, backups) is built on the local archive and works the
same regardless of how footage arrives.

## What changes if the answer differs

- Coach/admin with tag export: add a converter for Hudl's export format so tags
  and player names arrive automatically.
- Parent without download: footage must come from the coach/club; the import
  flow is unchanged.
- Hudl grants written permission or an official API: implement
  `HudlConnector` against it and switch its capabilities on.

ANSWER:

2026-11-09: Owner confirmed permission to access Hudl through the normal
username/password login, and requested reusable login, match downloads and
player/tag cataloguing. Use the public entry point `https://www.hudl.com/login`;
do not retain the transaction-specific identity URL supplied in chat.

Owner subsequently answered in this session:

- Normal user; no match or moment/player download/export controls.
- Confirms permission to download/use these videos and explicitly selected
  "Hudl permission for app automation". Proceed within that stated permission;
  do not repeatedly ask for it. This is the owner's attestation, not independent
  verification of a written agreement or permission for other users.
- Owner signed in directly in Safari and authorized enabling Web Inspector.

Read-only inspection confirmed full-match HLS playback and Sportscode moment
data through the normal player. The owner approved Playwright and signed into
the ephemeral Chrome helper. Full-match capture, tagged import, playback and
one-moment MP4 download verified. Server background-sync capability flags
remain false: capture is a separate host process. Keep real names, roster data and match
identifiers out of the repository. Research:
[HUDL_INTEGRATION.md](../../HUDL_INTEGRATION.md).
