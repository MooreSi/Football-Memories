import type { PlayerMetric, PlayerStat } from "./playerStats";
import { PLAYER_METRICS } from "./playerStats";

/** Owner request 2026-11-27: Player stats in the Match stats style. A note's `parts`
 *  alternate plain text and highlighted figures, as in matchStats `standouts`. */
export type PlayerStandout = { lead: string; parts: string[] };

const count = (p: PlayerStat, key: PlayerMetric) => p.events[key]?.length ?? 0;

/** The single leader of a list, or null for a tie or nothing counted. */
function leader(players: PlayerStat[], value: (p: PlayerStat) => number): PlayerStat | null {
  const sorted = [...players].sort((a, b) => value(b) - value(a));
  if (!sorted.length || value(sorted[0]) <= 0) return null;
  return sorted.length > 1 && value(sorted[1]) === value(sorted[0]) ? null : sorted[0];
}

/** Facts only: who was tagged most, and the leader of each action recorded directly on a
 *  player (individual actions, scorer assignments). Team-tag overlap is involvement, not
 *  attribution, so it never names a leader. Ties name nobody. */
export function playerStandouts(players: PlayerStat[], limit = 5): PlayerStandout[] {
  const out: PlayerStandout[] = [];
  const most = leader(players, p => p.moments.length);
  if (most) out.push({ lead: "Most involved", parts: ["", most.name, " was tagged in ", `${most.moments.length} moment${most.moments.length === 1 ? "" : "s"}`, "."] });
  for (const m of PLAYER_METRICS) {
    if (out.length >= limit) break;
    const direct = players.some(p => p.sources[m.key] === "actions" || p.sources[m.key] === "scorer");
    const top = direct ? leader(players, p => count(p, m.key)) : null;
    if (top) out.push({ lead: m.label, parts: ["", top.name, " recorded ", String(count(top, m.key)), ", the most in the match."] });
  }
  return out;
}

export function playerHeadlines(players: PlayerStat[]) {
  const top = leader(players, p => p.moments.length);
  return {
    players: players.length,
    moments: players.reduce((s, p) => s + p.moments.length, 0),
    goals: players.reduce((s, p) => s + count(p, "goals"), 0),
    top: top ? { name: top.name, moments: top.moments.length } : null,
  };
}
