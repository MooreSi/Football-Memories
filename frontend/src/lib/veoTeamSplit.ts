/** Decision 009 (owner, 2026-11-14): Veo's own team-sided stats and events, read at
 *  Refresh from its match report and events service. Own v opponent, no names. */
export type VeoSide = "own" | "opponent";
export type VeoTeamEvent = { type: string; side: VeoSide | null; time_s: number; period: number | null };
export type VeoTeamData = { stats: Record<string, { own: number; opponent: number }>; events: VeoTeamEvent[] };
export type TeamRow = { label: string; own: number; opponent: number };

// Veo's key stats first (its own counts), then event types it does not summarise.
const STATS: [string, string, (type: string) => boolean][] = [
  ["goals", "Goals", t => t === "GOAL"],
  ["total_attempts", "Attempts", t => t === "SHOT" || t === "GOAL"],
  ["corners", "Corners", t => t === "CORNER KICK"],
  ["fouls", "Fouls", t => t === "FOUL"],
  ["free_kicks", "Free kicks", t => t === "FREE KICK"],
];
const EXTRA: [string, string][] = [["THROW IN", "Throw-ins"], ["GOAL KICK", "Goal kicks"]];

function count(events: VeoTeamEvent[], keep: (type: string) => boolean): { own: number; opponent: number } {
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
  for (const [type, label] of EXTRA) {
    const value = count(events, t => t === type);
    if (value.own + value.opponent > 0) rows.push({ label, ...value });
  }
  return rows;
}
