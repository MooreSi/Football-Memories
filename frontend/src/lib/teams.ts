import { type HudlMatch, hudlAgeGroups } from "../api/hudl";

/** Owner request 2026-11-13: one team followed across seasons. U11 in 2026/27 is the
 *  same players as U10 in 2025/26 and U9 in 2024/25, so a team is keyed by
 *  (season's first year - age), the year that age group would have been "U0". */
export type Team = number;

export function seasonStart(label: string | undefined): number | null {
  const found = /^(\d{4})/.exec(label ?? "");
  return found ? Number(found[1]) : null;
}

function ages(group: string): number[] {
  return [...group.matchAll(/U\s*(\d{1,2})/gi)].map((m) => Number(m[1]));
}

export function cohortOf(age: string, season: string | undefined): Team | null {
  const start = seasonStart(season);
  const n = ages(age)[0];
  return start === null || n === undefined ? null : start - n;
}

export function ageIn(team: Team, season: string): string {
  const start = seasonStart(season);
  return start === null ? "" : `U${start - team}`;
}

export function inCohort(match: HudlMatch, team: Team): boolean {
  const start = seasonStart(match.season_label);
  if (start === null) return false;
  return hudlAgeGroups(match).some((g) => ages(g).some((n) => start - n === team));
}

/** The seasons this team has matches in, newest first, with its age group in each. */
export function teamSeasons(library: HudlMatch[] | undefined, team: Team): { season: string; age: string }[] {
  const seasons = [...new Set((library ?? []).filter((m) => inCohort(m, team)).map((m) => m.season_label!))];
  return seasons.sort((a, b) => b.localeCompare(a)).map((season) => ({ season, age: ageIn(team, season) }));
}

/** Every season in the library, newest first (undated videos left out). */
export function allSeasons(library: HudlMatch[] | undefined): string[] {
  return [...new Set((library ?? []).map((m) => m.season_label ?? "").filter((s) => seasonStart(s) !== null))].sort((a, b) => b.localeCompare(a));
}

/** Age groups with matches in one season, youngest first. */
export function agesIn(library: HudlMatch[] | undefined, season: string): string[] {
  const found = new Set<number>();
  for (const m of library ?? []) if (m.season_label === season) for (const g of hudlAgeGroups(m)) for (const n of ages(g)) found.add(n);
  return [...found].sort((a, b) => a - b).map((n) => `U${n}`);
}
