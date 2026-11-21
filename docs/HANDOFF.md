# Handoff

**Read this first.** Then [PROGRESS.md](todo/football-memories/PROGRESS.md) and
[DECISIONS.md](DECISIONS.md). Rules: [CLAUDE.md](../CLAUDE.md) (any agent) and
[60-handoff.md](system/rules/60-handoff.md) (how to leave the work).

## What this is

**Football Memories**: a local-first web app that archives football match
footage, indexes tagged moments, and (next) builds a player's memories
timeline. Full brief: [BRIEF.md](BRIEF.md). Design references:
[design/](design/DESIGN.md).

## Current change (2026-11-21)

- **Season performance story (spec 440), branch `codex/season-performance`.**
  Replaces monthly moment picks and prose with season totals, separate Goalkeeping
  and Outfield panels, shared-scale count bars and a save-percentage ring. Mixed-role
  seasons retain both. Outfield includes all twenty supported metrics, adding generic
  fouls and defensive/attacking 1v1 encounters (never assumed wins). Saved corrections,
  likely/overlap/estimate labels, missing-versus-zero and known-save sample coverage
  are preserved. New action aliases survive the normal parser/cache path; existing
  matches gain discarded labels on their next normal read. No source account accessed.
  Focused tests observed red/green; frontend 688/typecheck/build pass, desktop/375px
  synthetic browser review passed. Backend 772 each SQLite/PostgreSQL; lint,
  format, types and schema checks pass. Local frontend rebuilt/recreated; health,
  Nginx and served `index-BozlOEQQ.js` verified. Helper gracefully restarted with
  Hudl/Veo idle; both local status endpoints healthy. Backend container unchanged.
  Hosted installs follow their existing update settings.


- **Player football records (spec 430), branch `codex/player-record-stats`.**
  My Player replaces all four moment-volume records with position-specific totals.
  Outfield: goals scored, shots on target, chances, passes. Keeper: goals saved,
  goals conceded, shots faced, save percentage. Reuses match scorer/keeper edits
  and action sources; likely/overlap/estimated counts stay labelled. Missing data
  stays a dash. Shots faced/percentage use only the same matches with known saves;
  coverage appears on each card. Explicit profile position wins; unset position
  can use keeper evidence. Imported moment counts alone cannot supply action totals.
  Synthetic desktop/375px review passed; no source account accessed. Frontend 685,
  backend 771 each SQLite/PostgreSQL; lint/format/types/build/schema pass. Local
  frontend rebuilt/recreated; health/Nginx and served `index-DcpX92b7.js` verified.
  Hosted installs follow their existing update preferences.


- **Player label filter (spec 420), merged/pushed `main` at `2f81736`.** Owner reported
  Period Start as a player. Metadata-only audit: 230 nonempty cached matches,
  406 distinct categories. Eight administrative/set-piece labels passed shared
  detection: Period Start (64 matches), Analyst Clip (27), Analyst Clips (17),
  Analysts Focus (4), Coach Clip (3), Physical Focus (1), Yellow Set Piece (2),
  Bib Set Piece (1). Shared predicate now excludes these phrases and close variants,
  keeping actual names with Start/Period words valid. Tests observed red/green;
  all eight rejected by actual app predicate in local-cache audit. Frontend 680;
  backend 771 each SQLite/dedicated PostgreSQL; lint/format/types/build/schema pass.
  Frontend deployed locally; health/Nginx and served `index-CL2U0gIr.js` exclusion verified.

- **Action profile layout (spec 410), merged/pushed `main` at `89144c3`.** Owner
  chose mockup 2. Player identity/minutes sit beside horizontal contribution bars;
  zero counts remain clickable, missing stats/sources are in expandable detail.
  Match-wide scale makes counts comparable; no ratings. Desktop and 375px phone
  synthetic browser review complete; frontend 658/typecheck/build green.
  Worktree: `/Users/simon/.codex/worktrees/player-action-profile/Football Memories`.
  Isolated because another chat is changing keeper attribution in the shared checkout;
  that task’s new keeper test failed in the initial shared-tree full suite. It has
  since landed on main and is included in the final 658-test run. Backend 771 each
  SQLite/isolated PostgreSQL; lint/format/types/build/schema pass. Shared PostgreSQL
  first collided with another suite; dedicated temporary DB retry passed and was removed. Frontend deployed locally;
  health/Nginx and served `index-DYcDAzFm.js` profile markers verified.


- **Goalkeeper attribution (spec 400), merged to `main` at `70bbc49`.** Fixes
  outfield overlap, suppressed returning keepers across short periods, and first-name
  fallback for unresolved goals. Weighted pre-kick evidence, independent periods,
  repeated support, tie/empty-period abstention; ball-in timing and unnamed totals.
  Coventry reference now finds the owner's two keepers alternating over four periods,
  three conceded each (estimated), and retains the final likely save. Owner confirms
  the first name in the cached tags is correct. No real names/data committed.
  Manual local-cache audit: 229 matches across ages/seasons, 180 with spells;
  281/965 conceded goals remain unassigned rather than attributed without evidence.
  No real source account accessed; source cache/footage untouched. Verification: frontend 656, backend 771 each on SQLite/PostgreSQL;
  lint/format/types/build/schema pass. Deployed locally: frontend rebuilt/recreated;
  health/Nginx pass and served `index-DgovPcoI.js` verified. Backend/helper untouched.
  Hosted installs follow their update preferences. Separate managed worktree avoided
  concurrent stats edits.


- **Estimated player minutes (spec 380), merged to `main` at `0ee9991`.**
  Owner now requests automatic estimates: first-to-last approximate player touch per
  END HALF-delimited period, subtracting known keeper spells. Visible estimate/method/
  uncertainty; manual confirmed values still override, sorting uses the same value.
  Three presentation alternatives delivered in conversation; production stats layout
  unchanged pending a choice. Finishing is not a defined app metric; advise clip category
  rather than a quality score. Frontend 645; backend 771 on each database; lint/format/types/build/schema pass.
  Synthetic phone review complete. No real account accessed. Frontend rebuilt/deployed
  locally; health, Nginx and served `index-64qTA5xo.js` estimate text verified.

- **Individual player actions and full stats (spec 370), merged to `main` at `49b5820`.**
  Confirmed in the owner-selected Cardiff 9v9 Hudl UI: Passing is a label on player
  moments (181 source clips, 19 for one selected player), which the old HUDL_CODE-only
  parser discarded. Supported actions now survive parser/cache/library and take priority
  over overlapping team tags. All requested stats added, grouped/filterable; missing
  values stay unrecorded. Minutes played is explicitly confirmed, saved per match/player
  in preferences, clearable, sortable and backed up. Frontend 638; backend 771 each on
  SQLite/PostgreSQL; lint/format/types/build/schema all pass. Synthetic desktop/375px
  browser review complete. Deployed locally: backend/frontend rebuilt, helper restarted
  gracefully while Hudl/Veo idle. Live Cardiff read preserves 181 Passing-labelled source
  clips; all 13 outfield passing counts match their own labels. The 19-clip example is an
  inferred keeper and excluded from outfield rows. Health/Nginx/minutes API/served bundle
  checks pass (`index-BYrNKJL3.js`). Other matches gain labels on next normal open;
  hosted libraries retain their update preferences.

- **Player stats Goals and Offsides (spec 360), merged to `main` at `e27c6b7`.**
  Goals reuse saved/likely scorers from Goals and keepers, with a visible likely
  marker and reviewable clips. Untimed owner-added goals count without a seek
  button. Offsides use own-team tag overlap. Eight metrics laid out four across
  on desktop, two on phones. Frontend 631; backend 758 on each database; all checks
  green. Deployed locally 2026-11-21 by rebuilding/recreating only the frontend;
  health and Nginx checks passed, served `index-Cx_eLs_S.js` verified. Hosted libraries
  follow their existing update settings. Full verification in PROGRESS.

- **Match Player stats (spec 350), merged to `main` at `3aa8ee8`.** New tab after
  Goals and keepers, before Insights, on both connected match pages. Search/sort
  outfield players, compare six event counts, open clips inline and seek the video.
  Counts are explicitly team events overlapping a player's tags, never verified passes
  or shots made by that player. Missing own-team codes show a dash; Veo explains it
  supplies no named player stats. Goalkeeping spells excluded, with outfield activity
  retained after a keeper change. Owner approved the two tab-order test expectation
  updates in chat. Browser checked offline at desktop and in a 375px phone frame;
  no real account used. Verification recorded in PROGRESS. Deployed to the owner’s local
  app on 2026-11-21: frontend-only rebuild/recreate, health and Nginx checks passed;
  served bundle `index-DZGNBRir.js` verified to contain the new tab. Backend/helper
  left running. Hosted rollout follows existing update preferences; not manually moved.

## Current state (2026-11-20)

- **A stopped Veo read carries on where it left off (owner report 2026-11-20, lambro's new
  hosted account).** Each match read is saved to `.veo-account/progress.json`; the next
  Connect/Refresh skips those and reads the rest; Reset/Disconnect delete it. Unexpected
  errors now name type and line, and say how many matches were kept. Backend 758 (SQLite and
  PostgreSQL). **Deployed 2026-11-20:** five hosted libraries (lambro included) moved to
  `3246859` by the automatic round at about 18:12; fm-simon (automatic updates off) moved at
  20:55 through the gateway's own `updates._move`, health ok; the owner's Mac helper restarted
  under launchd at about 20:57. Lambro's own read finished at 17:37 (286 matches, 56 with
  video); the earlier failure's cause was lost when the container was recreated.

- **Veo clubs, crests and reels (owner report 2026-11-20), live on the owner's app.** Each Veo
  match names its own club (learnt from titles: NL, RCW, squad codes, spellings); a Wikipedia
  429 no longer blocks TheSportsDB crests (Redditch United now found); Veo reels keep picked
  team events. Hudl reels checked live: fine. Norton Lindsey, Olton Ravens, Kenilworth
  Sporting and Solihull Academy Blue still have no crest online that the app can see.

- **Hosted libraries can update themselves (spec 340, owner decision 013).** Settings >
  Update in a hosted library: version, Update now, "Update automatically"; title-bar "Update
  available" when not ticked. Gateway side (host updater, provisioner, portal API) is in the
  Gateway repo (GitHub football-memories-frontend), merged to its main 2026-11-20, deployed. All three hosted libraries
  moved to `9910cd9`. Not yet clicked through by a signed-in family.

- **Helper starts at login on a Mac (owner request 2026-11-20).** The installer writes the
  launchd login item `com.footballmemories.helper` (`scripts/mac/helper-login-item.sh`,
  RunAtLoad only, no KeepAlive so it never races the updater's in-place restart) and starts
  the helper through it; the old `nohup` start stays as the fallback. Already installed by
  hand on the owner's Mac (identical file) and running under launchd. **Windows:** the
  installer saves a Startup-folder shortcut (`scripts/windows/helper-login-item.ps1`) that
  opens the usual minimised helper window at sign-in. Checked as text only: no Windows or
  PowerShell here, so it has not run yet; first real check is the next Windows install.

- **Veo Connect reads at once, shared Veo match links, Veo in the Library (owner requests
  2026-11-20), on `main`.** Connect lists then reads the
  matches in one sign-in. Settings > Connections > Veo has "Shared match links" (add, delete),
  read signed out (check: a public match's JSON answers 200 in an empty browser). Library
  hero/Overview/count include shown Veo matches beside Hudl. Backend 725 (SQLite and
  PostgreSQL), frontend 606, lint/types/build pass; live Library checked against the running
  app. Owner decision [012](owner-decisions/012-hudl-tags-for-every-match.md) answered: with
  no age group saved, Hudl indexes every match's tags (same pacing). Backend 725 / frontend
  607 after it. Live on the owner's Mac 2026-11-20: helper restarted (now under launchd),
  frontend container rebuilt (the 8765 page had an 18 Nov build until then). The owner's
  first Connect read was interrupted by a helper restart (Veo list last saved 06:59); press
  Connect once to finish it. Not yet checked end to end against the real accounts.

- **Public security review (owner request 2026-11-20).** This repo's part merged into `main` at the
  owner's request (2026-11-20) from `codex/public-runtime-hardening`; Gateway work (merged to the Gateway repo main 2026-11-20) is in
  `~/Football Memories Gateway`. Spec 330 pins Python/Nginx runtime images, installs available
  system updates and removes pip after builds. New tests observed red first; backend 682 on
  SQLite and PostgreSQL, frontend 599, lint/format/types/build/schema drift all pass.
  Hosted images built from `4ac2237`, rescanned and import/Nginx-smoke checked with synthetic
  upstreams; report in the Gateway repo's `docs/security-review-2026-11-20.md` (code `b4bec39`).
  **Next:** an isolated integrated security pass or an owner verification exception before
  rollout of the hosted gateway. Installs pick up the new images on their next Update. The owner's local app/helper and all library volumes are
  untouched. Gateway audit found an MFA throttle reset, missing private cache protection,
  unbounded portal bodies, reflected validation inputs and unbounded Argon2 memory use;
  fixes tested offline. Further finding: quota checks do not cover backup/generated-file
  writes, so an approved user can threaten the shared disk. Internet ports 8443 and 6881 still open (unrelated services);
  IPv6 reachability remains unverified. Do not claim complete hardening. The old full-stack
  security runner and provisioner Docker test cannot safely run beside production.
  Owner approved moving the legacy tunnel fixture to its own subnet; **all four real-Caddy
  tests now pass**. Gateway ordinary suite 305, portal 61, provisioner 64 also pass. Remaining
  upstream advisories are documented; rebuilt web/egress have no high/critical scan entries.

- **"Hudl stopped part-way" on every Refresh (owner report 2026-11-19).** The hosted capture
  container hit its 1.5 GB cap, the kernel killed Chromium, and the helper kept reusing the dead
  browser. This repo: a disconnected browser now counts as no session (Refresh signs in once),
  and the generic error logs its type and line. Gateway: capture cap 2.5 GB plus `Init: true`.
  Needs the capture image rebuilt and the family's capture container recreated before it shows.

- **Owner's phase 2 check, first round of fixes (2026-11-19).** This repo: the hidden Hudl
  page is parked between jobs (it held 1.1 GB and pegged the capture container's CPU, then
  crashed, which is why Refresh failed); a crashed page counts as no session, so Refresh signs
  in once. Hosted crests come from one shared crest service (`app.crest_service`,
  `FM_CREST_SERVICE`), since a hosted backend has no internet. Dropdowns draw their own
  chevron in Chrome. Hosted header gains an account button. Gateway repo: families sign
  straight into their library; Docker Desktop groups each family's containers; crest service
  and crest-only filter; admin shows each family's container prefix. **Next:** Telegram admin
  (owner asked for: new-request alerts with Approve/Decline, reports, suspend/resume/restart),
  then the owner finishes the read-only check on https://localhost (Safari needs https).

- **Hosted gateway phase 2 built and tested offline** (owner sign-off 2026-11-19). This repo:
  sealed per-user Hudl/Veo store (`SealedFileStore`), one browser-launch rule (headless
  Playwright Chromium in a hosted library, never a visible window, through the egress proxy),
  hosted-only route refusals and storage limit in the helper, `backend/Dockerfile.capture`, and
  a hosted page that talks only to its own `/helper` after the user confirms permission.
  Gateway repo a503461: capture container per user, egress filter, permission gate,
  one-family-at-a-time slot, security pass 27/27. The owner's install is unchanged.
  **Next, owner only:** the read-only check in the gateway repo's docs/PHASE2_OWNER_CHECK.md.

- **Hosted gateway, phase 1 done; phase 3 built and switched off; phase 2 ready for sign-off.**
  Gateway repo at 391158a: security pass 24/24 (it found and fixed TLS failing for visits by
  IP address), registration limited to 5 per address per hour, Cloudflare Tunnel in
  `compose.tunnel.yaml` (off; owner steps in its docs/PHASE3_TUNNEL.md), CI actions on Node 24.
  This repo at 39096e4: a hosted copy shows one honest Hudl/Veo note instead of panels that
  could not work, and no Downloaded page. Phase 2 task files rewritten with what the code does
  today and the risks to weigh (many Hudl accounts from one home address; each user's own
  permission; the encryption limit): `todo/hosting/hosted-gateway/phase2-container-capture/`.
  **Needs the owner:** sign-off on phase 2's task files; a domain and tunnel token for phase 3;
  how to handle uploads over Cloudflare's 100 MB limit.

- **Hosted version for other users (owner request 2026-11-18, planning only):** plan pack
  [todo/hosting/hosted-gateway/](todo/hosting/hosted-gateway/README.md) and owner decision
  [011](owner-decisions/011-hosted-instances.md). A separate gateway (repo
  `MooreSi/football-memories-frontend`, still empty) with registration, admin approval, sign-in,
  admin page; one internal-network Docker stack per approved user; LAN first, Hudl/Veo in containers
  as a gated phase 2, Cloudflare Tunnel phase 3. Found while planning: the app's nginx forwards
  `/helper/` to the owner's desktop helper, so user instances need a hosted build without it
  (task 080). Owner answered QUESTIONS.md: all recommendations.
  Task 080 mostly done (c01338a): `FM_QUOTA_BYTES` quota on uploads/imports, `VITE_FM_HOSTED`
  build refuses every helper request, `FM_HOSTED=1` image uses `nginx.hosted.conf` (no helper
  route). Default install unchanged; live app not rebuilt or redeployed. Left in 080: hiding the
  remaining Hudl/Veo screens in a hosted build. Task 010 scaffolded in the gateway clone at
  `~/Football Memories Gateway` (3bc236e). Both pushed.
  Gateway tasks 020 (Caddy edge) and 030 (accounts and sign-in API) done at fc70e7b: 76 tests
  plus a real-Caddy test, every control broken on purpose and caught; stack run locally on
  127.0.0.1 and taken down again. Owner approved adding `cryptography`. Task 060 (portal
  screens after reference 01, served by the gateway) done at gateway 5e764c5; checked in the
  browser at desktop and 375 px; owner approved `qrcode`. Task 070 (admin page: approve, suspend, quotas, delete/erase,
  activity; screen at `/_portal/admin`) done at gateway aff5fca; disk and library figures show
  "not measured" until the provisioner exists. Task 040 (provisioner + our own Docker
  allow-list proxy; real-Docker tested) done at gateway e4f3976; this repo's 50b020f makes the
  backend image's /archive and /inbox writable in new volumes (owner's install unaffected; live
  app not rebuilt). Task 050 (forwarding to each user's own library; browser-checked end to
  end) done at gateway d96e78e. Owner: every hosted user enters their own Hudl and Veo
  credentials (phase 2). Next: 090 security pass, phase 2.

## Earlier (2026-11-17)

- **Next/Previous during Play Tagged (owner report 2026-11-17):** on the Hudl and Veo
  match pages, Next moment (button, N, media key) and Previous (B) during Play Tagged
  ended the queue, so the match just played on. They now move within the queue and
  playback carries on to the following moment; past either end of the queue they step
  through the moments shown as before. After a Next/Previous the queue waits until the
  video reaches that moment before counting its end (`arrived` in `lib/taggedPlayback.ts`),
  so a stale time from before the seek cannot skip it. Tests pass; not checked in a
  browser after the fix (the helper's stream had moved to another match the owner opened,
  and reopening ours would have taken it). Deployed 2026-11-17 at b7ed9e6 (frontend container only; health ok).
- **Match report scorers (owner request 2026-11-17, D-036):** the match report's Scorers
  line now names the likely scorer too, "(likely)" after a name none of whose goals is
  confirmed, and "N unknown" for goals with no scorer (`matchGoalLines`). Keepers stay
  confirmed only. Checked in the browser on a real 6-4 match: six goals, all likely.
  Deployed 2026-11-18 at 4c6c034 (frontend container only; health ok).
- **Season report top scorers and plays alongside (owner request 2026-11-17, D-036):**
  TOP SCORERS now counts the likely scorer for goals not yet confirmed; the note reads
  "N goals by a likely scorer, not yet confirmed · N goals with no scorer". "Plays
  alongside" removed from the season report (the player hub's "Plays alongside most"
  panel is untouched). On the real cache the top three have 23, 20 and 19
  goals; 62 likely, 8 with no scorer. Checked in the browser. Deployed 2026-11-17 at b7ed9e6 (frontend container only; health ok, live bundle has the new note; live app not opened).
- **"Two green boxes" on the moments grid (owner report 2026-11-17, open):** not
  reproduced. In Chromium, on the real match, the page only ever marks one tile
  (`aria-current`, `border-ok`) and only one is drawn; no duplicate moment ids in any of
  the 288 cached matches; no other CSS outlines a tile. Likely a stale repaint in the
  owner's browser (Chrome and Safari both run here). Needs: which browser, and the clicks
  that led to it. Same report on 2026-11-13 was put down to a focus ring.

## Earlier (2026-11-16)

- **Match page tabs (spec 320, owner request 2026-11-16, "implement option A" from
  layout mockups):** Hudl and Veo match pages now put a compact momentum timeline
  (playhead, click to watch) and a summary strip (possession, chances/attempts, on
  target, corners, who was in goal) under the video, then tabs Moments | Team stats |
  Goals and keepers | Insights, Moments first (`components/match/MatchSections`,
  `lib/matchSummary.ts`). Inactive panels stay mounted, hidden by CSS. Tag rail is
  sticky. Checked in the browser on a real Hudl and Veo match via the new
  `frontend-live-api` launch entry (`FM_API_PROXY`). Not built from the mockup: Team
  stats in two columns, goals in time order with a running score. Deployed 2026-11-16
  at 2b09b47 (frontend container only; health ok, live bundle has the tabs; live app
  not opened after the deploy).

- **Keepers from goal kicks, with changes (owner request 2026-11-16):** the old keeper
  guess needed a GOAL KEEPER code, which only 2 cached matches have. `lib/goals.ts` now
  votes at each of our goal kicks (the player whose tag is running at the kick, started
  up to 12 s before) and finds keeper spells, a change costing 2.5 votes, snapped to an
  END HALF tag. Saves and conceded go to whoever was in goal then (also for confirmed
  keepers when the owner did not name one). Panel shows "In goal to/from" when there was
  a change. On the cache: a keeper on 143 of 152 matches, a change on 47, 57 of 62 at an
  END HALF. Deployed 2026-11-16 at 6855cbe (frontend container only; health ok, live
  bundle has the keeper spells; live app not opened). Open for the owner: whether the
  spells match games they remember.

- **Likely scorer and panels removed (owner request 2026-11-16):** the owner said
  scorers were wrong. `lib/goals.ts` now picks the player whose touch is nearest the
  ball going in (goal tag end minus 5 s; touch = player tag end minus a third, at most
  5 s), measured on the cached tags (see interface domain notes); most overlap is the
  fallback. "How the score went" (GameStateStrip) and Match recap removed from both
  match pages, with `lib/matchRecap.ts` and `matchSpan`; season game-state lines kept.
  Deployed 2026-11-16 at b0696ee (frontend container only; health ok, live bundle has
  neither panel; live app not opened). Open for the owner: whether the new guess
  matches goals they know.

- **Goals and keepers (spec 270, owner requests 2026-11-16, owner chose "Both"):**
  Hudl and Veo name no scorer or keeper (checked on the real caches: Hudl goal tags are
  team-only with 3 to 4 player tags overlapping each goal; no save tag; Veo has goal
  times by side, no names, no on-target). `lib/goals.ts` guesses ("Likely"): the player
  tag overlapping a Hudl goal most, the player most often tagged with our GOAL KEEPER
  codes, saves = opposition ON TARGET tags not overlapping their goal. A Goals and
  keepers panel on the Hudl and Veo match pages lists goals (seek), keepers, saves,
  conceded; Edit lets the owner set scorers, add/remove goals, keepers, saves, keeper
  beaten. Saved as `preferences` `goals:<match id>` JSON (`GET/PUT /api/goals`). Match
  report: Scorers and Keeper lines; season report: TOP SCORERS (top three) and goals
  still unconfirmed. Reports use confirmed names only. Open for the owner: whether the
  "most overlap" guess matches a game they know.
- **Full app check (owner request 2026-11-16):** every gate green before and after;
  no file over 800 lines (largest `hudl_browser/_account.py`, 773). Three defects fixed,
  each test watched red first: one Veo match's odd report/details shape (a list where an
  object was expected) raised AttributeError and stopped the whole Refresh (`_parse`
  now reads it as missing); `media_range` accepted a Veo answer longer than the range
  asked for, which the range relay would forward past its promised length (now
  refused); a crest slower than 4 s stayed uncropped for the whole visit (`crestTrim`
  now keeps a late crop for the next badge). Verified on a clean copy of main with only
  these changes, because other sessions had uncommitted work in this checkout. The live
  app was not opened (it can start a Hudl/Veo refresh).

- **Match recap (spec 310, owner request 2026-11-16):** `lib/matchRecap.ts` (pure
  templates) and `components/match/MatchRecap` after How the score went on both match
  pages, with Copy. Half-time: Veo's first period end, Hudl's first END HALF tag. Only
  confirmed scorers/keepers are written. No local LLM (owner decision not asked).
  Deployed 2026-11-16 at 1f35c4a (frontend container only; health ok, live bundle has
  Match recap; live app not opened).

- **Reel presets (spec 300, owner request 2026-11-16):** `lib/reelPresets.ts` and
  `components/match/QuickReels` above the moments panel on both match pages; buttons
  navigate to `/clips/reel/new` with the same state Make Highlight Reel sends. Hidden
  for unsynced Hudl tags or a Veo match without video, and until the primary player
  and goal entries load. Pre/post-roll per reel not built: it would change what the
  helper fetches from Hudl (`/safe-change`). Deployed 2026-11-16 at 55a52eb (frontend
  container only; health ok, live bundle has Quick reels; live app not opened).

- **Game-state timeline (spec 290, owner request 2026-11-16):** `lib/gameState.ts`
  from spec 270's goals and `matchScore`; `components/match/GameStateStrip` under Goals
  and keepers on both match pages; season report lines via `seasonGameLines`. A match
  counts only when every goal has a time and they add up to the score (owner-added
  goals have no time, so such a match says why instead). Span: Veo periods, else first
  to last Hudl tag, else the video.
- **Deployed 2026-11-16** (owner yes): `docker compose up -d --build` at f93f8a0;
  health ok, live bundle has the expiry panel and the game-state strip. No migration
  change; helper not restarted (unchanged). The live app was not opened in a browser
  (it can start a Hudl/Veo refresh); the owner has not looked yet.

- **Veo expiry queue (spec 280, owner request 2026-11-16):** Downloaded page panel
  "Before Veo deletes them" (`components/downloads/VeoExpiryPanel`,
  `lib/veoExpiryQueue.ts`): Veo matches with video and no full-match download,
  soonest first, days left estimated as match date + 12 months (picker: 6; owner
  decision 010: owner confirmed 12), Veo's `expires-soon` counts as 30 days or less; expired
  matches never saved in a collapsed list. Frontend only, no Veo request.
  Deployed with spec 290 (see that entry). Research report behind
  it: `reports/Football Memories improvement ideas.md` (notes in `research_notes/`).

- **Veo Opponents and fuller crests (owner requests 2026-11-15):** with Hudl hidden and
  Veo shown, `/opponents` is built from Veo matches, one club at a time (Club picker,
  `?club=` from the Library match profile's new Opponents link; Season or all seasons).
  Opening an opponent shows Veo's stats summed over the meetings that have them (Shots
  on goal, Corners, Fouls, Free kicks, Penalties) and links each game to `/veo/<id>`.
  Across all seasons the Club list is long: older Veo titles put the home side first
  ("Redditch United vs RCW"), so opponents appear as clubs. Owner answer 2026-11-16:
  leave as is (first-named side stays the club). Crests: `lib/crestTrim.ts` crops a crest file's plain margin in the browser
  (canvas; the file is never changed); a round crest then fills 94% of the badge, a
  square or shield one 74%; the report uses the same crop. No canvas (the test DOM)
  shows the crest as before; a load that never finishes falls back after 4 s.
- **Reports and crests (owner request 2026-11-15):** a Veo match report shows Veo's
  team stats (attempts as "Shots on goal", Penalties always, 0 - 0 when none); the
  season card lists games Won / Drawn / Lost with scores (`Report.results`). Crests
  fill their circle (clipped). Crest lookup (`team_logos.py`): lower-case words are
  capitalised for the page title ("Bolehall swifts"), a football club page's PNG/SVG
  counts as its crest whatever its file name (short description says football club;
  JPEG never), and a search hit may add Athletic/Juniors/Youth/JFC. `resolveClub` no
  longer turns "AFC Birmingham" into Birmingham City. Wikipedia rate-limits after
  about a dozen quick requests (429); the 1 s pacing and pause handle it.
  **TheSportsDB added (owner: "Yes, add it"):** free public team search (key 123)
  after the Wikipedia search, before Commons; football teams only, named as the club,
  badge only from r2.thesportsdb.com (`/small`, PNG). Asked at most every 2.5 s (free
  tier: 30 a minute). Two older crest tests' fakes now answer its URL with "no team"
  (owner-approved test change). `_same_club` now ignores generic words ("club") on
  both sides, so "Racing Club Warwick" can match at all. Live: found Racing Club
  Warwick, Tamworth, Solihull Moors, Coleshill Town; not Bolehall Swifts (Wikipedia
  has it). The Veo account crest (Racing Club Warwick's) had been saved as Norton
  Lindsay's by `useVeoClubCrest`. Owner answer 2026-11-16: move it to Racing Club
  Warwick and stop saving it under the Veo team name. Done: hook removed and deployed;
  Norton Lindsay's copy moved from TeamLogos to the macOS Trash ("Norton Lindsay crest
  (Veo account copy) 8d0b5ec6.png"). Racing Club Warwick's file held the identical
  image, as does `.veo-account/crest.png`. Norton Lindsay now has no saved crest, so
  the app looks one up online or shows initials; the owner can upload one in Settings.

- **Veo season report split by club (owner request 2026-11-15):** the Veo account
  films Norton Lindsay ("NL ...") and Racing Club Warwick ("RCW ...", "Racing ...").
  `lib/veoClubs.ts` gives each Veo match the club its title names first (full name,
  initials or first word, against the Veo team setting and Veo's `team` values);
  Veo's `team` field is only a fallback because it is sometimes wrong. The Veo-only
  season report has a Club picker (Veo team first); the Veo match report and the
  Veo library cards name the match's own club. `lib/useVeoClub.ts` (`useVeoClubOf`)
  does the same for the Veo match pages (label, team stats, momentum, record against,
  now only that club's matches), reels, Downloaded and the Library hero/latest/profile.
  It names a club only from the known list and only when the Veo team is set
  (unset keeps the raw title / "Us", as tests require).
- **Recent moments for Veo (owner request 2026-11-15):** the Library's Recent moments
  panel lists Veo's team events first (match order), then the highlights; the count
  and "See all" include both (`HudlLatestPanel` `teamMoments`).

- **New matches appear on their own (owner request 2026-11-15):** `useVeoAutoCheck`
  (AppShell) refreshes Veo when its list is over 6 h old, on opening the app and on
  coming back to the tab (`useReturns`), never on `/veo/` or `/clips`.
  `useHudlAutoCheck` now also re-checks on coming back (list re-read only; the tag
  sweep stays once per load). Each browser waits 6 h after a try
  (`fm.{veo,hudl}.autocheck.tried`). Decision 003 records it; owner answer 2026-11-16:
  keep 6 hours. Veo highlights panel also has Highlights / Veo events filters.

- **Reel score and team stats cards, Hudl team stats (owner request 2026-11-15):**
  reel studio "Show the score" (match card shows the score instead of VS; Veo score,
  Hudl `matchScore`) and an opt-in "Team stats card" after each match's moments,
  on screen for 4 to 20 s (`statsCard`, `recordCard(..., seconds)`). Helper: Hudl
  batch items take `stats_card_id`, Veo reels `stats_card`. Hudl match page has a
  Team stats panel (`lib/hudlTeamStats.ts` from `teamProfile`; possession % first);
  the table is shared (`TeamStatsTable`).

- **Veo clips by range, multi-type rails, Veo head to head (owner request 2026-11-15):**
  Veo reels and moment downloads read only the parts they need through a private
  local relay (`veo/_ranges.py`), no full download. Hudl and Veo match rails pick
  several moment types at once (`aria-pressed`; reel name joins them). The Veo
  match's Match insights shows the record against this opponent from the Veo
  library (`HeadToHeadRecord`, shared with Hudl).

- **Veo team events as moments, momentum (owner request 2026-11-15):** the Veo match
  rail has a "Team events" group (OUR/OPPONENT goal, shot, corner, foul...) that can
  be played, ticked, downloaded and made into reels; Match insights has the Hudl
  momentum chart from Veo's team events. No possession (Veo gives none).

- **Veo team data fixes, totals and club crest (owner request 2026-11-15):** the first
  real Refresh found Veo writes sides as "Own"/"Opponent" (sides were all None; fixed,
  cache version `team_data.v = 2` re-reads once). Per-side totals from
  `teams/{Own,Opponent}/stats` (missed shots, penalties, out of play) on the Team
  stats table. Club crest from the match report saved once by the helper
  (`/veo/club`, `/veo/crest`); no longer given to any club by the app (owner answer
  2026-11-16); Veo's report names are unreliable (see connectors). Maps and POSTs: Veo refused them all on this account (403/404/422, no
  positions), so none were built or enabled; see decision 009 follow-up.

- **All matches Hudl cards (owner request 2026-11-15):** crests and score pill at the
  bottom right of each thumbnail (`ScoreBadge` in `HudlLibrary.tsx`, `matchScore`;
  hidden with no score) and the date as "15th November 2026" (`ordinalDate` in
  `lib/hudlFixture.ts`). LibraryPage passes the club to `HudlLibrary`.

- **Release 0.4 (owner request 2026-11-14):** versions 0.4.0, CHANGELOG 0.4, README
  with Veo, drawing board, My Player and import; new screenshots `reel.png`,
  `veo-match.png`, `connections.png`, `import.png`, refreshed `library.png` and
  `player.png`, all from made-up data (player "Sam Example", club Riverside,
  drawn pitches, invented crests) served by a throwaway stand-in helper and a
  separate throwaway database, both removed afterwards. Also: Veo Disconnect
  whenever an account is saved; Connections shows the home-network address
  (helper `GET /network`, `connectors/lan_address.py`: Bonjour name and private
  IPv4, read locally); the Your player card shows the club crest; My Player
  totals are centred, larger numbers.

- **Veo-only Library and Clips, Teams panel, Import upload (owner requests 2026-11-14):**
  with Show Hudl off and Show Veo on, the Library's hero (poster), latest match
  (Veo's score), overview, match profile and recent moments use Veo matches
  (`lib/veoAsHudl.ts`, links to `/veo/:id`); Clips opens the newest Veo match.
  My Player: Teams is narrow and the four totals are a 2 x 2 grid (Teams spans
  both when editing). Import: drop a video on the box or Choose a video; `PUT
  /api/imports/upload` streams it to `<import folder>/uploaded/` (`.part`, then
  `publish_new` with a ` (2)` name if taken; never replaces). Docker mounts only
  that subfolder writable; `/inbox` stays read-only. nginx streams it (50 GB cap).
  Browser-checked on the live app except a real upload (no file was written into
  the owner's import folder).

- **Veo team stats (owner yes 2026-11-14, decision 009):** `_client` now also allows
  `GET /api/mes/v2/<uuid>/match-events` (nothing else under `/api/mes/`). Refresh
  reads the match report and events once per match with video and keeps
  `team_data` (own v opponent stats, events with side and time; no names or
  addresses) in library.json, reused on later refreshes; a 400/403/404/405 keeps
  None and is not asked again, 401/429/5xx stop the refresh. The Veo match page
  shows a Team stats panel (us v opponent table, goals/shots timeline that seeks).
  Not yet run on the real account: the next Refresh makes 2 extra GETs per match.
  The event `team` value was not recorded by the check; the parser accepts
  own/opponent or home/away (matched to `own_side`); if Veo uses something else,
  sides show as unknown and the page counts nothing for them.

- **Veo data check run (decision 009, owner yes 2026-11-14):** match report and
  `/api/mes/v2/<id>/match-events` answer on the owner's account with team-sided
  events (101 on the match checked: shots, goals, corners, fouls, free kicks,
  throw-ins...) and own-v-opponent key stats; paid analytics and AI insights 403.
  Nothing uses them yet; next would be allowing those GETs in `_client` and
  showing team-split stats on the Veo match page.

- **Veo tick boxes and Veo data research (owner request 2026-11-13):** Veo
  highlights have tick boxes; Play Tagged, Download selected moments (helper action
  `moments`: one video or ZIP, cut from the saved match) and the reel use them.
  Research (public web-app code only, nothing sent to the account) found many
  unused Veo read paths, analytics included; listed with a proposed one-off
  read-only check in owner decision 009, waiting on the owner.

- **Connections switches, Veo reels, crest search (owner requests 2026-11-13):**
  Show Hudl/Show Veo now only choose the libraries listed (Library and Clips),
  never the Connections boxes. Veo match page has Make highlight reel → Reel
  Studio (`source: "veo"`, Veo team name on cards; note when unset). Helper
  `veo/_reels.py` cuts from the saved full match, downloading it first if needed.
  Crests: Wikipedia search + Commons fallbacks (`team_logos.py`), and Club crests
  has "Find the crest on the web" plus paste/drop. Decision 008 partly answered.
  Not tried on the real account; the owner's Veo team name is not set yet.

- **Veo playback fix and Veo match page (owner report 2026-11-13):** the owner
  uses Safari at `http://192.168.0.53:8765`; Veo's stream and poster links were
  left as 127.0.0.1:8766 (Hudl's are rewritten to `/helper`), so the helper refused
  them. Fixed in `api/veo.ts`. Veo cards now open `/veo/:id`, a full match page
  like Hudl's (`VeoMatchFullPage`, stats from `lib/veoInsights`, both teams). Helper
  restarted twice during the check (ends in-memory Hudl/Veo sessions; it now runs
  the unchanged code). Frontend redeployed. Not yet tried by the owner on a real
  Veo match. Posters: the owner's last Refresh (21:15) predates the poster code,
  so Refresh matches once.

- **Owner follow-ups after the first Veo download (2026-11-13):** Veo posters saved
  on Refresh; crests ignore side codes/colours and the owner can add crests
  (Settings > Connections > Club crests; decision 008 open on other sources);
  Veo downloads named `<match> <date>.mp4`; Veo matches open in the Clip explorer;
  team name per source (`/api/settings/home-teams`, used by `useHomeClub` for Hudl
  and `useVeoTeam`); My Player restacked (Tagged with removed), Recent matches 20
  bars in a blue gradient; Connections: Import card gone, Connect, Veo Disconnect.
  Deployed (Docker rebuilt, helper restarted). Owner to set the Veo team name and
  run Refresh matches for posters.
  Then **Records and streaks** on My Player (`lib/records.ts`, `RecordsPanel`): from
  moments per match only (imported + Hudl); a run is matches at or above the average.
  Then **Season story** (`lib/seasonStory.ts`, `SeasonStory`): July-June seasons,
  the player's first name (no guessed pronouns), match of the month per month.
  Then **Milestones** (`lib/milestones.ts`, `MilestonesTimeline`): badges along a
  scrolling timeline; Hudl age groups and team goals overlapping the player's moments
  (`involvement`). A new best counts only after five matches.
  Then **Top 5 moments** (`TopMoments`, `lib/hubExtras.rankHudlMoments`: overlap with
  GOAL > SAVE > CHANCE/SHOT > opposition shot; Make a reel goes to the Reel Studio, or
  `/api/reels` for imported favourites) and **Opponent map** (`OpponentMap`).

- **Spec 260, Veo Library and playback ([260](todo/football-memories/260-veo-library-and-playback.md)):**
  task 1 built: "Connected Veo" section under All matches (`components/veo/VeoLibrary`,
  same filters, expiry badge, hidden by Show Veo off via `lib/connections`) and
  `/veo/:id` (`pages/VeoMatchPage`: score, halves, highlights). Veo items stay
  out of Hudl's `/library` on purpose. **Tasks 2-3 built:** Watch (helper
  `/veo/stream/<token>`, Range 206, video address in memory only; after a helper
  restart Watch signs in once and reads that match's `/videos/`) and Download full
  match (`.part`, length + ffprobe, hard link, never overwrite, download index).
  The CDN is public (owner-approved check). Not yet tried by the owner. Task 4
  (highlight clips) todo; decision 007 open. Owner's Veo cache is empty until they
  select Refresh matches.

- **Veo Test fix (owner report 2026-11-13):** first real Test said "Veo signed
  this session out". Two owner-approved read-only sign-in checks showed Veo
  authorizes reads with a token header from localStorage, not a cookie.
  `_client` now copies the page's own `authorization` header (`signed_in_header`,
  `token_http`), in memory only, and still waits for the form and the app
  (`confirm_signed_in` names a 401). Helper restarted. **Owner's Test passed
  2026-11-13:** 284 matches in 3 clubs, 56 with video, 228 expired, 7 expiring.
  Refresh matches not yet run.

- **Next-moment fix (owner report 2026-11-13):** Next/Previous now step from the
  outlined moment in match order (ties keep list order), not from the video's
  play position; the clicked tile releases focus so its focus ring is not taken
  for a second highlight; the list scrolls to keep the new moment in view.

- **Veo connection, phase 1 (spec 250, D-035, owner decision 006 answered):**
  helper routes `/veo/account|credentials|action|library`, package
  `backend/app/connectors/veo/` (`_client` is the only module that talks to Veo:
  GET-only `/api/app/` JSON, 1 s apart, no retries, one sign-in attempt),
  Keychain item / Credential Manager target per service, cache
  `.veo-account/library.json`. Settings > Connections: Veo card and Show Hudl /
  Show Veo switches (localStorage). What Veo exposes is in
  `docs/system/domains/connectors/README.md`. **Phase 2 open:** Veo matches in
  Library and match page, streaming and MP4 download. Real-account check: the
  owner saves the account in Settings and selects Test, then Refresh.

- **Owner follow-ups 2026-11-13:** drawing Move tool (V); next/previous tagged
  moment (buttons, N/B, media keys via `navigator.mediaSession`) within the codes
  shown; green outline now an inset ring (the list's scroll box clipped the old
  outer shadow) and follows the clicked moment too; Continue watching capped at 3.
  **Veo connection not built**: waiting on owner decision 006 (permission,
  credentials, scope); nothing signed in to Veo. Browser-checked via the stand-in.
  Deployed 2026-11-13 (Docker rebuilt, health ok; helper unchanged, not restarted).

- **Drawing board (spec 240, D-034, owner request 2026-11-13):** toolbar under the
  match video (above Match insights): Draw on video, Note / draw on a moment,
  Screenshot, saved drawings. Ten tools, colours, widths, undo/redo, eraser, keys.
  Saved as vector data with the note in `preferences` (moment id, or
  `frame:<match>:<seconds>`); PNG export of frame + drawing. Browser-checked
  through the synthetic stand-in helper and a scratch SQLite backend (no Hudl,
  no owner data): every tool drawn, saved, reloaded, PNG made from the poster and
  from a playing frame, phone width. Deployed 2026-11-13 (Docker rebuilt;
  helper not restarted, unchanged). Not tried on a real Hudl stream.

- **Release 0.3 (2026-11-13):** versions 0.3.0, CHANGELOG, README rewritten for
  the new features, ten screenshots in `docs/screenshots/` taken from made-up
  data (club Riverside, fictional opponents, synthetic players and tags, a drawn
  pitch) served by a throwaway stand-in helper; nothing real or from Hudl.
  Fixed while shooting: "END HALF" and other plain-word codes were shown as names.

- **Opponents by team, report crests (owner request 2026-11-13, D-033):**
  Opponents, head-to-head and the season report follow one team across seasons
  (U11 2026/27 = U10 2025/26 = U9 2024/25), each club split by season with every
  game; match report shows both crests; season report values wrap instead of
  overlapping; header nav labels no longer wrap at 1280px. Browser-checked on
  real cached data through the stand-in helper (no Hudl).

- **Match insights (spec 230, branch `spec-230-match-insights`, owner request
  2026-11-13):** duplicate tag spellings merged where the helper serves its
  cache; possession % from tag lengths (match page, Library); momentum timeline
  (click to seek); player hub "On the pitch during", football journey by season,
  "Plays alongside most", attacks he was in; head-to-head on the match page and
  `/opponents`; "Attacks ending in a chance" as playable/downloadable clips;
  notes and arrows over the video; `/report/match/:id` and `/report/season`
  (PNG or print to PDF); alerts bell; Continue watching. See
  [230-match-insights.md](todo/football-memories/230-match-insights.md).
  **Deployed 2026-11-13:** merged to `main` (0b0947e), Docker frontend and
  backend rebuilt, helper restarted on the new code (PID 38416, log
  `data/helper.log`; that ended its in-memory Hudl session). Live helper serves
  320 codes, none with "&amp;" or lower case; download folder still
  `/Volumes/SMB_Share/Football`. Not tried over a real stream: notes editor,
  momentum seek. Owner question [005](owner-decisions/005-insight-choices.md)
  answered (D-032): radar possession uses time, weights kept, names shown as
  "Chris Demo"; the owner's hub (id 4) renamed from upper case to match.

## Earlier state (2026-11-11)

- **Opponents and crests (2026-11-13, owner report):** Chelsea, Manchester City,
  "The Hammers", "Bluebirds" and others showed initials. Two causes: Wikipedia
  answered 429 when a page asked for many crests at once and the app kept that
  as "no crest" for 24 hours; and Hudl titles use nicknames and short forms the
  app did not know. `frontend/src/lib/clubs.ts` resolves nicknames, short forms
  and cut-off names to full clubs; `fixtureParts(title, ourClub)` also reads
  "Arsenal v Aston Villa" and "Barcelona 3-0 Aston Villa". The backend now
  paces Wikipedia (1s), honours Retry-After and only keeps a real "no crest" for
  a day; the badge retries after 30s and 90s. Docker app rebuilt and checked:
  every match on the player timeline shows the right crest. **CFT Slovakia has
  no public club page or crest**, so it keeps initials; a way for the owner to
  pick a crest for such clubs would be a separate feature.

- **Saving to a NAS share (2026-11-12, owner report):** the owner's download
  folder is `/Volumes/SMB_Share/Football` (SMB, TrueNAS). Reel Studio stopped with
  `OSError in hudl_exports.py:293`: the share has no hard links (`ENOTSUP`). All
  publishes now use `app.services.publish.publish_new` (no-replace fallback);
  export + reel verified on the real share in a throwaway folder. Helper
  restarted on the new code. The media library now copies videos on a drive
  without hard links (symlinks and clones were probed on the share and do not
  help) and the panel says how much: the owner's library was built on the NAS,
  17 reels, 6.2 GB of copies. Plex (LXC 102 on the owner's Proxmox,
  192.168.3.225; Football mounted read-only at `/mnt/Football`) showed Hudl-style
  titles and two junk collections from the "/" in "2026/27": copies now carry the
  app's details (rewritten in place, frames identical) and seasons are written
  2026-27 in file tags. The owner must refresh metadata in Plex. The two
  12 July reels got today's date in Plex; files now also carry a binary
  recording time and copies are file-dated on the match day; the owner
  confirmed after a refresh that Plex now orders them correctly.

- **"The batch stopped" now names its cause (2026-11-12, owner report):** a Reel
  Studio batch failed with the generic message right after the helper was
  restarted for spec 220. An offline replay (real titles, cached moments and
  cards, fake stream) completed both reel modes with correct tags, so the
  failure was in the live Hudl part; its exception was swallowed. Unexpected
  batch/export errors now show and log the exception type and file:line, never
  the message (it can hold signed URLs; tested with a planted fake). **Cause of
  the owner's failure still unknown:** needs the owner to retry. The 17 reels
  that were in `data/inbox/reels` are in the Mac's Trash (seen through Finder),
  moved there by the owner (confirmed 2026-11-12), not by the app.

- **Media player details (spec 220, 2026-11-12, owner request):** new downloads
  carry MP4 tags (title, date, description, player...), and an opt-in
  Downloaded > Media library switch builds `<download folder>/Media library/`:
  one folder per download with a hard link to the video, `poster.jpg` and a
  `.nfo`, using the club/player/score the page sends. Delete takes that folder
  to the Trash too. Off by default ([owner decision 004](owner-decisions/004-media-library.md)).
  Helper restarted on the new code (ended its in-memory Hudl session) and the
  Docker frontend rebuilt. **Not yet tried in Plex/Jellyfin and not turned on
  in the owner's real folder;** verified on real data in a scratch folder.
  New downloads' embedded tags not observed on a real Hudl download.

- **Downloaded > Delete (2026-11-12, owner request):** a third button under
  Save opens a confirmation, then `POST /downloads/remove` moves that one file
  to the Trash (Recycle Bin on Windows) via the same never-replace rename as
  Settings > Storage. Only a file the download index lists can be removed;
  a full match's `.tags.csv` stays. Play/Save/Delete are 24px with 3px gaps so
  the stack stays 78px and rows keep their height (browser-measured on dev
  data, dialog opened and cancelled only). Deployed with spec 220.

- **Match scores (spec 210, owner request 2026-11-12):** score from goal tags,
  or the owner's correction (match page editor, `/api/scores`, kept in
  `preferences` so backups still restore). Hero pill, Latest panel and match
  page. See [210-match-scores.md](todo/football-memories/210-match-scores.md).

- **Update now restarts and reloads (2026-11-12, owner request):** after a
  successful update the helper restarts (Mac in place; Windows in a new console
  window that waits for port 8766) and Settings reloads the page once
  `/update/version` shows the new commit and `/api/health` answers. Tests with
  fakes and real sockets; **not run as a real update** (this checkout is on
  latest) and not on Windows.

- **Library names our side from Plays for (2026-11-12, owner report):** the hero,
  Latest match panel and Match Profile used only the newest imported team, so a
  fresh install showed "Home vs. Stoke City". LibraryPage now uses `useHomeClub`
  like Downloaded and Reel Studio. Test plus browser check on dev data.

- **New-folder install could not reach its database (2026-11-12, owner report):**
  a second ZIP in a new folder got a new `.env` password, but the shared
  `football-memories` database volume kept the first one; backend crash-looped
  and the installer said "did not answer on port 8765". Installers now sync the
  db role password from `.env` before starting the backend
  (`scripts/mac/sync-db-password.sh`, tested; `scripts/windows/sync-db-password.ps1`,
  not run on Windows), use curl/HTTP timeouts, and print the backend's last log
  lines on failure. Reproduced and fixed end to end with scratch Docker projects.

- **ZIP copies update themselves (2026-11-12, owner report from a second Mac):**
  `backend/app/connectors/git_adopt.py` links a folder unzipped from GitHub to
  the exact `main` commit it came from (new `.git`, index only, no file
  changed); Settings > Update runs it on the first check, both installers in
  step 4 (Mac: Apple `/usr/bin/python3`; Windows: `uv run --no-project`, uv now
  installed in step 3 with Git). Installers restart themselves after a pull
  that moved HEAD. Settings > Update now shows any helper 400 message instead
  of "helper not running". **The Windows `.bat` had been broken since 46034aa**
  (labels spliced into the Docker block, `:check_wsl` missing, so WSL check and
  Docker download misbehaved); rewritten and covered by a label-structure test.
  Verified on this Mac with GitHub's real ZIP and an older archive. **Not run
  on Windows.** The owner's existing ZIP Mac needs the one-time Terminal
  command in INSTALL.md (Updating), since its old installer cannot link itself.

- **One reel per match (spec 200, `main`):** batch download has a fourth tile,
  and the Reel Studio has a Save as switch (One reel / One reel per match).
  Per-match mode drops the opening card. Each match is fetched in turn, then
  saved as its own verified reel in `reels/`
  (`POST /account/batch` with `reel.per_match`). Tests and a browser check pass. Deployed:
  frontend image rebuilt (`docker compose up -d --build frontend`; a plain
  restart reuses the old bundle) and helper restarted on the new code (log
  `data/helper.log`). Not run against the real account.

- **`.env` fix:** `.gitignore`'s `.env.*` also ignored `.env.example`, so every
  GitHub copy lacked the template; the installers' `cp`/`copy` failed silently,
  no `.env` was written and compose stopped on `FM_DB_PASSWORD`. Template now
  tracked (`!.env.example`); the settings step moved to
  `scripts/mac/ensure-env.sh` (tested in `backend/tests/test_installers.py`) and
  `scripts/windows/ensure-env.ps1`, which fill in a missing/blank password and
  never change an existing one. Fresh-checkout compose config verified on Mac.

- **Installer fixes (owner report from a new Mac and a Windows PC):**
  Windows installer now checks WSL 2 + Virtual Machine Platform first (no
  admin), and if missing runs `scripts/windows/setup-wsl.ps1` elevated (one
  UAC prompt): enables both features, `wsl --install --no-distribution`,
  offers a restart and re-runs itself once via HKCU RunOnce. Smart App Control
  blocks browser-downloaded `.bat` files (Mark of the Web, no override), so
  `install-windows.ps1` is a one-line `irm | iex` bootstrap that fetches the app
  with git (or the ZIP via PowerShell) and runs the installer; the `.bat` also
  unblocks its own scripts. **Not executed on real Windows** (no Windows here);
  PowerShell parsed in a container only. Mac `forkpty: Resource temporarily
  unavailable` is Terminal failing before the installer starts (process limit
  reached); no installer cause found, troubleshooting added to INSTALL.md,
  owner asked for `ps` output if it recurs.

- **Social preview on `codex/github-social-preview`:** upload-ready
  [JPEG](design/social-preview.jpg) and [instructions](design/social-preview.md).
  Verified 1280 × 640, 214,610 bytes; visually checked after resizing.
  Asset/docs only; no app suites rerun or GitHub setting changed.

- **Renamed:** GitHub repo is now `MooreSi/Football-Memories` (was
  Football-Clip-Recorder; GitHub redirects the old URL) and the local folder
  is `/Users/simon/Football Memories`. Release **v0.1** published; About and
  topics set; README rewritten for users with synthetic-data screenshots in
  `docs/screenshots/`. The 18 old feature branches (all fully merged, 0 unique
  commits each) were deleted on the owner's go-ahead; `main` is the only branch.

- **Latest polish:** Recent moments read from kick-off (times are true video
  time; matches run about 1h23m); every crest sits on the same white disc with
  the same inset; overview tiles keep one number size with the unit below and
  scale to the tile; Downloaded has Play (full match, combined video, reel as
  one MP4 with its cards; a moments ZIP plays clip by clip via
  `/downloads/members`). `_account.py` split into `_batch.py` and `_tags.py`
  to stay under 800 lines.

- **Snapshot backfill:** only 4 of 286 matches had full-quality posters (they
  were made only on stream or first tag index). The paced sweep now also makes
  posters for indexed matches in the selected age group, one Hudl page at a
  time with a 2.5 s pause; failures are retried weekly (`poster_checked_at`).
  App open starts it automatically. Not yet observed running live.

- **D-027 follow-ups on `main`:** reel assembly accepts browser-recorded
  cards (the "A reel part could not be read" failure); one-word clubs get
  crests (Liverpool, Arsenal verified live); Library Recent moments / Most
  tagged follow the hero match and Overview counts the selected age/season;
  Hudl helper runs on Windows with Windows Credential Manager (ctypes adapter
  untested on real Windows; installer not executed). Helper restarted on the
  new code.

- **Spec 190 (owner batch of 16 requests) on `main`:** see
  [190-owner-requests-nov10.md](todo/football-memories/190-owner-requests-nov10.md)
  and PROGRESS. Player card styles, club crest and Moments/Games; Library hero
  crests and download badges; Downloaded tab; moments/ and reels/ folders with
  a download index; full-resolution snapshots; new logo and banner; reel studio
  with six animated card themes and auto-filled match cards; batch download;
  Settings > Update (helper-side git, fast-forward only) with header flash;
  Mac/Windows installers (INSTALL.md). Backend 341 (SQLite and Postgres),
  frontend 171. **Not live-verified against Hudl:** batch export, reel
  recording and render, poster grab, update apply; installers were not
  executed (they install software). Migration b190c1ab0001 adds two
  player columns. Deployed: Docker rebuilt (migration applied), helper
  restarted on the new code (PID 64788, log `data/helper.log`, ends the old
  in-memory Hudl session). Live: update check via git (up to date), download
  index found the 2 existing full captures, Downloaded tab and Library badges
  render on real data. Liverpool shows initials: single-word club names are
  rejected by the crest lookup as ambiguous (team_logos.py), a known gap.
- **Current branch: `main`**, including every local and remote feature branch
  through `codex/library-clips-polish` (owner requested all-branch merge).
  Spec 110 adds username/password Save/Test through macOS
  Keychain, normal-login accessible match cache, in-app Stream and verified
  Download → Import. Owner approved hls.js. Server background sync remains off.
  Shared TeamBadge now caches real club crests (Aston Villa/Stoke verified in
  Library); My Player uses shared charcoal panels/periwinkle accents, preserving
  the reference card/chart/feed layout. Browser preview checked on synthetic
  Sam Example. Owner Save/Test cached 100 accessible videos; Keychain login
  after helper restart and in-app 720p streaming verified. Download reused the
  captured match and offered Import; MP4 and CSV checksums unchanged.
- **Spec 180 complete:** Library team selector removed; age/season persist and
  scope metadata indexing to the selected team's served memberships. Fixed
  premature video-duration failures using recorded manifest duration (no video
  fetch). Clips has one main workspace and secondary saved-clips/playlist tools;
  memories merge into season/month cards with six moment previews, twelve match
  previews and explicit expansion. Phone grid/chart overflow fixed. Friendly
  attachment/ZIP member names include fixture, venue or player/type, ISO date;
  stable old capture identities remain reusable. Live U11 sweep completed all
  87 checks: 74,260 ranges (57 tagged / 28 without tags / 2 invalid timelines).
  A 1080p H.264 26.04s goal ZIP downloaded with
  matching SHA-256. Seven pre-existing archive files unchanged. Docker rebuilt
  and restarted; host helper PID 9872. Desktop/375px checked. Backend 318 /
  frontend 146 green.
- **D-024 (2026-11-10, owner report):** tag sweep no longer stops on
  unreadable videos (saved as unavailable with reason, retried weekly) and
  reports overall progress. 28 of 286 matches indexed before this fix. Check
  `tag_error` in `data/.hudl-account/details/*.json` to learn why the
  unreadable ones fail.
- **D-023 (2026-11-10, owner request):** moment downloads fetch only the
  covering stream segments (stream keeps playing); Clips shows the full
  explorer under the match picker; app open auto-checks Hudl (6 h) and indexes
  missing tags; hub/card/timeline include Hudl tag data; crop popup on every
  photo. **Not live-verified:** segment export on real Hudl HLS, first
  automatic tag sweep (281 of 286 matches still unindexed at handoff).
- **D-022 (2026-11-10, owner choice):** Hudl sign-in is now headless (no
  window, honestly identified). Failures fall back to a visible window on the
  next Test. **Not live-verified**: headless sign-in, stream and tag loading on
  real Hudl.
- **D-021 (2026-11-10, owner request):** sign-in Chrome is minimized (not
  headless, see D-021); progress bar with time left for moment exports; Play
  Tagged highlights the playing moment green, hides video controls unless the
  pointer is over the video and skips seeks between adjacent moments; Clips
  has a match picker (newest Hudl match for the selected age group); Library
  Latest match and Recent moments follow that match; photo crop/resize dialog
  and nginx upload limit fixed (was 1 MB). Browser-checked: Library latest
  panel (U11 Stoke, Pat Example moments). **Not live-verified:** minimized
  sign-in against Hudl, export progress on a real export, smoothness of real
  moment transitions, photo crop with a real phone photo.
- **D-020 (2026-11-10, owner request):** match page "Play Tagged" plays the
  chosen player's/selected moments back to back; moment download asks for
  separate files (ZIP) or one combined MP4, both re-encoded H.264 at source
  resolution. Player page lists every cached match where the player is tagged;
  tag metadata for all matches is indexed after each Hudl Test/Refresh (or
  "Index remaining matches"), pacing per owner decision 003 (open). Hudl-tagged
  names open a real Player Hub (photo/details). Library hero shows the newest
  Hudl match for the selected age group with prev/next arrows. Settings >
  Storage chooses the helper's download folder and moves files to the Trash.
  Verified in the browser: hero (U11 Stoke, then West Brom) and Storage list.
  **Not live-verified:** the first tag sweep against real Hudl, Play Tagged on a
  real stream, combined/separate export of a real match, Finder folder picker,
  Trash move on real files. These need the owner (each is read-only on Hudl).
- **Spec 160:** native Sportscode tags now cache independently of full video
  capture (D-019 supersedes the false-sync omission for observed native views).
  U11 Stoke: 2,191 tags / 66 codes; U11 West Brom: 1,927 / 65, streamed without
  downloading. Native Hudl and app goal seeks matched; actual 1080p/720p playback
  verified. Both caches survived helper restart with session_active=false; all
  ten inbox MP4/CSV files retain SHA-256. Existing CSV files were not rewritten.
  Observation waits for tag-response quiet; native HLS first tag-seek starts
  loading media. Legacy strict capture and unsupported-format warnings remain.
  Host helper 8766 PID 63629 runs final source. No pending owner action.
- **Spec 150:** unsynced tags no longer block account streaming/full capture.
  Strict parsing still rejects them; the account adapter records `tag_status`
  and omits unverified ranges. Match page shows a separate warning; moment/player
  exports remain disabled without valid ranges. Auth/GraphQL errors still stop.
  Live reported U11 match now streams/plays at 1920×1080 (readyState 4,
  advancing time, no media error). Highest full capture completed: HEVC/AAC,
  6195.52 seconds, 3,721,611,743 bytes. The app's attachment downloaded to the
  owner's Downloads folder with identical SHA-256 to the inbox copy. Empty tag
  CSV contains zero unverified ranges. All 8 previous inbox files are unchanged.
  Host helper 8766 (PID 56845) is idle with an active ephemeral stream; preview
  playback is paused. No live verification remains pending for this repair.
- **Spec 140:** connected ages now come from the real Hudl team selector,
  superseding title-based grouping. Follow served context links, verify team
  identity, preserve membership lists across cache restarts/shared videos. Hidden
  dropdown links have empty labels and avatars alter accessible names; tests
  cover both plus Home landing and selector hash fragments. Live discovery read
  U10 100, U11 87, U12 99 videos (286 unique), and the app's three filters showed
  those counts, with all 286 thumbnails cached. U11 remains selected in the
  preview. Repeat refresh retained all three groups. No footage download or
  credential/session storage change in this repair.
- **Spec 130:** connected Hudl cards now live inside All matches, with shared
  search/age/season filters and the original overview/hero/latest layout restored.
  Refresh previously mistook a playback Tags anchor for the entire catalogue;
  discovery now revisits actually served library routes, only accepts library
  links/fresh metadata, and preserves cache on failure. Helper errors show retry.
  Live Keychain refresh restored 100 videos/100 thumbnails; opened a match and
  refreshed again without losing entries. Shared U10 + 2025/26 yields 61 videos.
  Desktop and 375px checked, no phone overflow. Seasons use valid dated title
  prefixes with July boundary; undated videos remain Unclassified. Helper on
  8766 is running the final source with an active ephemeral session. No footage
  downloaded, deleted or overwritten in this repair.
- **Spec 120:** main Library has connected Hudl age selection and cached footage
  cards. Live refresh cached all 100 thumbnails (90 U10 videos). Dedicated match
  screen automatically streams maximum served resolution/bitrate and caches
  actual Sportscode tags (1,717 verified). Full match, player/code and selected
  range download controls now live on that screen; local archived match headers
  link there and switch to connected maximum-quality streams. My Player has an
  explicit tagged-code picker for existing imported codes and opened Hudl videos.
  New highest-quality captures leave older files intact. Moment ZIP exports copy
  encoded streams without resizing; boundaries may include preceding keyframes.
  Live highest-quality full match captured and selected goal ZIP downloaded
  through the app: source/clip both 1280×720 H.264. Older MP4/CSV checksums
  unchanged. Full MP4 attachment/reuse verified; 375px Library has no overflow.
  Final helper is running on 8766 with active Keychain-backed ephemeral session.
- Authorized capture from `codex/hudl-access-research` remains integrated.
  Authorized browser capture implemented (spec 090, D-012): host companion on
  127.0.0.1:8766, normal incognito Chrome login, HLS capture and Sportscode tag
  CSV, Settings → Connections form/progress, then existing Import workflow.
  Owner attests automation/download permission and approved Playwright.
  Real capture → import → playback → single-clip render/download verified.
  Captured 83m32s at 960×540 with H.264/AAC and 1,717 moments across 60 codes.
  Existing `highlight-reels` commits are integrated here because the running
  database already uses that schema; no database downgrade was performed.
- `main` now contains all existing feature branches, including Hudl/reels and
  the screen redesign. Historical branch names remain available; none deleted.
- **Working vertical slice:** import a video (+ optional `.tags.csv`) from the
  inbox → copy, SHA-256 verify, thumbnail → index in Postgres → Library page →
  Match page with player, event markers, filters (AND/OR), "play moments only".
- Runs in Docker Compose at http://127.0.0.1:8765, and on the LAN at
  http://MacMini.local:8765 with no password (owner choice, D-028).
- Hudl: scoped desktop capture authorized by owner decision 002; each user needs
  their own permission. Server background sync remains unavailable. Setup and
  current verification: [HUDL_INTEGRATION.md](../HUDL_INTEGRATION.md).
- UI follows the owner's reference images: Library = reference 01, Match page =
  reference 02, Player Hub = reference 03 (docs/design/DESIGN.md).
- Phase 4 Player Hub merged to `main`: primary player (kept
  across restarts), profile, favourites, watched state, Memories Timeline.
- Profile photos: upload/replace/remove in the hub's Edit panel; re-encoded and
  metadata-stripped (D-009).
- Clip Explorer (`/clips`, reference 02): search moments across all matches,
  queue player that crosses matches, saved playlists.
- Settings (`/settings`): clip timing used everywhere moments play; storage
  health with free space and missing-file detection.
- Backups (Settings > Backups): daily automatic + manual, download/upload,
  safe restore; Storage tab has verify / find moved files / rebuild thumbnails.
- Highlight reels (`/clips/reels`): queue -> reel -> per-clip trims, opening and
  closing cards drawn in the browser, background render to one MP4 with progress,
  crash recovery; download.
- Tests: backend 341 passed on SQLite and Postgres; frontend 171 (see D-020 note on the one updated match-page test).
  Lint, types, build, schema drift and Docker health checks green.
- **Owner's Mac disk is 99% full (about 16 GB free of 926 GB on 2026-11-09).** Full
  matches are several GB each; the Storage tab warns about this.

## How to run

Docker (normal use): see [DEVELOPMENT.md](../DEVELOPMENT.md) "Run everything in Docker".
Dev with hot reload: same file, "Run for development". Checks: [TESTING.md](../TESTING.md).

## Next steps (in order)

Public-security release comes first: see the Gateway report. Finish the isolated integration
check or obtain an explicit owner exception before deployment, address cumulative quota
enforcement, resolve public ports 8443/6881, and verify IPv6 firewall exposure.

0. **Spec 230:** with the owner, try a note and a momentum click on a real
   stream.
1. **Phase 4 leftovers:** calendar and card-gallery views of the timeline;
   "season highlights" shortcut once playlists exist.
2. Per-clip timing override (brief section 9). (Playback history on the server: done in spec 230 for Hudl matches; not for imported matches.)
3. Clip Explorer leftovers: notes on imported moments (Hudl moments have them, spec 230) and custom local tags; crossfade
   transitions. Single-clip export now uses the reel renderer with one item.
4. Playwright e2e for import → play → filter → playlist.
5. Phase 5/6: persistent jobs, clip export and highlight reels with ffmpeg,
   backup/restore, storage health.

## Blocked on / waiting for the owner

- Public hardening deployment: safe full-stack security validation needs a separate Docker
  environment (the populated production stack must not be torn down), or an owner exception
  to that pre-release check. Port 8443/6881 intent still pending. Existing hosted libraries
  continue using their old image IDs; rebuilding tags alone does not patch running services.

- [owner-decisions/002-hudl-access.md](owner-decisions/002-hudl-access.md):
  Normal-user/no-export role and automation permission answered. Real capture/import and clip download verified after owner sign-in. Explicit
  player-code mapping is covered offline; this live run preserved all labels
  as categories. Saved-account login, discovery, stream and Download reuse now
  verified. Helper remains on 8766 with active ephemeral session and credentials
  in Mac Keychain. No pending owner action. Spec 120 Library, maximum-quality source capture
  and selected-range download verified. Large-library exhaustive
  enumeration and native Safari HLS have not been separately verified.


## Gotchas

- Backend: always `uv run ...` from `backend/` (Python 3.12 venv). Bare
  `python3` is 3.13 without the deps.
- Postgres test runs need the dev container `fm-pg-dev` on 127.0.0.1:55432
  and a `memories_test` database (TESTING.md).
- Port 8080 is used by the owner's HomeBoard app; Football Memories uses 8765.
- The inbox is mounted read-only in Docker on purpose (originals are never touched).
- `.gitignore` rules for footage are anchored to the root (`/library/`): an
  unanchored `library/` once hid `frontend/src/components/library/` from both git
  and Tailwind's class scanner (classes silently missing). Anchor new ignore rules.
- `*.ts` also matches TypeScript source: `!frontend/**/*.ts` keeps source/config
  tracked while root/data MPEG transport streams remain ignored. Previously
  ignored API/types/utilities/config are included with this capture change.
- Screen-specific theme variables live in `frontend/src/screens.css`, scoped
  to AppShell `data-screen`. My Player now shares the charcoal dashboard palette (latest owner request,
  D-014 supersedes the light/lime palette).
  Mobile analysis filters must appear before the potentially long moment list.
- After adding a new folder of components, restart the Vite dev server if
  Tailwind classes look missing (it once served stale CSS). `npm run build` is
  the source of truth.
- Starlette 1.10 warns that its TestClient's httpx use is deprecated; harmless.
- shadcn/ui is in the brief but not installed yet; primitives live in
  `frontend/src/components/ui/`. Decide before building forms-heavy screens.
