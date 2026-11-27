import { describe, expect, it } from "vitest";
import { rayPanorama } from "./atlasGeometry";
import { inverse } from "./landmarks";
import type { Panorama } from "./panorama";
import { playShare } from "./playShare";

// A level camera panning about the vertical (world y points down): each frame is a yaw of one base view.
const BASE = [1, 0, -0.5, 0, 1, -0.2, 0, 0, 0.8];
const yaw = (t: number) => [Math.cos(t), 0, Math.sin(t), 0, 1, 0, -Math.sin(t), 0, Math.cos(t)];
const mul = (a: number[], b: number[]) => [0, 1, 2].flatMap(r => [0, 1, 2].map(c => a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c]));
const angles = [-0.3, -0.15, 0, 0.15, 0.3];
const worlds = angles.map(t => mul(yaw(t), BASE));
const data = { projection: { kind: "cylindrical", origin: [-1.6, -0.1], span: [3.2, 1.6], reference_focal: 0.8 }, times: angles.map((_, i) => i), cuts: angles.map(() => false),
  frame_to_world: worlds, frame_to_panorama: worlds, suggested_boundary: [], panorama_id: "a".repeat(64), source_sha256: "b".repeat(64), image: "pitch_atlas.jpg", width: 2400, height: 800, keyframe_times: [] } as unknown as Panorama;
// Ground point (right, forward) in camera heights -> atlas point, and -> a foot box in frame i.
const atlas = ([x, z]: number[]) => rayPanorama(data, [x, 1, z]);
const apply = (m: number[], v: number[]) => [0, 1, 2].map(r => m[r * 3] * v[0] + m[r * 3 + 1] * v[1] + m[r * 3 + 2] * v[2]);
const foot = (i: number, [x, z]: number[]) => {
  const q = apply(inverse(worlds[i]), [x, 1, z]), p = [q[0] / q[2], q[1] / q[2]];
  return { track_id: 1, time_s: i, team_id: null, role: "unknown", central: true, image_box: [p[0] - 0.01, p[1] - 0.05, p[0] + 0.01, p[1]] };
};
const square = [[-4, 2], [4, 2], [4, 8], [-4, 8]].map(atlas);
const spots = (inside: number, outside: number) => [...Array.from({ length: inside }, (_, k) => foot(k % 5, [-3 + (k % 7), 3 + (k % 4)])), ...Array.from({ length: outside }, (_, k) => foot(k % 5, [-2 + (k % 5), 10 + (k % 3)]))];

describe("playShare", () => {
  it("is the share of central players' feet inside the outline, on the level ground", () => {
    expect(playShare(data, square, spots(300, 100))).toBeCloseTo(0.75, 2);
  });
  it("ignores people away from the centre of the view (spectators along the far fence)", () => {
    const off = spots(0, 400).map(o => ({ ...o, central: false }));
    expect(playShare(data, square, [...spots(300, 0), ...off])).toBeCloseTo(1, 2);
  });
  it("abstains with too few players to judge", () => {
    expect(playShare(data, square, spots(50, 50))).toBeNull();
  });
  it("abstains when the camera never pans (no level ground)", () => {
    const still = { ...data, frame_to_world: worlds.map(() => worlds[2]) } as Panorama;
    expect(playShare(still, square, spots(300, 100))).toBeNull();
  });
});
