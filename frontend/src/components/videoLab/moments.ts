import type { Assignment, Review, Suggestion, Team, VeoTags } from "./labTypes";
import { typeName } from "./labTypes";
import { estimateActionTeam } from "./teams";

export type Source = "veo" | "model" | "you";
export type Moment = {
  key: string; id: string; source: Source; type: string; time: number; sourceTime?: number;
  team: Team | null; teamBasis: "veo" | "approved" | "estimated" | "none";
  evidence: string | null; status: "teacher" | "unreviewed" | "approved" | "rejected"; score?: number;
};
export type Filter = { source: Source | null; team: Team | "none" | null; type: string | null; showRejected?: boolean };

/** One timeline of Veo tags, model suggestions (with your decisions) and actions you added. */
export function buildMoments({ veo, suggestions, review, teams }: { veo?: VeoTags; suggestions?: Suggestion[]; review?: Review | null; teams: Map<number, Assignment> }): Moment[] {
  const list: Moment[] = [];
  const decided = new Map((review?.events ?? []).map(e => [e.id, e]));
  const rejected = new Set(review?.rejected_suggestions ?? []);
  const ok = (t: number) => Number.isFinite(t) && t >= 0;
  for (const [i, h] of (veo?.highlights ?? []).entries()) if (ok(h.time_s))
    list.push({ key: `veo-h-${h.source_id ?? i}`, id: `veo-h-${h.source_id ?? i}`, source: "veo", type: (h.source_label ?? "highlight").toLowerCase(), time: h.time_s, sourceTime: h.source_time_s, team: null, teamBasis: "none", evidence: null, status: "teacher" });
  for (const e of veo?.events ?? []) if (ok(e.time_s)) {
    const team = e.side === "own" || e.side === "opponent" ? e.side : null;
    list.push({ key: `veo-${e.id}`, id: e.id, source: "veo", type: typeName(e.type), time: e.time_s, sourceTime: e.source_time_s, team, teamBasis: team ? "veo" : "none", evidence: null, status: "teacher" });
  }
  const suggested = new Set<string>();
  for (const s of suggestions ?? []) if (ok(s.time_s)) {
    suggested.add(s.id);
    const mine = decided.get(s.id);
    if (mine?.confirmed) { list.push({ key: `model-${s.id}`, id: s.id, source: "model", type: typeName(mine.type), time: s.time_s, sourceTime: s.source_time_s, team: mine.team ?? null, teamBasis: mine.team ? "approved" : "none", evidence: null, status: "approved", score: s.score }); continue; }
    const estimate = estimateActionTeam(s.actor_candidates ?? [], teams);
    list.push({ key: `model-${s.id}`, id: s.id, source: "model", type: typeName(s.type), time: s.time_s, sourceTime: s.source_time_s, team: estimate.team, teamBasis: estimate.team ? "estimated" : "none", evidence: estimate.evidence, status: rejected.has(s.id) ? "rejected" : "unreviewed", score: s.score });
  }
  for (const e of review?.events ?? []) if (!suggested.has(e.id) && ok(e.time_s))
    list.push({ key: `you-${e.id}`, id: e.id, source: "you", type: typeName(e.type), time: e.time_s, team: e.team ?? null, teamBasis: e.team ? "approved" : "none", evidence: null, status: "approved" });
  return list.sort((a, b) => a.time - b.time || a.key.localeCompare(b.key));
}

export function filterMoments(moments: Moment[], filter: Filter) {
  return moments.filter(m => (filter.showRejected || m.status !== "rejected")
    && (!filter.source || m.source === filter.source)
    && (!filter.type || m.type === filter.type)
    && (!filter.team || (filter.team === "none" ? m.team === null : m.team === filter.team)));
}

export function momentCounts(moments: Moment[]) {
  const empty = () => ({ veo: 0, model: 0, you: 0 });
  const counts = { own: empty(), opponent: empty(), none: empty() };
  for (const m of moments) counts[m.team ?? "none"][m.source]++;
  return counts;
}
