import type { HudlMatch, HudlMoment } from "../api/hudl";
import { codeKey, sameCode } from "./codes";
import { displayCode, looksLikePlayer } from "./hudlPlayer";

export { codeKey, sameCode };
import { type Axis, type Kind, codeSides, sentence, type Side } from "./matchProfile";

/** Spec 230: what the tag lengths, times and overlaps say beyond plain counts.
 *  Every figure here comes from the coaches' tags; overlaps say a player was tagged
 *  *during* a situation, never that he made it. */

const end = (m: HudlMoment) => m.time_s + Math.max(0, m.duration_s || 0);
const overlaps = (a: HudlMoment, b: HudlMoment) => a.time_s <= end(b) && b.time_s <= end(a);
function overlapsAny(m: HudlMoment, sorted: HudlMoment[]): boolean {
  // `sorted` by start; the moments are short, so a linear scan from the first candidate is enough.
  for (const p of sorted) {
    if (p.time_s > end(m)) return false;
    if (overlaps(m, p)) return true;
  }
  return false;
}
const byStart = (a: HudlMoment, b: HudlMoment) => a.time_s - b.time_s;

// ---------------------------------------------------------------- possession

export type Possession = { ours: number; theirs: number; contested: number; oursPct: number; theirsPct: number };

/** Seconds each side had the ball, from the possession tags' lengths. Contested time is
 *  reported but left out of the split. Null when no tag says who had the ball. */
export function possession(moments: HudlMoment[], club: string | null): Possession | null {
  const place = codeSides(moments, club);
  let ours = 0, theirs = 0, contested = 0;
  for (const m of moments) {
    const code = codeKey(m.category);
    const length = Math.max(0, m.duration_s || 0);
    if (code === "CONTESTED POSSESSION") { contested += length; continue; }
    const { side, stem } = place(code);
    if (stem !== "POSSESSION") continue;
    if (side === "ours") ours += length;
    else if (side === "theirs") theirs += length;
  }
  return split(ours, theirs, contested);
}

function split(ours: number, theirs: number, contested: number): Possession | null {
  if (ours + theirs <= 0) return null;
  const oursPct = Math.round((ours / (ours + theirs)) * 100);
  return { ours, theirs, contested, oursPct, theirsPct: 100 - oursPct };
}

/** Possession over several matches: seconds added, so long matches weigh more. */
export function possessionTotals(matches: HudlMoment[][], club: string | null): (Possession & { matches: number }) | null {
  let ours = 0, theirs = 0, contested = 0, counted = 0;
  for (const moments of matches) {
    const p = possession(moments, club);
    if (!p) continue;
    ours += p.ours; theirs += p.theirs; contested += p.contested; counted += 1;
  }
  const total = split(ours, theirs, contested);
  return total && { ...total, matches: counted };
}

/** Owner decision 005: the Match Profile's possession point shows time on the ball (%),
 *  not the number of possession tags. Its place among the axes stays as counted. */
export function withPossessionTime<T extends { axes: Axis[]; neutral: Kind[] }>(team: T, poss: Possession | null): T {
  if (!poss) return team;
  return { ...team, axes: team.axes.map((a) => (a.name === "Possession" ? { name: a.name, ours: poss.oursPct, theirs: poss.theirsPct, unit: "%" as const } : a)) };
}

// ---------------------------------------------------------------- momentum

/** Weights for the momentum chart: a choice of this app, not Hudl's (spec 230). */
export const MOMENTUM_WEIGHTS: Record<string, number> = {
  "ATTACKING THIRD ENTRY": 1, "PENALTY AREA ENTRY": 2, CHANCE: 3, GOAL: 5,
};
export type Minute = { minute: number; ours: number; theirs: number; oursAt: number | null; theirsAt: number | null; goals: { ours: number; theirs: number } };

/** Minute by minute, how hard each side was attacking, with goals and half-time marks.
 *  `oursAt` / `theirsAt` are the first weighted moment in that minute (where a click seeks). */
export function momentum(moments: HudlMoment[], club: string | null, duration_s?: number): { minutes: Minute[]; halves: number[] } {
  const place = codeSides(moments, club);
  const weighted: { side: "ours" | "theirs"; at: number; weight: number; goal: boolean }[] = [];
  const halves: number[] = [];
  for (const m of moments) {
    const code = codeKey(m.category);
    if (code === "END HALF") { halves.push(m.time_s); continue; }
    const { side, stem } = place(code);
    const weight = MOMENTUM_WEIGHTS[stem];
    if (side !== "neutral" && weight) weighted.push({ side, at: m.time_s, weight, goal: stem === "GOAL" });
  }
  if (!weighted.length) return { minutes: [], halves: halves.sort((a, b) => a - b) };
  const last = Math.max(...weighted.map((w) => w.at), duration_s ? duration_s - 1 : 0);
  const minutes: Minute[] = Array.from({ length: Math.floor(last / 60) + 1 }, (_, minute) => ({
    minute, ours: 0, theirs: 0, oursAt: null, theirsAt: null, goals: { ours: 0, theirs: 0 },
  }));
  for (const w of weighted.sort((a, b) => a.at - b.at)) {
    const bucket = minutes[Math.floor(w.at / 60)];
    bucket[w.side] += w.weight;
    const key = w.side === "ours" ? "oursAt" : "theirsAt";
    if (bucket[key] === null) bucket[key] = w.at;
    if (w.goal) bucket.goals[w.side] += 1;
  }
  return { minutes, halves: halves.sort((a, b) => a - b) };
}

// ---------------------------------------------------------------- involvement

export type Group = "attacking" | "defending" | "setPieces";
const SET_PIECE = /CORNER|FREE KICK|THROW|GOAL KICK|KICK OFF|PENALTY(?! AREA)|SET PIECE/;
const DANGER = /ATTACKING THIRD ENTRY|PENALTY AREA ENTRY|CHANCE|GOAL|ON TARGET|CROSS/;
const DEFENDING = /^(DEF IN FINAL|PRESSING|TRANSITION DEF|REGROUPING|COMPACTNESS)/;

/** Which kind of play a situation code is, or null for codes that say nothing about it
 *  (possession, build-up thirds, ball out of play, players, unknown abbreviations). */
export function groupOf(code: string, side: Side, stem: string): Group | null {
  if (SET_PIECE.test(stem)) return "setPieces";
  if (side === "ours" && DANGER.test(stem)) return "attacking";
  if (side === "theirs" && DANGER.test(stem)) return "defending";
  if (side === "neutral" && /^TRANSITION ATT/.test(code)) return "attacking";
  if (side === "neutral" && DEFENDING.test(code)) return "defending";
  return null;
}

export type InvolvementItem = { code: string; label: string; side: Side; group: Group; count: number };
export type Involvement = {
  moments: number;
  groups: Record<Group, number>;
  headline: { ourChances: number; ourGoals: number; theirChances: number; theirGoals: number };
  items: InvolvementItem[];
};

/** The situations (in one match's moments) that overlap any of `name`'s tagged moments. */
export function involvement(moments: HudlMoment[], name: string, club: string | null): Involvement {
  const mine = moments.filter((m) => sameCode(m.category, name)).sort(byStart);
  const place = codeSides(moments, club);
  const groups: Record<Group, number> = { attacking: 0, defending: 0, setPieces: 0 };
  const headline = { ourChances: 0, ourGoals: 0, theirChances: 0, theirGoals: 0 };
  const items = new Map<string, InvolvementItem>();
  if (mine.length) for (const m of moments) {
    const code = codeKey(m.category);
    if (looksLikePlayer(code)) continue;
    const { side, stem } = place(code);
    const group = groupOf(code, side, stem);
    if (!group || !overlapsAny(m, mine)) continue;
    groups[group] += 1;
    if (stem === "CHANCE") headline[side === "ours" ? "ourChances" : "theirChances"] += side === "neutral" ? 0 : 1;
    if (stem === "GOAL") headline[side === "ours" ? "ourGoals" : "theirGoals"] += side === "neutral" ? 0 : 1;
    const item = items.get(code) ?? { code, label: side === "theirs" ? `Opposition ${stem.toLowerCase()}` : sentence(stem), side, group, count: 0 };
    item.count += 1;
    items.set(code, item);
  }
  return { moments: mine.length, groups, headline, items: [...items.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)) };
}

/** Involvement over many matches, added up. */
export function involvementTotals(matches: HudlMatch[], name: string, club: string | null): Involvement & { matches: number } {
  const total: Involvement & { matches: number } = {
    moments: 0, matches: 0, groups: { attacking: 0, defending: 0, setPieces: 0 },
    headline: { ourChances: 0, ourGoals: 0, theirChances: 0, theirGoals: 0 }, items: [],
  };
  const items = new Map<string, InvolvementItem>();
  for (const match of matches) {
    const v = involvement(match.moments ?? [], name, club);
    if (!v.moments) continue;
    total.matches += 1;
    total.moments += v.moments;
    for (const g of Object.keys(v.groups) as Group[]) total.groups[g] += v.groups[g];
    for (const k of Object.keys(v.headline) as (keyof Involvement["headline"])[]) total.headline[k] += v.headline[k];
    for (const it of v.items) {
      const key = `${it.side}:${it.label}`;
      const prev = items.get(key);
      items.set(key, prev ? { ...prev, count: prev.count + it.count } : { ...it });
    }
  }
  total.items = [...items.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  return total;
}

// ---------------------------------------------------------------- partnerships

export type Partner = { name: string; shared: number; matches: number };

/** Teammates ranked by how many of `name`'s moments overlap one of theirs. */
export function partnerships(matches: HudlMatch[], name: string): Partner[] {
  const out = new Map<string, Partner>();
  const me = codeKey(name);
  for (const match of matches) {
    const moments = match.moments ?? [];
    const mine = moments.filter((m) => codeKey(m.category) === me).sort(byStart);
    if (!mine.length) continue;
    const others = new Map<string, HudlMoment[]>();
    for (const m of moments) {
      const code = codeKey(m.category);
      if (code !== me && looksLikePlayer(code)) others.set(code, [...(others.get(code) ?? []), m]);
    }
    for (const [code, theirs] of others) {
      const p = out.get(code) ?? { name: displayCode(code), shared: 0, matches: 0 };
      theirs.sort(byStart);
      p.matches += 1;
      p.shared += mine.filter((m) => overlapsAny(m, theirs)).length;
      out.set(code, p);
    }
  }
  return [...out.values()].filter((p) => p.shared > 0).sort((a, b) => b.shared - a.shared || b.matches - a.matches || a.name.localeCompare(b.name));
}

// ---------------------------------------------------------------- journey

export type Season = { season: string; age: string; matches: number; moments: number; perMatch: number; attackingPct: number; defendingPct: number };

/** Season by season: how often he is tagged and how much of it is in attack or defence.
 *  A moment counts as attacking (defending) when it overlaps an attacking (defending)
 *  situation; one moment may be both, or neither. */
export function journey(matches: HudlMatch[], name: string, club: string | null): Season[] {
  const seasons = new Map<string, Season & { att: number; def: number; ages: Map<string, number> }>();
  for (const match of matches) {
    const moments = match.moments ?? [];
    const mine = moments.filter((m) => sameCode(m.category, name));
    if (!mine.length) continue;
    const place = codeSides(moments, club);
    const attacking: HudlMoment[] = [], defending: HudlMoment[] = [];
    for (const m of moments) {
      const code = codeKey(m.category);
      const { side, stem } = place(code);
      const g = groupOf(code, side, stem);
      if (g === "attacking") attacking.push(m);
      if (g === "defending") defending.push(m);
    }
    attacking.sort(byStart); defending.sort(byStart);
    const label = match.season_label || "Unclassified";
    const s = seasons.get(label) ?? { season: label, age: match.age_group, matches: 0, moments: 0, perMatch: 0, attackingPct: 0, defendingPct: 0, att: 0, def: 0, ages: new Map<string, number>() };
    s.ages.set(match.age_group, (s.ages.get(match.age_group) ?? 0) + 1);
    // The season's age group is the one most of its matches belong to.
    s.age = [...s.ages].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))[0][0];
    s.matches += 1;
    s.moments += mine.length;
    s.att += mine.filter((m) => overlapsAny(m, attacking)).length;
    s.def += mine.filter((m) => overlapsAny(m, defending)).length;
    seasons.set(label, s);
  }
  return [...seasons.values()]
    .sort((a, b) => a.season.localeCompare(b.season))
    .map(({ att, def, ages: _ages, ...s }) => ({
      ...s,
      perMatch: Math.round((s.moments / s.matches) * 10) / 10,
      attackingPct: Math.round((att / s.moments) * 100),
      defendingPct: Math.round((def / s.moments) * 100),
    }));
}

// ---------------------------------------------------------------- phases of play

export type Phase = { moment: HudlMoment; outcome: "goal" | "chance"; steps: string[] };

/** Each of our possessions that ends in a chance or a goal, as one clip. The clip is the
 *  possession tag itself, so Play Tagged, downloads and reels use its real id unchanged.
 *  With `player`, only the phases one of his moments overlaps. */
export function phases(moments: HudlMoment[], club: string | null, player?: string): Phase[] {
  const place = codeSides(moments, club);
  const ours: { m: HudlMoment; stem: string }[] = [];
  for (const m of moments) {
    const { side, stem } = place(codeKey(m.category));
    if (side === "ours") ours.push({ m, stem });
  }
  const mine = player ? moments.filter((m) => sameCode(m.category, player)).sort(byStart) : null;
  const out: Phase[] = [];
  for (const { m: possession, stem } of ours) {
    if (stem !== "POSSESSION" || !(possession.duration_s > 0)) continue;
    const inside = ours.filter((o) => o.m !== possession && o.stem !== "POSSESSION" && o.m.time_s >= possession.time_s && o.m.time_s <= end(possession))
      .sort((a, b) => a.m.time_s - b.m.time_s);
    const goal = inside.some((o) => o.stem === "GOAL");
    if (!goal && !inside.some((o) => o.stem === "CHANCE")) continue;
    if (mine && !overlapsAny(possession, mine)) continue;
    // The possession tag may run on past the goal; the story ends at the first goal, or the last chance.
    const stop = goal ? inside.findIndex((o) => o.stem === "GOAL") : inside.map((o) => o.stem).lastIndexOf("CHANCE");
    const steps: string[] = [];
    for (const o of inside.slice(0, stop + 1)) {
      const label = sentence(o.stem);
      if (steps[steps.length - 1] !== label) steps.push(label);
    }
    out.push({ moment: possession, outcome: goal ? "goal" : "chance", steps });
  }
  return out.sort((a, b) => a.moment.time_s - b.moment.time_s);
}
