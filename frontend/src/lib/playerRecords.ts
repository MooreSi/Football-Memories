import { sameCode } from "./codes";
import { type GoalsEntries, type GoalsSource, type MatchGoals, type Keeper, matchGoals } from "./goals";
import { PLAYER_METRICS, playerStats, type PlayerMetric, type PlayerStat } from "./playerStats";

export type FootballRecord = { label: string; value: number | null; note: string; percent?: boolean };
const sample = (n: number) => `${n} ${n === 1 ? "match" : "matches"}`;

export type FootballRecordData = { id: string; goals: MatchGoals; keeper: Keeper | undefined; player: PlayerStat | undefined };
export const goalkeeperPosition = (position: string | null) => /^(GK|G\.?K\.?|goal\s*keeper|keeper)$/i.test(position?.trim() ?? "");

export const selectedKeeper = (position: string | null, data: FootballRecordData[]) => position?.trim() ? goalkeeperPosition(position) : data.some(d => d.keeper);

/** Prepare attribution once so season panels can share it across roles. */
export function footballRecordData(matches: (GoalsSource & { id: string })[], name: string, club: string | null, entries: GoalsEntries, prepared?: Record<string, MatchGoals>): FootballRecordData[] {
  return [...new Map(matches.map(m => [m.id, m])).values()].map(match => {
    const goals = prepared?.[match.id] ?? matchGoals(match, club, entries[match.id]);
    return { id: match.id, goals, keeper: goals.keepers.find(k => k.name && sameCode(k.name, name)),
      player: playerStats(match, club, goals).find(p => sameCode(p.name, name)) };
  });
}

export function summarizeFootballRecords(data: FootballRecordData[], name: string, keeper: boolean, allOutfield = false): { keeper: boolean; cards: FootballRecord[] } {
  const keepers = data.flatMap(d => d.keeper ? [d.keeper] : []);
  if (keeper) {
    const known = keepers.filter(k => k.saves !== null);
    const saves = known.reduce((n, k) => n + k.saves!, 0);
    const faced = known.reduce((n, k) => n + k.saves! + k.conceded, 0);
    const note = (rows: typeof keepers) => `${sample(rows.length)}${rows.some(k => !k.confirmed) ? " · includes estimates" : " · saved assignments"}`;
    return { keeper, cards: [
      { label: "Goals saved", value: known.length ? saves : null, note: known.length ? note(known) : "Saves not recorded" },
      { label: "Goals conceded", value: keepers.length ? keepers.reduce((n, k) => n + k.conceded, 0) : null, note: keepers.length ? note(keepers) : "Keeper not assigned" },
      { label: "Shots faced", value: known.length ? faced : null, note: known.length ? `Saves + conceded · ${note(known)}` : "Saves not recorded" },
      { label: "Save percentage", value: faced ? Math.round(saves / faced * 100) : null, percent: true,
        note: known.length ? `Saved / shots faced · ${note(known)}` : "Saves not recorded" },
    ] };
  }
  const metrics: { key: PlayerMetric; label: string }[] = [
    { key: "goals", label: "Goals scored" }, { key: "shots", label: "Shots on target" },
    { key: "chances", label: "Chances" }, { key: "passes", label: "Passes" },
  ];
  const shownMetrics = allOutfield ? PLAYER_METRICS.map(m => ({ ...m, label: m.key === "goals" ? "Goals scored" : m.label })) : metrics;
  return { keeper, cards: shownMetrics.map(({ key, label }) => {
    const rows = data.flatMap(d => d.player && d.player.events[key] !== null ? [d.player] : []);
    // Corrected untimed goals count even without a remaining outfield tag window.
    if (key === "goals") {
      const goals = data.flatMap(d => d.goals.goals.filter(g => g.side === "ours" && g.scorer && sameCode(g.scorer, name)));
      const likely = goals.filter(g => !g.confirmed).length;
      return { label, value: rows.length || goals.length ? goals.length : null,
        note: rows.length || goals.length ? `Assigned scorers${likely ? ` · ${likely} likely` : ""}` : "Scorer not recorded" };
    }
    const sources = [...new Set(rows.map(p => p.sources[key]))];
    return { label, value: rows.length ? rows.reduce((n, p) => n + p.events[key]!.length, 0) : null,
      note: rows.length ? `${sources.includes("actions") ? "Player actions" : ""}${sources.includes("actions") && sources.includes("overlap") ? " + " : ""}${sources.includes("overlap") ? "Team-tag overlap (involvement)" : ""} · ${sample(rows.length)}` : "Not recorded" };
  }) };
}

/** All cached matches, using the same assignments and action sources as match stats. */
export function footballRecords(matches: (GoalsSource & { id: string })[], name: string, position: string | null, club: string | null, entries: GoalsEntries): { keeper: boolean; cards: FootballRecord[] } {
  const data = footballRecordData(matches, name, club, entries);
  const keeper = selectedKeeper(position, data);
  return summarizeFootballRecords(data, name, keeper);
}
