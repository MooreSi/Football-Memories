# Football Memories: product brief (owner's original, 2026-11-09)

This is the owner's brief, kept verbatim in substance so any agent can pick up
the work. Where it conflicts with what Hudl permits, the resolution is recorded
in [HUDL_INTEGRATION.md](../HUDL_INTEGRATION.md) and
[owner-decisions/](owner-decisions/README.md). Progress against it is tracked
in [todo/football-memories/PROGRESS.md](todo/football-memories/PROGRESS.md).

Design references supplied by the owner: [design/reference/](design/reference/).
The owner's three headline screens:

1. **Match Library**: dark, premium dashboard with match thumbnails, team
   filters, search, newest matches, download status and recently added clips.
2. **Match and clip player**: full-screen playback, tagged event markers,
   player filters, playlists, adjustable playback speed and clip creation.
3. **Player Memories**: a player profile combining clips from multiple games
   into a visual timeline of their football journey.

---

## 1. Role

Expert full-stack architect, senior React developer, Python backend engineer,
video processing specialist, UI/UX designer and QA engineer. Design and build a
professional-grade, fully functional application called **Football Memories**.
It connects to the owner's authorised Hudl account, discovers matches,
organises tagged moments, maintains a searchable local archive, and gives a
visually impressive way to watch and preserve the owner's son's football
journey. A real application, not a proof of concept or mock screens. Build it
iteratively with working functionality, maintainable architecture, automated
tests and clear documentation. Implement, validate, continue through phases.

## 2. Primary objective

Make it exceptionally easy to:

- Connect to the Hudl account and securely maintain an authenticated session.
- Browse all available age groups, teams and matches.
- Display matches with thumbnails, descriptions and metadata.
- Watch whole matches in the app.
- View and filter tagged moments by player or football action.
- Watch an individual clip or a continuous playlist of clips.
- Select a player and view their tagged moments across matches, seasons, teams.
- Download permitted full matches and clips at the highest available quality.
- Choose local download locations and maintain an indexed archive.
- Automatically check for new footage/tags and download permitted content per preferences.
- Maintain a favourite player profile across sessions.
- Notify when new matches or unseen clips featuring that player appear.
- Preserve footage long term without relying on continued Hudl availability.

Premium sports-platform look with the simplicity of a personal memories app.

## 3. Technical architecture

**Frontend:** React + TypeScript, Vite, Tailwind CSS, shadcn/ui, Framer Motion,
TanStack Query (server state), Zustand (light app state), Vidstack or Video.js,
responsive desktop/tablet/mobile, Lucide icons.

**Backend:** Python 3.12+, FastAPI, SQLAlchemy, Alembic, Pydantic, PostgreSQL,
APScheduler, persistent DB-backed jobs with retry and recovery, FFmpeg/ffprobe,
structured logging.

**Deployment:** Docker Compose; configurable bind mounts for the archive;
separate backend, frontend and database services; env-based config; persistent
data; Apple Silicon; reachable from a browser on the LAN.

Modular monolith with clearly separated components, services and adapters. No
unnecessary microservices.

## 4. Hudl integration: critical initial investigation

Login URL: https://identity.hudl.com/u/login

Investigate supported authentication, data access and download capabilities
using official documentation and legitimate functionality. Determine: official
API availability; whether browser auth and session reuse are suitable and
permitted; how teams/age groups/matches/tags are exposed; permissions needed to
stream or download; whether tag timestamps and player associations are
retrievable through supported means; how downloads can be tied to metadata.

Never assume an undocumented endpoint is a supported API. Never bypass DRM,
access controls, permissions, CAPTCHA, MFA or other protections. Never obtain
video through unauthorised stream extraction. If required functionality is not
available through authorised access, implement the nearest working
alternative, including manual imports of permitted downloads and metadata.

Interchangeable adapters: `HudlConnector`, `LocalImportConnector`,
`MockConnector` (tests). Capabilities exposed independently: can list teams,
list matches, retrieve tags, play authorised video, download full video,
download clips. **The UI must reflect actual capabilities; no non-functional
buttons.** Document restrictions and alternatives.

## 5. Authentication and credentials

Settings > Connections page. Connect via an appropriate authenticated flow;
reuse sessions where supported. Never store plaintext passwords; prefer OAuth or
hosted login; encrypt sensitive auth material at rest; OS keychain where
suitable; never expose tokens/cookies/passwords via frontend APIs or logs;
detect expired sessions; clear reconnect instructions; disconnect and erase
credentials; never bypass MFA. Page shows: state, account, last sync, teams,
capabilities, permission limitations, reconnect/disconnect.

## 6. Team and age-group management

Multiple teams and age groups with a team selector (e.g. U10-U13; illustrative,
not hardcoded). Auto-populate where the connector supports it. A team can change
age group between seasons and keep its history. Relationships: club, team, age
group, season, players, matches. Never lose historical player associations when
a player moves team or age group. Manual team/season management for imports.

## 7. Match library

Professional video cards: thumbnail, team, opposition, date, season, age group,
competition, duration, tagged-event count, favourite-player event count,
download status, watched state, offline availability, new-content indicator.
Grid/list views, lazy loading, server-side pagination, search, sort (date,
opponent, season), filters (team, player, download status, tag type),
multi-select, bulk download, bulk archive/index. Cache metadata locally; show
cached content immediately while background sync runs; never block browsing.

## 8. Match detail page

Large player, match info, team/opponent, date/season/age group, tag filters,
player filters, timeline markers, event list, download controls, favourite
controls, related matches. Watch whole match or only tagged moments. Preserve
source tag names; do not assume one taxonomy; support custom local tags.
Possible event types: saves, goals, assists, shots, tackles, interceptions,
passes, GK distributions, GK claims, one-on-ones, defensive actions, other.
Filter by multiple players/event types with AND/OR logic.

## 9. Integrated video playback

Play/pause, seek, full screen, volume/mute, speeds 0.25/0.5/0.75/1/1.25/1.5/2x,
frame stepping (local media), skip fwd/back, next/previous tagged event,
keyboard shortcuts, PiP, quality selection where supported, loop clip, autoplay
next clip, resume position, timeline with markers. Configurable pre/post event
buffer (e.g. event at 15:32 → start 8s before, end 5s after), settable globally
and per clip; correct clamping at match start/end.

## 10. Tagged clips and playlists

Clips browser filtering by teams, seasons, matches, players, tag categories,
date range. Each result: thumbnail, player, category, match, date, start/end,
duration, viewed state, downloaded state. Actions: play one, play all
continuously, reorder, save playlist, favourite, notes, local tags, export,
download where permitted, compile from local footage. Empty state when none.

## 11. Favourite player and persistent profiles

A **Primary Player**: select, persist, optional photo, display name, multiple
teams/seasons, change later; survives restart. **Player Hub**: header, avatar,
name/shirt number, team/season history, totals (matches, moments, downloaded
clips), latest/unwatched/favourite moments, season archive, event categories,
personal highlights. Never present tag counts as definitive performance stats.

## 12. Player memories timeline (core differentiator)

Interactive timeline across months and years grouped by season, month, match,
event; scroll and watch immediately. Alternative views: timeline, card gallery,
calendar, season, event category. Shortcuts: first archived game, latest game,
recently added clips, favourite saves/goals, all goalkeeper actions, season
highlights. Works for any position with excellent goalkeeper support.

## 13. Download manager

Whole match, clip, bulk, player-based, tag-based, by season; queue, progress,
speed, cancel, retry, pause/resume where possible, completed/failed, destination.
Always the highest legitimately available quality; never silently reduce
resolution; report quality accurately. Store: resolution, frame rate, codec,
bitrate, size, duration, date downloaded, source match, player, tags, path,
checksum. Support asynchronous official export workflows and manual import of
the highest-quality source.

**Download location:** folder/storage configuration page; distinguish browser
file selection from server-side directories; Docker bind-mounted paths; check
existence, write permission, free space, accessibility, naming conflicts.
Layout e.g. `FootballMemories/{Players,Matches,Clips,Compilations,Thumbnails}/`
grouped by player/season/team/match. Never allow arbitrary filesystem traversal
through the API.

## 14. Smart storage and indexing

Every match and clip indexed. Separate source records from local media files. A
clip may be a time range within a full-match file (no duplicate file); play
events directly from the local match file; only cut physical clips on request.
FFmpeg for authorised processing. Tables: matches, players, teams, seasons,
source media assets, local media assets, tag definitions, tagged event
instances, event-player links, playlists, playlist items, player preferences,
playback history, download jobs, sync jobs, notifications, settings. Stable
source IDs; dedup by source IDs, timestamps, sizes, hashes; handle renamed or
changed source matches; keep local files if a source match disappears; old media
stays playable after disconnecting Hudl.

## 15. Automatic synchronisation

Schedules: manual, 6h, 12h, daily, weekly, custom. Compare source metadata to
local DB; detect new matches, new tags, updated associations, new player clips,
changed metadata. Never re-download existing files. Policies: metadata only, new
matches, new primary-player clips, clips matching tags, all authorised footage,
selected teams/seasons only. Request limits, exponential backoff, retries,
idempotent jobs, execution history, crash recovery, activity page.

## 16. New content notifications

On start or after sync, find new events for the Primary Player: e.g. "5 new
moments featuring your player" with match, date, count, event types, view, mark
seen, dismiss. Notification centre; states newly discovered/viewed/unviewed/
downloaded/not downloaded. No repeat alerts once acknowledged; persistent;
dedupe by source event identity and revision. Optional browser notifications.

## 17. Custom clip editing

Adjust in/out, preview, create clip from local match, title, description,
notes, players, custom tags, save to collection, export MP4. Stream copy when
frame accuracy is not needed, re-encode when it is; explain tradeoffs. Never
overwrite source footage.

## 18. Highlight reel builder

Compilations (e.g. best saves of the season, U11 highlights, GK distributions,
favourite moments of 2026, "my son's football journey"): select clips,
drag-and-drop order, preview, simple opening/ending titles, transitions where
practical, export via FFmpeg. Local authorised footage; simple and reliable first.

## 19. Professional UI/UX

Original design (not a Hudl clone). Dark navy/charcoal, electric cyan accents,
subtle violet-to-blue gradients, crisp typography, large thumbnails, glass-like
panels where appropriate, refined hovers, smooth transitions, clear hierarchy,
compact readable data, minimal clutter; no excessive animation/neon. Screens:
Dashboard, Match Library, Match Detail, Clip Explorer, Player Hub, Memories
Timeline, Playlist & Highlight Builder, Download Manager, Notifications,
Settings & Integrations, Storage Management, Activity & Sync History.
Responsive; desktop/tablet first, usable mobile nav; reusable design system;
keyboard nav, focus states, contrast, reduced motion. **Real functionality
behind every control.**

## 20. Dashboard

Primary player at top. Metrics: matches indexed, tagged moments, unwatched
moments, archived matches, saved clips, new content. Sections: Continue
Watching, Newly Discovered Moments, Latest Matches, Favourite Player Highlights,
Recent Downloads, Memories Timeline. Quick actions: Sync Now, Browse Matches,
View Player Clips, Download New Clips, Create Highlight Reel. Quiet
operational status.

## 21. Privacy and security

Footage of children. Local-first; no mandatory cloud uploads; authentication
for LAN access; secure session cookies; API authorisation; encrypted secrets;
no secrets in source control; no sensitive data in logs; restricted storage
access; safe upload/import validation; input validation; path-traversal
protection; CORS and CSRF protection; private-by-default profiles; no public
sharing by default; explicit consent before sharing; data deletion and export.
Minimal personal data about children; no facial recognition or biometrics.

## 22. Backup and long-term preservation

DB backups, metadata export, playlist export, media integrity verification,
missing-file detection, relinking, thumbnail rebuild, search index rebuild,
restore. Preserve provenance, dates, tags. Storage health dashboard. Archive
usable without Hudl. Never delete local videos because they disappeared remotely.

## 23. Database and API design

Documented relational schema with constraints, indexes, migrations. REST APIs:
auth/session, connections, teams, seasons, players, matches, tags, events,
clips, media assets, playlists, downloads, sync, notifications, settings,
search, storage health. Pagination/filtering; efficient cross-match player
queries; stable event identity and provenance; indexes on player, match, team,
season, date, event category, viewed, download status. OpenAPI docs.

## 24. Testing and engineering standards

TDD (red, green, refactor); acceptance tests before major features. Frontend:
Vitest, React Testing Library, Playwright. Backend: pytest, API integration,
DB, media processing, scheduler, connector adapter tests. Regression
scenarios: first install, auth and expired sessions, team switching, match
discovery, tag filtering, cross-match player queries, full-match playback, clip
playback, download retry/restart, duplicate download prevention, sync after
restart, notification dedup, player preference persistence, missing source
media, missing local media, backup/restore, large libraries, storage
exhaustion, invalid file input. Mock Hudl; no live Hudl in the routine suite.
Linting, type checking, formatting, structured errors. Never claim a feature
works unless implemented and tested.

## 25. Documentation

README.md, ARCHITECTURE.md, DEVELOPMENT.md, TESTING.md, SECURITY.md,
HUDL_INTEGRATION.md, CLAUDE.md, .env.example; implementation plan and decision
log. Document install, setup, Hudl connection, folder configuration, importing
existing matches, migrations, backup/recovery, updating, troubleshooting, known
integration limitations, Docker Compose on macOS/Apple Silicon.

## 26. Implementation phases

1. **Discovery and foundation:** Hudl research, architecture, structure,
   frontend + backend, DB + migrations, Docker Compose, foundational UI,
   layout/navigation, test environment.
2. **Functional match library:** models, library, team/season filters,
   thumbnail caching, local import connector, match detail, playback, indexing,
   sample data tests.
3. **Hudl connection:** authorised auth, discovery, tag ingestion, playback,
   permitted downloads, capability/limitation display. Never block local
   archive features on Hudl restrictions.
4. **Player Hub:** primary player, preferences, multi-match views, memories
   timeline, filtering/search, viewed tracking, favourites.
5. **Downloads and automation:** queue, storage config, dedup, scheduled sync,
   incremental discovery, notifications, recovery/retry.
6. **Advanced:** clip editing, playlists, compilations, storage health,
   backup/restore, performance, tablet/mobile.
7. **Production readiness:** security review, regression suite, errors,
   accessibility, DB performance, docs, polish, deployment validation.

## 27. Acceptance criteria

1. Install and start locally from documented instructions.
2. Connect the authorised Hudl account via a supported secure flow.
3. See matches and teams the connector can legitimately access.
4. Import previously downloaded matches when direct integration is restricted.
5. Play archived video in the app.
6. Browse and filter indexed tagged moments.
7. Select the son's player profile and see moments across matches.
8. Player selection survives restarts.
9. Download authorised footage or generate clips from local video.
10. All imported/downloaded footage indexed and searchable.
11. Scheduler detects new source content without duplicates.
12. New-player-moment notifications work.
13. Recovery from failed downloads and interrupted sync.
14. Archive playable when Hudl is unavailable.
15. Professional UI on desktop and tablet.
16. Core automated tests pass.
17. Backup and restore works.

## 28. Additional guidance

Correctness and reliability over complexity. Never fabricate source data or
quietly substitute mock data for live content. Keep demo/mock clearly separate
from production. Feature flags/capability detection for connector features.
Document assumptions and proceed. Don't churn completed components; don't
compromise existing functionality for new features.

## 29. First actions

1. Research Hudl's supported auth, integration and export options.
2. Identify what can be built directly vs needs imports or permissions.
3. Concise architecture and implementation plan.
4. Database schema.
5. Project structure.
6. Initial functional foundation.
7. First vertical slice: **import match → index metadata → display thumbnail →
   play match → display tagged moments.**

Then continue through the phases, validating and testing each.

## Owner instructions added with the brief

- Save progress to GitHub and the working folder so another AI tool can pick
  up at any time and take over; this is a rule (see
  [system/rules/60-handoff.md](system/rules/60-handoff.md)).
- The attached screenshots show the intended look.
