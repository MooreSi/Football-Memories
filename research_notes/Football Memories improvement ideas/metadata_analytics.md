# Analytics and features from limited grassroots football metadata (no pitch coordinates)

Scope: what can be derived from per-match date/season/age group/opponent/home-away/score/half-time score/competition, Hudl Sportscode tag codes with ms start/end (player-name codes and category codes such as GOAL, SAVE, CHANCE, SHOT, attack and possession-phase codes), Veo team-sided events (goal, shot, corner, foul, free kick, goal kick, kick-off, throw-in, out of play, with video time and period), Veo key stats, and video file metadata. Audience: a parent's memories app, so every idea is rated **Robust** (facts or simple counts that do not depend on tagging diligence), **Medium** (meaningful as a season-level trend, noisy per match) or **Noisy** (do not present as a performance number; at most a gentle "story" signal).

Research method note: about 15 searches and fetches. Most professional definitions come from analytics blogs and vendor explainers; peer-reviewed small-sample evidence for grassroots youth data is essentially absent (see Gaps).

## Game-state analysis (winning/drawing/losing, time bins, first goal, comebacks, clean sheets, runs)

### Takeaway
Game state needs only goal events with timestamps, so it is the most robust "analytics" layer this archive can offer: time spent ahead/level/behind, first-goal outcomes, comebacks, clean sheets and goals-by-15-minute bins are all exact facts for matches where every goal is captured. Pro analysts treat the drawing state as the closest to a team's "natural" style and report shares of match time in each state; those definitions transfer directly, but per-season samples of 20-40 matches mean splits (for example "record when conceding first") should be shown as counts, not percentages or trends.

### Cited Findings
- StatsBomb's xPass game-state analysis plots each team's average pass difficulty when winning, drawing and losing, and argues the way a team plays when drawing is the closest of the three states to its intended style; it builds a "Divergence Score" comparing drawing behaviour against winning and losing behaviour ([StatsBomb, Using xPass to measure the impact of gamestate on team style](https://statsbomb.com/articles/soccer/using-xpass-to-measure-the-impact-of-gamestate-on-team-style)).
- A StatsBomb-hosted paper notes prior research shows losing or drawing teams prefer a more direct playing style ([StatsBomb conference paper, Influence of Game Context on Team Playing Style](https://blogarchive.statsbomb.com/uploads/2023/10/An-Analysis-of-the-Influence-of-Game-Context-on-Team-Playing-Style-2.pdf)).
- Opta Analyst reports game state as the share of total match time spent level, behind and ahead (example: one Premier League club level 29.9%, behind 32.1%, ahead 37.2% of match time in 2025-26) ([The Analyst, Premier League game state stats 2025-26](https://theanalyst.com/articles/premier-league-game-state-stats-winning-losing-2025-26)); a 2024 piece compares how teams play by game state using expected goals ([The Analyst, game state and xG](https://theanalyst.com/2024/10/game-state-how-premier-league-teams-play-expected-goals)).
- Goal timing study (3,433 matches from 21 competitions in StatsBomb open data, minute-level bins, null model of 6,000,000 simulated games): goals are rarer than uniform early in each half and rise as the match progresses (r about 0.438); there is a dip at minutes 45-50 attributed to the half-time restart; chi-squared vs uniform about 288.6, p about 3.7e-21; the last goal comes closer to the final whistle than chance predicts ([Temporal dynamics of goal scoring in soccer, arXiv 2501.18606](https://arxiv.org/html/2501.18606v1)).
- Same study: intervals between consecutive goals follow an exponential decay that the random null model fits almost exactly, so short gaps reflect the average scoring rate rather than behaviour change; however the same team scores the next goal more often than chance at short intervals ("bursty" scoring), which the authors caution may reflect stronger teams scoring consistently rather than momentum ([arXiv 2501.18606](https://arxiv.org/html/2501.18606v1)).
- The same paper does not analyse the first-goal effect or score-line-dependent rates; it proposes this as future work ([arXiv 2501.18606](https://arxiv.org/html/2501.18606v1)).
- A Poisson-model explainer notes that when few goals are expected in a match, the first goal often decides the result, whereas in high-scoring sports scoring first matters much less ([Plus Maths](https://www.pass.maths.org/ball)).
- FiveThirtyEight (NFL) asks whether scoring first causes wins or simply reflects being the better team; scoring first correlated 0.49 with full-season win percentage ([FiveThirtyEight](https://fivethirtyeight.com/features/does-scoring-first-in-the-nfl-make-you-a-good-team-or-do-good-teams-just-score-first)). Commonly quoted soccer figures (about 69% win / 19% draw / 11% loss for the team scoring first) come only from an unsourced blog and should be treated as unverified ([blog](https://carterxvier1974.blogspot.com/2022/04/what-are-odds-that-first-football-team.html)).

### Inferences
Catalogue (computation / data needed / robustness / caveat):
- **Game-state timeline per match** (Robust where all goals are timestamped): walk goal events in order, maintain score, integrate minutes in each state. Data: Veo own/opponent goal events with period and video time, or Hudl GOAL tags plus a team attribution; final score as a check (sum of goal events must equal final score, else mark state timeline "incomplete"). Show as a coloured strip under the match video (ahead/level/behind). Caveat: video time is not match time; needs per-period kick-off offset (Veo kick-off events give this directly). Half lengths vary by age group (for example U9-U10 shorter halves than U12), so normalise to "share of match" rather than absolute minutes when comparing across seasons.
- **Season share of time ahead/level/behind** (Medium): sum of the above across matches with complete goal data; mirrors Opta's presentation. Show with N matches included.
- **Goals by 15-minute (or per-quarter-of-half) bins** (Medium at season level, Noisy per match): bin goal-for and goal-against timestamps by period-relative time. Because half lengths change with age group, prefer "first/second quarter of each half" over fixed 15-minute bins. With roughly 50-100 goals a season, bins will hold single-digit counts; the pro finding that goals rise late in halves is a useful comparison but differences in a youth season will mostly be noise. Present as "when our goals came" memory chart, not a fitness claim.
- **First-goal record** (Robust as a count): W/D/L when scoring first vs conceding first. Present as counts ("scored first in 14, won 11"), never as a causal "scoring first wins games" claim, per the FiveThirtyEight caution.
- **Comebacks** (Robust): matches where the team trailed at any point and did not lose (comeback draw) or won (comeback win); also "biggest deficit overturned". Also "leads lost". Emotionally strong memory items.
- **Half-time to full-time transitions** (Robust, needs only per-half score): HT W/D/L x FT W/D/L matrix; "second-half team" story (goals for/against per half). Works even for matches with no event tags.
- **Clean sheets** (Robust given final score): count and longest streak; per goalkeeper only if a reliable keeper-per-match record exists (see player section).
- **Scoring runs / unanswered goals** (Robust): longest sequence of consecutive goals for without reply, within and across matches; "longest unbeaten run", "winning streak", "matches scored in" streaks. Bursty scoring is real in pro data but may reflect team strength, so phrase as a story ("four goals in ten minutes"), not "momentum".
- **Late goals / equalisers / winners** (Robust): last-goal timing relative to the end of the half; "winning goal" tag = the goal that put the team ahead for the last time in a win.
- Scaling by age group: U9-U11 results are not publishable under FA rules (see player section), so this all stays private to the family by default.

### Gaps
- No authoritative, sourced first-goal win percentage for soccer was found in this pass.
- No source studied game-state effects in youth or small-sided football specifically.
- FBref and The Athletic game-state definitions were not retrieved; the Opta "share of match time" and StatsBomb "drawing = natural style" definitions are the citable ones here.

## Ratings for teams from scores only (Elo, Glicko, Poisson/Dixon-Coles), predictions, strength-adjusted records

### Takeaway
Score-only rating models are well defined and cheap to compute, but the archive sees only its own team's matches against a scattered set of opponents, most of whom it plays once or twice a season, so opponent ratings will be barely estimated. They are best used internally (to weight "toughest opponent" or "best result" lists, or to show a single smooth "team form" line with an uncertainty band), not shown as numbers that rank children's teams. Glicko's rating deviation is the most honest way to show that uncertainty.

### Cited Findings
- World Football Elo adapts Elo for football with weighting by match type, a home-advantage adjustment and a goal-difference adjustment ([Wikipedia, World Football Elo Ratings](https://en.wikipedia.org/wiki/World_Football_Elo_Ratings)).
- Update rule Rn = Ro + K x (W - We), W = actual result, We = expected result ([The Conversation](https://theconversation.com/what-are-the-world-football-elo-ratings-27851)).
- K by competition: 20 for friendlies, 30 for minor tournaments (higher for major ones); goal-difference multiplier 1 for a one-goal margin, 1.5 for two goals, (N+11)/8 for three or more ([Berkeley undergraduate write-up](https://www.stat.berkeley.edu/~aldous/Research/Ugrad/Xiaochen_Yang_write-up.pdf); [Aldous Elo talk](https://www.stat.berkeley.edu/~aldous/Talks/Elo_talk.pdf)). Third-party pages give conflicting K values (for example K=60 or K=40), so the eloratings.net system page is the authority for exact constants.
- Dixon-Coles models each team with an attack and a defence strength plus a home-advantage factor, adds a correction for low scores (0-0, 1-0, 0-1, 1-1) where independent Poisson does not hold, and down-weights older matches with exponential time decay phi(t) = exp(-xi t) ([Wikipedia, Statistical association football predictions](https://en.wikipedia.com/wiki/Statistical_association_football_predictions); [regista R implementation](https://torvaney.github.io/regista); [Dixon-Coles calculator documentation](https://metricgate.com/calculator/dixon-coles-soccer-model)).
- Dixon and Coles' original fit used four seasons of data; a blogger reports a single-season fit ranked a team implausibly close to a stronger one ([The Cutback](https://the-cutback.beehiiv.com/p/simulating-football-with-dixon-coles-a-deep-dive-into-xg-data-and-predictive-modeling)).
- One implementation flags teams with fewer than 4 matches as "barely estimated rather than a genuine ranking" and warns that its observed-vs-expected table is an in-sample check, not a goodness-of-fit test (a tool convention, not from the paper) ([MetricGate Dixon-Coles](https://metricgate.com/calculator/dixon-coles-soccer-model)).
- Glicko adds a rating deviation (RD) measuring confidence: it starts high (350 in one implementation), shrinks as results accumulate, and grows during inactivity, so ratings move more after few games or a long break ([fooskill docs](https://fooskill.readthedocs.io/en/latest/overview/rating_system.html); [Chess.com support](https://support.chess.com/en/articles/8566476-what-is-the-glicko-rating-system)).
- Glicko processes games in rating periods; sources disagree on the ideal games per period: about 5-10 per player (informal forum) vs about 15-20 per player for Glicko-2 ([fooskill docs](https://fooskill.readthedocs.io/en/latest/overview/rating_system.html); [Planetary Annihilation forum](https://forums.planetaryannihilation.com/threads/psa-understanding-glicko-derived-rating-system.66563/)).

### Inferences
- **Is it meaningful with 20-40 matches a season?** For the own team: an Elo/Glicko "form line" is meaningful as a smoothed trend (Medium). For opponents: mostly not, because each opponent appears 1-3 times and the archive does not see opponents' other results. The "fewer than 4 matches = barely estimated" convention means nearly every opponent rating would be flagged.
- **Feasible approach**: (1) Own-team Glicko rating per match with RD band, reset or inflated RD at each season boundary because the squad and age group change (U9 to U10 etc.). (2) Opponent strength from a pooled Bayesian/shrunk Poisson model over all seasons, with strong shrinkage toward average; or simply use opponent goal difference against us as the crude strength proxy. Multi-season pooling is misleading because opponent clubs field different squads each year; key opponents by (club, season, age group), not club alone.
- **Toughest opponent faced** (Medium, phrase softly): rank opponents by combined goal difference against us across meetings, or by the fitted attack-minus-defence strength. Present as "the team that gave us the hardest games", with the scores, not a numeric rating.
- **Strength-adjusted record / "best win"** (Medium): weight each result by opponent strength (Elo expected score We); "best result" = largest W - We. Good narrative input ("the upset of the season").
- **Predictions**: technically possible (Dixon-Coles score probabilities), but predicting a child's team's next result is of little memory value and invites over-reading. Recommend not exposing predictions; at most use the model internally to flag surprising results.
- **Goal-difference caps**: youth scores can be lopsided (for example 12-0); cap goal difference (Elo's multiplier already grows slowly) to avoid one mismatch dominating.
- Competition weighting (league vs cup vs friendly vs tournament) can reuse Elo's K-by-match-type idea where competition is known; default to "friendly" weight when unknown.

### Gaps
- No source quantified how many matches per team Dixon-Coles or Elo need for stable estimates; the 4-match threshold is one tool's rule of thumb.
- No sources found on rating youth teams, or on handling squads that change each season.
- Bayesian/hierarchical shrinkage priors for thin data were not covered by retrieved sources.

## Tempo and rhythm from event timestamps (events per minute, set-piece share, territory proxies, shot ratios, pressure windows, momentum)

### Takeaway
Veo's team-sided restart and shot events support a "territory and threat" family of proxies: shot share, corner share, goal-kick share (goal kicks against suggest the opponent is attacking less dangerously, own goal kicks suggest we are shooting wide), throw-ins and fouls per minute. The pro analogue is field tilt (share of final-third touches or passes) and Opta's Match Momentum (per-minute comparison of each side's most dangerous action, weighted to recent minutes). A coordinate-free momentum chart built from rolling shot and corner counts is feasible and visually appealing, but it is a story device, not a measurement.

### Cited Findings
- Field tilt is a team's share of final-third touches (or passes in some definitions) out of all final-third touches/passes by both teams; it measures territory, not chance quality ([The Football Analyst, Field Tilt](https://the-footballanalyst.com/?p=8247); [Driblab](https://www.driblab.com/blog/field-tilt-percentage-of-passes-and-touches-in-the-final-third); [Spiideo AutoData definitions](https://support.spiideo.com/en/articles/16760804-definitions-autodata-soccer-advanced)).
- A 2026 arXiv paper reports field tilt correlates +0.58 with team xG while stressing that field tilt measures territory rather than possession quality ([arXiv 2608.09887](https://arxiv.org/pdf/2608.09887)).
- Opta's Match Momentum bins the match by minute, compares each team's most dangerous action (via its possession value model: probability of scoring in the next 10 seconds) and weights recent actions more heavily ([The Analyst, What is match momentum](https://theanalyst.com/articles/what-is-match-momentum)); Flashscore publishes the same chart ([Flashscore](https://www.flashscore.com/news/momentum/W82o7eCa/)).
- Defector argues the momentum chart works best as a summary for people who did not watch the match ([Defector](https://defector.com/what-on-earth-is-match-momentum)).
- A public tutorial shows computing a momentum chart from event data with rolling windows ([Medium, Kapich](https://medium.com/@aleks.kapich_64654/how-to-calculate-and-plot-football-match-momentum-using-event-data-1ca3a9ac4a39)).
- Team chance-conversion rate is close to uncorrelated season to season (R^2 = 0.002 between 2015/16 and 2016/17 in one blog's Premier League data); a three-season pooled rate correlated 0.37 with the following season ([Fantasy Football Scout, Plexiglas principle](https://www.fantasyfootballscout.co.uk/2017/07/10/the-plexiglas-principle-the-teams-set-to-improve-in-201718?hc_page=-1)).
- Stats Perform suggests Bayesian shrinkage for conversion: every player starts at a prior rate (9.12% in its example) and is updated per shot so hot starts are pulled toward average ([Stats Perform, Re-examining finishing skill](https://www.statsperform.com/resource/re-examining-finishing-skill)).

### Inferences
Catalogue:
- **Shots-for share** = own shots / (own + opponent shots) per match and season (Medium; best single "who was on top" proxy without coordinates). Data: Veo shot events or key stats "attempts". Caveat: Veo's automatic event detection and any manual tagging may miss or misattribute shots; show "about".
- **Corner share and goal-kick share** as territory proxies (Medium): corners won imply attacking pressure ending near the opponent's goal line; opponent goal kicks imply our attacks ended with the ball going out off us (often shots wide). "Territory index" = (own corners + opponent goal kicks) / (all corners + all goal kicks). Unvalidated proxy; label as "attacking pressure (rough)".
- **Set-piece share** (Medium): goals arising from corners/free kicks, identified by a goal within N seconds (for example 15 s) of an own corner or free-kick event. Window choice is arbitrary; report as "goals soon after a corner".
- **Events per minute / stoppage density** (Noisy for performance, fine as trivia): count throw-ins, fouls, out-of-play per minute of play. Mostly reflects pitch size, format (5v5/7v7/9v9 by age group) and refereeing, not team quality. Useful for "this match was scrappy" narrative only.
- **Shot conversion** = goals / shots (Noisy). Pro data shows it barely repeats season to season; for a youth team with tens of shots a season, show only with a shrinkage estimate or not at all.
- **Pressure windows** (Medium as visual, Noisy as stat): rolling count (for example 5-minute window) of own shots + corners minus opponent shots + corners; peaks = "spells of pressure". Mark goals on the line. This is a coordinate-free analogue of Opta Match Momentum; describe it as "spells when we were attacking most" with the caveat line.
- **Ball-in-play estimate** (Medium): match duration minus gaps between out-of-play and restart events; needs reliable restart timestamps, which Veo provides. Interesting for development story (ball-in-play rises with age group?), but untested.
- **Attack/possession-phase codes from Sportscode** (Medium where consistently tagged): count and average duration of attack phases per side, share of time in possession phases. Strongly dependent on who tagged and their coding window; never compare across taggers or seasons without checking the code set.

### Gaps
- No public validation was found that corners or goal kicks proxy territory; the territory-index idea is an unvalidated inference.
- Veo's own event-detection accuracy figures were not found in this pass.

## Shot quality proxies without coordinates

### Takeaway
Without location, shot quality has to come from context the tags already carry: whether it was a SHOT vs CHANCE vs GOAL code, whether it followed a set piece, whether the keeper made a SAVE, and game situation. These give at most a coarse "big chance" vs "attempt" split. Pro xG depends on location and body part, so none of this should be called xG.

### Cited Findings
- Post-shot expected goals is recommended as the primary goalkeeper shot-stopping measure because raw save percentage cannot tell a routine save from a difficult one ([Hudl, PSxG](https://www.hudl.com/blog/watch-soccer-psxg); [Sportshighlight, xG on target](https://sportshighlight.net/?p=1261)), implying shot-quality measurement depends on shot location and placement data this archive lacks.
- Finishing (conversion) shows weak repeatability, and StatsBomb argues that in a low-sample sport every data point should be used rather than split for repeatability tests ([Stats Perform](https://www.statsperform.com/resource/re-examining-finishing-skill); [StatsBomb](https://statsbomb.com/?p=7253)).

### Inferences
- **Chance tiering** (Medium if the coder uses CHANCE consistently): treat CHANCE-coded moments as "big chances" and SHOT as attempts; report "big chances created/conceded" and "big chances scored". Coder judgement drives it, so note who tagged.
- **On-target proxy** (Medium): shots followed within a few seconds by an opponent SAVE tag or an own goal = on target; shots followed by an opponent goal kick = likely off target. Works from Veo event sequences alone.
- **Set-piece vs open-play shots** via proximity to corner/free-kick events (Medium).
- **Shots per goal and goals-from-few-shots** framed as stories ("three shots, three goals"), never as finishing skill.
- Optional future: a vision model on the clip could estimate distance, but that is outside metadata scope.

### Gaps
- No source found for coordinate-free xG approximations validated in research.

## Player-level metrics from tag overlap (involvement, plus-minus, minutes, goalkeeper metrics) and youth-safeguarding guidance

### Takeaway
Player tags are evidence that a moment involving the child was clipped, not a complete record of what the child did. Counts reflect what the tagger chose to tag (tag bias). Plus-minus is noisy even in professional football due to low scoring and few substitutions; with partial minutes data it is unusable as a rating. Save percentage is misleading even for professionals. The FA prohibits publishing results and league tables for U7-U11 teams, which signals a strong norm against ranking young children. The child's data should drive memories ("moments of Sam in the 2024-25 season"), with numbers kept as gentle context.

### Cited Findings
- The FA prohibits publication of results and league tables for U7 through U11 teams; extended from U7 to U11 in 2012 after consultation as part of the Youth Development Review, and reiterated in 2015 ([The FA, 2015](https://www.thefa.com/news/2015/dec/09/fa-reiterates-youth-league-results-position-091215)).
- Cheshire FA: leagues and clubs may collect results and compile tables but must not publish them ([Cheshire FA](https://www.cheshirefa.com/news/2019/sep/25/publishing-of-results)). Some leagues display U7-U11 results as "X - X" with tables in alphabetical order ([Team Grassroots](https://www.teamgrassroots.co.uk/fa-reiterates-guidance-not-to-publish-youth-league-results/)).
- Kent FA's summary of FA rules says U12 may have any format including a season-long league table ([Kent FA](https://www.kentfa.com/news/2019/oct/01/npr-youth)). Implication for this archive: the team's U9-U11 seasons fall under the no-publication norm; U12 is where competitive tables return.
- FA Youth Award modules focus on the learning environment, decision-making and practice design ([London FA, Youth Award Module 3](https://www.londonfa.com/coaches/development-and-cpd/fa-youth-award-module-3)); the FA's development framework is the 4 Corner Model (technical, physical, psychological, social) ([The FA, 4 Corner Model](https://www.thefa.com/bootroom/resources/coaching/the-fas-4-corner-model)). No retrieved FA page directly addresses player statistics for under-12s.
- Plus-minus in soccer is largely redundant because substitution limits create few lineup combinations; low scoring and few substitutions limit adjusted plus-minus; players with little playing time get large errors; ridge regularisation trades information for less noise ([American Soccer Analysis, WOWY](https://americansocceranalysis.com/home/2019/8/14/with-or-without-you-wowy-a-plus-minus-alternative-for-soccer); [Soccermetrics, APM probably useless](https://www.soccermetrics.net/?p=2657); [American Soccer Analysis, MLS plus-minus](https://www.americansocceranalysis.com/home/2014/12/28/plus-minus-mls)).
- Save percentage treats a routine 30-yard collection the same as a top-corner diving save ([Hudl, PSxG](https://www.hudl.com/blog/watch-soccer-psxg)); a defence conceding high-quality chances drags a keeper's save ratio down while a well-organised one inflates it ([Soccerment, Vitruvian Goalie](https://soccerment.com/?p=4641)). Even goals-saved-above-expected remains affected by volume and random variation ([Sportshighlight](https://sportshighlight.net/?p=1261)).

### Inferences
Catalogue:
- **Appearances** (Robust if the "played" flag is curated): matches the child played; first appearance per age group; consecutive appearances.
- **Tagged-moment count** (Noisy): count of tags with the child's player code. Show as "clips of you this season: 23", never "involvements" or a ranking against teammates. Normalise only by "matches with player tagging", and show how many matches had player tagging at all.
- **Involvement timeline / on-pitch estimate** (Noisy): first-to-last tagged timestamp per half bounds a minimum time on the pitch; gaps longer than X minutes may indicate substitution but equally an untagged spell. Do not present minutes; at most "seen in both halves".
- **Moment co-occurrence** (Medium as memory feature): child's tag overlapping a GOAL/CHANCE/SAVE window ("you were in 6 goal clips"). Phrase as "goal moments featuring you", since overlap does not mean scorer or assister unless a code says so.
- **Plus-minus while tagged** (do not ship as a number): goals for minus against during the child's tagged windows. Pro research says plus-minus is redundant and noisy even with full lineups; with tag windows as a stand-in for minutes, it measures tagging habits.
- **Goalkeeper metrics** (Noisy): saves (SAVE tags in matches where the child kept goal), goals conceded, clean sheets. Prefer "saves you made this season" as a highlight reel rather than save %. If shown, include the caveat that save % depends heavily on the shots the defence allows. Rotating keepers in youth formats means keeper-per-match needs explicit curation.
- **Development over age groups**: show qualitative progress (clip reel per season, first goal at each age group) rather than per-season stat comparisons, because format, pitch size, and tagging practice change between U9 and U12.
- **Privacy default**: teammates' names appear as Sportscode codes; keep any per-player views limited to the owner's child and avoid leaderboards of other children, consistent with the FA no-ranking norm for U7-U11.

### Gaps
- No FA or UEFA document was retrieved that explicitly addresses individual player statistics for under-12s; the no-publication rule for results/tables is the strongest cited norm. UEFA grassroots guidance was not found in this pass.
- No research found on tag bias in amateur Sportscode coding.

## Narrative generation (templated or LLM summaries, "Wrapped" recaps, anniversaries, development charts)

### Takeaway
The data supports strong narrative features: per-match one-paragraph summaries from score, game-state timeline and notable events; season "Year in Football" recaps on the Strava Year in Sport / Spotify Wrapped model (chapters, a few big numbers, standout moments, private by default); and "on this day" anniversaries. Templates should be fact-grounded (every sentence traceable to an event) and an LLM, if used, should only rephrase verified facts.

### Cited Findings
- Strava's Year in Sport is a personalised summary of data insights, social engagement and standout moments, mobile only, requires at least three activities, and is viewable only by the user unless shared ([Strava support](https://support.strava.com/en-us/articles/15401959-your-year-in-sport)).
- Design agency Manual storyboarded the 2020 recap as chapters and built infographics from simple lines and dots to keep the data the focal point ([It's Nice That](https://www.itsnicethat.com/articles/manual-strava-year-in-sport-graphic-design-150321)); its 2021 work aimed to present data in a dynamic, celebratory way ([Manual](https://manualcreative.com/work/strava-year-in-sport-2021)).
- The 2024 edition was built in-house in Rive, sent personalised animated recaps to 5.87M athletes in 14 languages, and adapts each vignette to the athlete's own year ([Rive blog](https://rive.app/blog/strava-year-in-sport-built-with-rive)).
- Press frames Strava's recap as "like Spotify Wrapped for your activities" ([TechRadar](https://techradar.com/computing/software/stravas-year-in-sport-is-rolling-out-now-its-like-spotify-wrapped-for-your-activities)).
- Opta's Match Momentum is described as most useful as a summary for people who did not watch the match ([Defector](https://defector.com/what-on-earth-is-match-momentum)), the same audience a parent-written match recap serves (grandparents, the child years later).

### Inferences
- **Match summary template** (Robust inputs): "[Team] [won/drew/lost] [score] [home/away] against [Opponent] on [date]. [Came from behind / led from the 5th minute]. Half-time [score]. [Child] featured in [n] moments, including [goal/save] in the [second half]." Each clause gated on data presence.
- **LLM layer**: feed only a structured fact sheet (events, scores, tags) and require the output to cite fact ids; reject sentences with numbers not in the fact sheet. Avoid evaluative language about the child ("poor game").
- **Season recap chapters**: matches played, seasons' first and last goals, biggest win, best comeback, longest unbeaten run, "most watched clip", favourite opponent, goals by part-of-match chart, the child's top moments reel, clips per month. Private by default; share as video/image the parent chooses.
- **Anniversaries**: "On this day 2 years ago" for goals, first match, first match at a new age group, debut at a new club, a tournament win. Robust (needs only dates).
- **Development-over-time**: age-group-to-age-group strip (U9 to U12) of results, goals for/against per match, and a curated clip from each season; label format changes (pitch size, players per side) on the chart so comparisons are not read naively.
- **Tone guardrail**: every number shown with a short provenance line ("from 18 tagged matches"); never "rating", "score out of 10", or rank among teammates.

### Gaps
- No sources retrieved on LLM hallucination rates for sports recaps or on grounding methods specific to sports; the gating approach above is a design inference.

## Data quality (duplicates across Hudl and Veo, conflicting scores, missing tags, opponent-name normalisation, season edge cases)

### Takeaway
Most quality checks are deterministic: same date plus overlapping kick-off window plus similar opponent name identifies a Hudl/Veo duplicate; score conflicts are detected by comparing final scores and the sum of goal events; season assignment is a pure function of date (July-June) with edge cases for tournaments and pre-season. Opponent normalisation needs a curated alias table with fuzzy matching only as a suggestion.

### Cited Findings
- York and District's approach of showing U7-U11 results as "X - X" ([Team Grassroots](https://www.teamgrassroots.co.uk/fa-reiterates-guidance-not-to-publish-youth-league-results/)) means external results feeds (FA Full-Time) generally cannot be used to cross-check scores for U9-U11 matches.
- Dixon-Coles style models require consistent team identities across matches ([regista](https://torvaney.github.io/regista)), so opponent normalisation is a prerequisite for any opponent-level rating.

### Inferences
- **Duplicate match detection** (Robust): candidate pairs = same calendar date (allow +/-1 day for timezone/upload date drift) and normalised opponent similarity above threshold; confirm with score agreement and similar video duration. Merge as one match with two sources; prefer Veo for team-sided events and Hudl for player tags. Never auto-delete either video file (library safety).
- **Score conflict checks** (Robust): (a) Hudl-derived score vs Veo key-stat goals vs manually entered score; (b) per-half scores sum to the final; (c) count of goal events equals final score per side; (d) a goal event after the final whistle or before kick-off. Flag, do not auto-correct; show "scores disagree" in a review queue.
- **Missing tags** (Robust detection): match has video but zero tags; match has goals in score but no GOAL tags; child marked as played but no player-code tags; tag end before start or beyond video duration. Coverage percentage per season feeds the provenance lines above.
- **Opponent-name normalisation** (Medium): lowercase, strip punctuation and suffixes ("FC", "JFC", "Juniors", "U10", colour suffixes such as "Blue"/"Red", "Girls"), then fuzzy match (token-set ratio) to suggest merges; owner confirms. Keep team identity as (club, team variant, age group/season), because a club's U10 Reds and U10 Blues are different teams.
- **Season assignment** (Robust with overrides): season = year of date if month >= July else year - 1, labelled "2024-25". Edge cases: summer tournaments in June/July around the age-group switch; pre-season friendlies in July/August; matches played up or down an age group; league seasons that start in September. Store age group on the match, not derived from season, with derivation as default.
- **Timestamp sanity**: Veo video time vs period; Sportscode ms timings per source video; when two sources exist, compute an offset by aligning goal events.
- **Video metadata checks**: duration far shorter than the expected match length for the age group suggests partial footage; resolution/codec mismatches flag re-encode candidates.

### Gaps
- No sources retrieved on record linkage for sports archives specifically; the approach is standard entity resolution practice, not cited here.

## Search and organisation (natural-language search, smart playlists, saved filters)

### Takeaway
The metadata maps cleanly onto a filter grammar (match facets: season, age group, opponent, home/away, competition, result, score state; moment facets: code, half, minute, game state at the time, team side, child involved). Natural-language search can be implemented by an LLM translating a question into that structured filter (shown back to the user as editable chips), which keeps results exact. Smart playlists like "all goals in second halves vs teams we lost to" become saved queries.

### Cited Findings
- Game state as a filter dimension is standard in pro analysis: StatsBomb compares behaviour when winning, drawing and losing ([StatsBomb](https://statsbomb.com/articles/soccer/using-xpass-to-measure-the-impact-of-gamestate-on-team-style)), and Opta reports time in each state ([The Analyst](https://theanalyst.com/articles/premier-league-game-state-stats-winning-losing-2025-26)), which supports exposing "score state at the moment" as a moment facet.

### Inferences
- **Moment facets to precompute**: score state at the moment (ahead/level/behind and margin), half and part-of-half bin, side (own/opponent), event type, child involved (tag overlap), match result, opponent "lost to/beat/drew" relation across the season, first-meeting vs rematch.
- **Example smart playlists**: "every goal featuring [child]"; "equalisers and winners"; "goals in the last 5 minutes of a half"; "saves when we were level"; "second-half goals against teams we lost to"; "first goal at each age group"; "all comebacks"; "derby" (owner-curated opponent set).
- **NL search**: LLM converts the query into the filter JSON; app validates against known facets and opponent aliases; shows the parsed chips and the match count; no free-form answers about performance.
- **Saved filters as live playlists** that grow as new matches arrive; export as a reel.
- **Robustness**: all facets are as reliable as the underlying events. Playlists derived from Veo goals are Robust; those depending on player tags inherit tag bias, so label "moments where [child] was tagged".

### Gaps
- No sources retrieved on NL-to-filter search in sports video products; Hudl/Veo playlist features were not researched in this pass.
