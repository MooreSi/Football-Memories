# Interface

Design authority: [DESIGN.md](../../../design/DESIGN.md), the owner's three
references and spec 100. Existing routes are separate screens, with independent
layouts. The owner's later consistency request (D-014) gives My Player the
same charcoal palette, panel borders and periwinkle accents as the dashboard,
while retaining reference 03's card/charts/feed layout.

`frontend/src/screens.css` scopes CSS variables under AppShell `data-screen`.
Keep imports above other CSS rules. The phone feed restores dark tokens to avoid
inheriting light colours. Main analysis filters use a sticky rail on desktop;
on phones they follow the video/timeline and precede the potentially long list.
Presentation must preserve existing media actions, keyboard labels, filters and
real data. Never invent player ratings or copy people from design references.

Spec 130 supersedes the spec 120 placement: connected Hudl cards belong inside
Library's All matches panel, below offline cards, with shared search, age and
season controls. Preserve the original overview/hero/latest-match grid; no extra
full-width catalogue or row offsets. Remote cards use the same two-column card
footprint, initially 12 with Show more. Helper errors remain visible with Retry
connection; stale saved age selections clear rather than hiding every video.
`/hudl/:id` automatically prepares maximum-quality streaming and exposes
full-match, code/player and individual range download controls.
My Player offers actual tagged-code selection, including archived codes that
were previously kept only as categories. Remote code profiles link directly to
matching videos with their code filter applied.

Spec 140 makes the connected age selector follow actual Hudl team-library
memberships rather than labels in match titles. All three accessible groups are
listed; shared videos match each applicable group and display their memberships.
Keep the shared All matches filters and dashboard placement unchanged.

Spec 150 displays unverified Hudl tag sync as a separate match warning, while
stream/full-video controls continue to work. Show no fabricated moments or
player ranges; zero ranges keep moment export disabled. Completed unsynced-tag
video captures offer Import offline match without promising a populated tag file.

## Library, Clips and memories polish (spec 180)
Shared age/season preferences live in localStorage (nonsecret), notify mounted
screens and persist across app restarts. Validate a stale age only after remote
catalogue success, not against a partly loaded offline list. Library removes its
redundant Team filter and suppresses the empty offline gap when Hudl matches fit.
Hero and Clips default follow both age and season. Specific other matches remain
selectable. A missing scope prevents account-wide automatic tag indexing.

Clips keeps one visible page heading, match picker and analysis workspace.
Imported explorer, filters, queues, saved playlists and reels remain behind an
explicit Saved clips & playlists disclosure when a Hudl match is active; it is
open for imported-only mode. Desktop uses the code rail; mobile uses the compact
selector. Thumbnail poster avoids an empty black player before first Play.

Memories uses one newest-first season/month stream for Hudl/offline cards, six
moment previews with Show all, and twelve matches with Show more. Event filters,
favourites, unwatched and every moment link remain. Right feed caps previews and
links to the whole match. Charts and match-link grids must use min-w-0: ten flex
bars' intrinsic date widths previously expanded the phone grid. Radar text uses
short labels with full accessible descriptions/tooltips. Both screens checked
at 375px with document width exactly 375; desktop checked against references.

## Our side's name comes from the player first (2026-11-12)

Every fixture label and crest for our side uses `useHomeClub()`: the primary
player's "Plays for", else the newest imported team's name without its age
group, else "Home". The Library used only the imported team, so a fresh
install with Hudl matches but nothing imported showed "Home vs. Stoke City"
despite Plays for Aston Villa (owner report). Use the hook, not
`clubName(match.team_name)`, for anything that names our side.

## Opponents from Hudl titles (2026-11-13)

Hudl titles name opponents by nickname ("The Hammers", "Bluebirds", "Magpies"),
short form ("Man City", "QPR"), cut-off name ("Shrewsbury Tow") or with our club
first ("Arsenal v Aston Villa", "Barcelona 3-0 Aston Villa"). `lib/clubs.ts`
(`resolveClub`) maps these to full club names; pass our club to `fixtureParts`
so it can tell which side is the opponent. `TeamBadge` resolves names too, so
an imported match with a nickname still gets a crest. Add a new nickname to
`ALIASES` with a test in `lib/hudlFixture.test.ts`. Ambiguous nicknames
("Blues", "Reds", "Dons", "Dundee") are deliberately left out.

## Match scores (spec 210, 2026-11-12)

`lib/matchScore.ts`: the tagged score is the "Goal" axis of `teamProfile`
(goal kicks are their own code). No goal tags means no score, never 0-0. When
our side cannot be placed (no club name and no other paired codes), a single
unplaced "<side> GOAL" code is ours; two such sides gives no score, because
reading ours as 0 would be wrong. Corrections (`/api/scores`, stored as
`score:<hudl id>` in `preferences`) win everywhere and are labelled
"Corrected"; tag counts say "From tags". Shown on the hero crest pill, the
Latest/Selected panel (in place of "vs") and the match page (with editor; not
in the Clips embed). Owner's data: 139 of 286 matches have goal tags; latest
U10 v Stoke City reads 12-9.

## Match insights (spec 230, 2026-11-13)

- Analytics are pure functions in `frontend/src/lib/insights.ts` over the cached
  Hudl moments: possession (tag lengths), momentum, involvement, journey,
  partnerships, phases. `codeSides` in `matchProfile.ts` decides whose a code is.
- Overlap means "tagged during": wording must never claim he made the action.
- Real tags carry many `END HALF` marks in festival videos (several short games
  in one recording), so the momentum chart can show several half lines.
- Opponents repeat (festivals: 19 Liverpool meetings, many on one day), so
  lists of meetings show dates.
- Code matching for players is case-insensitive (`lib/codes.ts`): a hub created
  as "Pat Example" finds "PAT EXAMPLE" tags.
- Skipping between tiles (Next / N) must move or release keyboard focus: a tile
  button clicked earlier keeps focus, and the next key press makes the browser
  draw its focus ring there, which reads as a second highlighted moment.
- A highlight on a tile inside a scrolling list must be an inset ring
  (`ring-inset`): an outer box-shadow is clipped by the list's overflow box, so
  the outline looked broken on the edge tiles.
- Drawing board (spec 240): toolbar under the match video, above Match insights;
  the surface covers the 16:9 stage box, so marks are relative to that box, not
  to the letterboxed frame. The PNG export letterboxes the frame the same way
  (`containRect`). Before the stream has played, `video.videoWidth` is 0: the
  export uses the poster instead. Stream and poster load with
  `crossOrigin="anonymous"`; without it the canvas would be tainted and the
  export falls back to the drawing alone. Exported marks are one SVG string
  (`drawingSvg`), the overlay renders the same `marks()` in React.
- Notes, continue watching and the alerts snapshot are stored by the backend in
  `preferences` (`/api/notes`, `/api/watching`, `/api/alerts/seen`). Responses
  that are not the expected shape are treated as empty (an existing score test
  stubs every unknown URL with `{accepted: true}`, which caught this).
- Reports are drawn as one SVG with no external images, so the canvas is never
  tainted and "Save image" can make a PNG.
- UI checks without touching Hudl: open the dev app as `app.localhost`, which
  makes it use `/helper` instead of 127.0.0.1:8766, and proxy that to a stand-in
  serving a saved `/library`. Opening the app against the real helper starts the
  app-open check (D-023).
- Player names display re-cased ("Chris Demo") by `displayCode`, applied once
  in `useHudlLibrary`; it relies on the `looksLikePlayer` heuristic, so a name
  with digits or brackets ("THEO (T)") stays as written, and "MCDONALD" becomes
  "Mcdonald". Never compare codes with `===`; use `sameCode`.

## One team across seasons (owner request 2026-11-13)

- A team is the same players moving up an age group each season: U11 in
  2026/27 = U10 in 2025/26 = U9 in 2024/25. `lib/teams.ts` keys it as
  (season's first year - age) and matches any of a video's age memberships
  (mixed groups like "U9/U10" count for both). Undated videos belong to no team.
- Opponents, the match page's head-to-head and the season report use one team;
  never aggregate across age groups (different players). The choice is kept in
  `fm.opponents.team`; first time it follows a link, then the Library's age
  group, then the age group the primary player is tagged in most this season.
- Report cards embed crests as data URLs (fetched from `/api/team-logo`) so the
  PNG export never hits a tainted canvas; `lib/reportLayout.ts` moves a value
  under its label when both do not fit on one line.

## Veo match page (owner request 2026-11-13)

- A Veo card opens `/veo/:id` (`pages/VeoMatchFullPage`), laid out like a Hudl
  match: highlight-type rail, score, Download full match, player with Next/Previous
  (N/B) and the drawing board, Match insights, highlight tiles. This replaced the
  earlier same-day request that sent Veo cards to the Clip explorer, which still
  lists Veo matches (`VeoMatchView`, embedded).
- Opening the page starts Watch once, like Hudl's stream (one Veo read if the
  helper has no video address in memory). Expired matches start nothing.
- Veo highlights have a type and time but no team (`lib/veoInsights`), so the
  stats count both teams and say so: goals, shots, first goal, busiest 5 minutes,
  per half, a 5-minute bar chart that seeks. No possession or player stats.

## Show Hudl / Show Veo, Veo reels, crest search (owner requests 2026-11-13)

- The Connections switches choose which libraries All matches and the Clip
  explorer list (`connectionShown`); they never remove the Hudl or Veo box.
- Reel Studio takes `{ source: "veo" }` (one match): cards use the Veo team name
  (`useVeoTeam`), never Hudl's; with none set it says so and links to Settings.
- Club crests: "Find the crest on the web" opens a Google image search for
  "<club> FC crest" (side code and age dropped) in a new tab; the dashed box takes
  a pasted (⌘V) or dropped image.

- Veo match page tick boxes (owner request 2026-11-13): ticked highlights drive
  Play Tagged (back to back, `taggedPlaylist`/`advanceTagged`), Download (Hudl's
  `DownloadChoice`: one video or separate files) and Make highlight reel; with none
  ticked, the highlights shown (after the type filter) are used.

- Next/Previous during Play Tagged (Hudl and Veo, owner report 2026-11-17) step within
  the queue and keep it running; they must not call `watch()`, which ends the queue. A
  video `timeupdate` can still report the old position just after a seek, so after a
  queue move the page ignores times until `arrived()` says the video is inside the new
  moment; otherwise Previous would count the earlier moment as already finished.

### Import upload (owner request 2026-11-14)

- The Import page's drop box sends the file with XHR `PUT /api/imports/upload?filename=`
  (raw body, progress shown). The backend writes `<import root>/uploaded/.<hex>.part`,
  then `publish_new` to the cleaned name, or `<stem> (2).<ext>` and so on; it never
  replaces a file. Listed and imported as `uploaded/<name>`; the upload is kept.
- Docker: `/inbox` stays `:ro`; only `${FM_HOST_INBOX}/uploaded` is mounted writable on
  top of it. nginx has its own `location = /api/imports/upload` (50 GB, request
  buffering off) because the general `/api/` limit is 210 MB.
- Show Hudl off with Show Veo on: `LibraryPage` maps Veo matches through
  `veoAsHudl` into the Hudl hero/latest panels; `matchScore` returns Veo's score
  (`source: "veo"`) for them.

### Reel cards: score and team stats (2026-11-15)

- Match card: `score` replaces "VS" when "Show the score" is ticked (default on).
- Stats card (`kind: "stats"`, at most 9 rows) draws on a dark panel with the fixed
  team colours (OURS cyan, THEIRS orange): the themes' accent and ring were the
  same yellow on Kick-off, so the sides could not be told apart.
- The studio preview loops each card with a fade to black; a screenshot can land on
  the black frame. Sample the canvas or take several before calling it broken.

## Veo expiry queue (spec 280, 2026-11-16)

- Veo gives no expiry date per match, only `expiration_status`; the panel estimates
  from the title's `YYMMDD` date plus the retention picked (`fm.veo.retentionMonths`,
  12 or 6). "Saved" means a full-match entry in the download index; a moments
  download does not count. A match not expired but with no video is in neither list.

## Goals and keepers (spec 270, 2026-11-16)

- Nothing names a scorer: Hudl player tags overlap a goal 3 to 4 at a time (they mark
  who was involved), and Veo gives no names. Reports never show a guess, only what the
  owner saved.
- Hudl tag timing (measured 2026-11-16 on 154 cached matches): a goal tag is 25 s and
  the ball goes in 20 s in (BALL OUT OF PLAY starts there on 1243 of 1529 goals). Player
  tags are mostly 10 or 15 s and the touch sits a third of the way from the end (best
  match with our possession at 7 of 10 s, 10 of 15 s). The "Likely" scorer is the
  player whose touch is nearest the ball going in (12 s before to 3 s after, touches
  after counted double); most overlap is only the fallback. The most-overlap rule
  picked the build-up player: it agreed with the nearest touch on about half the goals.
- `looksLikePlayer` treats "keeper" as football vocabulary, so a player whose surname is
  Keeper would not be found; test names avoid it.
- Hudl has no save code. Likely saves = opposition ON TARGET tags not overlapping an
  opposition goal; null (not counted) when the match has no ON TARGET codes at all.
  Each save and conceded goal goes to the keeper in goal at that time.
- Keeper inference (spec 400, 2026-11-21) supersedes the original global votes.
  Score active player tags starting 0–30 s before our goal kicks with inverse
  distance from a four-second lead, normalized per kick. Keep all candidates:
  selecting just the closest player loses the keeper when a teammate overlaps.
  Each code name has at most one weight per kick; duplicate kick ids count once.
  Infer independently between END HALF markers, retaining the within-period
  2.5-vote change penalty. This permits repeated rotations across four periods.
  Exact score ties and spells with fewer than two supporting kicks stay unknown
  (explicit goalkeeper-code evidence can support a single observation).
  A closing END HALF whose window ends with the recording opens no new period.
  Otherwise empty periods remain gaps; do not extend the previous keeper.
- Conceded goals use estimated ball-in time, not the padded clip start. An owner
  assignment wins, then a matching inferred spell; only a single confirmed keeper
  can be used without timing. Multiple names never imply that the first conceded
  every unresolved goal. Unknown goals and inferred saves retain an unnamed row.
  The edit form says Keeper not assigned. Shared spells also feed outfield stats
  and estimated minutes; no age, season or roster is hard-coded.
- Local cached-metadata audit: 229 nonempty matches, 180 with named spells; 281 of
  965 conceded goals unassigned. These are coverage counts, not measured accuracy.
  The owner reference now yields the two owner-named keepers alternating across
  four periods. Real rosters, cached payloads and names remain outside Git.
- Veo goal ids are `t-<own|opponent>-goal-<ms>`, the same as its team moments, so an
  owner's scorer stays attached across refreshes.

## Game-state timeline (spec 290, 2026-11-16)

- The match-page strip ("How the score went") and the Match recap (spec 310) were
  removed at the owner's request on 2026-11-16; the season report lines remain.

- Goals come from `matchGoals` (spec 270), so owner edits count; an owner-added goal
  has no time, which makes that match incomplete for game state by design.
- Hudl's tagged score and `goals.ts` can disagree (a single unplaced "<club> GOAL"
  code with no club set): such a match shows "no score" and is left out.

## Match page tabs (spec 320, 2026-11-16)

- `components/match/MatchSections` lays out both match pages under the video: the
  momentum bars as "Match timeline" (compact, with playhead), the summary strip
  (`lib/matchSummary.ts`), then tabs. Inactive tab panels stay mounted and are hidden by
  the `hidden` class, not the `hidden` attribute: a Goals and keepers edit survives a tab
  switch. jsdom loads no CSS, so tests see every panel; tests of the tabs themselves
  check `aria-selected` and the `hidden` class.
- The timeline's chart is labelled "Match timeline" and Insights keeps "Momentum chart",
  so tests that look the chart up by name find one each.
- Team stats stays one table (narrowed to `max-w-3xl`): two tables would repeat the
  column headers for screen readers.
- `FM_API_PROXY=http://127.0.0.1:8765` (launch entry `frontend-live-api`) runs the dev
  server against the running app's API, to check a layout on real data. Opening a match
  page there starts that match's stream, as in the app.

## Dropdowns and the hosted account button (2026-11-19)

- Chrome drew its own grey arrow and light list on `select.field`; Safari did not. Every
  `select.field` now draws the app's chevron (`appearance: none`), and `:root` declares
  `color-scheme: dark` so the opened list is dark in every browser.
- A hosted family now signs straight into their library (gateway change), so the header has
  a round account button (`HostedAccountLink`, hosted builds only) back to the gateway's
  account page for password, two-step sign-in and sign out.
- 2026-11-19: the gateway's admin account has its own library. In a hosted build the header
  asks the gateway's `/_portal/api/me` (same origin) and shows an **Admin** button
  (`HostedAdminLink`, shield icon, label hidden on phones) to the admin only; it opens
  `/_portal/admin`. The admin API checks the role itself, so the button is not the guard.

## Match player stats (spec 350, 2026-11-21)

- Player stats sits between Goals and keepers and Insights in `MatchSections`.
  `lib/playerStats.ts` counts each own-team event once per player when its time
  overlaps an outfield player tag. It does not identify the passer/shooter.
- A missing own-team event code produces null (dash), not zero. No possession or
  player tag is interpreted as a pass. Veo has no named player stats in our cache.
- Keeper spells partition player-tag windows so events while in goal are excluded;
  a keeper who later plays outfield keeps their outfield involvement. Owner-named
  keepers without timed spells are excluded for the match. Existing inference is
  unchanged, including its uncertainty.
- Stats use responsive cards (six columns on wide screens, three on phones),
  search/sort and inline clip review. Match goals are memoized so video time updates
  do not recalculate the player comparison.

### Goals and offsides (spec 360, 2026-11-21)

- Goals are the exception to overlap counts: reuse the scorer in `matchGoals`,
  counting confirmed assignments and visibly marking likely guesses. Unassigned
  goals are excluded, rather than credited to all involved players. A goal added
  without a time counts but its clip entry says Time not recorded and cannot seek.
- Offsides match our OFFSIDE/OFFSIDES tags using the existing outfield overlap
  windows; an opposition offside is excluded. Eight metrics use four columns on
  desktop and two on phones.

### Full player actions and playing time (spec 370, 2026-11-21)

- Player comparisons prefer `moment.actions` linked to the same player over
  team-event overlap for each available metric; never add both sources. Every
  direct-action event counts once for that player, not overlapping teammates.
  The clips panel names its source; direct count cells say Player action.
- Seventeen stats are grouped into Attacking, Defending, Possession & discipline.
  Stats shown filters the same group across players; All stats remains the default.
  Missing labels stay unrecorded. Goals keep the existing scorer logic.
- Minutes played is an explicit user-confirmed number, never clip lengths or a
  first/last-tag estimate. `/api/player-minutes` stores a match-specific map in
  preferences using a hashed key that fits its 80-character column; names are
  canonicalized. Values survive backup/restart, accept zero and can be cleared.
  Query cache updates both the row and minutes sort immediately after saving.

### Estimated minutes (spec 380, owner request 2026-11-21)

- Supersedes spec 370’s confirmed-only display: timed player tags now supply an
  explicitly approximate fallback. Use first/last estimated touches per END HALF
  period; subtract union of known keeper spells. No inferred substitutions or
  extrapolation to period edges. A single distinct touch cannot estimate minutes.
- Sparse tags can underestimate unobserved edges or overestimate absences; without
  END HALF markers breaks may be counted. This is stated in each estimated row.
  Confirmed preferences (including zero) win; clearing restores the fallback.
- The comparison sort uses the same confirmed/estimated value shown in each row.

### Action profile presentation (spec 410, 2026-11-21)

- Owner selected Action profile mockup 2. Identity/minutes sidebar stacks above bars
  on phones. Positive counts get horizontal bars, zeros get selectable text, missing
  values remain dashes inside Sources and unrecorded stats.
- Every bar uses one maximum across all players and the selected metric group,
  independent of search/sort, so equal counts have equal lengths. These are counts,
  not performance ratings. Each bar has an accessible meter and a labelled clip button.
- Source descriptions distinguish attached player actions from team-tag overlap.
  Likely goals remain marked. Minutes have a compact correction control and an
  expandable estimate explanation; stored and estimated values are unchanged.

### Administrative tags are not players (spec 420, 2026-11-21)

- `looksLikePlayer` is shared by name display, Library counts, insights, clip sorting
  and goal/player-stat inference. Two/three plain words alone accept administrative
  labels. Local cache audit (230 nonempty matches, 406 categories) found Period Start,
  Analyst Clip(s), Analysts Focus, Coach Clip, Physical Focus, Yellow Set Piece and
  Bib Set Piece. All now fail the shared predicate via explicit phrase patterns.
- Goal inference already had an extra analyst/coach/focus exclusion; other consumers
  did not. Central filtering fixes those too. Keep exact phrase semantics rather
  than globally banning words such as Start that may be real surnames.
- Defensive variants include Period End, plural coach clips, technical/tactical focus
  and other one-word set-piece prefixes. The label remains a tag; only its treatment
  as a player changes. This remains a heuristic over free-text codes, not a roster.
