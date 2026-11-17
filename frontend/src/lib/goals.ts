import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { HudlMoment } from "../api/hudl";
import { codeKey } from "./codes";
import { looksLikePlayer } from "./hudlPlayer";
import { codeSides } from "./matchProfile";
import type { VeoTeamData } from "./veoTeamSplit";

/** Spec 270 (owner requests 2026-11-16): who scored, who kept goal, saves and goals
 *  conceded. Neither Hudl nor Veo names a scorer or a keeper, so the app guesses from
 *  Hudl's tags ("likely") and the owner confirms; reports show only what is confirmed. */

export type GoalsEntry = {
  scorers: Record<string, string>;
  added: { id: string; side: "ours" | "theirs" }[];
  removed: string[];
  keepers: { name: string; saves: number | null }[];
  beaten: Record<string, string>;
};
export type Goal = {
  id: string; side: "ours" | "theirs"; time_s: number | null; added: boolean;
  /** Hudl players tagged at the goal, most overlap first. */
  candidates: string[];
  /** Ours only: the owner's scorer, else the likely one. */
  scorer: string | null; confirmed: boolean;
  /** Theirs only: the keeper beaten. */
  keeper: string | null;
};
export type Keeper = { name: string | null; saves: number | null; conceded: number; confirmed: boolean };
/** A likely keeper's time in goal; to_s null means to the end. */
export type Spell = { name: string; from_s: number; to_s: number | null };
export type MatchGoals = { goals: Goal[]; keepers: Keeper[]; players: string[]; spells: Spell[] };
export type GoalsSource = { source?: string; moments?: HudlMoment[]; team_data?: VeoTeamData | null };

export const EMPTY_ENTRY: GoalsEntry = { scorers: {}, added: [], removed: [], keepers: [], beaten: {} };

// Codes that read like two plain words but are not people.
const NOT_PLAYER = /\b(CLIPS?|ANALYSTS?|COACH|FOCUS)\b/i;
const isPlayer = (code: string) => looksLikePlayer(code) && !NOT_PLAYER.test(code);
const overlap = (a: HudlMoment, b: HudlMoment) =>
  Math.max(0, Math.min(a.time_s + a.duration_s, b.time_s + b.duration_s) - Math.max(a.time_s, b.time_s));
const touches = (a: HudlMoment, b: HudlMoment) => a.time_s <= b.time_s + b.duration_s && b.time_s <= a.time_s + a.duration_s;

// Measured on the owner's cached Hudl tags (2026-11-16): goal tags are 25 s and the ball
// goes in 20 s in (a BALL OUT OF PLAY tag starts there on 1243 of 1529 goals); player tags
// (mostly 10 or 15 s) line up with our possession best at 7 of 10 s and 10 of 15 s, so the
// touch is a third of the tag, at most 5 s, before its end. With these, the nearest touch
// is within 1 s of the ball going in on three goals in four; the most-overlap player
// agreed with it on only about half.
const GOAL_LAG_S = 5;
const NEAR_BEFORE = 12;
const NEAR_AFTER = 3;
const ballInAt = (g: HudlMoment) => g.time_s + Math.max(0, g.duration_s - GOAL_LAG_S);
const touchAt = (p: HudlMoment) => p.time_s + p.duration_s - Math.min(GOAL_LAG_S, p.duration_s / 3);
// A touch after the ball went in is less likely the scorer's than one just before.
const nearness = (gap: number) => (gap >= 0 ? gap : -gap * 2);

// Keepers (owner request 2026-11-16). Few matches have a GOAL KEEPER code, but every one
// has our goal kicks. On the cache the kick is at the goal-kick tag's start: the keeper's
// tag is running then, started up to 12 s before (most about 0.5 s), and the player
// receiving it is tagged 0.3 to 1 s after. Counting tags that started up to 12 s before
// the kick and are still running at it, the spell's keeper is there on 83% of kicks, the
// next player on 28% (any overlap: 87% against 59%). Each kick is a vote; the spells are the keeper
// sequence that misses the fewest votes, a change costing SWITCH_COST of them, so one odd
// kick is not a change but a keeper swapped at a break is found.
const KICK_FROM = -12;
const KICK_TO = 0;
const SWITCH_COST = 2.5;

function keeperSpells(votes: { at: number; names: string[] }[], breaks: number[]): Spell[] {
  const seq = votes.filter((v) => v.names.length).sort((a, b) => a.at - b.at);
  const names = distinct(seq.flatMap((v) => v.names)).sort((a, b) => a.localeCompare(b));
  if (!seq.length) return [];
  const has = (i: number, n: string) => seq[i].names.some((x) => codeKey(x) === codeKey(n));
  let cost: number[] = names.map((n) => (has(0, n) ? 0 : 1));
  const back: number[][] = [];
  for (let i = 1; i < seq.length; i++) {
    const best = cost.indexOf(Math.min(...cost));
    back.push(names.map((_, j) => (cost[j] <= cost[best] + SWITCH_COST ? j : best)));
    cost = names.map((n, j) => Math.min(cost[j], cost[best] + SWITCH_COST) + (has(i, n) ? 0 : 1));
  }
  const path = [cost.indexOf(Math.min(...cost))];
  for (let i = back.length - 1; i >= 0; i--) path.unshift(back[i][path[0]]);
  const spells: Spell[] = [];
  path.forEach((j, i) => {
    const last = spells[spells.length - 1];
    if (last && codeKey(last.name) === codeKey(names[j])) return;
    // A change goes at an END HALF tag between the two spells (the nearest the middle),
    // else halfway between the last vote of one and the first of the next.
    const mid = last ? (seq[i - 1].at + seq[i].at) / 2 : 0;
    const gap = breaks.filter((b) => last && b > seq[i - 1].at && b < seq[i].at).sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid));
    const from = gap[0] ?? mid;
    if (last) last.to_s = from;
    spells.push({ name: names[j], from_s: from, to_s: null });
  });
  return spells;
}

const inSpell = (s: Spell, t: number) => t >= s.from_s && (s.to_s === null || t < s.to_s);

function distinct(names: string[]): string[] {
  const seen = new Map<string, string>();
  for (const n of names) if (!seen.has(codeKey(n))) seen.set(codeKey(n), n);
  return [...seen.values()];
}

type Base = { goals: Omit<Goal, "scorer" | "confirmed" | "keeper" | "added">[]; spells: Spell[]; saveTimes: number[] | null; players: string[] };

function fromHudl(moments: HudlMoment[], club: string | null): Base {
  const place = codeSides(moments, club);
  const players = moments.filter((m) => isPlayer(m.category));
  const sided = moments.map((m) => ({ m, p: place(m.category) }));
  let goalTags = sided.filter(({ p }) => p.stem === "GOAL" && p.side !== "neutral");
  // As taggedScore: with no goal of ours placed, one unplaced "<side> GOAL" code is ours.
  if (!goalTags.some(({ p }) => p.side === "ours")) {
    const unplaced = [...new Set(sided.filter(({ m, p }) => p.side === "neutral" && / GOAL$/i.test(m.category.trim())).map(({ m }) => codeKey(m.category)))];
    if (unplaced.length === 1) goalTags = [...goalTags, ...sided.filter(({ m }) => codeKey(m.category) === unplaced[0]).map(({ m }) => ({ m, p: { side: "ours" as const, stem: "GOAL" } }))];
  }
  const goals = goalTags.map(({ m, p }) => {
    const ballIn = ballInAt(m);
    const near = players.map((pl) => ({ name: pl.category, gap: ballIn - touchAt(pl) }))
      .filter((x) => x.gap >= -NEAR_AFTER && x.gap <= NEAR_BEFORE)
      .sort((a, b) => nearness(a.gap) - nearness(b.gap));
    const ranked = players.map((pl) => ({ name: pl.category, s: overlap(pl, m) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s);
    return { id: m.id, side: p.side as "ours" | "theirs", time_s: m.time_s, candidates: distinct([...near, ...ranked].map((x) => x.name)) };
  }).sort((a, b) => a.time_s - b.time_s);
  // Keeper votes: our goal kicks (who starts just before the kick) and goalkeeper codes.
  const votes = sided.filter(({ m, p }) => p.side !== "theirs" && (p.stem === "GOAL KICK" || /GOAL ?KEEPER/i.test(m.category)))
    .map(({ m, p }) => ({ at: m.time_s, names: distinct(players.filter((pl) => (p.stem === "GOAL KICK"
      ? pl.time_s - m.time_s >= KICK_FROM && pl.time_s - m.time_s <= KICK_TO && pl.time_s + pl.duration_s >= m.time_s
      : touches(pl, m))).map((pl) => pl.category)) }));
  const breaks = moments.filter((m) => /^END HALF$/i.test(m.category.trim())).map((m) => m.time_s);
  // Likely saves: their shots on target that did not overlap one of their goals.
  const onTarget = sided.filter(({ p }) => p.stem === "ON TARGET");
  const theirGoals = goalTags.filter(({ p }) => p.side === "theirs").map(({ m }) => m);
  const saveTimes = onTarget.length
    ? onTarget.filter(({ m, p }) => p.side === "theirs" && !theirGoals.some((g) => touches(g, m))).map(({ m }) => ballInAt(m))
    : null;
  return { goals, spells: keeperSpells(votes, breaks), saveTimes, players: distinct(players.map((p) => p.category)).sort((a, b) => a.localeCompare(b)) };
}

function fromVeo(data: VeoTeamData | null | undefined): Base {
  const goals = (data?.events ?? []).filter((e) => e.type === "GOAL" && (e.side === "own" || e.side === "opponent"))
    .map((e) => ({ id: `t-${e.side}-goal-${Math.round(e.time_s * 1000)}`, side: e.side === "own" ? "ours" as const : "theirs" as const, time_s: e.time_s, candidates: [] }))
    .sort((a, b) => a.time_s - b.time_s);
  return { goals, spells: [], saveTimes: null, players: [] };
}

export function matchGoals(match: GoalsSource, club: string | null, entry?: GoalsEntry | null): MatchGoals {
  const base = match.source === "veo" || match.team_data ? fromVeo(match.team_data) : fromHudl(match.moments ?? [], club);
  const e = entry ?? EMPTY_ENTRY;
  const removed = new Set(e.removed);
  const listed = [
    ...base.goals.filter((g) => !removed.has(g.id)).map((g) => ({ ...g, added: false })),
    ...e.added.map((a) => ({ id: a.id, side: a.side, time_s: null, candidates: [], added: true })),
  ];
  const { spells, saveTimes } = base;
  const guessed = distinct(spells.map((s) => s.name)).map((name) => ({
    name, saves: saveTimes && saveTimes.filter((t) => spells.some((s) => codeKey(s.name) === codeKey(name) && inSpell(s, t))).length,
    conceded: 0, confirmed: false,
  }));
  const keepers: Keeper[] = e.keepers.length
    ? e.keepers.map((k) => ({ name: k.name, saves: k.saves, conceded: 0, confirmed: true }))
    : guessed.length ? guessed : [{ name: null, saves: saveTimes && saveTimes.length, conceded: 0, confirmed: false }];
  const byName = (n: string | null | undefined) => (n ? keepers.find((x) => x.name && codeKey(x.name) === codeKey(n)) : undefined);
  const inGoalAt = (t: number | null) => (t === null ? undefined : spells.find((s) => inSpell(s, t))?.name);
  const goals: Goal[] = listed.map((g) => {
    if (g.side === "ours") {
      const own = e.scorers[g.id];
      return { ...g, scorer: own ?? g.candidates[0] ?? null, confirmed: own !== undefined, keeper: null };
    }
    // The keeper the owner named, else whoever was in goal then (a confirmed keeper only
    // when the owner kept that name), else the first.
    const k = byName(e.beaten[g.id]) ?? byName(inGoalAt(g.time_s)) ?? keepers[0];
    k.conceded += 1;
    return { ...g, scorer: null, confirmed: false, keeper: k.name };
  });
  const shown = keepers.filter((k) => k.confirmed || k.name !== null || k.conceded > 0 || k.saves !== null);
  return { goals, keepers: shown, players: base.players, spells };
}

const count = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;

function tally(names: string[]): { name: string; goals: number }[] {
  const found = new Map<string, { name: string; goals: number }>();
  for (const name of names) {
    if (codeKey(name) === "OWN GOAL") continue;
    const t = found.get(codeKey(name)) ?? { name, goals: 0 };
    found.set(codeKey(name), { ...t, goals: t.goals + 1 });
  }
  return [...found.values()].sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name));
}

const confirmedScorers = (m: MatchGoals) => m.goals.filter((g) => g.side === "ours" && g.confirmed && g.scorer).map((g) => g.scorer!);

/** Match report lines: confirmed scorers and keepers only, so a guess is never shared. */
export function matchGoalLines(m: MatchGoals): { label: string; value: string }[] {
  const lines: { label: string; value: string }[] = [];
  const scorers = tally(confirmedScorers(m));
  if (scorers.length) lines.push({ label: "Scorers", value: scorers.map((s) => (s.goals > 1 ? `${s.name} ${s.goals}` : s.name)).join(", ") });
  const keepers = m.keepers.filter((k) => k.confirmed && k.name);
  if (keepers.length) lines.push({ label: keepers.length > 1 ? "Keepers" : "Keeper",
    value: keepers.map((k) => `${k.name}: ${k.saves !== null ? `${count(k.saves, "save")}, ` : ""}${k.conceded} conceded`).join("; ") });
  return lines;
}

/** A season's top scorers (owner request 2026-11-17: the owner's scorer, else the likely
 *  one), how many of the goals counted are only likely, and how many of ours have no scorer. */
export function topScorers(matches: MatchGoals[], n = 3): { top: { name: string; goals: number }[]; likely: number; unnamed: number } {
  const ours = matches.flatMap((m) => m.goals.filter((g) => g.side === "ours"));
  const top = tally(ours.flatMap((g) => (g.scorer ? [g.scorer] : []))).slice(0, n);
  const inTop = new Set(top.map((s) => codeKey(s.name)));
  return {
    top,
    likely: ours.filter((g) => g.scorer && !g.confirmed && inTop.has(codeKey(g.scorer))).length,
    unnamed: ours.filter((g) => !g.scorer).length,
  };
}

export type GoalsEntries = Record<string, GoalsEntry>;

async function goalsRequest(init?: RequestInit): Promise<GoalsEntries> {
  const res = await fetch("/api/goals", { ...init, headers: { "Content-Type": "application/json" } });
  if (!res.ok) throw new Error("Could not save the goals");
  // Keep only well-formed entries, so an odd answer never breaks a match page.
  const body: unknown = await res.json();
  const ok = (e: unknown): e is GoalsEntry => typeof e === "object" && e !== null
    && ["scorers", "beaten"].every((k) => typeof (e as Record<string, unknown>)[k] === "object" && (e as Record<string, unknown>)[k] !== null)
    && ["added", "removed", "keepers"].every((k) => Array.isArray((e as Record<string, unknown>)[k]));
  return typeof body === "object" && body !== null ? Object.fromEntries(Object.entries(body).filter(([, e]) => ok(e))) : {};
}

export function useGoalEntries() {
  return useQuery<GoalsEntries>({ queryKey: ["goal-entries"], queryFn: () => goalsRequest(), retry: false, staleTime: 60_000 });
}

/** Save the owner's goals and keepers for a match; null clears them (back to the guess). */
export function useSaveGoals() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, entry }: { id: string; entry: GoalsEntry | null }) =>
      goalsRequest({ method: "PUT", body: JSON.stringify({ match_id: id, entry }) }),
    onSuccess: (data) => qc.setQueryData(["goal-entries"], data),
  });
}
