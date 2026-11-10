import type { HudlMatch, HudlMoment } from "../api/hudl";
import type { PlayerProfile } from "../api/types";
import { fixtureDate, fixtureParts } from "./hudlFixture";

export type HudlPlayerMatch = {
  id: string; title: string; opponent: string; date: string | null; season: string; age: string;
  thumbnail_url?: string | null; moments: HudlMoment[];
};

function iso(date: Date | null): string | null {
  if (!date) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Cached Hudl matches where `name` is a tagged code, oldest first. */
export function hudlPlayerMatches(library: HudlMatch[] | undefined, name: string): HudlPlayerMatch[] {
  return (library ?? [])
    .map((m) => ({
      id: m.id, title: m.title, opponent: fixtureParts(m.title)?.opponent ?? m.title,
      date: iso(fixtureDate(m.title)), season: m.season_label || "Unclassified", age: m.age_group,
      thumbnail_url: m.thumbnail_url,
      moments: (m.moments ?? []).filter((t) => t.category === name).sort((a, b) => a.time_s - b.time_s),
    }))
    .filter((m) => m.moments.length > 0)
    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
}

/** Per-match series entries (with links into the Hudl match) for the hub charts. */
export function hudlPerMatch(matches: HudlPlayerMatch[], name: string): PlayerProfile["per_match"] {
  return matches.map((m, i) => ({
    match_id: -(i + 1), match_date: m.date ?? "", opponent: m.opponent, moments: m.moments.length,
    href: `/hudl/${encodeURIComponent(m.id)}?player=${encodeURIComponent(name)}`,
  }));
}

// Words that mark a code as a football situation rather than a person's name.
const SITUATION = new Set(
  ("possession ball play entry third chance target pressing press goal save shot shots corner kick free throw " +
    "cross pass passing tackle foul offside penalty counter attack attacking defence defensive defending " +
    "transition build regain turnover compactness regrouping managing contested opposition final def gk keeper " +
    "distribution claim block clearance header dribble switch recovery duel aerial won lost restart sub").split(" "),
);
const NOISE = new Set(["BALL OUT OF PLAY"]);

/** A code of two or three plain words with no football vocabulary is taken to be a player. */
export function looksLikePlayer(code: string): boolean {
  const words = code.toLowerCase().split(/\s+/).filter(Boolean);
  return words.length >= 2 && words.length <= 3 && words.every((w) => /^[a-z'-]+$/.test(w) && !SITUATION.has(w));
}

/** Situations whose Hudl ranges overlap the player's own tagged ranges, most frequent first.
 *  These describe what was happening around the player; they are not credited to them. */
export function hudlTagProfile(library: HudlMatch[] | undefined, name: string): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const match of library ?? []) {
    const all = match.moments ?? [];
    for (const mine of all.filter((t) => t.category === name)) {
      const end = mine.time_s + mine.duration_s;
      for (const other of all) {
        if (other.category === name || NOISE.has(other.category) || looksLikePlayer(other.category)) continue;
        if (other.time_s < end && other.time_s + other.duration_s > mine.time_s) {
          counts.set(other.category, (counts.get(other.category) ?? 0) + 1);
        }
      }
    }
  }
  return [...counts].map(([n, count]) => ({ name: n, count })).sort((a, b) => b.count - a.count).slice(0, 8);
}
