import type { Minute } from "./insights";
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

/** Owner request 2026-11-15: momentum as on a Hudl match, from Veo's team events. */
export const VEO_MOMENTUM_WEIGHTS: Record<string, number> = { "CORNER KICK": 1, "FREE KICK": 1, SHOT: 3, "PENALTY KICK": 3, GOAL: 5 };

export function veoMomentum(events: VeoTeamEvent[], halves: number[][] | undefined, duration_s?: number): { minutes: Minute[]; halves: number[] } {
  const weighted = events.filter(e => e.side && VEO_MOMENTUM_WEIGHTS[e.type]).sort((a, b) => a.time_s - b.time_s);
  const breaks = (halves ?? []).slice(0, -1).map(h => h[1]);
  if (!weighted.length) return { minutes: [], halves: breaks };
  const last = Math.max(...weighted.map(e => e.time_s), duration_s ? duration_s - 1 : 0);
  const minutes: Minute[] = Array.from({ length: Math.floor(last / 60) + 1 }, (_, minute) => ({
    minute, ours: 0, theirs: 0, oursAt: null, theirsAt: null, goals: { ours: 0, theirs: 0 },
  }));
  for (const e of weighted) {
    const bucket = minutes[Math.floor(e.time_s / 60)];
    const side = e.side === "own" ? "ours" : "theirs";
    bucket[side] += VEO_MOMENTUM_WEIGHTS[e.type];
    const at = side === "ours" ? "oursAt" : "theirsAt";
    if (bucket[at] === null) bucket[at] = e.time_s;
    if (e.type === "GOAL") bucket.goals[side] += 1;
  }
  return { minutes, halves: breaks };
}
