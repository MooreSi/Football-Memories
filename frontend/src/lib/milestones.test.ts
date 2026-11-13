import { expect, it } from "vitest";
import { milestones } from "./milestones";

// Owner request 2026-11-13: a milestones timeline on the player hub. Synthetic matches.
type M = { match_id: number; match_date: string; opponent: string; moments: number; href?: string; age?: string; goals?: number };
const m = (n: number, date: string, moments: number, extra: Partial<M> = {}): M => ({ match_id: n, match_date: date, opponent: `Team ${n}`, moments, ...extra });

it("marks the first match, match counts and moment counts in date order", () => {
  const list = Array.from({ length: 12 }, (_, i) => m(i + 1, `2026-09-${10 + i}`, 10));
  const found = milestones(list, "Sam Example");
  expect(found.map((x) => x.title)).toEqual(["First match", "100 moments", "10 matches"]);
  expect(found[0]).toMatchObject({ kind: "first", date: "2026-09-10", detail: "vs Team 1", href: "/matches/1" });
  expect(found[1]).toMatchObject({ kind: "moments", date: "2026-09-19", detail: "vs Team 10" });
});

it("marks a new season, a new age group and the first team goal with the player on the pitch", () => {
  const found = milestones([
    m(1, "2026-05-01", 5, { age: "U10" }),
    m(2, "2026-08-30", 5, { age: "U10" }),
    m(3, "2026-09-06", 5, { age: "U11", goals: 2, href: "/hudl/c?player=Sam" }),
  ], "Sam Example");
  expect(found.map((x) => x.title)).toEqual(["First match", "First 2026/27 match", "First U11 match", "First team goal with Sam on"]);
  expect(found[3]).toMatchObject({ kind: "goal", href: "/hudl/c?player=Sam", detail: "vs Team 3" });
});

it("marks a new personal best only once the record means something (after five matches)", () => {
  const found = milestones([m(1, "2026-01-01", 5), m(2, "2026-01-02", 6), m(3, "2026-01-03", 7), m(4, "2026-01-04", 3), m(5, "2026-01-05", 4), m(6, "2026-01-06", 9), m(7, "2026-01-07", 8), m(8, "2026-01-08", 12)], "Sam");
  expect(found.filter((x) => x.kind === "best").map((x) => [x.title, x.date])).toEqual([
    ["New best: 9 moments", "2026-01-06"], ["New best: 12 moments", "2026-01-08"],
  ]);
});

it("returns nothing without dated matches and never uses a pronoun", () => {
  expect(milestones([], "Sam")).toEqual([]);
  const found = milestones([m(1, "2026-09-06", 120, { age: "U11", goals: 1 })], "Sam Example");
  for (const x of found) expect(`${x.title} ${x.detail}`).not.toMatch(/\b(he|she|his|her|him)\b/i);
});

it("marks an age group only the first time it is played, even when switching back and forth", () => {
  const found = milestones([
    m(1, "2026-09-01", 1, { age: "U11" }), m(2, "2026-09-08", 1, { age: "U10" }),
    m(3, "2026-09-15", 1, { age: "U11" }), m(4, "2026-09-22", 1, { age: "U10" }), m(5, "2026-09-29", 1, { age: "U12" }),
  ], "Sam");
  expect(found.filter((x) => x.kind === "age").map((x) => x.title)).toEqual(["First U10 match", "First U12 match"]);
});
