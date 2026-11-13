# 009: Reading Veo's analytics and match data the app does not use yet

**Status:** open
**Raised by:** owner request 2026-11-13 ("is there anything else that Veo doesn't publish
that is available to use? ai data, match analytics etc.")

## What was found (public sources only, nothing sent to the owner's account)

Veo publishes no developer API. Its web app (`app.veo.co`, code downloaded the way
any browser loads it before sign-in, read as text) knows these read paths beyond the
ones the app already uses (`matches/<slug>/`, `/videos/`, `/highlights/`, `/periods/`):

| Area | Paths (GET unless noted) | Likely content |
|---|---|---|
| Processing | `matches/<slug>/feature-processing-status/` | which analyses exist for this match |
| Match stats | `matches/<slug>/stats/`, `analysis/stats/`, `analysis/matches/<slug>/match-report/` | team stats, the match report |
| Events | `matches/<slug>/events/`, `matches/<slug>/highlights/detected/` | Veo's detected events beyond highlights |
| Players | `matches/<slug>/lineup/`, `matches/<slug>/roster/`, `clubs/<c>/teams/<t>/lineups/` | names, numbers, positions (if the club entered them) |
| Maps | `matches/<slug>/analysis/heatmap/`, `analysis/player-heatmaps/`, `analysis/player-event-maps/`, `analysis/passes-and-possession/` | heatmaps, event maps, passes and possession |
| Team | `clubs/<c>/teams/<t>/key-metrics/`, `comparison-radial/` | season key metrics, radar |
| AI insights | `coach-assist/insights/matches/<slug>/insights/` | Veo's written AI insights (listing only; `:generate` is a POST that creates them and is never used) |
| Analytics service | `/api/mes/v2/<id>/match-momentum`, `ui/score`, `match-events`, `player-moments`, `player-tracking`, `physical-metrics`, `speed-zone-distribution`, `quality`, `teams/<team>/stats`, `teams/<team>/players/<p>/stats` | momentum, events with pitch x/z, tracking, physical data, per-player stats |

Notes from the code:

- The web app sends the same `Bearer` sign-in token to `/api/app/` and `/api/mes/`.
  The earlier 401 on `/api/mes/` was with the old cookie-only reads; the helper
  now copies the page's token, so these may answer. They are part of Veo's paid
  Analytics add-on; per Veo's support pages, per-player and physical data are
  "Analytics 2" (from August 2026). Without the subscription they will refuse.
- Some analytics reads are POSTs in Veo's app (`/api/mes/v2/-/team-stats`,
  `passing-network`, cross-match player stats). The helper is GET-only by rule,
  so those stay out unless the owner decides otherwise.
- Veo's match data names the owner's club crest (`club.crest`, `team.image`) and
  gives `opponent_club_name`/`opponent_team_name`, but no opponent crest.
- `matches/<slug>/download-highlights-zip/` and `download-reel-video/` exist, but
  likely start a job on Veo's side, so they are not used; the app cuts its own.

## The question

May the helper make a one-off, read-only check on the owner's account to see which
of these answer and what they contain? Proposed, for **one** match with video:

1. Sign in once (as Watch does).
2. GET, 1 s apart, no retries: `feature-processing-status/`, `stats/`, `events/`,
   `lineup/`, `roster/`, `analysis/heatmap/`, `analysis/matches/<slug>/match-report/`,
   `coach-assist/insights/matches/<slug>/insights/`, and `/api/mes/v2/<id>/` for
   `match-momentum`, `ui/score`, `match-events`, `player-moments`, `quality`.
3. Record only field names, counts and status codes (no player names, no URLs or
   tokens) in `docs/system/domains/connectors/README.md`, and a scrubbed synthetic
   fixture for tests.

No POST, no match page (which records a view), nothing changed on Veo.

## Provisional default in use

None of these are called. The app uses only the reads already documented.

## What changes if the answer is yes

The check shows what the subscription allows. Then, per source that answers:
Veo's own stats, momentum and events on the Veo match page and in insights; the
lineup for player names (helps decision 007); the owner's club crest from Veo.

ANSWER:
