import { expect, it } from "vitest";
import type { HudlMatch, HudlMoment } from "../api/hudl";
import { opponentRecords, recordAgainst } from "./headToHead";

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
