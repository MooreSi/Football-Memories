import type { MatchCount } from "./records";

/** Owner request 2026-11-13: a short story of each football season (July to June) from
 *  the moments tagged with the player in each match. Uses the player's first name,
 *  never a guessed pronoun. */
export type MonthPick = { month: string; moments: number; matches: number; pick: MatchCount & { href: string } };
export type SeasonStoryData = {
  season: string; matches: number; moments: number; average: number; best: MatchCount;
  busiestMonth: { month: string; moments: number }; opponent: { name: string; times: number } | null;
  change: number | null; months: MonthPick[]; text: string;
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const monthName = (key: string) => `${MONTHS[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`;
const shortDay = (date: string) => `${Number(date.slice(8, 10))} ${MONTHS[Number(date.slice(5, 7)) - 1].slice(0, 3)}`;
const round1 = (n: number) => Math.round(n * 10) / 10;
const count = (n: number, word: string) => `${n.toLocaleString("en-GB")} ${word}${n === 1 ? "" : word.endsWith("ch") ? "es" : "s"}`;

function seasonOf(date: string): string {
  const year = Number(date.slice(0, 4));
  const start = Number(date.slice(5, 7)) >= 7 ? year : year - 1;
  return `${start}/${String((start + 1) % 100).padStart(2, "0")}`;
}

export function seasonStories(series: MatchCount[], name: string, today: Date = new Date()): SeasonStoryData[] {
  const first = name.trim().split(/\s+/)[0] || name;
  const groups = new Map<string, MatchCount[]>();
  for (const m of [...series].filter((x) => x.match_date).sort((a, b) => a.match_date.localeCompare(b.match_date))) {
    groups.set(seasonOf(m.match_date), [...(groups.get(seasonOf(m.match_date)) ?? []), m]);
  }
  const current = seasonOf(today.toISOString().slice(0, 10));
  const ordered = [...groups.keys()].sort();
  const stories = ordered.map((season, index): SeasonStoryData => {
    const list = groups.get(season)!;
    const moments = list.reduce((sum, m) => sum + m.moments, 0);
    const average = round1(moments / list.length);
    const best = list.reduce((top, m) => (m.moments > top.moments ? m : top), list[0]);
    const byMonth = new Map<string, MatchCount[]>();
    for (const m of list) byMonth.set(m.match_date.slice(0, 7), [...(byMonth.get(m.match_date.slice(0, 7)) ?? []), m]);
    const months = [...byMonth].map(([month, ms]) => {
      const pick = ms.reduce((top, m) => (m.moments > top.moments ? m : top), ms[0]);
      return { month, moments: ms.reduce((sum, m) => sum + m.moments, 0), matches: ms.length, pick: { ...pick, href: pick.href ?? `/matches/${pick.match_id}` } };
    });
    const busiest = months.reduce((top, m) => (m.moments > top.moments ? m : top), months[0]);
    const met = new Map<string, number>();
    for (const m of list) met.set(m.opponent, (met.get(m.opponent) ?? 0) + 1);
    const [opponentName, times] = [...met].reduce((top, e) => (e[1] > top[1] ? e : top));
    const previous = index > 0 ? groups.get(ordered[index - 1])! : null;
    const before = previous ? previous.reduce((sum, m) => sum + m.moments, 0) / previous.length : null;
    const change = before ? Math.round(((moments / list.length - before) / before) * 100) : null;
    const trend = change === null ? "" : change > 0 ? `, up ${change}% on ${ordered[index - 1]}` : change < 0 ? `, down ${-change}% on ${ordered[index - 1]}` : `, level with ${ordered[index - 1]}`;
    const text = [
      `${season}${season === current ? " so far" : ""}: ${count(list.length, "match")} and ${count(moments, "moment")}, ${average.toLocaleString("en-GB")} a match${trend}.`,
      `${first}'s best game was ${count(best.moments, "moment")} vs ${best.opponent} on ${shortDay(best.match_date)}.`,
      `${MONTHS[Number(busiest.month.slice(5, 7)) - 1]} was the busiest month with ${count(busiest.moments, "moment")}.`,
      times >= 2 ? `${opponentName} came up most often, ${times} times.` : "",
    ].filter(Boolean).join(" ");
    return {
      season, matches: list.length, moments, average, best,
      busiestMonth: { month: busiest.month, moments: busiest.moments },
      opponent: times >= 2 ? { name: opponentName, times } : null, change, months, text,
    };
  });
  return stories.reverse();
}
