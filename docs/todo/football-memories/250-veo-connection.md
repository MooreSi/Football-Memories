# 250: Veo connection

**Status:** In progress (phase 1)
**Sensitive:** yes (`/safe-change`): credentials, sign-in, requests to Veo.
Authorized by owner decision 006 / D-035.

Owner request 2026-11-13: connect a Veo account in Settings > Connections the
way Hudl is connected, test it against the owner's account, and add toggles
to show or hide the Hudl and Veo connections.

## What Veo offers (read-only look, owner signed in, 2026-11-13)

- No public API. The web app (app.veo.co) reads a JSON API under `/api/app/`
  with the session cookie; sign-in is a plain email/password form at
  auth.veo.co (`#email`, `#password`, submit), an OIDC interaction.
- `GET /api/app/clubs/?filter=own` lists the account's clubs;
  `GET /api/app/clubs/<club>/recordings/?filter=own&page=N` pages its
  recordings 20 at a time (`Link: rel="next"`, `x-veo-total-count`). The owner's
  account: 238 recordings, 56 active, 7 expiring soon, 182 expired.
- Per match (by slug): `/api/app/matches/<slug>/` (title, start, duration,
  home/away, opponent, `info.stats.score_aggregated`, team, expiry),
  `/videos/` (MP4 1920x1080 on c.veocdn.com, unsigned), `/highlights/?include_ai=true`
  (start, duration, type, tags, AI flag; side and players were empty),
  `/periods/` (halves as time ranges).
- Expired recordings keep their details but list no video and no highlights.
- Richer events (`/api/mes/v2/...`) need a separate bearer token; not used.
- Opening a match *page* posts a "view" to Veo. The helper reads the JSON
  directly and never opens match pages, so it changes nothing on Veo.

## Phase 1 (this change)

1. **Secret store per service.** Keychain item `FootballMemories.Veo` on
   macOS and Credential Manager target `FootballMemories/Veo` on Windows,
   separate from Hudl's (unchanged).
2. **Veo client** (`app/connectors/veo/_client.py`, the only Veo module that
   imports Playwright): ephemeral Chrome context, one sign-in attempt, GET-only
   JSON reads limited to `/api/app/` paths, one request at a time at least 1 s
   apart, no retries; 401/403/429, CAPTCHA, MFA or terms pages stop the run.
3. **Refresh**: every own club's recordings; for active ones, match details,
   video availability (the URL is not stored), highlights and halves. Cached
   in `.veo-account/library.json` (atomic write), in the helper's library
   shape (`id` `veo-<identifier>`, a `YYMMDD` date prefix on the title so
   existing date parsing works, season from the date, highlights as moments).
4. **Helper routes**: `GET /veo/account`, `POST /veo/credentials`,
   `POST /veo/action` (`test`, `refresh`), `GET /veo/library`.
5. **Settings > Connections**: a Veo card (save, test, refresh, what was
   found) and Show Hudl / Show Veo toggles.

## Phase 2 (next)

Veo matches in the Library and on the match page (stream through the helper,
moments, insights), full-match MP4 download (`.part`, verify, rename, never
overwrite), and Veo clips.

## What must NOT change

- Hudl's saved credentials, its Keychain item and every Hudl route.
- No automated test talks to Veo; fixtures are synthetic.

## Test plan

| Test | Asserts | Negative control |
|---|---|---|
| secret store | Veo item/target separate from Hudl; secret never in repr, errors, disk | Hudl target unchanged |
| parse | recording + detail + highlights -> library item; expired has no moments; score; season; next page | no remote video URL in the item |
| client | GET-only, `/api/app/` only, paced, stops on 401/403/429 | other paths refused before any request |
| routes | status, save (secret not echoed or logged), test/refresh start, library | foreign origin 403 |
| settings UI | Veo card saves and tests; toggles hide cards and persist | Hudl card unchanged |

## Real-account check (owner)

Owner saves the Veo account in Settings, selects Test, then Refresh matches.
Read-only: sign in, list clubs and recordings, read active matches' details.
