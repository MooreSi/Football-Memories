import type { HudlMatch } from "../api/hudl";
import { codeKey } from "./insights";

/** Spec 230: what is new since the owner last read the alerts. */
export type Seen = { matches: string[]; player: string | null; counts: Record<string, number> };
export type Alert = { kind: "match" | "moments"; id: string; title: string; count: number };

const countFor = (m: HudlMatch, player: string) => (m.moments ?? []).filter((t) => codeKey(t.category) === player).length;

/** The library as it is now: every match id and the player's moment count per match. */
export function snapshot(library: HudlMatch[] | undefined, player: string | null): Seen {
  const key = player ? codeKey(player) : null;
  const counts: Record<string, number> = {};
  if (key) for (const m of library ?? []) {
    const n = countFor(m, key);
    if (n) counts[m.id] = n;
  }
  return { matches: (library ?? []).map((m) => m.id), player: key, counts };
}

/** New matches first (with the player's moments in them), then matches where the
 *  player has more tagged moments than before. Nothing before a first snapshot, and no
 *  moment alerts when the snapshot was taken for a different player. */
export function newAlerts(seen: Seen | null | undefined, library: HudlMatch[] | undefined, player: string | null): Alert[] {
  if (!seen) return [];
  const key = player ? codeKey(player) : null;
  const known = new Set(seen.matches);
  const samePlayer = key !== null && seen.player === key;
  const fresh: Alert[] = [];
  const more: Alert[] = [];
  for (const m of library ?? []) {
    const count = key ? countFor(m, key) : 0;
    if (!known.has(m.id)) fresh.push({ kind: "match", id: m.id, title: m.title, count });
    else if (samePlayer && count > (seen.counts[m.id] ?? 0)) more.push({ kind: "moments", id: m.id, title: m.title, count: count - (seen.counts[m.id] ?? 0) });
  }
  return [...fresh, ...more];
}
