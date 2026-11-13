import type { HudlMatch } from "../api/hudl";
import { sameClub } from "./clubs";
import { fixtureDate, fixtureParts } from "./hudlFixture";
import { type Corrections, type Score, matchScore } from "./matchScore";

/** Spec 230: our record against each club, from match titles and scores (spec 210). */
export type Meeting = { id: string; title: string; date: string | null; score: Score | null };
export type Record = {
  opponent: string; played: number; scored: number; won: number; drawn: number; lost: number;
  goalsFor: number; goalsAgainst: number; last: Meeting | null; meetings: Meeting[];
};

function iso(date: Date | null): string | null {
  if (!date) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Every opponent in the library, most played first. Matches without a score count as
 *  played but not as a result; a match with no "X v Y" title has no opponent. */
export function opponentRecords(library: HudlMatch[] | undefined, club: string | null, corrections: Corrections | undefined): Record[] {
  const records: Record[] = [];
  for (const match of library ?? []) {
    const opponent = fixtureParts(match.title, club)?.opponent;
    if (!opponent) continue;
    let r = records.find((x) => sameClub(x.opponent, opponent));
    if (!r) {
      r = { opponent, played: 0, scored: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, last: null, meetings: [] };
      records.push(r);
    }
    const s = matchScore(match, club, corrections);
    const score = s && { ours: s.ours, theirs: s.theirs };
    r.played += 1;
    if (score) {
      r.scored += 1;
      r.goalsFor += score.ours;
      r.goalsAgainst += score.theirs;
      if (score.ours > score.theirs) r.won += 1;
      else if (score.ours < score.theirs) r.lost += 1;
      else r.drawn += 1;
    }
    r.meetings.push({ id: match.id, title: match.title, date: iso(fixtureDate(match.title)), score });
  }
  for (const r of records) {
    r.meetings.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
    r.last = r.meetings[0] ?? null;
  }
  return records.sort((a, b) => b.played - a.played || a.opponent.localeCompare(b.opponent));
}

export function recordAgainst(library: HudlMatch[] | undefined, club: string | null, corrections: Corrections | undefined, opponent: string): Record | null {
  return opponentRecords(library, club, corrections).find((r) => sameClub(r.opponent, opponent)) ?? null;
}
