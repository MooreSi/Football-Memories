import { expect, it } from "vitest";
import { boxesAt, footRing, indexObservations } from "./LabVideo";
import type { Observation } from "./labTypes";

const row = (track_id: number, time_s: number, image_box: number[]): Observation => ({ track_id, time_s, team_id: null, role: "unknown", image_box });

it("moves a box smoothly between two detection samples instead of jumping", () => {
  const index = indexObservations([row(1, 0, [0.1, 0.2, 0.2, 0.4]), row(1, 0.36, [0.3, 0.2, 0.4, 0.4])]);
  const [box] = boxesAt(index, 0.18);
  expect(box.track_id).toBe(1);
  box.image_box!.forEach((n, i) => expect(n).toBeCloseTo([0.2, 0.2, 0.3, 0.4][i]));
});

it("does not slide a person across a long gap in tracking", () => {
  const index = indexObservations([row(1, 0, [0.1, 0.2, 0.2, 0.4]), row(1, 2, [0.6, 0.2, 0.7, 0.4])]);
  expect(boxesAt(index, 0.3)[0].image_box).toEqual([0.1, 0.2, 0.2, 0.4]);
  expect(boxesAt(index, 1)).toEqual([]);
});

it("keeps a person missing from the next sample still until that sample, then drops them", () => {
  const index = indexObservations([row(1, 0, [0.1, 0.2, 0.2, 0.4]), row(2, 0.36, [0.5, 0.2, 0.6, 0.4])]);
  expect(boxesAt(index, 0.2)[0]).toMatchObject({ track_id: 1, image_box: [0.1, 0.2, 0.2, 0.4] });
  expect(boxesAt(index, 0.4).map(b => b.track_id)).toEqual([2]);
});

it("draws the ring flat on the ground under the feet, wider than the body", () => {
  const ring = footRing([0.1, 0.2, 0.2, 0.6], 1000, 500);
  expect(ring.cx).toBeCloseTo(150);
  expect(ring.cy).toBeCloseTo(300);
  expect(ring.rx).toBeGreaterThan(50);
  expect(ring.ry).toBeLessThan(ring.rx / 2);
});
