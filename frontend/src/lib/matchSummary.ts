import type { MatchGoals } from "./goals";
import type { TeamRow } from "./veoTeamSplit";

/** Spec 320: the headline numbers under a match's video, taken from the team stats rows
 *  already on the page. Veo has attempts where Hudl has chances. */
const PICKS: [string[], string][] = [
  [["Possession %"], "Possession"], [["Chances", "Attempts"], ""], [["On target"], ""], [["Corners"], ""],
];

export type SummaryCell = { label: string; value: string };

export function summaryCells(rows: TeamRow[]): SummaryCell[] {
  const cells: SummaryCell[] = [];
  for (const [labels, name] of PICKS) {
    const r = rows.find((x) => labels.includes(x.label));
    if (!r) continue;
    const pct = r.label.endsWith("%");
    cells.push({ label: name || r.label, value: `${r.own}–${r.opponent}${pct ? "%" : ""}` });
  }
  return cells;
}

/** Who was in goal: the keepers the owner saved, else the likely spells in order with the
 *  time of the first change. */
export function keeperLine(m: MatchGoals): { names: string; change: number | null; likely: boolean } | null {
  const saved = m.keepers.filter((k) => k.confirmed && k.name);
  if (saved.length) return { names: saved.map((k) => k.name).join(", "), change: null, likely: false };
  const order = m.spells.map((s) => s.name).filter((n, i, all) => i === 0 || n !== all[i - 1]);
  if (order.length) return { names: order.join(" then "), change: m.spells.length > 1 ? m.spells[1].from_s : null, likely: true };
  const named = m.keepers.filter((k) => k.name);
  if (named.length) return { names: named.map((k) => k.name).join(", "), change: null, likely: true };
  return null;
}
