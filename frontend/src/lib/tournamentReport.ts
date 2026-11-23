import type { Tournament } from "../api/types";
import type { Report } from "./report";
import type { Score } from "./matchScore";
import { tournamentStats } from "./tournaments";

export type TournamentReportGame = { key: string; title: string; date: string | null; club: string | null; score: Score | null; scoreNote?: string };

/** Membership, not the currently visible Library cards, determines report scope. */
export function tournamentReport(tournament: Tournament, games: TournamentReportGame[], team = ""): Report {
  const byKey = new Map(games.map(game => [game.key, game]));
  const entries = Object.entries(tournament.entries).filter(([, squad]) => squad !== "Team unassigned" && (!team || squad === team));
  const rows = tournamentStats({ ...tournament, entries: Object.fromEntries(entries) }, games);
  const sum = (key: "games" | "scored" | "won" | "drawn" | "lost" | "gf" | "ga" | "gd") => rows.reduce((n, row) => n + row[key], 0);
  const played = sum("games"), scored = sum("scored"), gd = sum("gd");
  const review = team ? [] : Object.entries(tournament.entries).filter(([, squad]) => squad === "Team unassigned");
  const dates = [...new Set([...entries, ...review].map(([key]) => byKey.get(key)?.date).filter((date): date is string => Boolean(date)))].sort();
  const dateLabel = (date: string) => new Date(`${date.slice(0, 10)}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const date = dates.length ? dates.length === 1 ? dateLabel(dates[0]) : `${dateLabel(dates[0])} – ${dateLabel(dates[dates.length - 1])}` : "Date unknown";
  const clean = entries.filter(([key]) => byKey.get(key)?.score?.theirs === 0).length;
  const gameLines = (members: [string, string][], prefix: string) => [...members]
    .sort(([a], [b]) => (byKey.get(a)?.date ?? "").localeCompare(byKey.get(b)?.date ?? "") || a.localeCompare(b, undefined, { numeric: true }))
    .map(([key, squad], i) => {
      const game = byKey.get(key), score = game?.score;
      return { label: `${prefix} ${i + 1}`, value: `${game?.title ?? `${key} · Metadata unavailable`} · ${squad} · ${score ? `${score.ours}–${score.theirs}${game?.scoreNote ? ` (${game.scoreNote})` : ""}` : "Score not recorded"}` };
    });
  return {
    kind: "tournament", title: !tournament.name_corrected && tournament.name.startsWith("Match day · ")
      ? `Tournament · ${dates.length ? new Date(`${dates[dates.length - 1]}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "Date unknown"}` : tournament.name, eyebrow: "TOURNAMENT REPORT", subtitle: `${date} · ${team || "All squads"}`,
    headline: team ? null : `${rows.length} ${rows.length === 1 ? "squad" : "squads"} · ${review.length} ${review.length === 1 ? "needs" : "need"} review`,
    ours: entries.map(([key]) => byKey.get(key)?.club).find(Boolean) || "Our team", theirs: "Opponents", possession: null, player: null,
    record: { played, won: sum("won"), drawn: sum("drawn"), lost: sum("lost"), unscored: played - scored },
    lines: [
      { label: "Goals for / against", value: scored ? `${sum("gf")} / ${sum("ga")}` : "—" },
      { label: "Goal difference", value: scored ? `${gd > 0 ? "+" : ""}${gd}` : "—" },
      { label: "Clean sheets", value: scored ? String(clean) : "—" },
      { label: "Win rate", value: scored ? `${Math.round(sum("won") / scored * 100)}% of scored games` : "—" },
      { label: "Score coverage", value: `${scored} of ${played} assigned games` },
      { label: "Stats scope", value: "Assigned squads only. Unknown scores excluded; review games do not contribute." },
      ...(!team ? rows.map((row, i) => ({ label: `Squad ${i + 1}`, value: `${row.team} · ${row.games} ${row.games === 1 ? "game" : "games"} · ${row.scored ? `W${row.won} D${row.drawn} L${row.lost} · GF ${row.gf} GA ${row.ga} GD ${row.gd > 0 ? "+" : ""}${row.gd}` : "No scores recorded"} · ${row.scored}/${row.games} scored` })) : []),
      ...gameLines(entries, "Game"),
      ...(review.length ? [{ label: "Needs review", value: `${review.length} linked ${review.length === 1 ? "game" : "games"} excluded from squad totals` }, ...gameLines(review, "Review")] : []),
    ],
  };
}
