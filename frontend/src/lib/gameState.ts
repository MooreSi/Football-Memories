import type { Score } from "./matchScore";

/** Spec 290: how the score went in one match. Exact only when a score is known, every
 *  goal has a time and the goals add up to the score; otherwise it says why and nothing
 *  else, so a half-known match never tells a wrong story. */
export type Side = "ours" | "theirs";
export type State = "ahead" | "level" | "behind";
export type Story = "came-from-behind-win" | "came-from-behind-draw" | "led-drew" | "led-lost" | null;
export type Segment = { from: number; to: number; state: State };
export type Share = { ahead: number; level: number; behind: number };
export type GameState =
  | { complete: false; reason: string }
  | {
      complete: true; final: Score;
      goals: { side: Side; time_s: number; ours: number; theirs: number }[];
      segments: Segment[]; share: Share | null;
      firstGoal: Side | null; biggestLead: number; biggestDeficit: number;
      story: Story; longestRun: { side: Side; goals: number } | null;
    };

const stateOf = (ours: number, theirs: number): State => (ours > theirs ? "ahead" : ours < theirs ? "behind" : "level");
const round = (n: number) => Math.round(n * 10000) / 10000;

export function gameState(goals: { side: Side; time_s: number | null }[], score: Score | null, span?: number[][] | null): GameState {
  if (!score) return { complete: false, reason: "There is no score for this match." };
  const untimed = goals.filter((x) => x.time_s === null).length;
  if (untimed) return { complete: false, reason: `${untimed} ${untimed === 1 ? "goal has" : "goals have"} no time, so the order of goals is not known.` };
  const ours = goals.filter((x) => x.side === "ours").length;
  const theirs = goals.length - ours;
  if (ours !== score.ours || theirs !== score.theirs) {
    return { complete: false, reason: `The goals found (${ours}-${theirs}) do not add up to the score (${score.ours}-${score.theirs}).` };
  }
  const ordered = [...goals].sort((a, b) => (a.time_s as number) - (b.time_s as number));
  const running: { side: Side; time_s: number; ours: number; theirs: number }[] = [];
  let o = 0, t = 0, lead = 0, deficit = 0, wasBehind = false, wasAhead = false;
  let run: { side: Side; goals: number } | null = null, best: { side: Side; goals: number } | null = null;
  for (const goal of ordered) {
    if (goal.side === "ours") o += 1; else t += 1;
    running.push({ side: goal.side, time_s: goal.time_s as number, ours: o, theirs: t });
    lead = Math.max(lead, o - t); deficit = Math.max(deficit, t - o);
    wasBehind ||= o < t; wasAhead ||= o > t;
    run = run && run.side === goal.side ? { side: goal.side, goals: run.goals + 1 } : { side: goal.side, goals: 1 };
    if (!best || run.goals > best.goals) best = run;
  }
  const result = stateOf(o, t);
  const story: Story = wasBehind && result === "ahead" ? "came-from-behind-win" : wasBehind && result === "level" ? "came-from-behind-draw"
    : wasAhead && result === "level" ? "led-drew" : wasAhead && result === "behind" ? "led-lost" : null;

  const segments: Segment[] = [];
  let share: Share | null = null;
  const periods = (span ?? []).filter((p) => p[1] > p[0]);
  if (periods.length) {
    const start = periods[0][0], end = periods[periods.length - 1][1];
    const marks = [start, ...running.map((r) => Math.min(Math.max(r.time_s, start), end)), end];
    const states = [stateOf(0, 0), ...running.map((r) => stateOf(r.ours, r.theirs))];
    for (let i = 0; i < states.length; i += 1) {
      if (marks[i + 1] <= marks[i]) continue;
      const last = segments[segments.length - 1];
      if (last && last.state === states[i]) last.to = marks[i + 1];
      else segments.push({ from: marks[i], to: marks[i + 1], state: states[i] });
    }
    const time: Share = { ahead: 0, level: 0, behind: 0 };
    for (const s of segments) for (const [a, b] of periods) time[s.state] += Math.max(0, Math.min(s.to, b) - Math.max(s.from, a));
    const total = time.ahead + time.level + time.behind;
    if (total > 0) share = { ahead: round(time.ahead / total), level: round(time.level / total), behind: round(time.behind / total) };
  }
  return { complete: true, final: score, goals: running, segments, share, firstGoal: running[0]?.side ?? null,
    biggestLead: lead, biggestDeficit: deficit, story, longestRun: best };
}

/** Season report lines, each saying what it counts. Nothing when no match has every goal timed. */
export function seasonGameLines(states: GameState[], scores: (Score | null)[]): { label: string; value: string }[] {
  const done = states.filter((s): s is Extract<GameState, { complete: true }> => s.complete);
  if (!done.length) return [];
  const result = (s: (typeof done)[number]) => stateOf(s.final.ours, s.final.theirs);
  const first = done.filter((s) => s.firstGoal === "ours");
  const count = (list: typeof done, r: State) => list.filter((s) => result(s) === r).length;
  const back = done.filter((s) => s.story === "came-from-behind-win" || s.story === "came-from-behind-draw");
  const lines = [{ label: "Scored first", value: first.length ? `${first.length} (won ${count(first, "ahead")}, drew ${count(first, "level")}, lost ${count(first, "behind")})` : "0" }];
  if (back.length) lines.push({ label: "Came from behind", value: `won ${count(back, "ahead")}, drew ${count(back, "level")}` });
  lines.push({ label: "Clean sheets", value: String(scores.filter((s) => s && s.theirs === 0).length) });
  lines.push({ label: "Goal times known", value: `${done.length} of ${scores.length} matches` });
  return lines;
}
