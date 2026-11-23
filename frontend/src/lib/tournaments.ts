import type { Tournament } from "../api/types";
import type { Score } from "./matchScore";

export type TournamentGame = { key: string; score: Score | null };
export type TournamentStats = { team: string; games: number; scored: number; won: number; drawn: number; lost: number; gf: number; ga: number; gd: number };

export function tournamentStats(tournament: Tournament, games: TournamentGame[]): TournamentStats[] {
  const scores = new Map(games.map(game => [game.key, game.score]));
  const rows = new Map<string, TournamentStats>();
  for (const [key, team] of Object.entries(tournament.entries)) {
    const row = rows.get(team) ?? {team, games: 0, scored: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0};
    row.games++;
    const score = scores.get(key);
    if (score) {
      row.scored++;
      row.gf += score.ours;
      row.ga += score.theirs;
      row.gd = row.gf - row.ga;
      if (score.ours > score.theirs) row.won++;
      else if (score.ours < score.theirs) row.lost++;
      else row.drawn++;
    }
    rows.set(team, row);
  }
  return [...rows.values()].sort((a,b) => a.team.localeCompare(b.team));
}
