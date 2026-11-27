import { expect, it } from "vitest";
import { isShirtCandidates, setShirtNumber, shirtNumbers } from "./shirtNumbers";
import type { Review } from "./labTypes";

it("your number beats the automatic reading, and 'no number' hides a wrong reading", () => {
  const read = [{ track_id: 2, number: 14 }, { track_id: 3, number: 6 }, { track_id: 4, number: 9 }];
  const yours = [{ track_id: 3, number: 7 }, { track_id: 4, number: null }];
  const numbers = shirtNumbers(read, yours);
  expect(numbers.get(2)).toEqual({ number: 14, source: "read" });
  expect(numbers.get(3)).toEqual({ number: 7, source: "you" });
  expect(numbers.has(4)).toBe(false);
});

it("only real shirt numbers from the worker are accepted", () => {
  expect(isShirtCandidates([{ track_id: 2, number: 14, votes: 3 }])).toBe(true);
  expect(isShirtCandidates([{ track_id: 2, number: 100 }])).toBe(false);
  expect(isShirtCandidates([{ track_id: 2, number: "14" }])).toBe(false);
  expect(isShirtCandidates({})).toBe(false);
});

it("sets, clears and removes your correction for one person only", () => {
  const review = { shirt_numbers: [{ track_id: 9, number: 4 }] } as unknown as Review;
  expect(setShirtNumber(review, 2, 7).shirt_numbers).toEqual([{ track_id: 9, number: 4 }, { track_id: 2, number: 7 }]);
  expect(setShirtNumber(review, 9, null).shirt_numbers).toEqual([{ track_id: 9, number: null }]);
  expect(setShirtNumber(review, 9, undefined).shirt_numbers).toEqual([]);
});
