/** Owner request 2026-11-15: one Veo account films more than one club ("NL vs ...",
 *  "RCW vs ..."), so a Veo season report is split by club. A match belongs to the club
 *  its title names first; Veo's own team field is only a fallback, because it is
 *  sometimes wrong (a Norton Lindsay match filed under Racing Club Warwick). */

type Titled = { title: string; team?: string | null };

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
const acronym = (name: string) => norm(name).split(" ").map((w) => w[0]).join("");

/** The known clubs: the Veo team setting first, then each team Veo names, once each. */
export function veoClubNames(matches: Titled[], home: string | null): string[] {
  const names: string[] = [];
  for (const name of [home, ...matches.map((m) => m.team)]) {
    const t = name?.trim();
    if (t && !names.some((n) => norm(n) === norm(t))) names.push(t);
  }
  return names;
}

/** The first side of "261108 NL vs Northgate", or null when the title is no fixture. */
function firstSide(title: string): string | null {
  const body = title.trim().replace(/^(?:\d{6}|20\d{2}[.-]\d{2}[.-]\d{2})\s+/, "");
  const split = /^(.*?)\s+vs?\.?\s+\S/i.exec(body);
  const side = split?.[1].split(/\s+-\s+|\(/)[0].trim();
  return side || null;
}

/** Which club a Veo match is: a known club named in full, by initials or by its first
 *  word(s); otherwise the name as written; with no fixture, Veo's team, else "Other". */
export function veoClubOf(match: Titled, known: string[]): string {
  const side = firstSide(match.title);
  if (side) {
    const s = norm(side);
    const hit = known.find((k) => norm(k) === s || acronym(k) === s.replace(/ /g, "")
      || (s.length >= 3 && norm(k).startsWith(`${s} `)));
    return hit ?? side;
  }
  return match.team?.trim() || "Other";
}
