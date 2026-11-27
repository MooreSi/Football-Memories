import { expect, it } from "vitest";
import { EMPTY_ENTRY, matchGoals } from "./goals";
import { playerHeadlines, playerStandouts } from "./playerStandouts";
import { playerStats } from "./playerStats";

// Owner request 2026-11-27: Player stats in the Match stats style. Made-up names.
const t = (id: string, category: string, time_s: number, actions?: string[]) => ({ id, category, time_s, duration_s: 10, ...(actions ? { actions } : {}) });
const match = { id: "m", moments: [
  t("s1", "Sam Example", 20, ["passes", "regains"]), t("s2", "Sam Example", 40, ["passes"]), t("s3", "Sam Example", 80),
  t("a1", "Ali Demo", 60, ["passes", "tackles"]),
  t("pass", "ASTON VILLA PASS", 62),
] };
const players = playerStats(match, "Aston Villa", matchGoals(match, "Aston Villa", EMPTY_ENTRY));

it("names who was tagged most and who led each directly recorded action", () => {
  const notes = playerStandouts(players);
  expect(notes.map(n => n.lead)).toEqual(["Most involved", "Passes", "Tackles", "Regains"]);
  expect(notes[0].parts).toEqual(["", "Sam Example", " was tagged in ", "3 moments", "."]);
  expect(notes[1].parts).toEqual(["", "Sam Example", " recorded ", "2", ", the most in the match."]);
});

it("says nothing for a tie or for team-tag overlap alone", () => {
  const tie = { id: "tie", moments: [t("s", "Sam Example", 20, ["passes"]), t("a", "Ali Demo", 60, ["passes"]), t("o", "ASTON VILLA OFFSIDE", 21)] };
  const notes = playerStandouts(playerStats(tie, "Aston Villa", matchGoals(tie, "Aston Villa", EMPTY_ENTRY)));
  expect(notes.map(n => n.lead)).toEqual([]);
});

it("sums the headline figures from the players", () => {
  expect(playerHeadlines(players)).toEqual({ players: 2, moments: 4, goals: 0, top: { name: "Sam Example", moments: 3 } });
  expect(playerHeadlines([])).toEqual({ players: 0, moments: 0, goals: 0, top: null });
});
