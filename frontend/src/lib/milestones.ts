import type { MatchCount } from "./records";

/** Owner request 2026-11-13: milestones along the player's archive, from the moments
 *  tagged with the player in each match. Hudl matches also carry their age group and
 *  how many of the team's goals overlapped the player's moments. Uses the player's
 *  first name, never a guessed pronoun. */
export type MilestoneMatch = MatchCount & { age?: string; goals?: number };
export type Milestone = {
  kind: "first" | "season" | "age" | "moments" | "matches" | "best" | "goal";
  title: string; detail: string; date: string; href: string;
};

const MOMENTS = [100, 250, 500, 750, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 7500, 10000];
const MATCHES = [10, 25, 50, 75, 100, 150, 200];
const BEST_AFTER = 5;

function seasonOf(date: string): string {
  const year = Number(date.slice(0, 4));
  const start = Number(date.slice(5, 7)) >= 7 ? year : year - 1;
  return `${start}/${String((start + 1) % 100).padStart(2, "0")}`;
}

export function milestones(series: MilestoneMatch[], name: string): Milestone[] {
  const first = name.trim().split(/\s+/)[0] || name;
  const matches = series.filter((m) => m.match_date).sort((a, b) => a.match_date.localeCompare(b.match_date));
  const found: Milestone[] = [];
  let total = 0;
  let best = 0;
  let season = "";
  const ages = new Set<string>();
  let scored = false;
  matches.forEach((m, index) => {
    const at = (kind: Milestone["kind"], title: string) =>
      found.push({ kind, title, detail: `vs ${m.opponent}`, date: m.match_date, href: m.href ?? `/matches/${m.match_id}` });
    const thisSeason = seasonOf(m.match_date);
    if (index === 0) at("first", "First match");
    else if (thisSeason !== season) at("season", `First ${thisSeason} match`);
    season = thisSeason;
    if (m.age && ages.size > 0 && !ages.has(m.age)) at("age", `First ${m.age} match`);
    if (m.age) ages.add(m.age);
    const before = total;
    total += m.moments;
    for (const mark of MOMENTS) if (before < mark && total >= mark) at("moments", `${mark.toLocaleString("en-GB")} moments`);
    if (MATCHES.includes(index + 1)) at("matches", `${index + 1} matches`);
    if (index >= BEST_AFTER && m.moments > best) at("best", `New best: ${m.moments} moments`);
    best = Math.max(best, m.moments);
    if (!scored && (m.goals ?? 0) > 0) { at("goal", `First team goal with ${first} on`); scored = true; }
  });
  return found;
}
