import type { HudlMatch } from "../api/hudl";
import { sameCode } from "./codes";
import { footballRecordData, selectedKeeper, summarizeFootballRecords, type FootballRecordData, type FootballRecord } from "./playerRecords";
import type { GoalsEntries, MatchGoals } from "./goals";
import { matchScore, type Corrections } from "./matchScore";
export type PerformanceOptions = { matches: HudlMatch[]; name: string; position: string | null; club: string | null; entries?: GoalsEntries; goals?: Record<string, MatchGoals>; corrections?: Corrections; importedGames?: number };
const sample = (n: number) => `${n} ${n === 1 ? "match" : "matches"}`;
const round = (n: number) => Math.round(n * 10) / 10;

/** Shared by hub, milestones and both report formats; no moment volume is a performance stat. */
export function performanceFromData(matches: HudlMatch[], data: FootballRecordData[], name: string, keeper: boolean, club: string | null, corrections?: Corrections): FootballRecord[] {
  const byId = new Map(matches.map(m => [m.id, m]));
  const relevant = data.filter(d => d.keeper || d.player || d.goals.goals.some(g => g.scorer && sameCode(g.scorer, name))
    || byId.get(d.id)?.moments?.some(m => sameCode(m.category, name)));
  const games: FootballRecord = { label: "Games played", value: relevant.length, note: "Recorded tagged/assigned appearances; full playing time not confirmed" };
  const core = summarizeFootballRecords(relevant, name, keeper, !keeper).cards;
  if (!keeper) return [games, ...core];
  const keepers = relevant.flatMap(d => d.keeper ? [d.keeper] : []);
  const known = keepers.filter(k => k.saves !== null);
  const note = `${sample(known.length)} with recorded saves${known.some(k => !k.confirmed) ? " · includes estimates" : ""}`;
  // A split keeper spell is not a full-match clean sheet. Require a known score
  // consistent with saved goals and only this named keeper for the entire match.
  const eligible = relevant.filter(d => {
    const match = byId.get(d.id);
    const score = match && matchScore(match, club, corrections);
    return score && d.keeper?.confirmed && d.goals.keepers.length === 1 && d.goals.keepers[0] === d.keeper
      && d.goals.spells.every(s => sameCode(s.name, name))
      && d.goals.goals.filter(g => g.side === "ours").length === score.ours
      && d.goals.goals.filter(g => g.side === "theirs").length === score.theirs
      && d.goals.goals.filter(g => g.side === "theirs").every(g => g.keeper && sameCode(g.keeper, name));
  });
  const penaltyMatches = matches.filter(m => relevant.some(d => d.id === m.id) && m.moments?.some(t => t.actions?.includes("penaltiesSaved")));
  const penalties = penaltyMatches.reduce((n, m) => n + new Set(m.moments?.filter(t => sameCode(t.category, name) && t.actions?.includes("penaltiesSaved")).map(t => t.id)).size, 0);
  return [...core, games,
    { label: "Penalties stopped", value: penaltyMatches.length ? penalties : null, note: penaltyMatches.length ? `Explicit player actions · ${sample(penaltyMatches.length)}` : "Penalty-save outcomes not recorded" },
    { label: "Clean sheets", value: eligible.length ? eligible.filter(d => d.keeper!.conceded === 0).length : null,
      note: eligible.length ? `${sample(eligible.length)} with consistent score and sole keeper${eligible.some(d => !d.keeper!.confirmed) ? " · includes estimated assignments" : ""}` : "Needs a consistent score and sole keeper; split spells excluded" },
    { label: "Best saves in a match", value: known.length ? Math.max(...known.map(k => k.saves!)) : null, note },
    { label: "Saves per game", value: known.length ? round(known.reduce((n, k) => n + k.saves!, 0) / known.length) : null, note },
    { label: "Goals conceded per game", value: keepers.length ? round(keepers.reduce((n, k) => n + k.conceded, 0) / keepers.length) : null,
      note: `${sample(keepers.length)} with keeper assignments; may include estimates or partial appearances` },
  ];
}

export function playerPerformance({ matches, name, position, club, entries = {}, goals, corrections, importedGames = 0 }: PerformanceOptions): { keeper: boolean; cards: FootballRecord[] } {
  const unique = [...new Map(matches.map(m => [m.id, m])).values()];
  const data = footballRecordData(unique, name, club, entries, goals);
  const keeper = selectedKeeper(position, data);
  const cards = performanceFromData(unique, data, name, keeper, club, corrections);
  const games = cards.find(c => c.label === "Games played")!;
  games.value! += importedGames;
  if (importedGames) games.note += ` · ${importedGames} imported appearances without action data`;
  return { keeper, cards };
}
