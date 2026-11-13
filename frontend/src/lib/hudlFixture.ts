/** Readable fixture names and dates from Hudl library titles such as "261108 U11 v Stoke (A)". */
import { resolveClub, sameClub } from "./clubs";

export function fixtureDate(title: string): Date | null {
  const t = title.trim();
  const found = /^(\d{2})(\d{2})(\d{2})(?:\s|$)/.exec(t) ?? /^20(\d{2})[.-](\d{2})[.-](\d{2})(?:\s|$)/.exec(t);
  if (!found) return null;
  const date = new Date(2000 + Number(found[1]), Number(found[2]) - 1, Number(found[3]));
  return date.getMonth() === Number(found[2]) - 1 ? date : null;
}

// Our side written as an age group or birth year: "U10s", "U12/U13s", "2015s".
const OUR_SIDE = /^(?:(?:u\s*\d{1,2}s?|\d{4}s?)(?:\s*\/\s*(?:u\s*)?\d{1,4}s?)?\s*)*$/i;

/** One side of "X v Y", without brackets, " - Pitch 2", "| UYL" or a trailing "Pitch 1". */
function side(text: string): string {
  return text.split(/\s+-\s+|\s*\|\s*|\(/)[0].replace(/\s+pitch\s+\w+$/i, "").trim();
}

/** The opponent in a Hudl title. Our club, when known, tells which side is which in
 *  "Arsenal v Aston Villa" or "Barcelona 3-0 Aston Villa"; otherwise it is the side
 *  after "v" (owner request 2026-11-13: nicknames and short forms resolve to clubs). */
export function fixtureParts(title: string, home?: string | null): { opponent: string; venue: "Home" | "Away" | null } | null {
  const body = title.trim().replace(/^(?:\d{6}|20\d{2}[.-]\d{2}[.-]\d{2})\s+/, "");
  const split = /^(.*?)\s*(?:\b(?:vs?)\.?\s+|\s\d+\s*[-\u2013]\s*\d+\s+)(.+)$/i.exec(body);
  if (!split) return null;
  const left = side(split[1]);
  const right = side(split[2]);
  if (!right) return null;
  let opponent = right;
  if (left && !OUR_SIDE.test(left) && home && sameClub(right, home) && !sameClub(left, home)) opponent = left;
  const venue = /\(H\)/i.test(title) ? "Home" : /\(A\)/i.test(title) ? "Away" : null;
  return { opponent: resolveClub(opponent), venue };
}

/** "Aston Villa vs. Stoke City U11"; titles that are not fixtures are kept as written. */
export function fixtureLabel(title: string, club: string | null, age: string): string {
  const parts = fixtureParts(title, club);
  if (!parts) return title;
  return `${club || "Home"} vs. ${parts.opponent}${age && age !== "Unclassified" ? ` ${age}` : ""}`;
}

/** Newest dated title first; undated videos keep their library order after them. */
export function latestFirst<T extends { title: string }>(items: T[]): T[] {
  return items
    .map((item, index) => ({ item, index, time: fixtureDate(item.title)?.getTime() ?? -Infinity }))
    .sort((a, b) => b.time - a.time || a.index - b.index)
    .map((x) => x.item);
}

/** "Aston Villa U10" -> "Aston Villa". */
export function clubName(team: string | undefined): string | null {
  if (!team) return null;
  return team.replace(/\b(?:u\s*\d{1,2}s?|under[ -]?\d{1,2})\b/gi, "").replace(/\s+/g, " ").trim() || null;
}

/** UK long date, e.g. "8 November 2026" (spec 190). */
export function ukDate(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}
