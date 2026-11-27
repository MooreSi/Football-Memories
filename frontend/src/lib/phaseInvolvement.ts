import type { HudlMoment } from "../api/hudl";
import { codeKey } from "./codes";

/** Team-phase codes the coach tags as timed clips (spec 810). Labels are the codes as Hudl shows
 * them; POFTB and QCC are not expanded because their meaning is the coach's. */
export const PHASES = [
  { key: "pressing", code: "PRESSING", label: "Pressing" },
  { key: "transitionDef", code: "TRANSITION DEF", label: "Transition def" },
  { key: "transitionAtt", code: "TRANSITION ATT", label: "Transition att" },
  { key: "poftb", code: "POFTB", label: "POFTB" },
  { key: "qcc", code: "QCC", label: "QCC" },
] as const;
export type PhaseKey = typeof PHASES[number]["key"];
export type PhaseShare = { key: PhaseKey; label: string; clips: HudlMoment[]; total: number; share: number };

/** Provisional default (spec 810): a clip counts when at least half of it lies inside the phase.
 * Both kinds of clip are padded fixed-length windows, so "any overlap" would count neighbours. */
const MIN_INSIDE = 0.5;

function union(spans: HudlMoment[]): [number, number][] {
  const sorted = spans.map(s => [s.time_s, s.time_s + Math.max(0, s.duration_s)] as [number, number])
    .filter(([a, b]) => b > a).sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const [a, b] of sorted) {
    const last = merged[merged.length - 1];
    if (last && a <= last[1]) last[1] = Math.max(last[1], b); else merged.push([a, b]);
  }
  return merged;
}

function counts(clip: HudlMoment, spans: [number, number][]): boolean {
  const from = clip.time_s, to = clip.time_s + Math.max(0, clip.duration_s);
  if (to === from) return spans.some(([a, b]) => from >= a && from < b);
  const inside = spans.reduce((sum, [a, b]) => sum + Math.max(0, Math.min(b, to) - Math.max(a, from)), 0);
  return inside >= MIN_INSIDE * (to - from);
}

/** Share of a player's clips during each team phase this match tagged. Involvement while the team
 * was in that phase, not an action by the player. */
export function phaseInvolvement(moments: HudlMoment[], clips: HudlMoment[]): PhaseShare[] {
  if (!clips.length) return [];
  return PHASES.flatMap(phase => {
    const spans = union(moments.filter(m => codeKey(m.category) === phase.code));
    if (!spans.length) return [];
    const counted = clips.filter(c => counts(c, spans));
    return [{ key: phase.key, label: phase.label, clips: counted, total: clips.length, share: counted.length / clips.length }];
  });
}
