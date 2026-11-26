import type { HudlMoment } from "../api/hudl";
import { formatClock } from "./format";
import { fixtureDate } from "./hudlFixture";
import { codeSides } from "./matchProfile";
import type { TeamRow, VeoTeamEvent } from "./veoTeamSplit";

/** Owner request 2026-11-26: a Match stats tab beside Team stats, with the match's own
 *  numbers drawn as charts (references 04-07 in docs/design). Everything here comes from
 *  the team stats rows and the sided events already on the page; nothing is estimated. */
export type Side = "ours" | "theirs";
export type StatKind = "goal" | "attempt" | "corner" | "freeKick" | "foul" | "penalty";
export type StatEvent = { side: Side; kind: StatKind; time_s: number };

const VEO_KINDS: Record<string, StatKind> = {
  GOAL: "goal", SHOT: "attempt", "CORNER KICK": "corner", "FREE KICK": "freeKick", FOUL: "foul", "PENALTY KICK": "penalty",
};
const HUDL_KINDS: Record<string, StatKind> = {
  GOAL: "goal", CHANCE: "attempt", CORNER: "corner", "FREE KICK": "freeKick", FOUL: "foul", PENALTY: "penalty",
};
const byTime = (a: StatEvent, b: StatEvent) => a.time_s - b.time_s;

/** Veo logs a goal as a SHOT then a GOAL about a second later, and counts it once in its
 *  attempts total; a GOAL within this many seconds of a same-side SHOT is that shot. */
const GOAL_AFTER_SHOT_S = 5;

export function veoStatEvents(events: VeoTeamEvent[]): StatEvent[] {
  const out: StatEvent[] = [];
  for (const e of [...events].sort((a, b) => a.time_s - b.time_s)) {
    const kind = VEO_KINDS[e.type];
    if (!kind || !e.side) continue;
    const side: Side = e.side === "own" ? "ours" : "theirs";
    if (kind === "goal") {
      const shot = [...out].reverse().find(x => x.side === side && x.kind === "attempt" && e.time_s - x.time_s <= GOAL_AFTER_SHOT_S);
      if (shot) { shot.kind = "goal"; continue; }
    }
    out.push({ side, kind, time_s: e.time_s });
  }
  return out;
}

export function hudlStatEvents(moments: HudlMoment[], club: string | null): StatEvent[] {
  const place = codeSides(moments, club);
  const out: StatEvent[] = [];
  for (const m of moments) {
    const { side, stem } = place(m.category);
    const kind = HUDL_KINDS[stem];
    if (kind && side !== "neutral") out.push({ side, kind, time_s: m.time_s });
  }
  return out.sort(byTime);
}

const row = (rows: TeamRow[], ...labels: string[]) => rows.find(r => labels.includes(r.label));
const pct = (part: number, whole: number) => Math.round((part / whole) * 100);

export type Shots = { goals: number; attempts: number; onTarget: number | null; conversion: number | null };
export type ShotSummary = { ours: Shots; theirs: Shots; share: number | null };

/** Goals per attempt for each side, and our share of the match's attempts. A goal is
 *  always an attempt, so attempts never fall below goals (Hudl may tag a goal alone). */
export function shotSummary(rows: TeamRow[]): ShotSummary | null {
  const goals = row(rows, "Goals"), attempts = row(rows, "Attempts", "Chances"), target = row(rows, "On target");
  if (!goals && !attempts) return null;
  const side = (k: "own" | "opponent"): Shots => {
    const g = goals?.[k] ?? 0;
    const a = Math.max(attempts?.[k] ?? 0, g);
    return { goals: g, attempts: a, onTarget: target ? target[k] : null, conversion: a ? pct(g, a) : null };
  };
  const ours = side("own"), theirs = side("opponent");
  const all = ours.attempts + theirs.attempts;
  return { ours, theirs, share: all ? pct(ours.attempts, all) : null };
}

export type Step = { time_s: number; total: number; goal: boolean };

/** Running total of each side's attempts (goals included), one step per attempt. */
export function attemptsOverTime(events: StatEvent[]): Record<Side, Step[]> {
  const out: Record<Side, Step[]> = { ours: [], theirs: [] };
  for (const e of [...events].sort(byTime)) {
    if (e.kind !== "attempt" && e.kind !== "goal") continue;
    const list = out[e.side];
    list.push({ time_s: e.time_s, total: list.length + 1, goal: e.kind === "goal" });
  }
  return out;
}

export const SPELL_S = 900;
type Tally = { attempts: number; goals: number };
export type Spell = { start: number; ours: Tally; theirs: Tally };

/** Attempts and goals per side in 15-minute spells from kick-off to the end of the match. */
export function spells(events: StatEvent[], duration: number): Spell[] {
  const end = Math.max(duration, ...events.map(e => e.time_s + 1), 0);
  const out: Spell[] = Array.from({ length: Math.ceil(end / SPELL_S) }, (_, i) => ({
    start: i * SPELL_S, ours: { attempts: 0, goals: 0 }, theirs: { attempts: 0, goals: 0 },
  }));
  for (const e of events) {
    if (e.kind !== "attempt" && e.kind !== "goal") continue;
    const t = out[Math.floor(e.time_s / SPELL_S)][e.side];
    t.attempts += 1;
    if (e.kind === "goal") t.goals += 1;
  }
  return out;
}

const PERIODS = ["1st half", "2nd half", "Extra time 1", "Extra time 2"];
type PeriodTally = { goals: number; attempts: number; corners: number };
export type Period = { label: string; ours: PeriodTally; theirs: PeriodTally };

/** Each period's goals, attempts and corners. An event in a break counts to the period
 *  before it. Empty unless the match has at least two periods. */
export function periodSplit(events: StatEvent[], halves: number[][] | undefined): Period[] {
  if (!halves || halves.length < 2) return [];
  const out: Period[] = halves.map((_, i) => ({
    label: PERIODS[i] ?? `Period ${i + 1}`,
    ours: { goals: 0, attempts: 0, corners: 0 }, theirs: { goals: 0, attempts: 0, corners: 0 },
  }));
  for (const e of events) {
    let i = 0;
    halves.forEach((h, j) => { if (e.time_s >= h[0]) i = j; });
    const t = out[i][e.side];
    if (e.kind === "goal") { t.goals += 1; t.attempts += 1; }
    if (e.kind === "attempt") t.attempts += 1;
    if (e.kind === "corner") t.corners += 1;
  }
  return out;
}

export type Form = { average: number; pct: number; matches: number };

/** This match's own figure against the average of the earlier matches that have it. */
export function formDelta(rows: TeamRow[], previous: TeamRow[][], label: string): Form | null {
  const now = row(rows, label);
  const past = previous.map(p => row(p, label)).filter((r): r is TeamRow => Boolean(r));
  if (!now || !past.length) return null;
  const average = past.reduce((s, r) => s + r.own, 0) / past.length;
  if (!average) return null;
  return { average: Math.round(average * 10) / 10, pct: Math.round(((now.own - average) / average) * 100), matches: past.length };
}

/** The dated matches played before this one, newest first. An undated match has no "before". */
export function earlier<T>(list: T[], title: string, titleOf: (x: T) => string, limit = 5): T[] {
  const at = fixtureDate(title)?.getTime();
  if (at === undefined) return [];
  return list
    .map(item => ({ item, time: fixtureDate(titleOf(item))?.getTime() }))
    .filter((x): x is { item: T; time: number } => x.time !== undefined && x.time < at)
    .sort((a, b) => b.time - a.time)
    .slice(0, limit)
    .map(x => x.item);
}

/** A bullet: a bold lead, then text whose odd-numbered parts are the figures, so the page
 *  can pick them out. Joined, the parts read as one sentence. */
export type Standout = { lead: string; parts: string[] };

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** What stood out, stated only from the numbers on the page, at most four. */
export function standouts(rows: TeamRow[], events: StatEvent[], halves: number[][] | undefined, duration: number): Standout[] {
  const out: Standout[] = [];
  const add = (lead: string, ...parts: string[]) => { out.push({ lead, parts }); };
  const shots = shotSummary(rows);
  if (shots && shots.ours.conversion !== null) {
    const them = shots.theirs.conversion !== null ? ` (opponent ${shots.theirs.conversion}%)` : "";
    add("Finishing", "", plural(shots.ours.attempts, "attempt"), " produced ", plural(shots.ours.goals, "goal"),
      ", a ", `${shots.ours.conversion}% conversion rate`, `${them}.`);
  }
  if (shots && shots.share !== null && shots.theirs.attempts > 0) {
    add("Shot volume", "", plural(shots.ours.attempts, "attempt"), " to the opponent's ", String(shots.theirs.attempts),
      ": ", `${shots.share}%`, " of the match's attempts.");
  }
  const best = spells(events, duration).reduce<Spell | null>((b, s) => (s.ours.attempts > (b?.ours.attempts ?? 1) ? s : b), null);
  if (best) {
    const goals = best.ours.goals ? ` and ${plural(best.ours.goals, "goal")}` : "";
    add("Best spell", "", `${formatClock(best.start)}–${formatClock(best.start + SPELL_S)}`, " brought ", plural(best.ours.attempts, "attempt"), `${goals}.`);
  }
  const corners = row(rows, "Corners");
  if (corners && corners.own > 0) {
    const ours = events.filter(e => e.side === "ours");
    const taken = ours.filter(e => e.kind === "corner");
    if (taken.length) {
      const scored = taken.filter(c => ours.some(g => g.kind === "goal" && g.time_s >= c.time_s && g.time_s - c.time_s <= 30)).length;
      add("Set pieces", "", plural(corners.own, "corner"), " won; ", scored ? String(scored) : "none", " was followed by a goal within 30 seconds.");
    } else add("Set pieces", "", plural(corners.own, "corner"), " won to the opponent's ", String(corners.opponent), ".");
  }
  const periods = periodSplit(events, halves);
  if (periods.length >= 2) {
    const total = periods.reduce((s, p) => s + p.ours.attempts, 0);
    const top = periods.reduce((a, b) => (b.ours.attempts > a.ours.attempts ? b : a));
    if (total && periods.filter(p => p.ours.attempts === top.ours.attempts).length === 1) {
      add("Stronger half", "", `${top.ours.attempts} of ${total}`, " attempts came in the ", top.label, ".");
    }
  }
  const fouls = row(rows, "Fouls");
  if (fouls && fouls.own !== fouls.opponent) add("Discipline", "", plural(fouls.own, "foul"), " given away to the opponent's ", String(fouls.opponent), ".");
  return out.slice(0, 4);
}
