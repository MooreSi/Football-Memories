import type { HudlMoment } from "../api/hudl";
import { codeKey } from "./codes";
import type { GoalsSource, MatchGoals } from "./goals";
import { displayCode } from "./hudlPlayer";
import { codeSides } from "./matchProfile";

export const PLAYER_METRICS = [
  { key: "goals", label: "Goals", stems: [] },
  { key: "penaltiesScored", label: "Penalties scored", stems: [] },
  { key: "assists", label: "Assists", stems: ["ASSIST", "ASSISTS"] },
  { key: "keyPasses", label: "Key passes", stems: ["KEY PASS", "KEY PASSES", "CHANCE CREATED"] },
  { key: "passes", label: "Passes", stems: ["PASS", "PASSES", "PASSING", "PASS COMPLETED", "SUCCESSFUL PASS"] },
  { key: "shots", label: "Shots on target", stems: ["ON TARGET", "SHOT ON TARGET"] },
  { key: "chances", label: "Chances", stems: ["CHANCE"] },
  { key: "crosses", label: "Crosses", stems: ["CROSS"] },
  { key: "tackles", label: "Tackles", stems: ["TACKLE", "TACKLE WON"] },
  { key: "interceptions", label: "Interceptions", stems: ["INTERCEPTION", "INTERCEPTIONS"] },
  { key: "blocks", label: "Blocks", stems: ["BLOCK", "BLOCKS"] },
  { key: "clearances", label: "Clearances", stems: ["CLEARANCE", "CLEARANCES"] },
  { key: "defensive1v1", label: "Defensive 1v1s", stems: ["DEF 1V1", "DEFENSIVE 1V1", "DEFENDING 1V1", "DEF 1 V 1"] },
  { key: "attacking1v1", label: "Attacking 1v1s", stems: ["ATT 1V1", "ATTACKING 1V1", "ATTACK 1V1", "ATT 1 V 1"] },
  { key: "fouls", label: "Fouls", stems: ["FOUL", "FOULS"] },
  { key: "foulsWon", label: "Fouls won", stems: ["FOUL WON", "FOULS WON"] },
  { key: "foulsConceded", label: "Fouls conceded", stems: ["FOUL CONCEDED", "FOULS CONCEDED", "FOUL COMMITTED"] },
  { key: "successfulDribbles", label: "Successful dribbles", stems: ["SUCCESSFUL DRIBBLE", "SUCCESSFUL DRIBBLES"] },
  { key: "possessionLost", label: "Possession lost", stems: ["POSSESSION LOST", "BALL LOST", "DISPOSSESSED"] },
  { key: "offsides", label: "Offsides", stems: ["OFFSIDE", "OFFSIDES"] },
  { key: "regains", label: "Regains", stems: ["REGAIN", "RECOVERY", "BALL RECOVERY"] },
] as const;
export type PlayerMetric = typeof PLAYER_METRICS[number]["key"];
export type PlayerStatClip = Omit<HudlMoment, "time_s"> & { time_s: number | null; confirmed?: boolean };
export type StatSource = "actions" | "overlap" | "scorer" | "none";
export type PlayerStat = { name: string; sources: Record<PlayerMetric, StatSource>; moments: HudlMoment[]; events: Record<PlayerMetric, PlayerStatClip[] | null> };
const end = (m: HudlMoment) => m.time_s + Math.max(0, m.duration_s);
// Positive-length windows are half-open: merely touching their edges is not involvement.
const overlaps = (a: HudlMoment, b: HudlMoment) => a.time_s === end(a)
  ? b.time_s <= a.time_s && (a.time_s < end(b) || b.time_s === end(b) && a.time_s === b.time_s)
  : b.time_s === end(b) ? a.time_s <= b.time_s && b.time_s < end(a)
  : a.time_s < end(b) && b.time_s < end(a);

/** Goals reuse scorer corrections/guesses; other metrics count team events during named tags. */
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
  const sources = Object.fromEntries(PLAYER_METRICS.map(metric => [metric.key,
    metric.key === "goals" ? "scorer" : moments.some(m => names.has(codeKey(m.category)) && m.actions?.includes(metric.key))
      ? "actions" : events[metric.key].length ? "overlap" : "none",
  ])) as PlayerStat["sources"];
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
    return { name, sources, moments: mine, events: Object.fromEntries(PLAYER_METRICS.map(metric => [metric.key,
      metric.key === "goals" ? goals.goals.filter(g => g.side === "ours" && g.scorer && codeKey(g.scorer) === key
        && (g.time_s === null || !inGoal(g.time_s))).map(g => ({
          id: g.id, category: `Goal · ${g.confirmed ? "confirmed" : "likely"}`, time_s: g.time_s,
          duration_s: 0, confirmed: g.confirmed,
        })).sort((a, b) => (a.time_s ?? Infinity) - (b.time_s ?? Infinity))
        : sources[metric.key] === "actions" ? [...new Map(mine.filter(m => m.actions?.includes(metric.key))
          .map(m => [m.id, { ...m, category: `${metric.label} · individual action` }])).values()]
        : events[metric.key].length ? events[metric.key].filter(e => outfield.some(p => overlaps(e, p))) : null,
    ])) as PlayerStat["events"] };
  }).filter(p => p.moments.length).sort((a, b) => a.name.localeCompare(b.name));
}
