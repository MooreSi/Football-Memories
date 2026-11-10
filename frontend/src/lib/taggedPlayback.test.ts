import { expect, it } from "vitest";
import { advanceTagged, taggedPlaylist } from "./taggedPlayback";

const list = taggedPlaylist([
  { id: "b", category: "Sam", time_s: 50, duration_s: 10 },
  { id: "a", category: "Sam", time_s: 10, duration_s: 5 },
]);

it("orders tagged moments as they happened in the match", () => {
  expect(list.map((m) => m.id)).toEqual(["a", "b"]);
});

it("keeps playing a moment until its tagged range ends, then moves to the next", () => {
  expect(advanceTagged(list, 0, 12)).toBe(0);
  expect(advanceTagged(list, 0, 15)).toBe(1);
  expect(advanceTagged(list, 1, 55)).toBe(1);
});

it("stops after the last tagged moment", () => {
  expect(advanceTagged(list, 1, 60)).toBeNull();
  expect(advanceTagged([], 0, 1)).toBeNull();
});
