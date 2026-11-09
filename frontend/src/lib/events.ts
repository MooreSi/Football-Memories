import type { MatchEvent } from "../api/types";

export type FilterMode = "and" | "or";

export interface EventFilter {
  categories: string[];
  players: string[];
  mode: FilterMode;
}

/**
 * OR: an event matches if it has any selected category or any selected player.
 * AND: it must have a selected category (when any are chosen) and every selected player.
 */
export function filterEvents(events: MatchEvent[], f: EventFilter): MatchEvent[] {
  if (f.categories.length === 0 && f.players.length === 0) return events;
  return events.filter((e) => {
    const catHit = f.categories.includes(e.category);
    if (f.mode === "or") {
      return catHit || e.players.some((p) => f.players.includes(p));
    }
    const catOk = f.categories.length === 0 || catHit;
    const playersOk = f.players.every((p) => e.players.includes(p));
    return catOk && playersOk;
  });
}

export interface Buffers {
  pre: number;
  post: number;
}

export const DEFAULT_BUFFERS: Buffers = { pre: 8, post: 5 };

/** The playable window for an event, clamped to [0, matchDuration]. */
export function clipWindow(e: MatchEvent, b: Buffers, matchDuration: number): { start: number; end: number } {
  const start = Math.max(0, e.time_s - b.pre);
  const end = Math.min(matchDuration, e.time_s + e.duration_s + b.post);
  return { start, end };
}

/** Index of the first event after `time`, or -1. Events must be sorted by time. */
export function nextEventIndex(events: MatchEvent[], time: number): number {
  return events.findIndex((e) => e.time_s > time + 0.05);
}

/** Index of the last event before `time`, skipping one that started under 1.5s ago. */
export function previousEventIndex(events: MatchEvent[], time: number): number {
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].time_s < time - 1.5) return i;
  }
  return -1;
}
