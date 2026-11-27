import {panoramaPointsAt,type BoundPanorama} from "./panorama";
import type { Observation } from "./labTypes";
import { fittedCorners, PITCH_CORNERS, type Landmark } from "./landmarks";
import { markerPointsAt, type MarkerModel } from "./pitchMarkers";
export { fitLandmarks } from "./landmarks";

/** Worker `camera_motion.json` (spec 600): step i maps normalised points at times[i] to times[i+1]. */
export type CameraMotion = { times: number[]; steps: number[][]; cuts: boolean[]; source_sha256?:string; pitch_boundaries?: {time_s:number;points:Corners}[] };
export type Corners = [number, number][];
export type PitchKeyframe = { time_s: number; corners: Corners; landmarks?: Landmark[]; fit_corner_indices?: number[] };
type Matrix = number[];

export const isCameraMotion = (v: unknown): v is CameraMotion =>
  !!v && Array.isArray((v as CameraMotion).times) && Array.isArray((v as CameraMotion).steps) && Array.isArray((v as CameraMotion).cuts);

const multiply = (a: Matrix, b: Matrix): Matrix => [0, 1, 2].flatMap(r => [0, 1, 2].map(c => a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c]));

function invert(m: Matrix): Matrix {
  const [a, b, c, d, e, f, g, h, i] = m;
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
  const det = a * A + b * B + c * C;
  return [A, -(b * i - c * h), b * f - c * e, B, a * i - c * g, -(a * f - c * d), C, -(a * h - b * g), a * e - b * d].map(v => v / det);
}

function apply(m: Matrix, [x, y]: [number, number]): [number, number] {
  const w = m[6] * x + m[7] * y + m[8];
  return [(m[0] * x + m[1] * y + m[2]) / w, (m[3] * x + m[4] * y + m[5]) / w];
}

/** Each sample's camera relative to the start of its segment (segments are split at cuts). */
/** `markers` (spec 800): your pitch marks placed through the atlas poses, ahead of every other outline.
 * `atlas`: this source has registered atlas poses, so marks are only ever read through them. */
export type Camera = { panorama?:BoundPanorama; proposal?:BoundPanorama; markers?:MarkerModel; atlas?:boolean; times: number[]; segment: number[]; total: Matrix[]; inverse: Matrix[] };

export function buildCamera(motion: CameraMotion): Camera {
  const identity = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  const segment = [0], total = [identity];
  for (let i = 0; i < motion.steps.length; i++) {
    const cut = motion.cuts[i];
    segment.push(segment[i] + (cut ? 1 : 0));
    total.push(cut ? identity : multiply(motion.steps[i], total[i]));
  }
  return { times: motion.times, segment, total, inverse: total.map(invert) };
}

function sampleIndex(times: number[], t: number) {
  let lo = 0, hi = times.length - 1, found = -1;
  while (lo <= hi) { const mid = (lo + hi) >> 1; if (times[mid] <= t) { found = mid; lo = mid + 1; } else hi = mid - 1; }
  return found;
}

function cornersAt(camera: Camera, keyframes: PitchKeyframe[], index: number): Corners | null {
  const usable = keyframes
    .map(k => ({ k, at: Math.max(0, sampleIndex(camera.times, k.time_s)) }))
    .filter(({ at }) => camera.segment[at] === camera.segment[index]);
  if (!usable.length) return null;
  const reference = ({k,at}: typeof usable[number]): Matrix => {
    if(at+1>=camera.times.length || camera.segment[at+1]!==camera.segment[at]) return camera.inverse[at];
    const f=Math.max(0,Math.min(1,(k.time_s-camera.times[at])/(camera.times[at+1]-camera.times[at])));
    const step=multiply(camera.total[at+1],camera.inverse[at]);
    const identity=[1,0,0,0,1,0,0,0,1];
    const partial=step.map((v,n)=>identity[n]+(v/step[8]-identity[n])*f);
    return multiply(camera.inverse[at],invert(partial));
  };
  const { k, at } = usable.reduce((best, item) => Math.abs(item.k.time_s - camera.times[index]) < Math.abs(best.k.time_s - camera.times[index]) ? item : best);
  const move = multiply(camera.total[index], reference({k,at}));
  const fitted = fittedCorners(k.corners, k.landmarks, k.fit_corner_indices);
  if (!fitted) return null;
  const carried = fitted.map(p => apply(move, p));
  // New calibrations use corrections from both directions, avoiding a jump at the
  // nearest-mark boundary. Never blend across a cut; old four-corner reviews stay compatible.
  if (!usable.some(item => item.k.landmarks !== undefined)) return carried;
  const before = usable.filter(item => item.k.time_s <= camera.times[index]).sort((a,b) => b.k.time_s-a.k.time_s)[0];
  const after = usable.filter(item => item.k.time_s >= camera.times[index]).sort((a,b) => a.k.time_s-b.k.time_s)[0];
  if (!before || !after || before.k.time_s === after.k.time_s) return carried;
  const carry = (item: typeof before) => fittedCorners(item.k.corners,item.k.landmarks,item.k.fit_corner_indices)?.map(p => apply(multiply(camera.total[index],reference(item)),p));
  const left=carry(before), right=carry(after);
  if(!left || !right) return null;
  const f=(camera.times[index]-before.k.time_s)/(after.k.time_s-before.k.time_s);
  return left.map(([x,y],n)=>[x+(right[n][0]-x)*f,y+(right[n][1]-y)*f]);
}

/** The owner's pitch outline at time `t`, carried with the camera from the nearest mark in the same
 * camera segment and blended between samples; null where no mark reaches (beyond a cut). */
export function outlineAt(camera: Camera, keyframes: PitchKeyframe[], t: number): Corners | null {
  if (camera.markers) { const p = markerPointsAt(camera.markers, t, PITCH_CORNERS); return p && p.every(Boolean) ? p as Corners : null; }
  if(camera.panorama?.review.corners) return panoramaPointsAt(camera.panorama,t,true);
  if (!keyframes.length || !camera.times.length) return null;
  const i = Math.max(0, sampleIndex(camera.times, t));
  const here = cornersAt(camera, keyframes, i);
  const j = i + 1;
  if (!here || j >= camera.times.length || camera.segment[j] !== camera.segment[i]) return here;
  const next = cornersAt(camera, keyframes, j);
  if (!next) return here;
  const f = Math.min(1, Math.max(0, (t - camera.times[i]) / (camera.times[j] - camera.times[i])));
  return here.map(([x, y], n) => [x + (next[n][0] - x) * f, y + (next[n][1] - y) * f]);
}

function edgeDistance([x, y]: [number, number], [ax, ay]: [number, number], [bx, by]: [number, number]) {
  const dx = bx - ax, dy = by - ay, len = dx * dx + dy * dy;
  const t = len ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len)) : 0;
  return Math.hypot(x - ax - t * dx, y - ay - t * dy);
}

/** Feet inside the outline, or within `margin` of its edge (players on the line). */
export function insidePitch(point: [number, number], corners: Corners, margin: number): boolean {
  let inside = false;
  for (let a = 0, b = corners.length - 1; a < corners.length; b = a++) {
    const [xa, ya] = corners[a], [xb, yb] = corners[b];
    if ((ya > point[1]) !== (yb > point[1]) && point[0] < ((xb - xa) * (point[1] - ya)) / (yb - ya) + xa) inside = !inside;
  }
  return inside || corners.some((c, n) => edgeDistance(point, c, corners[(n + 1) % corners.length]) <= margin);
}

export const feet = (o: Observation): [number, number] => [(o.image_box![0] + o.image_box![2]) / 2, o.image_box![3]];
export const footMargin = (o: Observation) => (o.image_box![3] - o.image_box![1]) * 0.5;

/** Is this person standing on the marked pitch at that moment, clearly inside the lines rather than
 * at the touchline where coaches and spectators stand? null where no outline is known. */
export function standingOnPitch(resolve:(t:number)=>Corners|null):(o:Observation)=>boolean|null {
  const outlines=new Map<number,Corners|null>();
  return o=>{
    if(!o.image_box) return null;
    if(!outlines.has(o.time_s)) outlines.set(o.time_s,resolve(o.time_s));
    const outline=outlines.get(o.time_s);
    if(!outline) return null;
    const point=feet(o),inset=(o.image_box[3]-o.image_box[1])*0.1;
    return insidePitch(point,outline,0) && !outline.some((c,n)=>edgeDistance(point,c,outline[(n+1)%outline.length])<inset);
  };
}

/** Tracks seen mostly off the marked pitch (where an outline is known). */
export function offPitchTracks(observations: Observation[], camera: Camera, keyframes: PitchKeyframe[], resolve?: (t:number)=>Corners|null): Set<number> {
  const outlines = new Map<number, Corners | null>();
  const tally = new Map<number, [number, number]>();
  for (const o of observations) {
    if (!o.image_box) continue;
    if (!outlines.has(o.time_s)) outlines.set(o.time_s, resolve ? resolve(o.time_s) : outlineAt(camera, keyframes, o.time_s));
    const outline = outlines.get(o.time_s);
    if (!outline) continue;
    const [on, all] = tally.get(o.track_id) ?? [0, 0];
    tally.set(o.track_id, [on + (insidePitch(feet(o), outline, footMargin(o)) ? 1 : 0), all + 1]);
  }
  return new Set([...tally].filter(([, [on, all]]) => on / all < 0.5).map(([track]) => track));
}

/** Transport arbitrary mask vertices. Physical calibration remains four corners. */
export function carryPoints(camera: Camera, points: Corners, from: number, to: number): Corners | null {
  const pose = (t:number) => {
    const i=Math.max(0,sampleIndex(camera.times,t)), j=i+1;
    if(j>=camera.times.length || camera.segment[i]!==camera.segment[j]) return camera.total[i];
    const f=Math.max(0,Math.min(1,(t-camera.times[i])/(camera.times[j]-camera.times[i])));
    const step=multiply(camera.total[j],camera.inverse[i]),identity=[1,0,0,0,1,0,0,0,1];
    return multiply(step.map((v,n)=>identity[n]+(v/step[8]-identity[n])*f),camera.total[i]);
  };
  if(!camera.times.length || camera.segment[Math.max(0,sampleIndex(camera.times,from))]!==camera.segment[Math.max(0,sampleIndex(camera.times,to))]) return null;
  const move=multiply(pose(to),invert(pose(from)));
  const out=points.map(p=>apply(move,p));
  return out.every(p=>p.every(Number.isFinite)) ? out : null;
}

/** A picture point (normalised) at time t, steadied against camera motion: [camera shot, x, y]. */
export function stabilise(camera: Camera, t: number, x: number, y: number): [number, number, number] | null {
  if (!camera.times.length) return null;
  const i = Math.max(0, sampleIndex(camera.times, t));
  const [px, py] = apply(camera.inverse[i], [x, y]);
  return Number.isFinite(px) && Number.isFinite(py) ? [camera.segment[i], px, py] : null;
}
