import {groundCalibration,multiply} from "./atlasGeometry";
import {panoramaMatrixAt} from "./panorama";
import type { Observation } from "./labTypes";
import { feet, outlineAt, type Camera, type Corners, type PitchKeyframe } from "./pitch";

/** Spec 610: pitch positions in metres from the owner's pitch outline (near-left corner = 0,0;
 * x along the near touchline to the right, y across towards the far touchline). */
export type PitchSize = { length_m: number; width_m: number };
type Matrix = number[];

export const PITCH_PRESETS: { label: string; size: PitchSize }[] = [
  { label: "5v5 (37 x 27 m)", size: { length_m: 37, width_m: 27 } },
  { label: "7v7 (55 x 37 m)", size: { length_m: 55, width_m: 37 } },
  { label: "9v9 (73 x 46 m)", size: { length_m: 73, width_m: 46 } },
  { label: "11v11 youth (91 x 55 m)", size: { length_m: 91, width_m: 55 } },
  { label: "11v11 (100 x 64 m)", size: { length_m: 100, width_m: 64 } },
];

/** Solve A x = b (8 x 8) by Gaussian elimination with partial pivoting. */
function solve(a: number[][], b: number[]): number[] {
  const n = b.length, m = a.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
    [m[c], m[p]] = [m[p], m[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = m[r][c] / m[c][c];
      for (let k = c; k <= n; k++) m[r][k] -= f * m[c][k];
    }
  }
  return m.map((row, i) => row[n] / row[i]);
}

/** Homography from the marked image corners (near-left, near-right, far-right, far-left) to metres. */
export function pitchHomography(corners: Corners, { length_m: l, width_m: w }: PitchSize): Matrix {
  const target = [[0, 0], [l, 0], [l, w], [0, w]];
  const a: number[][] = [], b: number[] = [];
  corners.forEach(([x, y], i) => {
    const [u, v] = target[i];
    a.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
    a.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
  });
  return [...solve(a, b), 1];
}

export function toPitch(h: Matrix, [x, y]: [number, number]): [number, number] {
  const d = h[6] * x + h[7] * y + h[8];
  return [(h[0] * x + h[1] * y + h[2]) / d, (h[3] * x + h[4] * y + h[5]) / d];
}

/** Compose the shared pitch calibration with each camera pose directly. */
export function imageToPitch(camera:Camera,marks:PitchKeyframe[],size:PitchSize,at:number):Matrix|null {
 if(camera.panorama?.review.corners){
  const pose=panoramaMatrixAt(camera.panorama.data,at);
  if(!pose)return null;
  if(camera.panorama.data.projection){
   const fit=groundCalibration(camera.panorama.data,camera.panorama.review.corners,null);
   if(!fit)return null;
   return multiply([size.length_m,0,0,0,size.width_m,0,0,0,1],multiply(fit.matrix,pose));
  }
  const h=pitchHomography(camera.panorama.review.corners,size);
  const out=[0,1,2].flatMap(r=>[0,1,2].map(c=>h[r*3]*pose[c]+h[r*3+1]*pose[3+c]+h[r*3+2]*pose[6+c]));
  return out.every(Number.isFinite)?out:null;
 }
 const outline=outlineAt(camera,marks,at);
 return outline?pitchHomography(outline,size):null;
}

/** Each observation's feet in metres, where an outline is known at its time. */
export function positions(rows: Observation[], camera: Camera, marks: PitchKeyframe[], size: PitchSize) {
  const cache = new Map<number, Matrix | null>();
  const out: { track_id: number; time_s: number; x: number; y: number }[] = [];
  for (const o of rows) {
    if (!o.image_box) continue;
    if (!cache.has(o.time_s)) cache.set(o.time_s,imageToPitch(camera,marks,size,o.time_s));
    const h = cache.get(o.time_s);
    if (!h) continue;
    const [x, y] = toPitch(h, feet(o));
    if(!Number.isFinite(x)||!Number.isFinite(y))continue;
    out.push({ track_id: o.track_id, time_s: o.time_s, x, y });
  }
  return out;
}

const MAX_SPEED = 10, STEP_S = 0.45, SPEED_WINDOW_S = 1;

/** Distance and top speed per tracked stretch. Positions are thinned to about two a second
 * (denser samples add jitter); a step faster than 10 m/s is a mismatched detection and skipped. */
export function trackMovement(rows: Observation[], camera: Camera, marks: PitchKeyframe[], size: PitchSize) {
  const byTrack = new Map<number, { time_s: number; x: number; y: number }[]>();
  for (const p of positions(rows, camera, marks, size)) { const list = byTrack.get(p.track_id) ?? []; list.push(p); byTrack.set(p.track_id, list); }
  const result = new Map<number, { distance_m: number; top_speed_ms: number; seconds: number }>();
  for (const [track, list] of byTrack) {
    list.sort((a, b) => a.time_s - b.time_s);
    const kept = [list[0]];
    let distance = 0;
    for (const p of list.slice(1)) {
      const last = kept[kept.length - 1], dt = p.time_s - last.time_s;
      if (dt < STEP_S) continue;
      const step = Math.hypot(p.x - last.x, p.y - last.y);
      if (step / dt > MAX_SPEED) continue;
      distance += step; kept.push(p);
    }
    let top = 0;
    for (let i = 0, j = 0; i < kept.length; i++) {
      while (j < kept.length && kept[j].time_s - kept[i].time_s < SPEED_WINDOW_S) j++;
      if (j >= kept.length) break;
      top = Math.max(top, Math.hypot(kept[j].x - kept[i].x, kept[j].y - kept[i].y) / (kept[j].time_s - kept[i].time_s));
    }
    result.set(track, { distance_m: distance, top_speed_ms: top, seconds: kept[kept.length - 1].time_s - kept[0].time_s });
  }
  return result;
}

/** Time spent per cell of a cols x rows grid over the pitch, per team (row 0 = near touchline). */
export function heatGrid(rows: Observation[], camera: Camera, marks: PitchKeyframe[], size: PitchSize, teamOf: (track: number) => "own" | "opponent" | null, cols = 12, gridRows = 8) {
  const empty = () => Array.from({ length: gridRows }, () => new Array<number>(cols).fill(0));
  const grid = { own: empty(), opponent: empty() };
  for (const p of positions(rows, camera, marks, size)) {
    const team = teamOf(p.track_id);
    if (!team || p.x < 0 || p.y < 0 || p.x >= size.length_m || p.y >= size.width_m) continue;
    grid[team][Math.floor((p.y / size.width_m) * gridRows)][Math.floor((p.x / size.length_m) * cols)] += 1;
  }
  return grid;
}
