import type { HudlMoment } from "../api/hudl";
import { codeKey } from "./codes";
import type { Spell } from "./goals";

/** Sparse involvement evidence, not a verified appearance/substitution record.
 * Assume continuous presence between a player's first/last touch in each period.
 * Never extrapolate into unobserved period edges or add padded clip lengths. */
export function estimatePlayerMinutes(moments: HudlMoment[], name: string, spells: Spell[]): number | null {
  const valid = moments.filter(m => Number.isFinite(m.time_s) && m.time_s >= 0
    && Number.isFinite(m.duration_s) && m.duration_s >= 0);
  const breaks = [...new Set(valid.filter(m => codeKey(m.category) === "END HALF").map(m => m.time_s))].sort((a, b) => a - b);
  const periods = new Map<number, number[]>();
  for (const m of valid.filter(m => codeKey(m.category) === codeKey(name))) {
    // Same approximate touch position as scorer inference (goals.ts).
    const at = m.time_s + m.duration_s - Math.min(5, m.duration_s / 3);
    const period = breaks.filter(b => b <= at).length;
    periods.set(period, [...(periods.get(period) ?? []), at]);
  }
  const keepers = spells.filter(s => codeKey(s.name) === codeKey(name));
  let total = 0, evidence = false;
  for (const times of periods.values()) {
    const from = Math.min(...times), to = Math.max(...times);
    if (to <= from) continue;
    evidence = true;
    const cuts = [...new Set([from, to, ...keepers.flatMap(s => [s.from_s, s.to_s ?? to])])]
      .filter(at => at >= from && at <= to).sort((a, b) => a - b);
    for (let i = 0; i < cuts.length - 1; i++) {
      if (!keepers.some(s => cuts[i] >= s.from_s && cuts[i] < (s.to_s ?? Infinity))) total += cuts[i + 1] - cuts[i];
    }
  }
  return evidence ? Math.round(total / 6) / 10 : null;
}
