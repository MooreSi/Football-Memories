import type { VeoHighlight } from "../api/veo";

/** Owner request 2026-11-13: the stats a Veo match can show. Veo's highlights carry
 *  a type and a time but not a team, so every count is both teams together. */
export type VeoSpell = { start: number; goals: number; shots: number; other: number };
export type VeoHalf = { label: string; goals: number; shots: number; highlights: number };
export type VeoInsights = {
  goals: number; shots: number; firstGoal: number | null;
  halves: VeoHalf[]; spells: VeoSpell[]; busiest: number | null;
};

export const SPELL = 300;
const HALF = ["1st half", "2nd half", "Extra time 1", "Extra time 2"];
const isGoal = (c: string) => c.trim().toUpperCase() === "GOAL";
const isShot = (c: string) => /SHOT/i.test(c);

export function veoInsights(moments: VeoHighlight[], halves: number[][] | undefined, duration: number | undefined): VeoInsights {
  const sorted = [...moments].sort((a, b) => a.time_s - b.time_s);
  const goals = sorted.filter(m => isGoal(m.category));
  const shots = sorted.filter(m => isShot(m.category));
  const periods = halves ?? [];
  // A highlight belongs to the period it falls in, else the last one that started before it.
  const periodOf = (t: number) => {
    let at = -1;
    periods.forEach((p, i) => { if (t >= p[0]) at = i; });
    return at;
  };
  const split = periods.map((_, i) => {
    const inside = sorted.filter(m => periodOf(m.time_s) === i);
    return { label: HALF[i] ?? `Period ${i + 1}`, goals: inside.filter(m => isGoal(m.category)).length,
      shots: inside.filter(m => isShot(m.category)).length, highlights: inside.length };
  });
  const end = Math.max(duration ?? 0, sorted.length ? sorted[sorted.length - 1].time_s + 1 : 0);
  const spells: VeoSpell[] = Array.from({ length: Math.ceil(end / SPELL) }, (_, i) => ({ start: i * SPELL, goals: 0, shots: 0, other: 0 }));
  for (const m of sorted) {
    const spell = spells[Math.floor(m.time_s / SPELL)];
    if (!spell) continue;
    if (isGoal(m.category)) spell.goals += 1;
    else if (isShot(m.category)) spell.shots += 1;
    else spell.other += 1;
  }
  const weight = (s: VeoSpell) => s.goals * 3 + s.shots + s.other;
  const top = spells.reduce<VeoSpell | null>((best, s) => (weight(s) > (best ? weight(best) : 0) ? s : best), null);
  return { goals: goals.length, shots: shots.length, firstGoal: goals[0]?.time_s ?? null,
    halves: split, spells, busiest: top ? top.start : null };
}
