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
export type MatchGoals = { goals: Goal[]; keepers: Keeper[]; players: string[] };
export type GoalsSource = { source?: string; moments?: HudlMoment[]; team_data?: VeoTeamData | null };

export const EMPTY_ENTRY: GoalsEntry = { scorers: {}, added: [], removed: [], keepers: [], beaten: {} };

// Codes that read like two plain words but are not people.
const NOT_PLAYER = /\b(CLIPS?|ANALYSTS?|COACH|FOCUS)\b/i;
const isPlayer = (code: string) => looksLikePlayer(code) && !NOT_PLAYER.test(code);
const overlap = (a: HudlMoment, b: HudlMoment) =>
  Math.max(0, Math.min(a.time_s + a.duration_s, b.time_s + b.duration_s) - Math.max(a.time_s, b.time_s));
const touches = (a: HudlMoment, b: HudlMoment) => a.time_s <= b.time_s + b.duration_s && b.time_s <= a.time_s + a.duration_s;

function distinct(names: string[]): string[] {
  const seen = new Map<string, string>();
  for (const n of names) if (!seen.has(codeKey(n))) seen.set(codeKey(n), n);
  return [...seen.values()];
}

type Base = { goals: Omit<Goal, "scorer" | "confirmed" | "keeper" | "added">[]; keeper: string | null; saves: number | null; players: string[] };

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
    const ranked = players.map((pl) => ({ name: pl.category, s: overlap(pl, m) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s);
    return { id: m.id, side: p.side as "ours" | "theirs", time_s: m.time_s, candidates: distinct(ranked.map((x) => x.name)) };
  }).sort((a, b) => a.time_s - b.time_s);
  // The likely keeper: the player most often tagged with our goalkeeper codes.
  const votes = new Map<string, { name: string; n: number }>();
  for (const { m, p } of sided) {
    if (p.side === "theirs" || !/GOAL ?KEEPER/i.test(m.category)) continue;
    for (const name of distinct(players.filter((pl) => touches(pl, m)).map((pl) => pl.category))) {
      const v = votes.get(codeKey(name)) ?? { name, n: 0 };
      votes.set(codeKey(name), { ...v, n: v.n + 1 });
    }
  }
  const keeper = [...votes.values()].sort((a, b) => b.n - a.n || a.name.localeCompare(b.name))[0]?.name ?? null;
  // Likely saves: their shots on target that did not overlap one of their goals.
  const onTarget = sided.filter(({ p }) => p.stem === "ON TARGET");
  const theirGoals = goalTags.filter(({ p }) => p.side === "theirs").map(({ m }) => m);
  const saves = onTarget.length ? onTarget.filter(({ m, p }) => p.side === "theirs" && !theirGoals.some((g) => touches(g, m))).length : null;
  return { goals, keeper, saves, players: distinct(players.map((p) => p.category)).sort((a, b) => a.localeCompare(b)) };
}

function fromVeo(data: VeoTeamData | null | undefined): Base {
  const goals = (data?.events ?? []).filter((e) => e.type === "GOAL" && (e.side === "own" || e.side === "opponent"))
    .map((e) => ({ id: `t-${e.side}-goal-${Math.round(e.time_s * 1000)}`, side: e.side === "own" ? "ours" as const : "theirs" as const, time_s: e.time_s, candidates: [] }))
    .sort((a, b) => a.time_s - b.time_s);
  return { goals, keeper: null, saves: null, players: [] };
}

export function matchGoals(match: GoalsSource, club: string | null, entry?: GoalsEntry | null): MatchGoals {
  const base = match.source === "veo" || match.team_data ? fromVeo(match.team_data) : fromHudl(match.moments ?? [], club);
  const e = entry ?? EMPTY_ENTRY;
  const removed = new Set(e.removed);
  const listed = [
    ...base.goals.filter((g) => !removed.has(g.id)).map((g) => ({ ...g, added: false })),
    ...e.added.map((a) => ({ id: a.id, side: a.side, time_s: null, candidates: [], added: true })),
  ];
  const keepers: Keeper[] = e.keepers.length
    ? e.keepers.map((k) => ({ name: k.name, saves: k.saves, conceded: 0, confirmed: true }))
    : [{ name: base.keeper, saves: base.saves, conceded: 0, confirmed: false }];
  const goals: Goal[] = listed.map((g) => {
    if (g.side === "ours") {
      const own = e.scorers[g.id];
      return { ...g, scorer: own ?? g.candidates[0] ?? null, confirmed: own !== undefined, keeper: null };
    }
    const named = e.beaten[g.id];
    const k = keepers.find((x) => named && x.name && codeKey(x.name) === codeKey(named)) ?? keepers[0];
    k.conceded += 1;
    return { ...g, scorer: null, confirmed: false, keeper: k.name };
  });
  const shown = keepers.filter((k) => k.confirmed || k.name !== null || k.conceded > 0 || k.saves !== null);
  return { goals, keepers: shown, players: base.players };
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

/** A season's top scorers from confirmed goals, and how many of our goals are unconfirmed. */
export function topScorers(matches: MatchGoals[], n = 3): { top: { name: string; goals: number }[]; unconfirmed: number } {
  return {
    top: tally(matches.flatMap(confirmedScorers)).slice(0, n),
    unconfirmed: matches.reduce((sum, m) => sum + m.goals.filter((g) => g.side === "ours" && !g.confirmed).length, 0),
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
