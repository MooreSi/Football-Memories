import { expect, it } from "vitest";
import type { HudlMoment } from "../api/hudl";
import { matchScore, taggedScore } from "./matchScore";

let n = 0;
const tag = (category: string): HudlMoment => ({ id: String(n++), category, time_s: n, duration_s: 5 });
const tags = (...codes: [string, number][]) => codes.flatMap(([c, k]) => Array.from({ length: k }, () => tag(c)));

it("counts our goals and theirs from the coaches' tags", () => {
  const moments = tags(["ASTON VILLA GOAL", 4], ["OPPOSITION GOAL", 3], ["ASTON VILLA GOAL KICK", 9], ["OPP GOAL KICK", 7], ["ASTON VILLA KICK OFF", 3], ["OPPOSITION KICK OFF", 5]);
  expect(taggedScore(moments, "Aston Villa")).toEqual({ ours: 4, theirs: 3 });
});

it("does not count goal kicks as goals", () => {
  const moments = tags(["AVFC GOAL KICK", 5], ["OPP GOAL KICK", 5], ["ASTON VILLA GOAL", 1], ["OPPOSITION KICK OFF", 1]);
  expect(taggedScore(moments, "Aston Villa")).toEqual({ ours: 1, theirs: 0 });
});

it("finds our side without a club name when it pairs with the opposition's codes", () => {
  const moments = tags(["ASTON VILLA GOAL", 2], ["ASTON VILLA KICK OFF", 2], ["OPPOSITION GOAL", 2], ["OPPOSITION KICK OFF", 2]);
  expect(taggedScore(moments, null)).toEqual({ ours: 2, theirs: 2 });
});

it("gives no score when no goal is tagged: the match may just be untagged", () => {
  expect(taggedScore(tags(["ASTON VILLA KICK OFF", 2], ["OPPOSITION KICK OFF", 2]), "Aston Villa")).toBeNull();
  expect(taggedScore([], "Aston Villa")).toBeNull();
  expect(taggedScore(undefined, "Aston Villa")).toBeNull();
});

it("gives no score for training-game codes with no opposition side", () => {
  expect(taggedScore(tags(["BIB GOAL", 8], ["NON-BIB GOAL", 10]), "Aston Villa")).toBeNull();
});

it("uses the owner's correction over the tags, and says which it is", () => {
  const moments = tags(["ASTON VILLA GOAL", 4], ["OPPOSITION GOAL", 3]);
  expect(matchScore({ id: "m", moments }, "Aston Villa", {})).toEqual({ ours: 4, theirs: 3, source: "tags" });
  expect(matchScore({ id: "m", moments }, "Aston Villa", { m: { ours: 5, theirs: 3 } })).toEqual({ ours: 5, theirs: 3, source: "corrected" });
  expect(matchScore({ id: "x", moments: [] }, "Aston Villa", { x: { ours: 0, theirs: 0 } })).toEqual({ ours: 0, theirs: 0, source: "corrected" });
  expect(matchScore({ id: "x", moments: [] }, "Aston Villa", undefined)).toBeNull();
});

it("counts our goals when only goal codes show which side is ours, rather than reading 0", () => {
  const moments = tags(["ASTON VILLA GOAL", 4], ["OPPOSITION GOAL", 3], ["ASTON VILLA GOAL KICK", 6]);
  expect(taggedScore(moments, null)).toEqual({ ours: 4, theirs: 3 });
});

it("gives no score when two unknown sides both have goal codes", () => {
  const moments = tags(["RED GOAL", 2], ["BLUE GOAL", 1], ["OPPOSITION GOAL", 3]);
  expect(taggedScore(moments, null)).toBeNull();
});
