import { expect, it } from "vitest";
import { teamProfile } from "./matchProfile";

const tags = (...codes: [string, number][]) =>
  codes.flatMap(([category, n]) => Array.from({ length: n }, (_, i) => ({ id: `${category}-${i}`, category, time_s: i, duration_s: 1 })));

it("pairs our codes with the opposition's by situation, one count per side", () => {
  const p = teamProfile(tags(
    ["ASTON VILLA POSSESSION", 5], ["OPPOSITION POSSESSION", 4], ["ASTON VILLA CHANCE", 3], ["OPPOSITION CHANCE", 1],
    ["AVFC GOAL KICK", 2], ["OPP GOAL KICK", 3], ["OPPOSITION MIDFIELD THIRD ENTRY", 2],
  ), "Aston Villa");
  expect(p.axes).toEqual([
    { name: "Possession", ours: 5, theirs: 4 },
    { name: "Goal kick", ours: 2, theirs: 3 },
    { name: "Chance", ours: 3, theirs: 1 },
    { name: "Midfield third entry", ours: 0, theirs: 2 },
  ]);
});

it("keeps codes that belong to neither side, and leaves out player names and ball out of play", () => {
  const p = teamProfile(tags(
    ["ASTON VILLA POSSESSION", 2], ["OPPOSITION POSSESSION", 2], ["CONTESTED POSSESSION", 6], ["PRESSING", 1],
    ["SAM EXAMPLE", 9], ["BALL OUT OF PLAY", 9],
  ), "Aston Villa");
  expect(p.axes.map((a) => a.name)).toEqual(["Possession"]);
  expect(p.neutral).toEqual([{ name: "CONTESTED POSSESSION", count: 6 }, { name: "PRESSING", count: 1 }]);
});

it("finds our prefix without a club name when it pairs with two or more opposition codes", () => {
  const p = teamProfile(tags(
    ["ROVERS POSSESSION", 2], ["OPPOSITION POSSESSION", 1], ["ROVERS CHANCE", 1], ["OPPOSITION CHANCE", 1],
    ["ROVERS THROW", 4], ["CONTESTED POSSESSION", 3],
  ), null);
  expect(p.axes).toEqual([
    { name: "Throw", ours: 4, theirs: 0 },
    { name: "Possession", ours: 2, theirs: 1 },
    { name: "Chance", ours: 1, theirs: 1 },
  ]);
  expect(p.neutral).toEqual([{ name: "CONTESTED POSSESSION", count: 3 }]);
});
