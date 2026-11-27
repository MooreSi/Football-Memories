import { describe, expect, it } from "vitest";
import { panoramaRay, rayPanorama } from "./atlasGeometry";
import { inverse } from "./landmarks";
import type { GoalCandidate, Panorama } from "./panorama";
import { formatFromTitle, goalPitch } from "./goalPitch";
import { labPanorama } from "./decisions";

// A level camera panning about the vertical (world y points down), as in playShare.test.ts. Ground
// points are (right, forward) in camera heights; the camera stands at (0, 0).
const BASE = [1, 0, -0.5, 0, 1, -0.2, 0, 0, 0.8];
const yaw = (t: number) => [Math.cos(t), 0, Math.sin(t), 0, 1, 0, -Math.sin(t), 0, Math.cos(t)];
const mul = (a: number[], b: number[]) => [0, 1, 2].flatMap(r => [0, 1, 2].map(c => a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c]));
const angles = [-0.3, -0.15, 0, 0.15, 0.3];
const worlds = angles.map(t => mul(yaw(t), BASE));
const base = { projection: { kind: "cylindrical", origin: [-1.6, -0.1], span: [3.2, 1.6], reference_focal: 0.8 }, times: angles.map((_, i) => i), cuts: angles.map(() => false),
  frame_to_world: worlds, frame_to_panorama: worlds, suggested_boundary: [], panorama_id: "a".repeat(64), source_sha256: "b".repeat(64), image: "pitch_atlas.jpg", width: 2400, height: 800, keyframe_times: [] } as unknown as Panorama;
const atlas = ([x, z]: number[]) => rayPanorama(base, [x, 1, z]);
const ground = (p: [number, number]) => { const r = panoramaRay(base, p); return [r[0] / r[1], r[2] / r[1]]; };
const apply = (m: number[], v: number[]) => [0, 1, 2].map(r => m[r * 3] * v[0] + m[r * 3 + 1] * v[1] + m[r * 3 + 2] * v[2]);
const foot = (i: number, [x, z]: number[]) => {
  const q = apply(inverse(worlds[i]), [x, 1, z]), p = [q[0] / q[2], q[1] / q[2]];
  return { track_id: 1, time_s: i, team_id: null, role: "unknown", central: true, image_box: [p[0] - 0.01, p[1] - 0.05, p[0] + 0.01, p[1]] };
};
// A side-on camera sees each goal's frame front to back: the detected "posts" lie along the pitch.
const goal = (id: string, x: number, z: number): GoalCandidate => ({ id, posts: [atlas([x - 0.15, z]), atlas([x + 0.15, z])], tops: [], time_s: 0, support: 5, score: 0.3, requires_review: true });
const goals = [goal("left", -6, 7), goal("right", 6, 7)];
const data = { ...base, selected_goals: goals } as Panorama;
const near = (a: number[], b: number[]) => { expect(a[0]).toBeCloseTo(b[0], 3); expect(a[1]).toBeCloseTo(b[1], 3); };

describe("formatFromTitle", () => {
  it("reads the game format from the age group in the title", () => {
    expect(formatFromTitle("261108 U11 v Stoke (A)")?.format).toBe("9v9");
    expect(formatFromTitle("U9s Saturday")?.size).toEqual({ length_m: 55, width_m: 37 });
    expect(formatFromTitle("U7 festival")?.format).toBe("5v5");
    expect(formatFromTitle("261116 Racing Club Warwick vs. Kidderminster RMC")).toBeNull();
  });
});

describe("goalPitch", () => {
  it("puts the goal lines at the goals, the kick-off spot half way between them and the halfway line square through it", () => {
    const g = goalPitch(data, { title: "U11 v Stoke" })!;
    expect(g.format).toBe("9v9");
    near(ground(g.kickoff), [0, 7]);
    const [h1, h2] = g.halfway.map(ground);
    expect(h1[0]).toBeCloseTo(0, 3); expect(h2[0]).toBeCloseTo(0, 3);
    // Equal distance either side of the halfway line, and of the goal-to-goal line.
    const corners = g.points.map(ground);
    expect(corners.map(c => Math.abs(c[0]))).toEqual(corners.map(() => expect.closeTo(6, 3)));
    const width = 12 * 46 / 73;
    expect(corners.map(c => c[1]).sort((a, b) => a - b)).toEqual([7 - width / 2, 7 - width / 2, 7 + width / 2, 7 + width / 2].map(v => expect.closeTo(v, 3)));
    near(h1, [0, 7 - width / 2]); near(h2, [0, 7 + width / 2]);
  });
  it("takes the shape from the chosen pitch size, else from the age group (7v7 for U9)", () => {
    const w = (g: ReturnType<typeof goalPitch>) => { const c = g!.points.map(ground).map(p => p[1]); return Math.max(...c) - Math.min(...c); };
    expect(w(goalPitch(data, { title: "U9 league" }))).toBeCloseTo(12 * 37 / 55, 3);
    expect(w(goalPitch(data, { title: "U9 league", size: { length_m: 60, width_m: 40 } }))).toBeCloseTo(8, 3);
  });
  it("a crowd along one touchline does not widen the pitch; play past both touchlines does", () => {
    const players = Array.from({ length: 400 }, (_, k) => foot(k % 5, [-5 + (k % 11), 7 + ((k % 9) - 4) * 0.8]));
    const crowd = Array.from({ length: 200 }, (_, k) => foot(k % 5, [-5 + (k % 11), 11.5]));
    expect(goalPitch(data, { observations: [...players, ...crowd] })!.widened).toBe(false);
    const wide = Array.from({ length: 400 }, (_, k) => foot(k % 5, [-5 + (k % 11), 7 + ((k % 9) - 4) * 1.15]));
    const g = goalPitch(data, { observations: wide })!;
    expect(g.widened).toBe(true);
    const c = g.points.map(ground).map(p => p[1]);
    // Still centred on the goals.
    expect((Math.max(...c) + Math.min(...c)) / 2).toBeCloseTo(7, 3);
  });
  it("keeps every outline point on the filmed atlas: an unfilmed corner is cut along the image edge", () => {
    const g = goalPitch({ ...data, selected_goals: [goal("l", -9, 4), goal("r", 9, 4)] } as Panorama, {})!;
    expect(g.points.length).toBeGreaterThanOrEqual(4);
    for (const p of [...g.points, ...g.halfway]) for (const v of p) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); }
  });
  it("refuses goals that cannot be one game's pair", () => {
    expect(goalPitch({ ...data, selected_goals: [goals[0]] } as Panorama)).toBeNull();
    const big = { ...goals[1], posts: [atlas([5, 7]), atlas([7, 7])] };
    expect(goalPitch({ ...data, selected_goals: [goals[0], big] } as Panorama)).toBeNull();
    expect(goalPitch({ ...data, selected_goals: [goal("a", -0.4, 7), goal("b", 0.4, 7)] } as Panorama)).toBeNull();
  });
});

describe("labPanorama", () => {
  const players = Array.from({ length: 400 }, (_, k) => foot(k % 5, [-5 + (k % 11), 7 + ((k % 9) - 4) * 0.8]));
  const painted = { ...data, pitch_outline: { method: "painted_lines", halfway: null }, suggested_boundary: [[-3, 8], [3, 8], [3, 12], [-3, 12]].map(atlas) } as Panorama;
  it("uses the goal outline when it holds the play better than the painted lines (Stoke: the lines were a bigger pitch's)", () => {
    const out = labPanorama(painted, players, "U11 v Stoke", null)!;
    expect(out.pitch_outline?.method).toBe("goal_symmetric");
    expect(out.suggested_boundary).not.toBe(painted.suggested_boundary);
    expect(out.pitch_outline?.halfway?.map(ground).map(p => p[0])).toEqual([expect.closeTo(0, 3), expect.closeTo(0, 3)]);
  });
  it("keeps the painted outline when the goals' outline holds less play (a false goal pair)", () => {
    const good = { ...painted, suggested_boundary: [[-6, 3], [6, 3], [6, 11], [-6, 11]].map(atlas), selected_goals: [goal("a", -3, 9), goal("b", 3, 9)] } as Panorama;
    const kept = labPanorama(good, players, "U11", null)!;
    expect(kept.suggested_boundary).toBe(good.suggested_boundary);
    expect(kept.pitch_outline?.method).toBe("painted_lines");
  });
});

describe("centreHalfway (an outline without a halfway line)", () => {
  it("puts the halfway line through the pitch centre, square to its long side, so both halves are equal", async () => {
    const { centreHalfway } = await import("./goalPitch");
    const outline = [[-6, 4], [6, 4], [6, 10], [-6, 10]].map(atlas) as [number, number][];
    const half = centreHalfway(base, outline)!;
    const [a, b] = half.map(ground);
    expect(a[0]).toBeCloseTo(0, 2); expect(b[0]).toBeCloseTo(0, 2);
    expect([a[1], b[1]].sort((x, y) => x - y)).toEqual([expect.closeTo(4, 2), expect.closeTo(10, 2)]);
  });
  it("the lab proposes it for a painted outline that has none, and keeps one the worker found", () => {
    const painted = { ...base, pitch_outline: { method: "painted_lines", halfway: null }, suggested_boundary: [[-6, 4], [6, 4], [6, 10], [-6, 10]].map(atlas) } as Panorama;
    const players = Array.from({ length: 400 }, (_, k) => foot(k % 5, [-5 + (k % 11), 5 + (k % 5)]));
    const out = labPanorama(painted, players, "", null)!;
    expect(out.pitch_outline?.halfway?.map(ground).map(p => p[0])).toEqual([expect.closeTo(0, 2), expect.closeTo(0, 2)]);
    const found = [[0.5, 0.5], [0.5, 0.6]] as [number, number][];
    expect(labPanorama({ ...painted, pitch_outline: { method: "painted_lines", halfway: found } } as Panorama, players, "", null)!.pitch_outline?.halfway).toBe(found);
  });
});

describe("withHalfway (your accepted outline without a halfway line)", () => {
  it("takes the halfway line through its own centre, and never replaces one you placed", async () => {
    const { withHalfway } = await import("./decisions");
    const points = [[-6, 4], [6, 4], [6, 10], [-6, 10]].map(atlas) as [number, number][];
    const bound = withHalfway({ data: base, review: { panorama_id: base.panorama_id, points, accepted: true } })!;
    expect(bound.review.halfway?.map(ground).map(p => p[0])).toEqual([expect.closeTo(0, 2), expect.closeTo(0, 2)]);
    const mine = [[0.4, 0.5], [0.45, 0.7]] as [number, number][];
    expect(withHalfway({ data: base, review: { panorama_id: base.panorama_id, points, halfway: mine, accepted: true } })!.review.halfway).toBe(mine);
  });
});
