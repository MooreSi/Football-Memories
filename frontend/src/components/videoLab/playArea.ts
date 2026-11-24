import type { Assignment, Observation } from "./labTypes";

/** Worker `dense_tracks.json`: people about ten times a second inside each moment clip. */
export type DenseTracks = {
  windows: { start_s: number; end_s: number }[];
  observations: { track_id: number; time_s: number; image_box: number[]; linked: boolean }[];
};

export const isDense = (v: unknown): v is DenseTracks =>
  !!v && Array.isArray((v as DenseTracks).windows) && Array.isArray((v as DenseTracks).observations);

/** Refined positions replace the sampled ones inside moment clips; outside them nothing changes. */
export function mergeDense(sampled: Observation[], dense?: DenseTracks): Observation[] {
  if (!dense?.windows.length) return sampled;
  const inside = (t: number) => dense.windows.some(w => t >= w.start_s - 1e-6 && t <= w.end_s + 1e-6);
  const refined = dense.observations.map(o => ({ track_id: o.track_id, time_s: o.time_s, team_id: null, role: "unknown", image_box: o.image_box }));
  return [...sampled.filter(o => !inside(o.time_s)), ...refined].sort((a, b) => a.time_s - b.time_s);
}

const assigned = (info?: Assignment) => !!info && info.source !== "none" && (!!info.team || info.role === "goalkeeper" || info.role === "referee");
const yours = (info?: Assignment) => assigned(info) && info!.source === "you";
const notPlayer = (info?: Assignment) => info?.role === "other" && info.source !== "none";

/**
 * People worth a ring at this moment. Veo films from high on the near side, so spectators along the far
 * fence and people on pitches beyond sit further from the camera (higher in the frame) than the match.
 * The far edge of play is the furthest of your labelled players on screen (with fewer than two, the
 * second furthest person with any team, so one wrong suggestion cannot move it). Anyone standing beyond
 * it by more than their own height loses their ring; nearer people and those to the sides keep theirs.
 * Your labelled people and the selected person always show; people marked not players never do.
 */
export function inPlay(rows: Observation[], teams: Map<number, Assignment>, selected: number | null): Observation[] {
  const footY = (o: Observation) => o.image_box![3];
  const keep = rows.filter(o => o.track_id === selected || !notPlayer(teams.get(o.track_id)));
  const mine = rows.filter(o => yours(teams.get(o.track_id))).map(footY).sort((a, b) => a - b);
  const any = rows.filter(o => assigned(teams.get(o.track_id))).map(footY).sort((a, b) => a - b);
  const edge = mine.length >= 2 ? mine[0] : any.length >= 3 ? any[1] : null;
  if (edge === null) return keep;
  return keep.filter(o => o.track_id === selected || yours(teams.get(o.track_id)) || footY(o) >= edge - (o.image_box![3] - o.image_box![1]));
}
