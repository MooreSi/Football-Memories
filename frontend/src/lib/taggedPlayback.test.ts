import { expect, it } from "vitest";
import { advanceTagged, needsSeek, taggedPlaylist, timeLeft } from "./taggedPlayback";

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

it("continues without seeking when the next moment starts where playback already is", () => {
  expect(needsSeek({ id: "n", category: "Sam", time_s: 15.5, duration_s: 5 }, 15)).toBe(false);
  expect(needsSeek({ id: "n", category: "Sam", time_s: 13, duration_s: 5 }, 15)).toBe(false);
  expect(needsSeek({ id: "n", category: "Sam", time_s: 50, duration_s: 5 }, 15)).toBe(true);
  expect(needsSeek({ id: "n", category: "Sam", time_s: 5, duration_s: 2 }, 15)).toBe(true);
});

it("describes time left in plain words", () => {
  expect(timeLeft(null)).toBe("estimating time left");
  expect(timeLeft(8)).toBe("about 8 sec left");
  expect(timeLeft(150)).toBe("about 3 min left");
});
