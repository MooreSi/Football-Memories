/** Decision 009 (owner, 2026-11-14): Veo's own team-sided stats and events, read at
 *  Refresh from its match report and events service. Own v opponent, no names. */
export type VeoSide = "own" | "opponent";
export type VeoTeamEvent = { type: string; side: VeoSide | null; time_s: number; period: number | null };
type Pair = { own: number; opponent: number };
// totals: each side's own counts from Veo's events service (owner request 2026-11-15).
export type VeoTeamData = { stats: Record<string, Pair>; events: VeoTeamEvent[]; totals?: Record<string, Pair> };
export type TeamRow = { label: string; own: number; opponent: number };

// Veo's key stats first (its own counts), then event types it does not summarise.
const STATS: [string, string, (type: string) => boolean][] = [
  ["goals", "Goals", t => t === "GOAL"],
  ["total_attempts", "Attempts", t => t === "SHOT" || t === "GOAL"],
  ["corners", "Corners", t => t === "CORNER KICK"],
  ["fouls", "Fouls", t => t === "FOUL"],
  ["free_kicks", "Free kicks", t => t === "FREE KICK"],
];
// Then Veo's per-side totals, or the events counted when a match has none.
const EXTRA: [string, string, string | null][] = [
  ["missed_shots", "Missed shots", null], ["penalty_kick", "Penalties", "PENALTY KICK"],
  ["throw_in", "Throw-ins", "THROW IN"], ["goal_kick", "Goal kicks", "GOAL KICK"], ["out_of_play", "Out of play", null],
];

function count(events: VeoTeamEvent[], keep: (type: string) => boolean): Pair {
  const chosen = events.filter(e => keep(e.type));
  return { own: chosen.filter(e => e.side === "own").length, opponent: chosen.filter(e => e.side === "opponent").length };
}

export function teamSplit(data: VeoTeamData | null | undefined): TeamRow[] {
  if (!data) return [];
  const events = data.events ?? [];
  const rows: TeamRow[] = [];
  for (const [key, label, keep] of STATS) {
    const given = data.stats?.[key];
    const value = given ?? count(events, keep);
    if (given || value.own + value.opponent > 0) rows.push({ label, ...value });
  }
  for (const [key, label, type] of EXTRA) {
    const value = data.totals?.[key] ?? (type ? count(events, t => t === type) : { own: 0, opponent: 0 });
    if (value.own + value.opponent > 0) rows.push({ label, ...value });
  }
  return rows;
}
