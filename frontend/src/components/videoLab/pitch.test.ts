import { describe, expect, it } from "vitest";
import { buildCamera, insidePitch, offPitchTracks, outlineAt, stabilise, type CameraMotion } from "./pitch";
import { propagateTeams } from "./teams";
import type { AppearanceTrack, Observation } from "./labTypes";

/** Camera panning right: each step moves scene points 0.1 to the left. */
const shift = (dx: number) => [1, 0, dx, 0, 1, 0, 0, 0, 1];
const motion = (cuts: boolean[] = [false, false, false]): CameraMotion => ({ times: [0, 1, 2, 3], steps: cuts.map(() => shift(-0.1)), cuts });
const CORNERS: [number, number][] = [[0.1, 0.9], [0.9, 0.9], [0.8, 0.3], [0.2, 0.3]];

it("carries the marked outline with the camera, between and across steps", () => {
  const camera = buildCamera(motion());
  const at2 = outlineAt(camera, [{ time_s: 0, corners: CORNERS }], 2)!;
  expect(at2[0][0]).toBeCloseTo(-0.1);
  expect(at2[0][1]).toBeCloseTo(0.9);
  const between = outlineAt(camera, [{ time_s: 0, corners: CORNERS }], 1.5)!;
  expect(between[1][0]).toBeCloseTo(0.75);
});

it("works backwards from a later mark and prefers the nearest mark", () => {
  const camera = buildCamera(motion());
  const marks = [{ time_s: 3, corners: CORNERS }, { time_s: 0, corners: [[0, 1], [1, 1], [1, 0], [0, 0]] as [number, number][] }];
  expect(outlineAt(camera, marks, 2.4)![0][0]).toBeCloseTo(0.16);
  expect(outlineAt(camera, marks, 0.2)![0][0]).toBeCloseTo(-0.02);
});

it("never carries an outline across a camera cut", () => {
  const camera = buildCamera(motion([false, true, false]));
  const marks = [{ time_s: 0, corners: CORNERS }];
  expect(outlineAt(camera, marks, 1)).not.toBeNull();
  expect(outlineAt(camera, marks, 2.5)).toBeNull();
});

it("counts feet on the line as on the pitch, and a step off it as outside", () => {
  const square: [number, number][] = [[0.1, 0.9], [0.9, 0.9], [0.9, 0.1], [0.1, 0.1]];
  expect(insidePitch([0.5, 0.5], square, 0)).toBe(true);
  expect(insidePitch([0.92, 0.5], square, 0.05)).toBe(true);
  expect(insidePitch([0.99, 0.5], square, 0.05)).toBe(false);
});

const obs = (track_id: number, time_s: number, x: number, y: number): Observation => ({ track_id, time_s, team_id: null, role: "unknown", image_box: [x - 0.01, y - 0.1, x + 0.01, y] });

it("finds people who spend most of their time off the marked pitch", () => {
  const camera = buildCamera({ times: [0, 1, 2], steps: [shift(0), shift(0)], cuts: [false, false] });
  const marks = [{ time_s: 0, corners: [[0.1, 0.9], [0.9, 0.9], [0.9, 0.4], [0.1, 0.4]] as [number, number][] }];
  const rows = [obs(1, 0, 0.5, 0.6), obs(1, 1, 0.5, 0.6), obs(2, 0, 0.5, 0.2), obs(2, 1, 0.5, 0.2), obs(2, 2, 0.5, 0.6)];
  expect([...offPitchTracks(rows, camera, marks)]).toEqual([2]);
});

it("look-alike suggestions skip people off the pitch; your own labels stay", () => {
  const track = (track_id: number): AppearanceTrack => ({ track_id, group: 0, start_s: 0, end_s: 1, thumb: 0, v: [1, 0], kit: [150, 170, 150] });
  const teams = propagateTeams([track(1), track(2), track(3)], [{ track_id: 1, team: "own", role: "player" }, { track_id: 3, team: "own", role: "player" }], [{ group_id: 0, team: "own", role: "player" }], [], new Set([2, 3]));
  expect(teams.get(2)?.source).toBe("none");
  expect(teams.get(3)?.source).toBe("you");
});

it("stabilise undoes the camera pan, so a point resting on the ground keeps one place", () => {
  const right = [1, 0, -0.1, 0, 1, 0, 0, 0, 1]; // each step the picture shifts left by 0.1
  const camera = buildCamera({ times: [0, 1, 2], steps: [right, right], cuts: [false, false] });
  expect(stabilise(camera, 0, 0.5, 0.5)).toEqual([0, 0.5, 0.5]);
  const later = stabilise(camera, 2, 0.3, 0.5)!;
  expect(later[0]).toBe(0); expect(later[1]).toBeCloseTo(0.5, 6); expect(later[2]).toBeCloseTo(0.5, 6);
});

describe("standingOnPitch", () => {
  const square: [number, number][] = [[0.1, 0.4], [0.9, 0.4], [0.9, 0.9], [0.1, 0.9]];
  const person = (x: number, footY: number) => ({ track_id: 1, time_s: 0, team_id: null, role: "unknown", image_box: [x - 0.01, footY - 0.1, x + 0.01, footY] });
  it("is true clearly inside the lines and false on or just beyond the touchline, where coaches stand (f2ab96a2)", async () => {
    const { standingOnPitch } = await import("./pitch");
    const test = standingOnPitch(() => square);
    expect(test(person(0.5, 0.6))).toBe(true);
    expect(test(person(0.5, 0.395))).toBe(false);
    expect(test(person(0.5, 0.405))).toBe(false);
    expect(test(person(0.5, 0.3))).toBe(false);
  });
  it("is unknown without an outline or a box", async () => {
    const { standingOnPitch } = await import("./pitch");
    expect(standingOnPitch(() => null)(person(0.5, 0.6))).toBeNull();
    expect(standingOnPitch(() => square)({ track_id: 1, time_s: 0, team_id: null, role: "unknown" })).toBeNull();
  });
});
