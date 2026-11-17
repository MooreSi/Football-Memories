import { gameState, seasonGameLines } from "./gameState";
import type { HudlMatch } from "../api/hudl";
import { opponentRecords } from "./headToHead";
import { fixtureDate, fixtureParts, latestFirst, ukDate } from "./hudlFixture";
import { involvementTotals, possession, possessionTotals } from "./insights";
import { type Corrections, matchScore } from "./matchScore";
import { teamProfile } from "./matchProfile";
import { sameCode } from "./codes";
import { type MatchGoals, matchGoalLines, topScorers } from "./goals";

/** Spec 230: the numbers on a shareable report, kept apart from drawing them. */
export type ReportLine = { label: string; value: string };
export type Report = { kind: "match" | "season"; eyebrow: string; title: string; subtitle: string; headline: string | null; possession: { ours: number; theirs: number } | null;
  ours: string; theirs: string; lines: ReportLine[]; player: { name: string; lines: ReportLine[] } | null;
  /** Season only (owner request 2026-11-15): games played, won, drawn, lost; `unscored` have no result. */
  record?: { played: number; won: number; drawn: number; lost: number; unscored: number } | null;
  /** Season only (owner request 2026-11-15): each game won, drawn and lost, newest first. */
  results?: { won: string[]; drawn: string[]; lost: string[] } | null;
  /** Season only (spec 270; likely scorers counted from 2026-11-17): the top three scorers,
   *  and a note of how many are only likely and how many goals have no scorer. */
  scorers?: { lines: ReportLine[]; note: string | null } | null };

/** Veo's team stats as report lines (owner request 2026-11-15): Veo's attempts are its
 *  "shots on goal"; penalties always shown, 0 - 0 when Veo saw none. */
function veoLines(rows: { label: string; own: number; opponent: number }[]): ReportLine[] {
  const lines = rows.map((r) => ({ label: r.label === "Attempts" ? "Shots on goal" : r.label, value: `${r.own} - ${r.opponent}` }));
  return lines.some((l) => l.label === "Penalties") ? lines : [...lines, { label: "Penalties", value: "0 - 0" }];
}

export function matchReport(match: HudlMatch, club: string | null, corrections: Corrections | undefined, player: string | null,
  veoRows?: { label: string; own: number; opponent: number }[], goals?: MatchGoals): Report {
  const moments = match.moments ?? [];
  const opponent = fixtureParts(match.title, club)?.opponent ?? "Opposition";
  const date = fixtureDate(match.title);
  const score = matchScore(match, club, corrections);
  const poss = possession(moments, club);
  const axes = teamProfile(moments, club).axes.filter((a) => a.name !== "Possession").slice(0, 6);
  const tagged = player ? moments.filter((m) => sameCode(m.category, player)).length : 0;
  const v = player && tagged ? involvementTotals([match], player, club) : null;
  return {
    record: null, results: null,
    kind: "match", eyebrow: `MATCH REPORT · ${match.age_group}`, title: `${club || "Us"} v ${opponent}`, subtitle: date ? ukDate(date) : match.title,
    headline: score ? `${score.ours} - ${score.theirs}` : null, possession: poss && { ours: poss.oursPct, theirs: poss.theirsPct },
    ours: club || "Us", theirs: opponent,
    lines: [...(veoRows?.length ? veoLines(veoRows) : axes.map((a) => ({ label: a.name, value: `${a.ours} - ${a.theirs}` }))),
      ...(goals ? matchGoalLines(goals) : [])],
    player: v && player ? { name: player, lines: [
      { label: "Tagged moments", value: String(tagged) },
      { label: "During our chances", value: String(v.headline.ourChances) },
      { label: "During our goals", value: String(v.headline.ourGoals) },
      { label: "During opposition chances", value: String(v.headline.theirChances) },
    ] } : null,
  };
}

function scorerSection(matches: HudlMatch[], goals: Record<string, MatchGoals> | undefined): Report["scorers"] {
  if (!goals) return null;
  const { top, likely, unnamed } = topScorers(matches.flatMap((m) => (goals[m.id] ? [goals[m.id]] : [])));
  if (!top.length && !unnamed) return null;
  const plural = (n: number) => `${n} goal${n === 1 ? "" : "s"}`;
  const note = [likely ? `${plural(likely)} by a likely scorer, not yet confirmed` : "", unnamed ? `${plural(unnamed)} with no scorer` : ""]
    .filter(Boolean).join(" · ");
  return { lines: top.map((s, i) => ({ label: `${i + 1}. ${s.name}`, value: plural(s.goals) })), note: note || null };
}

/** Spec 290: scored first, came from behind, clean sheets, from fully timed matches only. */
function gameLines(matches: HudlMatch[], club: string | null, corrections: Corrections | undefined, goals: Record<string, MatchGoals>) {
  const scores = matches.map((m) => matchScore(m, club, corrections));
  return seasonGameLines(matches.map((m, i) => (goals[m.id] ? gameState(goals[m.id].goals, scores[i]) : { complete: false as const, reason: "" })), scores);
}

export function seasonReport(matches: HudlMatch[], scope: string, club: string | null, corrections: Corrections | undefined, player: string | null,
  goals?: Record<string, MatchGoals>): Report {
  const records = opponentRecords(matches, club, corrections);
  const sum = (k: "won" | "drawn" | "lost" | "goalsFor" | "goalsAgainst" | "scored") => records.reduce((n, r) => n + r[k], 0);
  const poss = possessionTotals(matches.map((m) => m.moments ?? []), club);
  const v = player ? involvementTotals(matches, player, club) : null;
  const scored = sum("scored");
  const results = { won: [] as string[], drawn: [] as string[], lost: [] as string[] };
  for (const m of latestFirst(matches)) {
    const score = matchScore(m, club, corrections);
    if (!score) continue;
    const line = `${fixtureParts(m.title, club)?.opponent ?? m.title} ${score.ours}-${score.theirs}`;
    results[score.ours > score.theirs ? "won" : score.ours < score.theirs ? "lost" : "drawn"].push(line);
  }
  return {
    results, scorers: scorerSection(matches, goals),
    record: { played: matches.length, won: sum("won"), drawn: sum("drawn"), lost: sum("lost"),
      unscored: matches.length - sum("won") - sum("drawn") - sum("lost") },
    kind: "season", eyebrow: "SEASON REPORT", title: `${club || "Our team"}`, subtitle: scope,
    headline: scored ? `W${sum("won")} D${sum("drawn")} L${sum("lost")}` : null,
    possession: poss && { ours: poss.oursPct, theirs: poss.theirsPct }, ours: club || "Us", theirs: "Opponents",
    lines: [
      { label: "Matches", value: String(matches.length) },
      ...(scored ? [{ label: "Goals", value: `${sum("goalsFor")} - ${sum("goalsAgainst")}` }] : []),
      { label: "Opponents", value: String(records.length) },
      ...(records[0] ? [{ label: "Most played", value: `${records[0].opponent} (${records[0].played})` }] : []),
      ...(goals ? gameLines(matches, club, corrections, goals) : []),
    ],
    player: v && player && v.moments ? { name: player, lines: [
      { label: "Matches tagged", value: String(v.matches) },
      { label: "Tagged moments", value: `${v.moments} (${Math.round((v.moments / v.matches) * 10) / 10} a match)` },
      { label: "During our chances / goals", value: `${v.headline.ourChances} / ${v.headline.ourGoals}` },
    ] } : null,
  };
}
