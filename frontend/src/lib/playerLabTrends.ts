import { sameCode } from "./codes";
import { aggregateCells, LAB_METRICS, type LabRow } from "./playerLab";
import { goalkeeperPosition } from "./playerRecords";

/** Owner request 2026-11-27: Player Lab's trend, recent-form and teammate panels showed
 *  almost nothing. Causes: the squad picker opened on the alphabetically first age group
 *  (often a one-off match played up or down), the ten-match comparison needs ten dated
 *  appearances, and teammate comparison needs lab-confirmed minutes nobody had entered. */

const agesOf = (r: LabRow) => (r.match.age_groups?.length ? r.match.age_groups : [r.match.age_group]).filter((a): a is string => Boolean(a));

/** The age group the player appears in most that season; ties go alphabetically. */
export function mainSquad(rows: LabRow[], season: string): string {
  const counts = new Map<string, number>();
  for (const r of rows) if (r.season === season) for (const a of agesOf(r)) counts.set(a, (counts.get(a) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? "";
}

/** Latest, average and best recorded value, for a selection shorter than ten matches.
 *  Rows are newest first; unrecorded matches are left out, never counted as zero. */
export function recentSummary(rows: LabRow[], metric: string, percent: boolean): { latest: number; average: number; best: number; matches: number } | null {
  const known = rows.filter(r => r.date && r.stats[metric]?.value !== null && r.stats[metric]?.value !== undefined);
  if (!known.length) return null;
  const values = known.map(r => r.stats[metric].value!);
  const average = percent ? aggregateCells(known.map(r => r.stats[metric]), true)! : values.reduce((s, v) => s + v, 0) / values.length;
  return { latest: values[0], average, best: Math.max(...values), matches: known.length };
}

const DIRECT = new Set(["action", "confirmed", "likely", "estimated", "manual"]);

/** Teammates at the same fixtures, per match: both values recorded, from the same kind of
 *  record, never team-tag overlap. Needs three shared matches. Used when the stricter
 *  per-30-confirmed-minutes comparison has no data. */
export function sharedComparison(own: LabRow[], other: LabRow[], metric: string): { ours: number; theirs: number; matches: number; basis: "match"; percent: boolean } | null {
  const pairs = own.flatMap(a => {
    const b = other.find(x => x.match.id === a.match.id);
    const ca = a.stats[metric], cb = b?.stats[metric];
    return b && ca && cb && ca.value !== null && cb.value !== null && DIRECT.has(ca.source) && ca.source === cb.source ? [[a, b] as const] : [];
  });
  if (pairs.length < 3) return null;
  const percent = LAB_METRICS.find(m => m.key === metric)?.percent ?? false;
  const value = (i: 0 | 1) => {
    const cells = pairs.map(p => p[i].stats[metric]);
    return percent ? aggregateCells(cells, true)! : cells.reduce((s, c) => s + c.value!, 0) / cells.length;
  };
  return { ours: value(0), theirs: value(1), matches: pairs.length, basis: "match", percent };
}

/** Names tagged in the player's own matches, by how many they share; the player and
 *  names never seen beside them are left out. */
export function teammatesBySharedMatches(rows: LabRow[], names: string[], player: string): { name: string; shared: number }[] {
  return names.filter(name => !sameCode(name, player))
    .map(name => ({ name, shared: rows.filter(r => (r.match.moments ?? []).some(m => sameCode(m.category, name))).length }))
    .filter(t => t.shared > 0)
    .sort((a, b) => b.shared - a.shared || a.name.localeCompare(b.name));
}

export type LabRole = "keeper" | "outfield";
const KEEPER_METRICS = ["saves", "conceded", "faced", "savePercentage", "cleanSheets", "penaltiesSaved"];

/** Owner request 2026-11-27: the lab follows the player's role. A set position decides;
 *  without one, a keeper is in goal (assigned, estimated or a lab record) for at least half
 *  the selection. One guessed spell in goal does not make an outfield player a keeper. */
export function labRole(rows: LabRow[], position: string | null): LabRole {
  if (position?.trim()) return goalkeeperPosition(position) ? "keeper" : "outfield";
  const inGoal = rows.filter(r => goalkeeperPosition(r.position) || r.stats.saves.value !== null || r.stats.conceded.value !== null).length;
  return rows.length && inGoal * 2 >= rows.length ? "keeper" : "outfield";
}

/** Metrics for the role: outfield players never see keeper numbers; keepers see theirs first. */
export function roleMetrics(role: LabRole): typeof LAB_METRICS {
  const keeper = KEEPER_METRICS.map(k => LAB_METRICS.find(m => m.key === k)!);
  const rest = LAB_METRICS.filter(m => !KEEPER_METRICS.includes(m.key));
  return role === "keeper" ? [...keeper, ...rest] : rest;
}
