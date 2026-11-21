import type { HudlMatch } from "../api/hudl";
import { sameCode } from "./codes";
import type { GoalsEntries } from "./goals";
import { fixtureDate } from "./hudlFixture";
import { performanceFromData } from "./playerPerformance";
import type { Corrections } from "./matchScore";
import type { MatchCount } from "./records";
import { footballRecordData, selectedKeeper, type FootballRecord, type FootballRecordData } from "./playerRecords";

type Options = { library: HudlMatch[] | undefined; series: MatchCount[]; name: string; position: string | null; club: string | null; entries: GoalsEntries; corrections?: Corrections; today?: Date };
export type SeasonStoryData = { season: string; matches: number; importedMatches: number; keeperMatches: number; outfieldMatches: number; goalkeeping: FootballRecord[] | null; outfield: FootballRecord[] | null; text: string };
const count = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString("en-GB")} ${n === 1 ? one : many}`;
function seasonOf(date: Date): string {
  const start = date.getMonth() >= 6 ? date.getFullYear() : date.getFullYear() - 1;
  return `${start}/${String((start + 1) % 100).padStart(2, "0")}`;
}
function seasonLabel(label: string | undefined): string {
  const parts = /^(20\d{2})[/-](\d{2})$/.exec(label ?? "");
  return parts && Number(parts[2]) === (Number(parts[1]) + 1) % 100 ? `${parts[1]}/${parts[2]}` : "Unclassified";
}
const stat = (cards: FootballRecord[], label: string) => cards.find(c => c.label === label)?.value ?? null;
function summary(story: Omit<SeasonStoryData, "text">, name: string, current: string): string {
  const first = name.trim().split(/\s+/)[0] || name;
  const text = [`${first}'s ${story.season}${story.season === current ? " so far" : ""}.`];
  if (story.goalkeeping) {
    const saves = stat(story.goalkeeping, "Goals saved"), conceded = stat(story.goalkeeping, "Goals conceded");
    const faced = stat(story.goalkeeping, "Shots faced"), percentage = stat(story.goalkeeping, "Save percentage");
    const facts = [saves === null ? null : count(saves, "save"), conceded === null ? null : count(conceded, "goal conceded", "goals conceded"),
      percentage === null ? null : `${percentage}% save percentage from ${count(faced!, "recorded shot")}`,
      stat(story.goalkeeping, "Penalties stopped") === null ? null : count(stat(story.goalkeeping, "Penalties stopped")!, "penalty stopped", "penalties stopped"),
      stat(story.goalkeeping, "Clean sheets") === null ? null : count(stat(story.goalkeeping, "Clean sheets")!, "clean sheet")].filter(Boolean);
    text.push(facts.length ? `Goalkeeping across ${count(stat(story.goalkeeping, "Games played") ?? story.keeperMatches, "recorded appearance")}: ${facts.join(", ")}.` : "No goalkeeping stats recorded for this season.");
  }
  if (story.outfield) {
    const facts = [["Goals scored", "goal", "goals"], ["Shots on target", "shot on target", "shots on target"],
      ["Passes", "pass", "passes"], ["Chances", "chance", "chances"], ["Crosses", "cross", "crosses"], ["Regains", "regain", "regains"]]
      .flatMap(([label, one, many]) => { const value = stat(story.outfield!, label); return value === null ? [] : [count(value, one, many)]; });
    text.push(facts.length ? `Outfield in ${count(story.outfieldMatches, "match", "matches")}: ${facts.join(", ")}.` : "No outfield stats recorded for this season.");
  }
  if ([...(story.goalkeeping ?? []), ...(story.outfield ?? [])].some(c => /likely|includes estimates|includes estimated|overlap/.test(c.note))) text.push("Includes likely assignments or tagged involvement; sources are shown below.");
  if (story.importedMatches) text.push(`${count(story.importedMatches, "imported match", "imported matches")} without an action breakdown.`);
  return text.join(" ");
}

/** Football seasons by match date (July–June), with role-separated whole-season totals. */
export function seasonStories({ library, series, name, position, club, entries, corrections, today = new Date() }: Options): SeasonStoryData[] {
  const matches = [...new Map((library ?? []).map(m => [m.id, m])).values()];
  const lookup = new Map(matches.map(m => [m.id, m]));
  const groups = new Map<string, { data: FootballRecordData[]; imports: Set<number> }>();
  const group = (season: string) => { if (!groups.has(season)) groups.set(season, { data: [], imports: new Set() }); return groups.get(season)!; };
  // Only the player's own tags/assignments can create a season, never a teammate's match.
  const relevant = matches.filter(m => m.moments?.some(t => sameCode(t.category, name))
    || entries[m.id]?.keepers.some(k => sameCode(k.name, name))
    || Object.values(entries[m.id]?.scorers ?? {}).some(s => sameCode(s, name)));
  for (const row of footballRecordData(relevant, name, club, entries)) {
    const match = lookup.get(row.id)!;
    const date = fixtureDate(match.title);
    group(date ? seasonOf(date) : seasonLabel(match.season_label)).data.push(row);
  }
  for (const match of series) {
    const date = match.match_date ? new Date(`${match.match_date}T12:00:00`) : null;
    group(date && Number.isFinite(date.getTime()) ? seasonOf(date) : "Unclassified").imports.add(match.match_id);
  }
  return [...groups].sort(([a], [b]) => a === "Unclassified" ? 1 : b === "Unclassified" ? -1 : b.localeCompare(a)).map(([season, { data, imports }]) => {
    const keeperMatches = data.filter(d => d.keeper).length;
    const outfieldMatches = data.filter(d => d.player || d.goals.goals.some(g => g.side === "ours" && g.scorer && sameCode(g.scorer, name))).length;
    const showKeeper = selectedKeeper(position, data);
    const scoped = data.flatMap(d => { const match = lookup.get(d.id); return match ? [match] : []; });
    const cards = performanceFromData(scoped, data, name, showKeeper, club, corrections);
    const games = cards.find(c => c.label === "Games played")!;
    games.value! += imports.size;
    const story = { season, matches: data.length + imports.size, importedMatches: imports.size, keeperMatches, outfieldMatches,
      goalkeeping: showKeeper ? cards : null,
      outfield: showKeeper ? null : cards };
    return { ...story, text: summary(story, name, seasonOf(today)) };
  });
}
