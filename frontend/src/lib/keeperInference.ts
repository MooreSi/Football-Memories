import { codeKey } from "./codes";
import type { Spell } from "./goals";

/** context: a period-wide vote from where the player's tags fall (goals.ts); like a
 *  goalkeeper code, it can support a spell alone. */
export type KeeperVote = { at: number; names: string[]; explicit?: boolean; context?: boolean; weights?: Record<string, number> };
// Owner 2026-11-28: two kicks in a row by another keeper are a change, one is not.
// Measured on the cache at 1.5: four matches gain a change inside a period (each checked
// against the kicks and goal tags), none lose one, odd kicks inside a spell 17 -> 11.
const SWITCH_COST = 1.5;
const distinct = (names: string[]) => [...new Map(names.map(n => [codeKey(n), n])).values()];

const weightOf = (v: KeeperVote, n: string) => v.weights?.[codeKey(n)]
  ?? (v.names.some(x => codeKey(x) === codeKey(n)) ? 1 : 0);

/** How many votes each name leads outright (strictly the heaviest), across the match. */
function leadCounts(votes: KeeperVote[]): Map<string, number> {
  const leads = new Map<string, number>();
  for (const v of votes) {
    const ranked = distinct(v.names).map(n => ({ n, w: weightOf(v, n) })).sort((a, b) => b.w - a.w);
    if (!ranked.length || (ranked[1] && ranked[1].w === ranked[0].w)) continue;
    leads.set(codeKey(ranked[0].n), (leads.get(codeKey(ranked[0].n)) ?? 0) + 1);
  }
  return leads;
}

// Changes between tagged periods cost nothing; within a period, an isolated odd
// kick must not create a change. Unsupported periods remain gaps in the spells.
// Short periods (youth quarters) often hold one of our goal kicks each, so a spell
// is also supported when its keeper led two or more kicks anywhere in the match.
export function keeperSpells(votes: KeeperVote[], breaks: number[]): Spell[] {
  const edges = [0, ...new Set(breaks.filter(b => b > 0).sort((a, b) => a - b))];
  const leads = leadCounts(votes);
  const spells = edges.flatMap((from, i) => {
    const to = edges[i + 1] ?? null;
    return inferPeriod(votes.filter(v => v.at >= from && (to === null || v.at < to)), from, to, leads);
  });
  return spells.reduce<Spell[]>((merged, s) => {
    const last = merged.at(-1);
    if (last && last.to_s === s.from_s && codeKey(last.name) === codeKey(s.name)) last.to_s = s.to_s;
    else merged.push({ ...s });
    return merged;
  }, []);
}

function inferPeriod(votes: KeeperVote[], from: number, to: number | null, leads: Map<string, number>): Spell[] {
  const seq = votes.filter((v) => v.names.length).sort((a, b) => a.at - b.at);
  const names = distinct(seq.flatMap((v) => v.names)).sort((a, b) => a.localeCompare(b));
  if (!seq.length) return [];
  const evidence = (i: number, n: string) => weightOf(seq[i], n);
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
    return support.some(v => v.explicit || v.context) || support.length >= 2 || (leads.get(codeKey(s.name)) ?? 0) >= 2;
  });
}
