import type { HudlMatch, HudlMoment } from "../api/hudl";
import { clubKey } from "./clubs";
import { sameCode } from "./codes";
import { codeSides, type Placed } from "./matchProfile";
import { fixtureDate, fixtureParts } from "./hudlFixture";
import type { MatchCount } from "./records";

// Owner request 2026-11-13: an opponent map and top moments on the player hub.

export type Club = { name: string; matches: number; moments: number; last: string; href: string };

/** Clubs played, most often first, from the moments-per-match series. */
export function opponentMap(series: MatchCount[]): Club[] {
  const clubs = new Map<string, Club>();
  for (const m of [...series].filter((x) => x.match_date && x.opponent).sort((a, b) => a.match_date.localeCompare(b.match_date))) {
    const key = clubKey(m.opponent);
    const club = clubs.get(key) ?? { name: m.opponent, matches: 0, moments: 0, last: "", href: "" };
    clubs.set(key, { ...club, matches: club.matches + 1, moments: club.moments + m.moments, last: m.match_date, href: m.href ?? `/matches/${m.match_id}` });
  }
  return [...clubs.values()].sort((a, b) => b.matches - a.matches || b.moments - a.moments || a.name.localeCompare(b.name));
}

export type RankedMoment = {
  match_id: string; moment_id: string; reason: string; score: number; time_s: number;
  opponent: string; date: string; href: string; thumbnail: string | null;
};

/** What a situation code says about the play, best first, by side (codeSides, as the
 *  match insights read them): our GOAL, a save, our chance or shot, a shot faced.
 *  Goal kicks, "1 GOAL KEEPER", goals conceded and codes of no side count for nothing. */
function weigh(placed: Placed): [number, string] {
  const { side, stem } = placed;
  if (stem === "GOAL") return side === "ours" ? [5, "Team goal"] : [0, ""];
  if (/^SAVES?$/.test(stem) && side !== "theirs") return [4, "Save"];
  if (stem === "CHANCE" || /^SHOTS?\b/.test(stem) || /ON TARGET/.test(stem)) {
    return side === "ours" ? [3, "Chance"] : side === "theirs" ? [2, "Shot faced"] : [0, ""];
  }
  return [0, ""];
}

const overlaps = (a: HudlMoment, b: HudlMoment) => a.time_s < b.time_s + b.duration_s && b.time_s < a.time_s + a.duration_s;

/** The player's Hudl moments ranked by the play they overlapped (goal, save, chance,
 *  shot faced); a tie goes to the newer match, then the later moment. */
export function rankHudlMoments(library: HudlMatch[] | undefined, name: string, limit: number, club: string | null = null): RankedMoment[] {
  const ranked: RankedMoment[] = [];
  for (const match of library ?? []) {
    const all = match.moments ?? [];
    const others = all.filter((m) => !sameCode(m.category, name));
    const place = codeSides(all, club);
    const date = fixtureDate(match.title);
    const iso = date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}` : "";
    for (const mine of all.filter((m) => sameCode(m.category, name))) {
      let best: [number, string] = [0, ""];
      for (const other of others) if (overlaps(mine, other)) { const w = weigh(place(other.category)); if (w[0] > best[0]) best = w; }
      if (best[0] === 0) continue;
      ranked.push({
        match_id: match.id, moment_id: mine.id, reason: best[1], score: best[0], time_s: mine.time_s,
        opponent: fixtureParts(match.title, club)?.opponent ?? match.title, date: iso,
        href: `/hudl/${encodeURIComponent(match.id)}?moment=${encodeURIComponent(mine.id)}`, thumbnail: match.thumbnail_url ?? null,
      });
    }
  }
  ranked.sort((a, b) => b.score - a.score || b.date.localeCompare(a.date) || b.time_s - a.time_s);
  // Variety: each match's best moment first, then the rest in the same order.
  const seen = new Set<string>();
  const firsts = ranked.filter((m) => !seen.has(m.match_id) && seen.add(m.match_id));
  return [...firsts, ...ranked.filter((m) => !firsts.includes(m))].slice(0, limit);
}
