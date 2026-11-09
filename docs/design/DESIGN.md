# Design

**Rule (owner, 2026-11-09): the GUI is built from the owner's reference images.**
Every screen names the reference it follows, and is checked side by side
against it in the browser before it is called done. Take layout, hierarchy,
density and mood from the references; never copy their logos, photos, brand
names or text, and never show invented data (no fake scores, odds or ratings).

| Reference | Used for | What we take |
|---|---|---|
| [01-ai-dashboard.webp](reference/01-ai-dashboard.webp) | **App shell, Library (dashboard)** | pill top nav (active pill labelled + glowing, others round icons), 3 columns: overview tiles + ranked bars left, big hero with carousel arrows/dots centre, "latest match" panel with team discs and a big blue **Watch now** button + list right; floodlit stadium mood |
| [02-smart-tagging-player.png](reference/02-smart-tagging-player.png) | **Match page / clip player** | left rail: back + title, match card, uppercase tag rows with counts and a solid blue active row; centred match header pill; big video; clip bar (start / tag / end); removable filter chips + blue "n selected" pill; full-match timeline with yellow pins |
| [03-player-card-profile.webp](reference/03-player-card-profile.webp) | **Player Hub** | player card with photo and key numbers, teams/numbers/roles chips, teammates row, skills radar and per-match bar chart (from tag counts only, labelled as tag counts, not ratings), vertical clip feed |

## Screen to reference status

| Screen | Reference | Status |
|---|---|---|
| App shell / navigation | 01 | done |
| Library | 01 | done (desktop 3 columns; tablet hero first, side columns paired; phone single column) |
| Match page | 02 | done (video first below 1280px) |
| Import, Connections | 01 styling | done |
| Player Hub (+ chooser) | 03 | done: shield card with photo (or initials), teams/numbers/position with Edit, tagged-with carousel, dates column, tag radar, moments-per-match bars, phone moments feed |
| Clip Explorer | 02 | done: event-type rail with counts + solid active row, PLAYLISTS panel with "+", clip bar, queue, moment-frame cards |
| Memories Timeline | 03 styling | done (season > month > match > moment; all / favourites / unwatched / by type) |
| Library "Your player" card | 01 (MVP card slot) | done |

## Tokens (`frontend/src/index.css`)

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

Team identity is an initials disc (`TeamBadge`): we never invent crests or flags.

## Rules

Colours only from tokens or the two CTA blues above; motion is short and
disabled under `prefers-reduced-motion`; every control does something real;
visible focus rings; no horizontal scroll at 375px.
