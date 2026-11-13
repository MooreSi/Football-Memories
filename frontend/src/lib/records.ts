import type { PlayerProfile } from "../api/types";

/** Owner request 2026-11-13: records and streaks on the player hub, from the moments
 *  tagged with the player in each match (imported and Hudl). */
export type MatchCount = PlayerProfile["per_match"][number];

export type Records = {
  total: number;
  average: number;
  best: MatchCount;
  latest: MatchCount;
  personalBest: boolean;
  bestMonth: { month: string; moments: number; matches: number };
  currentRun: number;
  longestRun: number;
  milestone: { next: number; previous: number; remaining: number; fraction: number };
};

const MILESTONES = [50, 100, 250, 500, 750, 1000, 1250, 1500, 2000, 2500, 3000, 4000, 5000];

function milestone(total: number): Records["milestone"] {
  let next = MILESTONES.find((value) => value > total);
  if (next === undefined) next = (Math.floor(total / 1000) + 1) * 1000;
  const previous = [...MILESTONES].reverse().find((value) => value <= total && value < next!) ?? 0;
  const base = total >= 5000 ? next - 1000 : previous;
  return { next, previous: base, remaining: next - total, fraction: Math.round(((total - base) / (next - base)) * 100) / 100 };
}

export function playerRecords(series: MatchCount[]): Records | null {
  const matches = series.filter((m) => m.match_date).sort((a, b) => a.match_date.localeCompare(b.match_date));
  if (matches.length === 0) return null;
  const total = matches.reduce((sum, m) => sum + m.moments, 0);
  const average = Math.round((total / matches.length) * 100) / 100;
  const best = matches.reduce((top, m) => (m.moments > top.moments ? m : top), matches[0]);
  const latest = matches[matches.length - 1];
  const earlier = matches.slice(0, -1);
  const personalBest = earlier.length > 0 && earlier.every((m) => latest.moments > m.moments);
  const months = new Map<string, { moments: number; matches: number }>();
  for (const m of matches) {
    const key = m.match_date.slice(0, 7);
    const month = months.get(key) ?? { moments: 0, matches: 0 };
    months.set(key, { moments: month.moments + m.moments, matches: month.matches + 1 });
  }
  // A tie goes to the more recent month.
  const [month, counts] = [...months].reduce((top, entry) => (entry[1].moments >= top[1].moments ? entry : top));
  let run = 0;
  let longestRun = 0;
  for (const m of matches) {
    run = m.moments >= average ? run + 1 : 0;
    longestRun = Math.max(longestRun, run);
  }
  return { total, average, best, latest, personalBest, bestMonth: { month, ...counts }, currentRun: run, longestRun, milestone: milestone(total) };
}
