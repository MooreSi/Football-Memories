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
