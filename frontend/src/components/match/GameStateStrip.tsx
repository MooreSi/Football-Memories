import { TrendingUp } from "lucide-react";
import type { HudlMatch, HudlMoment } from "../../api/hudl";
import { formatClock } from "../../lib/format";
import { type GameState, type State, type Story, gameState, matchSpan } from "../../lib/gameState";
import { type GoalsSource, matchGoals, useGoalEntries } from "../../lib/goals";
import { type Score, matchScore, useScoreCorrections } from "../../lib/matchScore";
import { OURS, THEIRS } from "../../lib/teamColours";

type Match = GoalsSource & { id: string; title?: string; moments?: HudlMoment[]; halves?: number[][]; duration_s?: number;
  score?: Score | null; source?: string };

const FILL: Record<State, string> = { ahead: OURS, level: "rgb(255 255 255 / 0.18)", behind: THEIRS };
const STORY: Record<Exclude<Story, null>, string> = {
  "came-from-behind-win": "Came from behind to win", "came-from-behind-draw": "Came from behind to draw",
  "led-drew": "Led, then drawn", "led-lost": "Led, then lost",
};
const pct = (n: number) => `${Math.round(n * 100)}%`;

function headline(s: Extract<GameState, { complete: true }>): string {
  const deficit = s.biggestDeficit > 1 && s.story?.startsWith("came-from-behind") ? ` (from ${s.biggestDeficit} down)` : "";
  if (s.story) return STORY[s.story] + deficit;
  if (!s.goals.length) return "Level all game";
  return s.firstGoal === "ours" ? "Scored first" : "Conceded first";
}

/** Spec 290: how the score went in one match, from its goals (spec 270) and score. Shown
 *  only when every goal has a time and the goals add up to the score. */
export function GameStateStrip({ match, club, onSeek }: { match: Match; club: string | null; onSeek?: (t: number) => void }) {
  const entries = useGoalEntries();
  const corrections = useScoreCorrections();
  if (entries.isPending || corrections.isPending) return null;
  const goals = matchGoals(match, club, entries.data?.[match.id]).goals;
  const score = matchScore({ id: match.id, moments: match.moments, source: match.source as HudlMatch["source"], score: match.score ?? undefined }, club, corrections.data);
  const span = matchSpan(match);
  const s = gameState(goals, score, span);
  const start = span?.[0][0] ?? 0, end = span?.[span.length - 1][1] ?? 0, width = end - start;
  const at = (time: number) => `${((time - start) / width) * 100}%`;

  return <section aria-label="How the score went" className="panel space-y-3 p-5">
    <h2 className="flex items-center gap-2 text-xl font-semibold"><TrendingUp size={18} className="text-accent" aria-hidden /> How the score went</h2>
    {!s.complete ? <p className="text-sm text-fg-muted">{s.reason}</p> : <>
      <p className="text-sm font-medium">{headline(s)}{s.longestRun && s.longestRun.goals >= 3 ? ` · ${s.longestRun.goals} goals in a row ${s.longestRun.side === "ours" ? "for us" : "against"}` : ""}</p>
      {s.segments.length > 0 && width > 0 && <div className="relative pt-6">
        <div className="flex h-3 overflow-hidden rounded-full">
          {s.segments.map((seg, i) => <span key={i} data-testid="game-segment" data-state={seg.state} title={seg.state}
            style={{ width: `${((seg.to - seg.from) / width) * 100}%`, background: FILL[seg.state] }} />)}
        </div>
        {s.goals.map((g, i) => {
          const label = `${g.ours}-${g.theirs} at ${formatClock(g.time_s)}`;
          const mark = <span className="block -translate-x-1/2 rounded bg-ink-900 px-1 text-[11px] tabular-nums" style={{ color: g.side === "ours" ? OURS : THEIRS }}>{g.ours}-{g.theirs}</span>;
          return <span key={i} className="absolute top-0" style={{ left: at(g.time_s) }}>
            {onSeek ? <button type="button" aria-label={`Watch ${label}`} title={label} onClick={() => onSeek(g.time_s)} className="hover:underline">{mark}</button> : mark}
          </span>;
        })}
      </div>}
      {s.share && <p className="text-xs text-fg-muted">
        Ahead {pct(s.share.ahead)} · Level {pct(s.share.level)} · Behind {pct(s.share.behind)}
        <span className="text-fg-subtle"> · of the time played, roughly</span>
      </p>}
    </>}
  </section>;
}
