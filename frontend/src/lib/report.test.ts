import { expect, it } from "vitest";
import type { HudlMatch } from "../api/hudl";
import { matchReport, seasonReport } from "./report";
import { matchGoals } from "./goals";

const t = (id: string, category: string, time_s: number, duration_s = 0) => ({ id, category, time_s, duration_s });
const a: HudlMatch = { id: "a", title: "261101 U11 v Derby County", age_group: "U11", capture_key: "a", moments: [
  t("1", "ASTON VILLA POSSESSION", 0, 60), t("2", "OPPOSITION POSSESSION", 60, 20), t("3", "ASTON VILLA GOAL", 10), t("4", "ASTON VILLA GOAL", 30),
  t("5", "OPPOSITION GOAL", 70), t("6", "ASTON VILLA CHANCE", 9), t("7", "PAT EXAMPLE", 8, 5),
] };
const b: HudlMatch = { id: "b", title: "261108 U11 v Stoke City", age_group: "U11", capture_key: "b", moments: [t("8", "PRESSING", 1)] };

it("puts score, possession, situations and useful outfield stats on a match report", () => {
  const r = matchReport(a, "Aston Villa", {}, "Pat Example");
  expect(r).toMatchObject({ title: "Aston Villa v Derby County", subtitle: "1 November 2026", headline: "2 - 1", possession: { ours: 75, theirs: 25 } });
  expect(r.lines).toContainEqual({ label: "Goal", value: "2 - 1" });
  expect(r.lines.some((l) => l.label === "Possession")).toBe(false);
  expect(r.player?.lines).toContainEqual({ label: "Chances", value: "1" });
});

it("leaves the player out of a match he is not tagged in, and the score out when unknown", () => {
  const r = matchReport(b, "Aston Villa", {}, "Pat Example");
  expect(r.player).toBeNull();
  expect(r.headline).toBeNull();
});

it("adds up a season, counting only scored matches as results", () => {
  const r = seasonReport([a, b], "U11 · 2026-27", "Aston Villa", {}, "Pat Example");
  expect(r.headline).toBe("W1 D0 L0");
  expect(r.lines).toEqual([
    { label: "Matches", value: "2" }, { label: "Goals", value: "2 - 1" }, { label: "Opponents", value: "2" }, { label: "Most played", value: "Derby County (1)" },
  ]);
  expect(r.player?.lines[0]).toEqual({ label: "Games played", value: "1" });
});

// Owner request 2026-11-15: the season report shows games played, won, drawn and lost.
it("counts a season's games played, won, drawn and lost, and those without a score", () => {
  const draw: HudlMatch = { id: "d", source: "veo", title: "261115 U11 v Leek Town", age_group: "U11", capture_key: "d", score: { ours: 1, theirs: 1 }, moments: [] };
  const loss: HudlMatch = { id: "l", source: "veo", title: "261122 U11 v Crewe", age_group: "U11", capture_key: "l", score: { ours: 0, theirs: 3 }, moments: [] };
  expect(seasonReport([a, b, draw, loss], "U11", "Aston Villa", {}, null).record).toEqual({ played: 4, won: 1, drawn: 1, lost: 1, unscored: 1 });
  expect(matchReport(a, "Aston Villa", {}, null).record).toBeNull();
});

// Owner request 2026-11-15: the season report lists the games won and lost.
it("lists a season's games won, drawn and lost, newest first, with the scores", () => {
  const win: HudlMatch = { id: "w", source: "veo", title: "261129 U11 v Leek Town", age_group: "U11", capture_key: "w", score: { ours: 3, theirs: 0 }, moments: [] };
  const loss: HudlMatch = { id: "l", source: "veo", title: "261122 U11 v Crewe", age_group: "U11", capture_key: "l", score: { ours: 0, theirs: 3 }, moments: [] };
  expect(seasonReport([a, b, win, loss], "U11", "Aston Villa", {}, null).results).toEqual({
    won: ["Leek Town 3-0", "Derby County 2-1"], drawn: [], lost: ["Crewe Alexandra 0-3"],
  });
  expect(matchReport(a, "Aston Villa", {}, null).results).toBeNull();
});

// Owner request 2026-11-15: a Veo match report carries Veo's team stats, penalties included.
it("puts Veo's team stats on a Veo match report, shots on goal and penalties included", () => {
  const veo: HudlMatch = { id: "v", source: "veo", title: "261115 RJ vs Northgate", age_group: "U11", capture_key: "v", score: { ours: 1, theirs: 4 }, moments: [] };
  const rows = [{ label: "Goals", own: 1, opponent: 4 }, { label: "Attempts", own: 10, opponent: 28 }, { label: "Corners", own: 5, opponent: 8 }, { label: "Fouls", own: 6, opponent: 3 }];
  const r = matchReport(veo, "Riverside Juniors", {}, null, rows);
  expect(r.lines).toEqual([
    { label: "Goals", value: "1 - 4" }, { label: "Shots on goal", value: "10 - 28" }, { label: "Corners", value: "5 - 8" },
    { label: "Fouls", value: "6 - 3" }, { label: "Penalties", value: "0 - 0" },
  ]);
});

// Spec 270 (owner requests 2026-11-16): confirmed scorers and keepers, season top three.
// Owner request 2026-11-17: who scored is on the match report, a likely scorer marked as such.
it("adds the scorers and confirmed keeper to a match report, a likely scorer marked", () => {
  const confirmed = matchGoals(a, "Aston Villa", { scorers: { "3": "Pat Example", "4": "Pat Example" }, added: [], removed: [],
    keepers: [{ name: "Chris Hands", saves: 2 }], beaten: {} });
  const lines = matchReport(a, "Aston Villa", {}, null, undefined, confirmed).lines;
  expect(lines.slice(-2)).toEqual([{ label: "Scorers", value: "Pat Example 2" }, { label: "Keeper", value: "Chris Hands: 2 saves, 1 conceded" }]);
  const c = { ...b, moments: [t("g", "ASTON VILLA GOAL", 100, 25), t("p", "Ali Test", 110, 15)] };
  expect(matchReport(c, "Aston Villa", {}, null, undefined, matchGoals(c, "Aston Villa")).lines).toContainEqual({ label: "Scorers", value: "Ali Test (likely)" });
});

// Owner request 2026-11-17: top scorers use the likely scorer until one is confirmed.
it("lists a season's top three scorers, saying how many are likely and how many have none", () => {
  const goals = {
    a: matchGoals(a, "Aston Villa", { scorers: { "3": "Pat Example" }, added: [], removed: [], keepers: [], beaten: {} }),
    b: matchGoals(b, "Aston Villa", { scorers: { x: "Ali Test", y: "Pat Example", z: "Zed Other", w: "Bo Demo" },
      added: ["x", "y", "z", "w"].map((id) => ({ id, side: "ours" as const })), removed: [], keepers: [], beaten: {} }),
  };
  const r = seasonReport([a, b], "U11", "Aston Villa", {}, null, goals);
  expect(r.scorers).toEqual({ lines: [
    { label: "1. Pat Example", value: "2 goals" }, { label: "2. Ali Test", value: "1 goal" }, { label: "3. Bo Demo", value: "1 goal" },
  ], note: "1 goal with no scorer" });
  expect(seasonReport([a, b], "U11", "Aston Villa", {}, null).scorers).toBeNull();
  expect(seasonReport([b], "U11", "Aston Villa", {}, null, { b: matchGoals(b, "Aston Villa") }).scorers).toBeNull();
});

it("counts a likely scorer in the season's top scorers and says it is not yet confirmed", () => {
  const goals = { a: matchGoals(a, "Aston Villa", { scorers: { "3": "Pat Example" }, added: [], removed: [], keepers: [], beaten: {} }),
    b: matchGoals({ ...b, moments: [t("g", "ASTON VILLA GOAL", 100, 25), t("p", "Ali Test", 110, 15)] }, "Aston Villa") };
  const r = seasonReport([a, { ...b, moments: [t("g", "ASTON VILLA GOAL", 100, 25), t("p", "Ali Test", 110, 15)] }], "U11", "Aston Villa", {}, null, goals);
  expect(r.scorers?.lines).toEqual([{ label: "1. Ali Test", value: "1 goal" }, { label: "2. Pat Example", value: "1 goal" }]);
  expect(r.scorers?.note).toBe("1 goal by a likely scorer, not yet confirmed · 1 goal with no scorer");
});

// Owner request 2026-11-17: "Plays alongside" is not relevant on the season report.
it("leaves plays alongside off the season report's player lines", () => {
  const withMate = { ...a, moments: [...a.moments!, t("9", "JO TESTER", 8, 5)] };
  const r = seasonReport([withMate], "U11", "Aston Villa", {}, "Pat Example");
  expect(r.player?.lines.map((l) => l.label)).toEqual(["Games played", "Goals scored", "Penalties scored", "Passes", "Shots on target", "Chances", "Crosses", "Defensive 1v1s", "Attacking 1v1s", "Fouls", "Regains"]);
});

// Spec 290: how games went, from matches whose every goal has a time and adds up to the score.
it("adds scored first, clean sheets and how many matches they come from to a season with goals", () => {
  const r = seasonReport([a, b], "U11", "Aston Villa", {}, null, { a: matchGoals(a, "Aston Villa"), b: matchGoals(b, "Aston Villa") });
  expect(r.lines.slice(-3)).toEqual([
    { label: "Scored first", value: "1 (won 1, drew 0, lost 0)" }, { label: "Clean sheets", value: "0" }, { label: "Goal times known", value: "1 of 2 matches" },
  ]);
  expect(r.lines.slice(0, -3)).toEqual(seasonReport([a, b], "U11", "Aston Villa", {}, null).lines);
});

it("replaces player involvement rows with corrected goalkeeper performance in match and season reports", () => {
  const goals = matchGoals(a, "Aston Villa", { scorers: {}, added: [], removed: [], keepers: [{ name: "Pat Example", saves: 3 }], beaten: {} });
  const report = matchReport(a, "Aston Villa", {}, "Pat Example", undefined, goals, "Goalkeeper");
  expect(report.player?.lines).toContainEqual({ label: "Shots saved", value: "3" });
  expect(report.player?.lines).toContainEqual({ label: "Save percentage", value: "75%" });
  expect(report.player?.lines.some(l => /Tagged|During|Passes/.test(l.label))).toBe(false);
  const season = seasonReport([a, { ...a, id: "second" }], "2026/27", "Aston Villa", {}, "Pat Example", { a: goals, second: goals }, "GK");
  expect(season.player?.lines).toContainEqual({ label: "Shots saved", value: "6" });
  expect(season.player?.lines).toContainEqual({ label: "Goals conceded", value: "2" });
  expect(season.player?.lines).toContainEqual({ label: "Games played", value: "2" });
});

it("shows the selected outfield role even when keeper inference names the player", () => {
  const report = matchReport(a, "Aston Villa", {}, "Pat Example", undefined, matchGoals(a, "Aston Villa"), "Forward");
  expect(report.player?.lines.some(l => l.label === "Goals scored")).toBe(true);
  expect(report.player?.lines.some(l => l.label === "Shots saved")).toBe(false);
  expect(report.player?.note).toContain("Sources");
});
