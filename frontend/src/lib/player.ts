import type { PlayerMoment } from "../api/types";

export interface TimelineMatch {
  match_id: number;
  match_date: string;
  opponent: string;
  team_name: string;
  age_group: string | null;
  thumbnail_url: string | null;
  moments: PlayerMoment[];
}
export interface TimelineMonth {
  key: string; // YYYY-MM
  label: string;
  matches: TimelineMatch[];
}
export interface TimelineSeason {
  season: string;
  months: TimelineMonth[];
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

/** Season > month > match > moment. Newest season, month and match first; moments in match order. */
export function groupTimeline(moments: PlayerMoment[]): TimelineSeason[] {
  const seasons = new Map<string, Map<string, Map<number, TimelineMatch>>>();
  for (const mo of moments) {
    const months = seasons.get(mo.season_label) ?? new Map<string, Map<number, TimelineMatch>>();
    seasons.set(mo.season_label, months);
    const key = mo.match_date.slice(0, 7);
    const matches = months.get(key) ?? new Map<number, TimelineMatch>();
    months.set(key, matches);
    const match = matches.get(mo.match_id) ?? {
      match_id: mo.match_id, match_date: mo.match_date, opponent: mo.opponent, team_name: mo.team_name,
      age_group: mo.age_group, thumbnail_url: mo.thumbnail_url, moments: [],
    };
    matches.set(mo.match_id, match);
    match.moments.push(mo);
  }
  const desc = (a: string, b: string) => (a < b ? 1 : a > b ? -1 : 0);
  return [...seasons.entries()]
    .sort(([a], [b]) => desc(a, b))
    .map(([season, months]) => ({
      season,
      months: [...months.entries()]
        .sort(([a], [b]) => desc(a, b))
        .map(([key, matches]) => ({
          key,
          label: monthLabel(key),
          matches: [...matches.values()]
            .sort((a, b) => desc(a.match_date, b.match_date) || b.match_id - a.match_id)
            .map((m) => ({ ...m, moments: [...m.moments].sort((x, y) => x.time_s - y.time_s) })),
        })),
    }));
}

/** Polygon points for a radar chart: first axis at the top, clockwise. */
export function radarPoints(values: number[], max: number, radius: number, cx: number, cy: number): [number, number][] {
  const n = values.length;
  return values.map((v, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
    const r = max > 0 ? (v / max) * radius : 0;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  });
}

/** Three-letter label for a tag name, like a player card's attribute codes. */
export function abbreviate(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  if (words[0].length <= 2) return (words[0] + words.slice(1).map((w) => w[0]).join("")).slice(0, 3).toUpperCase();
  return words.map((w) => w[0]).join("").slice(0, 3).toUpperCase();
}

/** Latest value against the average of the earlier ones. */
export function trend(values: number[]): "up" | "down" | "flat" {
  if (values.length < 2) return "flat";
  const last = values[values.length - 1];
  const before = values.slice(0, -1);
  const avg = before.reduce((a, b) => a + b, 0) / before.length;
  return last > avg ? "up" : last < avg ? "down" : "flat";
}
