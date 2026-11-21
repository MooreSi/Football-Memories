import { codeKey } from "./codes";
import type { Spell } from "./goals";

export type KeeperVote = { at: number; names: string[]; explicit?: boolean; weights?: Record<string, number> };
const SWITCH_COST = 2.5;
const distinct = (names: string[]) => [...new Map(names.map(n => [codeKey(n), n])).values()];

// Changes between tagged periods cost nothing; within a period, isolated odd
// kicks must not create a change. Unsupported periods remain gaps in the spells.
export function keeperSpells(votes: KeeperVote[], breaks: number[]): Spell[] {
  const edges = [0, ...new Set(breaks.filter(b => b > 0).sort((a, b) => a - b))];
  const spells = edges.flatMap((from, i) => {
    const to = edges[i + 1] ?? null;
    return inferPeriod(votes.filter(v => v.at >= from && (to === null || v.at < to)), from, to);
  });
  return spells.reduce<Spell[]>((merged, s) => {
    const last = merged.at(-1);
    if (last && last.to_s === s.from_s && codeKey(last.name) === codeKey(s.name)) last.to_s = s.to_s;
    else merged.push({ ...s });
    return merged;
  }, []);
}

function inferPeriod(votes: KeeperVote[], from: number, to: number | null): Spell[] {
  const seq = votes.filter((v) => v.names.length).sort((a, b) => a.at - b.at);
  const names = distinct(seq.flatMap((v) => v.names)).sort((a, b) => a.localeCompare(b));
  if (!seq.length) return [];
  const evidence = (i: number, n: string) => seq[i].weights?.[codeKey(n)]
    ?? (seq[i].names.some(x => codeKey(x) === codeKey(n)) ? 1 : 0);
  let cost: number[] = names.map((n) => (1 - evidence(0, n)));
  const back: number[][] = [];
  for (let i = 1; i < seq.length; i++) {
    const best = cost.indexOf(Math.min(...cost));
    back.push(names.map((_, j) => (cost[j] <= cost[best] + SWITCH_COST ? j : best)));
    cost = names.map((n, j) => Math.min(cost[j], cost[best] + SWITCH_COST) + (1 - evidence(i, n)));
  }
  const minimum = Math.min(...cost);
  if (cost.filter(c => Math.abs(c - minimum) < 0.000001).length !== 1) return [];
  const path = [cost.indexOf(minimum)];
  for (let i = back.length - 1; i >= 0; i--) path.unshift(back[i][path[0]]);
  const start = from;
  const spells: Spell[] = [];
  path.forEach((j, i) => {
    const last = spells[spells.length - 1];
    if (last && codeKey(last.name) === codeKey(names[j])) return;
    const from = last ? (seq[i - 1].at + seq[i].at) / 2 : start;
    if (last) last.to_s = from;
    spells.push({ name: names[j], from_s: from, to_s: to });
  });
  return spells.filter(s => {
    const support = seq.filter(v => v.at >= s.from_s && (s.to_s === null || v.at < s.to_s)
      && v.names.some(n => codeKey(n) === codeKey(s.name)));
    return support.some(v => v.explicit) || support.length >= 2;
  });
}
