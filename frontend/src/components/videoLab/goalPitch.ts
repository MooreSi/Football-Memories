import { applyRay, panoramaRay, rayPanorama } from "./atlasGeometry";
import { levelGround, type Level } from "./levelGround";
import { panoramaMatrixAt, type GoalCandidate, type Panorama } from "./panorama";
import type { Corners } from "./pitch";
import type { PitchSize } from "./metres";

/**
 * The pitch from its two goals (owner request 27 November 2026, 261108 U11 v Stoke).
 *
 * Youth games are often laid out inside a bigger pitch: on Stoke the 9v9 goals stood on a full
 * pitch's penalty-box lines and the 9v9 touchlines were flat cones, so the painted lines belonged to
 * the wrong pitch and the automatic outline ran to the far fence. The goals always belong to the game
 * being played. On the level ground (true shape, one unknown scale) they fix:
 * - the goal lines (each goal stands on one) and so the length;
 * - the centre line of the pitch (goal to goal): a pitch is equally wide either side of it;
 * - the kick-off spot (half way between the goals) and the halfway line through it, square to the
 *   goal-to-goal line, so the two halves are equal by construction.
 * The width is not measurable from goals alone: it comes from the game format's shape (from the age
 * group in the title, or the pitch size you chose), widened only if play clearly spills past it.
 * Every format's shape is close (width 0.6-0.73 of the length), so a wrong guess costs little.
 */

/** FA recommended youth sizes by age group (football.co.uk / The FA youth format guidance). */
export const FORMAT_BY_AGE: { upTo: number; format: string; size: PitchSize }[] = [
  { upTo: 8, format: "5v5", size: { length_m: 37, width_m: 27 } },
  { upTo: 10, format: "7v7", size: { length_m: 55, width_m: 37 } },
  { upTo: 12, format: "9v9", size: { length_m: 73, width_m: 46 } },
  { upTo: 14, format: "11v11", size: { length_m: 82, width_m: 50 } },
  { upTo: 16, format: "11v11", size: { length_m: 91, width_m: 55 } },
  { upTo: 99, format: "11v11", size: { length_m: 100, width_m: 64 } },
];

/** Game format and recommended size from an age group in a match title ("261108 U11 v Stoke" -> 9v9). */
export function formatFromTitle(title: string | undefined): (typeof FORMAT_BY_AGE)[number] | null {
  const m = /\bU\s?(\d{1,2})s?\b/i.exec(title ?? "");
  if (!m) return null;
  const age = Number(m[1]);
  return age >= 5 ? FORMAT_BY_AGE.find(f => age <= f.upTo) ?? null : null;
}

type P = [number, number];
const sub = (a: P, b: P): P => [a[0] - b[0], a[1] - b[1]];
const add = (a: P, b: P): P => [a[0] + b[0], a[1] + b[1]];
const mul = (a: P, k: number): P => [a[0] * k, a[1] * k];
const len = (a: P) => Math.hypot(a[0], a[1]);

const plan = (g: Level, ray: number[]): P | null => {
  const d = g.down[0] * ray[0] + g.down[1] * ray[1] + g.down[2] * ray[2];
  if (!(d > 1e-9)) return null;
  const dot = (a: number[]) => a[0] * ray[0] + a[1] * ray[1] + a[2] * ray[2];
  return [dot(g.right) / d, dot(g.forward) / d];
};
const toAtlas = (data: Panorama, g: Level, [x, z]: P): P => rayPanorama(data, [0, 1, 2].map(i => g.right[i] * x + g.forward[i] * z + g.down[i]));

/** The two goals of one game are the same size: their ground spans within this ratio. */
const MAX_GOAL_RATIO = 2.5;
/** Length over a goal's ground span. The span is post to post for an end-on camera, or the goal frame's
 * depth for a side-on one (Stoke: the detected contacts were the front and back of each frame), so this
 * only rules out absurd pairs: two goals side by side, or a spare goal across the complex. */
const LENGTH_PER_GOAL = [4, 60];
/** Play spilling past a touchline: share of central feet allowed beyond it before widening. */
const SPILL = 0.03;

export type GoalPitch = {
  /** Corners in atlas coordinates: left goal line near, right goal line near, right far, left far. */
  points: Corners;
  /** Halfway line ends (near touchline, far touchline), through the kick-off spot. */
  halfway: Corners;
  kickoff: P;
  /** Plan-view length / width (camera-height units) and the size used for the shape. */
  length: number; width: number; size: PitchSize; format: string | null; widened: boolean;
};

const STEPS = 64;
const onAtlas = (p: P) => p.every(v => Number.isFinite(v) && v >= 0 && v <= 1);

/**
 * Ground polygon (or line) to atlas points that all lie on the atlas image. Edges are straight on the
 * ground, so a point is sampled along each edge; where an edge leaves the filmed area it is cut at the
 * last sample on the image. The boundary editor accepts only points on the image, and ground nobody
 * filmed cannot be checked anyway.
 */
function clipToAtlas(data: Panorama, g: Level, plain: P[], closed: boolean): Corners {
  const out: P[] = [];
  const edges = closed ? plain.length : plain.length - 1;
  for (let i = 0; i < edges; i++) {
    const a = plain[i], b = plain[(i + 1) % plain.length];
    let was: boolean | null = null, prev: P | null = null;
    for (let k = 0; k <= STEPS; k++) {
      if (closed && k === STEPS) break;
      const p = toAtlas(data, g, add(a, mul(sub(b, a), k / STEPS))), inside = onAtlas(p);
      if (k === 0 ? inside : was !== inside) out.push(inside ? p : prev!);
      else if (!closed && k === STEPS && inside) out.push(p);
      was = inside; prev = p;
    }
  }
  const kept = out.filter(onAtlas);
  // Drop repeats (a corner reached from both its edges).
  return kept.filter((p, i) => i === 0 || Math.hypot(p[0] - kept[i - 1][0], p[1] - kept[i - 1][1]) > 1e-6) as Corners;
}

type Foot = { time_s: number; image_box?: number[]; central?: boolean };

/** Pitch outline from the two selected goals, or null when they do not look like one game's goals. */
export function goalPitch(data: Panorama, opts: { title?: string; size?: PitchSize | null; observations?: Foot[]; goals?: GoalCandidate[] } = {}): GoalPitch | null {
  const goals = opts.goals ?? data.selected_goals ?? [];
  if (!data.projection || goals.length !== 2) return null;
  const g = levelGround(data);
  if (!g) return null;
  const posts = goals.map(goal => goal.posts.map(p => plan(g, panoramaRay(data, p as P))));
  if (posts.some(pair => pair.length !== 2 || pair.some(p => !p || !p.every(Number.isFinite)))) return null;
  const [[a1, a2], [b1, b2]] = posts as [P, P][];
  const ca = mul(add(a1, a2), 0.5), cb = mul(add(b1, b2), 0.5);
  const axis = sub(cb, ca), length = len(axis);
  const wa = len(sub(a1, a2)), wb = len(sub(b1, b2));
  if (!(length > 0) || !(wa > 0) || !(wb > 0)) return null;
  if (Math.max(wa, wb) / Math.min(wa, wb) > MAX_GOAL_RATIO) return null;
  const perLength = length / ((wa + wb) / 2);
  if (perLength < LENGTH_PER_GOAL[0] || perLength > LENGTH_PER_GOAL[1]) return null;
  const u = mul(axis, 1 / length);
  const fromTitle = formatFromTitle(opts.title);
  const size = opts.size ?? fromTitle?.size ?? FORMAT_BY_AGE[2].size;
  let width = (length * size.width_m) / size.length_m;
  // Normal pointing away from the camera (the camera is at the plan origin), so "near" is the camera side.
  let n: P = [-u[1], u[0]];
  const kickoff = mul(add(ca, cb), 0.5);
  if (n[0] * kickoff[0] + n[1] * kickoff[1] < 0) n = mul(n, -1);
  let widened = false;
  if (opts.observations) {
    // How far play reaches on each side of the goal-to-goal line, between the goal lines. Spectators,
    // coaches and the next pitch crowd one side (Stoke: the far fence at 0.41 of the length while
    // players stopped at 0.27), so the pitch widens only when play spills past BOTH touchlines.
    const sides: number[][] = [[], []];
    for (const o of opts.observations) {
      if (!o.central || !o.image_box) continue;
      const m = panoramaMatrixAt(data, o.time_s);
      if (!m) continue;
      const [x1, , x2, y2] = o.image_box, p = plan(g, applyRay(m, [(x1 + x2) / 2, y2, 1]));
      if (!p) continue;
      const d = sub(p, kickoff), t = d[0] * u[0] + d[1] * u[1], c = d[0] * n[0] + d[1] * n[1];
      if (Math.abs(t) <= length / 2) sides[c >= 0 ? 1 : 0].push(Math.abs(c));
    }
    if (sides.every(v => v.length >= 100)) {
      const reach = sides.map(v => { const sorted = [...v].sort((x, y) => x - y); return sorted[Math.floor((1 - SPILL) * (sorted.length - 1))]; });
      const edge = 2 * Math.min(...reach);
      // Never wider than the widest format's shape (100 x 64).
      if (edge > width * 1.05) { width = Math.min(edge, length * 0.66); widened = true; }
    }
  }
  const half = mul(n, width / 2);
  const plain: P[] = [sub(ca, half), sub(cb, half), add(cb, half), add(ca, half)];
  const points = clipToAtlas(data, g, plain, true);
  const halfway = clipToAtlas(data, g, [sub(kickoff, half), add(kickoff, half)], false);
  if (points.length < 3 || halfway.length !== 2) return null;
  return { points, halfway, kickoff: toAtlas(data, g, kickoff), length, width, size, format: opts.size ? null : fromTitle?.format ?? null, widened };
}
