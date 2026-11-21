import type { HudlMoment } from "../api/hudl";
import { codeKey } from "./codes";
import type { GoalsSource, MatchGoals } from "./goals";
import { displayCode } from "./hudlPlayer";
import { codeSides } from "./matchProfile";

export const PLAYER_METRICS = [
  { key: "passes", label: "Passes", stems: ["PASS", "PASSES", "PASS COMPLETED", "SUCCESSFUL PASS"] },
  { key: "shots", label: "Shots on target", stems: ["ON TARGET", "SHOT ON TARGET"] },
  { key: "chances", label: "Chances", stems: ["CHANCE"] },
  { key: "crosses", label: "Crosses", stems: ["CROSS"] },
  { key: "tackles", label: "Tackles", stems: ["TACKLE", "TACKLE WON"] },
  { key: "regains", label: "Regains", stems: ["REGAIN", "RECOVERY", "BALL RECOVERY"] },
] as const;
export type PlayerMetric = typeof PLAYER_METRICS[number]["key"];
export type PlayerStat = { name: string; moments: HudlMoment[]; events: Record<PlayerMetric, HudlMoment[] | null> };
const end = (m: HudlMoment) => m.time_s + Math.max(0, m.duration_s);
// Positive-length windows are half-open: merely touching their edges is not involvement.
const overlaps = (a: HudlMoment, b: HudlMoment) => a.time_s === end(a)
  ? b.time_s <= a.time_s && (a.time_s < end(b) || b.time_s === end(b) && a.time_s === b.time_s)
  : b.time_s === end(b) ? a.time_s <= b.time_s && b.time_s < end(a)
  : a.time_s < end(b) && b.time_s < end(a);

/** Counts of team events during named tags, never attribution of an action to a player. */
export function playerStats(match: GoalsSource, club: string | null, goals: MatchGoals): PlayerStat[] {
  if (match.source === "veo") return [];
  const moments = match.moments ?? [];
  const place = codeSides(moments, club);
  const events = Object.fromEntries(PLAYER_METRICS.map(metric => {
    const matching = moments.filter(m => {
      const p = place(codeKey(m.category));
      return p.side === "ours" && (metric.stems as readonly string[]).includes(p.stem);
    });
    return [metric.key, [...new Map(matching.map(m => [m.id, m])).values()].sort((a, b) => a.time_s - b.time_s)];
  })) as Record<PlayerMetric, HudlMoment[]>;
  const names = new Map(goals.players.map(name => [codeKey(name), displayCode(name)]));
  return [...names].map(([key, name]) => {
    const spells = goals.spells.filter(s => codeKey(s.name) === key);
    const untimedKeeper = goals.keepers.some(k => k.name && codeKey(k.name) === key) && !spells.length;
    const inGoal = (at: number) => spells.some(s => at >= s.from_s && (s.to_s === null || at < s.to_s));
    const windows = (m: HudlMoment): HudlMoment[] => {
      if (end(m) === m.time_s) return inGoal(m.time_s) ? [] : [m];
      const cuts = [...new Set([m.time_s, end(m), ...spells.flatMap(s => [s.from_s, s.to_s ?? Infinity])])]
        .filter(at => at >= m.time_s && at <= end(m)).sort((a, b) => a - b);
      return cuts.slice(0, -1).flatMap((at, i) => inGoal(at) ? [] : [{ ...m, time_s: at, duration_s: cuts[i + 1] - at }]);
    };
    const mine = untimedKeeper ? [] : moments.filter(m => codeKey(m.category) === key && windows(m).length)
      .sort((a, b) => a.time_s - b.time_s);
    const outfield = mine.flatMap(windows);
    return { name, moments: mine, events: Object.fromEntries(PLAYER_METRICS.map(metric => [metric.key,
      events[metric.key].length ? events[metric.key].filter(e => outfield.some(p => overlaps(e, p))) : null,
    ])) as PlayerStat["events"] };
  }).filter(p => p.moments.length).sort((a, b) => a.name.localeCompare(b.name));
}
