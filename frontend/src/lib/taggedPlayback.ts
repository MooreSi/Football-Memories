import type { HudlMoment } from "../api/hudl";

/** "Play Tagged": every chosen moment in match order, one after another. */
export function taggedPlaylist(moments: HudlMoment[]): HudlMoment[] {
  return [...moments].sort((a, b) => a.time_s - b.time_s || a.id.localeCompare(b.id));
}

/** Index to play after `current` once playback reaches `time`; null when the queue is finished,
 *  `current` while the moment is still playing. */
export function advanceTagged(list: HudlMoment[], current: number, time: number): number | null {
  const moment = list[current];
  if (!moment) return null;
  if (time < moment.time_s + Math.max(0.5, moment.duration_s)) return current;
  return current + 1 < list.length ? current + 1 : null;
}

/** Adjacent or overlapping moments play straight on: no seek, no buffering pause. */
export function needsSeek(next: HudlMoment, time: number): boolean {
  const end = next.time_s + Math.max(0.5, next.duration_s);
  if (next.time_s <= time + 1.5 && next.time_s >= time - 1.5) return false;
  return !(next.time_s < time && end > time);
}

/** Owner request 2026-11-13: the next (dir 1) or previous (dir -1) tagged moment, in
 *  match order (moments at the same second keep the list's order). From the highlighted
 *  moment (`fromId`) it is simply the one after or before it, however far the video has
 *  played on; with nothing highlighted it is the first after (or before) `time`, where
 *  half a second either side counts as "here". */
export function nextMoment(moments: HudlMoment[], time: number, dir: 1 | -1, fromId?: string): HudlMoment | undefined {
  const sorted = moments.map((m, i) => ({ m, i })).sort((a, b) => a.m.time_s - b.m.time_s || a.i - b.i).map((x) => x.m);
  const at = fromId === undefined ? -1 : sorted.findIndex((m) => m.id === fromId);
  if (at >= 0) return sorted[at + dir];
  return dir === 1 ? sorted.find((m) => m.time_s > time + 0.5) : [...sorted].reverse().find((m) => m.time_s < time - 0.5);
}

export function timeLeft(seconds: number | null | undefined): string {
  if (seconds == null) return "estimating time left";
  if (seconds < 60) return `about ${Math.max(1, Math.round(seconds))} sec left`;
  return `about ${Math.round(seconds / 60)} min left`;
}
