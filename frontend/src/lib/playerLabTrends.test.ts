import { expect, it } from "vitest";
import type { HudlMatch } from "../api/hudl";
import { EMPTY_BOOK, labRows } from "./playerLab";
import { mainSquad, recentSummary, sharedComparison, teammatesBySharedMatches } from "./playerLabTrends";

// Owner request 2026-11-27: "fix Performance Over Time, Recent Five Matches, Compare on
// fair terms". Made-up names.
const sam = "Sam Example", ali = "Ali Demo";
const tag = (id: string, category: string, time_s: number, actions?: string[]) => ({ id, category, time_s, duration_s: 10, ...(actions ? { actions } : {}) });
const match = (id: string, day: number, age: string, moments: ReturnType<typeof tag>[]): HudlMatch =>
  ({ id, title: `2611${String(day).padStart(2, "0")} ${age} v Rovers`, age_group: age, capture_key: id, moments });

it("picks the squad the player appears in most that season, not the first alphabetically", () => {
  const rows = labRows([
    match("a", 1, "U10", [tag("s", sam, 10)]),
    match("b", 2, "U11", [tag("s", sam, 10)]), match("c", 3, "U11", [tag("s", sam, 10)]),
  ], sam, null, null, EMPTY_BOOK);
  expect(mainSquad(rows, rows[0].season)).toBe("U11");
  expect(mainSquad([], "2026/27")).toBe("");
});

it("summarises a selection too short for the ten-match comparison", () => {
  const undated: HudlMatch = { id: "u", title: "U11 v Rovers", age_group: "U11", capture_key: "u", moments: Array.from({ length: 9 }, (_, i) => tag(`u${i}`, sam, 10 + i * 20, ["passes"])) };
  const rows = labRows([undated, ...[1, 2, 3].map(d => match(`m${d}`, d, "U11", Array.from({ length: d }, (_, i) => tag(`p${i}`, sam, 10 + i * 20, ["passes"]))))], sam, null, null, EMPTY_BOOK);
  expect(rows).toHaveLength(4); // the undated match is a row, but not part of the dated summary
  expect(recentSummary(rows, "passes", false)).toEqual({ latest: 3, average: 2, best: 3, matches: 3 });
  expect(recentSummary(rows, "assists", false)).toBeNull();
});

const shared = [1, 2, 3].map(d => match(`m${d}`, d, "U11", [tag("s", sam, 10, ["passes", "passes"].slice(0, 1)), tag("s2", sam, 30, d > 1 ? ["passes"] : undefined), tag("a", ali, 60, ["passes"])]));

it("compares teammates per shared match when no lab minutes are confirmed, never on team-tag overlap", () => {
  const own = labRows(shared, sam, null, null, EMPTY_BOOK), other = labRows(shared, ali, null, null, EMPTY_BOOK);
  expect(sharedComparison(own, other, "passes")).toEqual({ ours: 5 / 3, theirs: 1, matches: 3, basis: "match", percent: false });
  // Both players' tags overlap the same team tackle: involvement for both, attribution for neither.
  const tackles = shared.map(m => ({ ...m, moments: [...m.moments!, tag("s3", sam, 58), tag("t", "ASTON VILLA TACKLE", 62)] }));
  const [samT, aliT] = [sam, ali].map(n => labRows(tackles, n, null, "Aston Villa", EMPTY_BOOK));
  expect(samT[0].stats.tackles).toMatchObject({ value: 1, source: "overlap" });
  expect(aliT[0].stats.tackles).toMatchObject({ value: 1, source: "overlap" });
  expect(sharedComparison(samT, aliT, "tackles")).toBeNull();
  expect(sharedComparison(own.slice(0, 2), other, "passes")).toBeNull();
});

it("lists teammates by shared appearances, most first, leaving the player out", () => {
  const lib = [...shared, match("x", 9, "U11", [tag("s", sam, 10), tag("z", "Zed Other", 40)])];
  expect(teammatesBySharedMatches(labRows(lib, sam, null, null, EMPTY_BOOK), [sam, ali, "Zed Other", "Nobody Here"], sam))
    .toEqual([{ name: ali, shared: 3 }, { name: "Zed Other", shared: 1 }]);
});
