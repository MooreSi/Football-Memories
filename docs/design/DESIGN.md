# Design

**Rule (owner, 2026-11-09): the GUI is built from the owner's reference images.**
Every screen names the reference it follows, and is checked side by side
against it in the browser before it is called done. Take layout, hierarchy,
density and mood from the references; never copy their sample photos, brand
names or text, and never show invented data (no fake scores, odds or ratings).

| Reference | Used for | What we take |
|---|---|---|
| [01-ai-dashboard.webp](reference/01-ai-dashboard.webp) | **App shell, Library (dashboard)** | pill top nav (active pill labelled + glowing, others round icons), 3 columns: overview tiles + ranked bars left, big hero with carousel arrows/dots centre, "latest match" panel with team discs and a big blue **Watch now** button + list right; floodlit stadium mood |
| [02-smart-tagging-player.png](reference/02-smart-tagging-player.png) | **Match page / clip player** | left rail: back + title, match card, uppercase tag rows with counts and a solid blue active row; centred match header pill; big video; clip bar (start / tag / end); removable filter chips + blue "n selected" pill; full-match timeline with yellow pins |
| [03-player-card-profile.webp](reference/03-player-card-profile.webp) | **Player Hub** | player card with photo and key numbers, teams/numbers/roles chips, teammates row, skills radar and per-match bar chart (from tag counts only, labelled as tag counts, not ratings), vertical clip feed |
| [04-match-stats-key-bars.webp](reference/04-match-stats-key-bars.webp), [05-match-stats-tiles-charts.webp](reference/05-match-stats-tiles-charts.webp), [06-match-stats-network.webp](reference/06-match-stats-network.webp), [07-match-stats-standouts.webp](reference/07-match-stats-standouts.webp) | **Match page: Match stats tab** (owner, 2026-11-26) | "What stood out" card with highlighted figures, headline tiles with big number and recent-form delta, three ruled columns of centre-out comparison bars, ring charts, gradient bar charts; dark rounded cards with small uppercase subtitles. Not taken: passing stats, pass network and player photos (no such data in the app), green/grey team colours (the app's cyan/orange pair stays) |

## Screen to reference status

| Screen | Reference | Status |
|---|---|---|
| App shell / navigation | 01 | redesigned: labelled desktop tabs, compact phone icons, active pill; screen-specific canvas |
| Library | 01 | redesigned: charcoal glass, overview / tall footage hero / latest match; single column on phones |
| Match page | 02 | redesigned: compact navy workstation, 250px tag rail, video/timeline; phone filters precede the moment list |
| Connected Hudl Library / match | 01 / 02 | All matches contains footage cards with shared age/season/search filters; navy player workspace with code rail and real download actions |
| Import, Connections | 01 styling | done |
| Player Hub (+ chooser) | 03 | shared charcoal canvas/panels, periwinkle shield and bars, blue radar, dark phone feed (owner consistency request, D-014) |
| Clip Explorer | 02 | done: event-type rail with counts + solid active row, PLAYLISTS panel with "+", clip bar, queue, moment-frame cards |
| Settings (Playback, Storage + archive tools, Backups, Connections) | 01 tiles/panels | done |
| Highlight reels (list + builder) | 02 queue/clip bar + 01 panels | done; title cards drawn in the app's palette |
| Memories Timeline | 03 styling | done (season > month > match > moment; all / favourites / unwatched / by type) |
| Library "Your player" card | 01 (MVP card slot) | done |
| Match page: Match stats tab | 04-07 | done 2026-11-26: checked at 1440 and 375 px against a real Veo match |

## Screen themes (`frontend/src/screens.css`)

The owner re-supplied all three references and requested distinct screens on
2026-11-09 (spec 100). `AppShell` sets `data-screen` from the existing route:

| Route | Canvas | Accents |
|---|---|---|
| `/` | warm charcoal (#151619), neutral translucent cards | periwinkle navigation, blue Watch action |
| `/matches/:id`, `/clips…` | flat navy (#0c111d), compact bordered panels | blue active rows, yellow timeline pins |
| `/player…` | shared charcoal (#151619) | periwinkle shield/bars, blue tag radar, dark phone feed |
| `/import`, `/settings…` | charcoal utility screens | shared form/control styles |

Theme variables are scoped to `.app-surface`, never `body`; the phone feed
restores its own dark variables. Shared behaviours and APIs stay identical.
CSS imports must precede other rules; screen CSS is intentionally unlayered to
override component utility defaults. Desktop and 375px Safari previews checked.
Only existing match thumbnails and uploaded player photos provide imagery.

## Base tokens (`frontend/src/index.css`)

| Token | Value | Use |
|---|---|---|
| `ink-950 … ink-700` | #060a14 → #1a2542 | backgrounds, panels, raised surfaces |
| `fg / fg-muted / fg-subtle` | #e8eef8 / #93a1bd / #64728f | text hierarchy |
| `accent` | #22d3ee | electric cyan: focus, active, highlights |
| `violet` | #7c5cff | secondary gradient stop, age-group badges |
| `pin` | #facc15 | moment pins and times (reference 2's yellow markers) |
| blue CTA | #1d4ed8 → #2563eb | primary actions (Watch now, active rows), as in references 1 and 2 |
| `ok / warn / danger` | green / amber / red | states only |
| `.panel` / `.tile` | translucent glass, 24px / 20px radius | every card surface |

Team identity uses a real cached club crest (`TeamBadge`) with initials on lookup
failure. Aston Villa and Stoke City use official club CDN images; other
unambiguous club names can resolve through Wikipedia pageimages. Age groups
share the club identity. No invented crests, ratings or inferred affiliations.

## Rules

Colours only from tokens or the two CTA blues above; motion is short and
disabled under `prefers-reduced-motion`; every control does something real;
visible focus rings; no horizontal scroll at 375px.

Spec 180 refines reference 02 Clips into one main analysis workspace with a
secondary saved-tools disclosure. Reference 03 memories use compact chronological
match cards with progressive expansion; charts and tag feeds stay bounded on
phones. Desktop and 375px review completed; real footage/metadata only.

Owner selection 2026-11-21 (spec 410): match Player stats follows the Action profile
mockup selected in chat: player identity/minutes beside common-scale horizontal action
bars, compact zero counts, expandable sources/unrecorded stats. Retains reference 02
navy/cyan palette and stacks at phone width; no invented ratings or player imagery.
