/** Owner request 2026-11-15: one Veo account films more than one club ("NL vs ...",
 *  "RCW vs ..."), so a Veo season report is split by club. A match belongs to the club
 *  its title names first; Veo's own team field is only a fallback, because it is
 *  sometimes wrong (a Norton Lindsey match filed under Racing Club Warwick).
 *
 *  Owner request 2026-11-20: the account films many clubs and titles name them many ways:
 *  initials ("NL", "RCW", "SAFC Blues"), squad codes and age groups ("Solihull Moors AB U9s",
 *  "Redditch United MA", "Olton Ravens TB"), plurals and spellings ("Blues", "Lindsay"), and
 *  short forms ("Redditch", "Kenilworth"). The clubs are learnt from the titles themselves. */

type Titled = { title: string; team?: string | null };

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
const singular = (w: string) => (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w);

/** Words that name a squad, not a club: age groups, leagues, match days. */
const SQUAD_WORD = /^(?:u\d{1,2}s?|under\d{1,2}s?|\d{1,2}s|mjpl|league|cup|sun|sat|sunday|saturday|team|squad)$/i;

/** The side without its squad: trailing squad words and short capital codes ("AB", "MA"). */
function clubPart(side: string): string[] {
  const words = side.replace(/\(.*$/, "").split(/\s+/).filter(Boolean);
  while (words.length > 1) {
    const last = words[words.length - 1];
    const lowerCode = words.length >= 3 && /^[a-z]{1,2}$/.test(last); // "Solihull moors ab"
    if (SQUAD_WORD.test(last) || /^[A-Z]{1,4}$/.test(last) || /^u\s?\d/i.test(last) || lowerCode
      || /^[a-z]{1,2}\/[a-z]{1,2}$/i.test(last)) words.pop();
    else break;
  }
  return words;
}

/** Edits between two words, a swap of two letters counting as one ("Acadmey"). */
function levenshtein(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i ? (j ? 0 : i) : j)));
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

/** Two words of a club name are the same: equal, a plural, or a near spelling. */
function sameWord(a: string, b: string): boolean {
  const x = singular(norm(a)), y = singular(norm(b));
  if (x === y) return true;
  const allowed = Math.min(x.length, y.length) >= 8 ? 2 : Math.min(x.length, y.length) >= 5 ? 1 : 0;
  return allowed > 0 && levenshtein(x, y) <= allowed;
}

/** What one written token can stand for: itself, or initials ("SAFC" = "SA" + F.C.). */
function readings(token: string): { initials: string | null; word: string } {
  const caps = /^[A-Z]{2,6}$/.test(token);
  return { initials: caps ? token.toLowerCase() : null, word: token };
}

/** How many words of `club` the written side covers, in order (0 = not this club). The
 *  first word must match; later club words may be skipped ("Solihull Blues"). */
function coverage(side: string[], club: string): number {
  const words = norm(club).split(" ");
  const best = (t: number, w: number): number => {
    if (t === side.length) return 0;
    if (w >= words.length) return -1;
    const { initials, word } = readings(side[t]);
    let result = -1;
    const options = initials ? [initials, initials.replace(/a?fc$/, ""), initials.replace(/fc$/, "")] : [];
    for (const letters of new Set(options.filter(Boolean))) {
      const span = words.slice(w, w + letters.length);
      if (span.length === letters.length && span.map((x) => x[0]).join("") === letters) {
        const rest = best(t + 1, w + letters.length);
        if (rest >= 0) result = Math.max(result, letters.length + rest);
      }
    }
    if (sameWord(word, words[w])) {
      const rest = best(t + 1, w + 1);
      if (rest >= 0) result = Math.max(result, 1 + rest);
    }
    // After the first word, a club word the title leaves out may be skipped.
    if (t > 0) {
      const skipped = best(t, w + 1);
      if (skipped >= 0) result = Math.max(result, skipped);
    }
    return result;
  };
  return Math.max(0, best(0, 0));
}

/** Words many clubs share: on their own they name no club. */
const COMMON = new Set(["united", "city", "town", "rovers", "rangers", "athletic", "sporting", "academy", "junior",
  "juniors", "fc", "afc", "villa", "county", "albion", "wanderers", "celtic", "blue", "white", "red", "black", "green",
  "colts", "youth", "club", "football"]);

/** The one known club this side names, or null when it names none or could be two. */
function match(side: string, known: string[]): string | null {
  const part = clubPart(side);
  // "Moors vs ...": one distinctive word that only one known club has.
  if (part.length === 1 && part[0].length >= 4 && !COMMON.has(singular(norm(part[0])))) {
    const holders = known.filter((k) => norm(k).split(" ").slice(1).some((w) => sameWord(w, part[0])));
    if (holders.length === 1 && !known.some((k) => coverage(part, k) > 0)) return holders[0];
  }
  const scored = known.map((k) => ({ k, score: coverage(part, k), full: coverage(part, k) === norm(k).split(" ").length }))
    .filter((s) => s.score > 0);
  if (!scored.length) return null;
  const full = scored.filter((s) => s.full);
  const pool = full.length ? full : scored;
  const top = Math.max(...pool.map((s) => s.score));
  const best = pool.filter((s) => s.score === top);
  return best.length === 1 ? best[0].k : null;
}

/** The two sides of "261108 NL vs Northgate", or null when the title is no fixture. */
function sides(title: string): [string, string] | null {
  const body = title.trim().replace(/^(?:\d{6}|20\d{2}[.-]\d{2}[.-]\d{2})\s+/, "").replace(/^match\s*-\s*/i, "");
  const split = /^(.*?)\s+vs?\.?\s+(.+)$/i.exec(body);
  if (!split) return null;
  const first = split[1].split(/\s+-\s+|\(/)[0].trim();
  const second = split[2].split(/\s+-\s+|\(/)[0].trim();
  return first ? [first, second] : null;
}

/** A side written as a club name (not initials), worth learning when it recurs. */
const nameLike = (words: string[]) => words.some((w) => /[a-z]/.test(w) && w.length >= 3);

/** The known clubs: the Veo team setting, each team Veo names, and each club the titles
 *  name first at least twice. One name per club: the spelling the titles use most. */
export function veoClubNames(matches: Titled[], home: string | null): string[] {
  const clubs: { name: string; spellings: Map<string, number> }[] = [];
  const add = (name: string, weight: number, learnt: boolean) => {
    const words = clubPart(name.trim());
    // The setting and Veo's own team names are kept as written ("Riverside U11"); only a
    // name learnt from titles loses its squad code.
    const written = learnt ? words.join(" ") : name.trim().replace(/\s+/g, " ");
    if (!written) return;
    const exact = clubs.find((c) => norm(c.name) === norm(written));
    if (exact) { exact.spellings.set(written, (exact.spellings.get(written) ?? 0) + weight); return; }
    const hit = match(written, clubs.map((c) => c.name));
    const twin = hit && clubs.find((c) => c.name === hit);
    // Same words, spelt slightly differently: one club, counted under this spelling.
    if (twin && norm(twin.name).split(" ").length === words.length) {
      twin.spellings.set(written, (twin.spellings.get(written) ?? 0) + weight);
      return;
    }
    if (learnt && (hit || clubs.some((c) => coverage(words, c.name) > 0))) return; // a short form, or unclear
    clubs.push({ name: written, spellings: new Map([[written, weight]]) });
  };
  if (home?.trim()) add(home, 1, false);
  for (const m of matches) if (m.team?.trim()) add(m.team, 0, false);
  // Recurring first sides, longest names first so short forms fold into them.
  const counts = new Map<string, { words: string[]; n: number }>();
  for (const m of matches) {
    const first = sides(m.title)?.[0];
    const words = first ? clubPart(first) : [];
    if (!nameLike(words)) continue;
    const key = norm(words.join(" "));
    const seen = counts.get(key);
    counts.set(key, { words: seen?.words ?? words, n: (seen?.n ?? 0) + 1 });
  }
  const recurring = [...counts.values()].filter((c) => c.n >= 2).sort((a, b) => b.words.length - a.words.length || b.n - a.n);
  for (const c of recurring) add(c.words.join(" "), c.n, true);
  return clubs.map((c) => [...c.spellings].sort((a, b) => b[1] - a[1])[0]?.[0] ?? c.name);
}

/** Which club a Veo match is: the known club either side names (the first side first);
 *  otherwise the first side as written; with no fixture, Veo's team, else "Other". */
export function veoClubOf(match_: Titled, known: string[]): string {
  const pair = sides(match_.title);
  if (pair) return match(pair[0], known) ?? match(pair[1], known) ?? pair[0];
  return match_.team?.trim() || "Other";
}
