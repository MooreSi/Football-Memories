/** Readable fixture names and dates from Hudl library titles such as "261108 U11 v Stoke (A)". */

// Common shortenings in the owner's Hudl titles, expanded to the clubs' full names.
const CLUBS: Record<string, string> = {
  stoke: "Stoke City",
  "west brom": "West Bromwich Albion",
  leeds: "Leeds United",
  leicester: "Leicester City",
  coventry: "Coventry City",
  ipswich: "Ipswich Town",
  cambridge: "Cambridge United",
  oxford: "Oxford United",
  shrewsbury: "Shrewsbury Town",
  derby: "Derby County",
  norwich: "Norwich City",
  birmingham: "Birmingham City",
  "man city": "Manchester City",
  "man utd": "Manchester United",
  spurs: "Tottenham Hotspur",
};

export function fixtureDate(title: string): Date | null {
  const prefix = /^(\d{2})(\d{2})(\d{2})(?:\s|$)/.exec(title.trim());
  if (!prefix) return null;
  const date = new Date(2000 + Number(prefix[1]), Number(prefix[2]) - 1, Number(prefix[3]));
  return date.getMonth() === Number(prefix[2]) - 1 ? date : null;
}

export function fixtureParts(title: string): { opponent: string; venue: "Home" | "Away" | null } | null {
  const found = /\bvs?\.?\s+(.+?)\s*(?:\(([HAN])\)|\s-\s|\(|$)/i.exec(title);
  if (!found) return null;
  const short = found[1].trim();
  const venue = /\(H\)/i.test(title) ? "Home" : /\(A\)/i.test(title) ? "Away" : null;
  return { opponent: CLUBS[short.toLowerCase()] ?? short, venue };
}

/** "Aston Villa vs. Stoke City U11"; titles that are not fixtures are kept as written. */
export function fixtureLabel(title: string, club: string | null, age: string): string {
  const parts = fixtureParts(title);
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
