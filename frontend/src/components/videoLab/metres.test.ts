import { expect, it } from "vitest";
import { heatGrid, pitchHomography, toPitch, trackMovement } from "./metres";
import { buildCamera } from "./pitch";
import type { Observation } from "./labTypes";

// A perspective-looking quad: near touchline wide at the bottom, far touchline narrower above.
const QUAD: [number, number][] = [[0.0, 0.9], [1.0, 0.9], [0.75, 0.3], [0.25, 0.3]];
const SIZE = { length_m: 60, width_m: 40 };

it("maps the marked corners to the pitch corners in metres", () => {
  const h = pitchHomography(QUAD, SIZE);
  expect(toPitch(h, [0, 0.9])).toEqual([expect.closeTo(0, 5), expect.closeTo(0, 5)]);
  expect(toPitch(h, [1, 0.9])).toEqual([expect.closeTo(60, 5), expect.closeTo(0, 5)]);
  expect(toPitch(h, [0.75, 0.3])).toEqual([expect.closeTo(60, 5), expect.closeTo(40, 5)]);
  expect(toPitch(h, [0.25, 0.3])).toEqual([expect.closeTo(0, 5), expect.closeTo(40, 5)]);
});

it("respects perspective: halfway up the image between touchlines is nearer the camera in metres", () => {
  // The near half of the pitch fills more of the picture than the far half.
  const [, y] = toPitch(pitchHomography(QUAD, SIZE), [0.5, 0.6]);
  expect(y).toBeGreaterThan(5);
  expect(y).toBeLessThan(20);
});

const still = buildCamera({ times: [0, 10], steps: [[1, 0, 0, 0, 1, 0, 0, 0, 1]], cuts: [false] });
const marks = [{ time_s: 0, corners: [[0, 1], [1, 1], [1, 0], [0, 0]] as [number, number][] }];
// With that square mark on a 100 x 50 pitch, image x maps to x * 100 m and image y to (1 - y) * 50 m.
const foot = (track_id: number, time_s: number, x: number, y: number): Observation => ({ track_id, time_s, team_id: null, role: "unknown", image_box: [x - 0.01, y - 0.05, x + 0.01, y] });
const PITCH = { length_m: 100, width_m: 50 };

it("measures distance covered and top speed over a tracked stretch", () => {
  // 0.02 of the width (2 m) every 0.5 s for 5 s: 20 m at 4 m/s.
  const run = Array.from({ length: 11 }, (_, i) => foot(1, i * 0.5, 0.2 + 0.02 * i, 0.5));
  const moved = trackMovement(run, still, marks, PITCH).get(1)!;
  expect(moved.distance_m).toBeCloseTo(20, 0);
  expect(moved.top_speed_ms).toBeCloseTo(4, 0);
  expect(moved.seconds).toBeCloseTo(5);
});

it("ignores impossible jumps when a track briefly latches onto someone else", () => {
  const run = [foot(1, 0, 0.2, 0.5), foot(1, 0.5, 0.22, 0.5), foot(1, 1, 0.6, 0.5), foot(1, 1.5, 0.24, 0.5), foot(1, 2, 0.26, 0.5)];
  const moved = trackMovement(run, still, marks, PITCH).get(1)!;
  expect(moved.distance_m).toBeLessThan(10);
  expect(moved.top_speed_ms).toBeLessThan(10);
});

it("counts where each team spent its time on a coarse pitch grid", () => {
  const rows = [foot(1, 0, 0.05, 0.95), foot(1, 1, 0.05, 0.95), foot(2, 0, 0.95, 0.05)];
  const teams = new Map<number, "own" | "opponent">([[1, "own"], [2, "opponent"]]);
  const grid = heatGrid(rows, still, marks, PITCH, id => teams.get(id) ?? null, 10, 5);
  expect(grid.own[0][0]).toBe(2);
  expect(grid.opponent[4][9]).toBe(1);
  expect(grid.own.flat().reduce((a, b) => a + b)).toBe(2);
});
