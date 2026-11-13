import { expect, it } from "vitest";
import type { HudlMatch, HudlMoment } from "../api/hudl";
import { bySeason, opponentRecords, recordAgainst } from "./headToHead";

let n = 0;
const goals = (ours: number, theirs: number): HudlMoment[] => [
  ...Array.from({ length: ours }, () => ({ id: `g${n++}`, category: "ASTON VILLA GOAL", time_s: n, duration_s: 1 })),
  ...Array.from({ length: theirs }, () => ({ id: `g${n++}`, category: "OPPOSITION GOAL", time_s: n, duration_s: 1 })),
];
const match = (id: string, title: string, moments: HudlMoment[] = []): HudlMatch => ({ id, title, age_group: "U11", capture_key: id, moments });

const lib = [
  match("a", "260901 U11 v Stoke City (H)", goals(3, 1)),
  match("b", "251001 U10 v Stoke (A)", goals(1, 1)),
  match("c", "250901 U10 v Stoke City", goals(0, 2)),
  match("d", "260915 U11 v Stoke City"),
  match("e", "260920 U11 v Rovers", goals(2, 0)),
];

it("adds up results, goals and the last meeting against one club", () => {
  const r = recordAgainst(lib, "Aston Villa", {}, "Stoke City");
  expect(r).toMatchObject({ opponent: "Stoke City", played: 4, scored: 3, won: 1, drawn: 1, lost: 1, goalsFor: 4, goalsAgainst: 4 });
  expect(r?.last).toMatchObject({ id: "d", date: "2026-09-15", score: null });
  expect(r?.meetings.map((m) => m.id)).toEqual(["d", "a", "b", "c"]);
});

it("does not count an unscored match as a draw, and uses the owner's correction", () => {
  const r = recordAgainst(lib, "Aston Villa", { d: { ours: 0, theirs: 5 } }, "Stoke City");
  expect(r).toMatchObject({ scored: 4, lost: 2, goalsAgainst: 9 });
});

it("lists every opponent, most played first", () => {
  expect(opponentRecords(lib, "Aston Villa", {}).map((r) => [r.opponent, r.played])).toEqual([["Stoke City", 4], ["Rovers", 1]]);
  expect(recordAgainst(lib, "Aston Villa", {}, "Nobody FC")).toBeNull();
});

it("splits a record by season, newest first, with every game in it", () => {
  const seasons = [
    { ...match("s1", "260901 U11 v Stoke City", goals(2, 0)), season_label: "2026/27" },
    { ...match("s2", "260915 U11 v Stoke City", goals(1, 1)), season_label: "2026/27" },
    { ...match("s3", "251001 U10 v Stoke City", goals(0, 3)), season_label: "2025/26" },
    { ...match("s4", "251008 U10 v Stoke City"), season_label: "2025/26" },
  ];
  const r = recordAgainst(seasons, "Aston Villa", {}, "Stoke City")!;
  expect(bySeason(r).map(({ meetings, ...s }) => ({ ...s, games: meetings.map((m) => m.id) }))).toEqual([
    { season: "2026/27", played: 2, scored: 2, won: 1, drawn: 1, lost: 0, goalsFor: 3, goalsAgainst: 1, games: ["s2", "s1"] },
    { season: "2025/26", played: 2, scored: 1, won: 0, drawn: 0, lost: 1, goalsFor: 0, goalsAgainst: 3, games: ["s4", "s3"] },
  ]);
});
