import type { HudlMatch, HudlMoment } from "../api/hudl";
import type { PlayerProfile } from "../api/types";
import { fixtureDate, fixtureParts } from "./hudlFixture";
import { sameCode } from "./codes";

export type HudlPlayerMatch = {
  id: string; title: string; opponent: string; date: string | null; season: string; age: string;
  thumbnail_url?: string | null; moments: HudlMoment[];
};

function iso(date: Date | null): string | null {
  if (!date) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Cached Hudl matches where `name` is a tagged code, oldest first. */
export function hudlPlayerMatches(library: HudlMatch[] | undefined, name: string, club?: string | null): HudlPlayerMatch[] {
  return (library ?? [])
    .map((m) => ({
      id: m.id, title: m.title, opponent: fixtureParts(m.title, club)?.opponent ?? m.title,
      date: iso(fixtureDate(m.title)), season: m.season_label || "Unclassified", age: m.age_group,
      thumbnail_url: m.thumbnail_url,
      moments: (m.moments ?? []).filter((t) => sameCode(t.category, name)).sort((a, b) => a.time_s - b.time_s),
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
    "distribution claim block clearance header dribble switch recovery duel aerial won lost restart sub " +
    "half end injury best practice warm substitution kickoff").split(" "),
);

/** A code of two or three plain words with no football vocabulary is taken to be a player. */
export function looksLikePlayer(code: string): boolean {
  const words = code.toLowerCase().split(/\s+/).filter(Boolean);
  return words.length >= 2 && words.length <= 3 && words.every((w) => /^[a-z'-]+$/.test(w) && !SITUATION.has(w));
}

/** Owner decision 005 (2026-11-13): player names read "Chris Demo", not "CHRIS DEMO".
 *  The helper merges spellings in upper case; only codes that look like a name are
 *  re-cased, and only for display (comparisons ignore case, see lib/codes.ts). */
export function displayCode(code: string): string {
  if (!looksLikePlayer(code)) return code;
  return code.toLowerCase().replace(/(^|[\s'-])([a-z])/g, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}

/** The served library with player names re-cased; the input is not changed. */
export function displayLibrary(library: HudlMatch[]): HudlMatch[] {
  return library.map((m) => (m.moments ? { ...m, moments: m.moments.map((t) => ({ ...t, category: displayCode(t.category) })) } : m));
}
