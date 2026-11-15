# 009: Reading Veo's analytics and match data the app does not use yet

**Status:** answered 2026-11-14 (check run; using the results is a separate request)
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

ANSWER: 2026-11-14, owner: "Yes, run the check".

## Result of the check (2026-11-14)

One sign-in, 14 GETs 1 s apart, on one match with video (28 highlights, 4-2). No
POST, no match page, nothing changed on Veo; no refusal stopped the run. Only
status codes, field names, counts and event-type labels were kept.

| Path | Status | What it holds |
|---|---|---|
| `matches/<slug>/` | 200 | match record: `opponent_short_name`, team colours, formations, `duration`; `opponent_club_name` was empty |
| `feature-processing-status/` | 200 | `followcam`, `interactive`, `ai_detection`, `analytics`, `player_spotlight` (values not kept), `match_report.available` |
| `analysis/matches/<slug>/match-report/` | 200 | **team-sided events** (28: goals and shots, each with `team`, period and video time), **key stats own v opponent** (goals, total attempts, corners, fouls, free kicks; full time and per period), scorers by side with times (no names), home and away team with `crest_url` for the owner's side, lineup block |
| `/api/mes/v2/<id>/match-events` | 200 | **101 events with `team`**: corner kicks, fouls, free kicks, goals, goal kicks, kick-offs, out of play, shots, throw-ins; `x`/`z` (pitch position) empty |
| `/api/mes/v2/<id>/ui/score` | 200 | `{own, opponent}` |
| `lineup/`, `roster/` | 200 | empty (no players entered on Veo) |
| `stats/` | 403 | refused (Analytics subscription, most likely) |
| `coach-assist/.../insights/` | 403 | refused (Veo's AI insights are not on this account) |
| `match-momentum`, `quality` | 404 | not produced for this match |
| `events/`, `player-moments` | 400 | need parameters Veo's app sends; not tried further |
| `analysis/heatmap/` | 405 | not a GET |

What this means: on this account Veo gives, for free, every detected event with
**which team** it was (the highlights list has no side), plus own-v-opponent key
stats and the owner's club crest. Pitch positions, heatmaps, tracking, player stats,
momentum and AI insights are not available (paid Analytics, or not processed).

Using these reads needs `_client` to allow GETs under `/api/mes/v2/` and the
match-report path (today it allows `/api/app/` only). That is the next request.

**Built 2026-11-14 (owner: "Yes, add them"):** `_client` allows only
`/api/mes/v2/<uuid>/match-events` beyond `/api/app/`. Refresh reads the report and
events once per match with video and caches the team-split result; the Veo match
page shows it as Team stats.

**Follow-up 2026-11-15 (owner: "activate post requests as well", "add the maps
feature"):** a second one-off check tried the read-type POSTs Veo's own analysis
page sends (heatmap, team stats, passing network) and the possession read. All were
refused or empty on this account (403/404/422; no pitch positions), so no POST is
enabled and there is no map data to show. Per-side totals (`teams/{Own,Opponent}/
stats`, GET) answered and are now read; the club crest from the report is saved.
Details: `docs/system/domains/connectors/README.md`. If the owner adds Veo's
Analytics subscription, the check can be run again.

**Physical and tracking check 2026-11-15 (owner: "Yes, run the check"):** one sign-in,
five GETs 1 s apart on the same match, no POST, nothing changed on Veo. Only status
codes and field names were kept.

| Path | Status | What it holds |
|---|---|---|
| `matches/<slug>/` | 200 | match record; `ras_status` (Veo's player-tracking processing state) is null |
| `/api/mes/v2/-/physical-metrics?matchIds=<id>` | 403 | refused (paid Analytics, most likely) |
| `/api/mes/v2/<id>/physical-metrics-detail` | 200 | empty list |
| `/api/mes/v2/<id>/teams/Own/physical-stats` | 200 | empty list |
| `/api/mes/v2/<id>/player-tracking?start=0` | 404 | not produced for this match |

Speed zones (`speed-zone-distribution`) are a POST that asks Veo to compute them, so
it was not sent. What this means: this account has no physical metrics or player
tracking for its matches (tracking was never processed, and the cross-match read is
refused). Event metrics stay as built: team-sided events and key stats. If Veo's
Analytics subscription is added and a match is processed for tracking, the same five
reads show whether data then appears.
