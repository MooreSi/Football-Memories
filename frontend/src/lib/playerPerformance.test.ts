import { expect, it } from "vitest";
import type { HudlMatch } from "../api/hudl";
import { EMPTY_ENTRY, matchGoals } from "./goals";
import { playerPerformance } from "./playerPerformance";
const name = "Sam Example";
const match = (id: string, actions?: string[]): HudlMatch => ({ id, title: "261101 U11 v Town", age_group: "U11", capture_key: id,
  moments: [{ id: "p", category: name, time_s: 10, duration_s: 10, actions }] });
const options = { matches: [] as HudlMatch[], name, position: "Goalkeeper", club: "Aston Villa" };

it("provides keeper totals, weighted ratios, appearances and best saves, excluding unrelated matches", () => {
  const a = match("a"), b = match("b"), other = { ...match("other"), moments: [] };
  const entries = { a: { ...EMPTY_ENTRY, keepers: [{ name, saves: 9 }], added: [{ id: "g", side: "theirs" as const }] },
    b: { ...EMPTY_ENTRY, keepers: [{ name, saves: 1 }], added: [1, 2, 3].map(i => ({ id: String(i), side: "theirs" as const })) } };
  const result = playerPerformance({ ...options, matches: [a, b, other], entries });
  expect(result.keeper).toBe(true);
  const value = (label: string) => result.cards.find(c => c.label === label)?.value;
  expect(value("Games played")).toBe(2);
  expect(value("Goals saved")).toBe(10);
  expect(value("Goals conceded")).toBe(4);
  expect(value("Shots faced")).toBe(14);
  expect(value("Save percentage")).toBe(71);
  expect(value("Best saves in a match")).toBe(9);
  expect(value("Saves per game")).toBe(5);
  expect(value("Goals conceded per game")).toBe(2);
  expect(result.cards.some(c => c.label === "Passes")).toBe(false);
});

it("counts only explicit named penalty outcomes, not generic penalties, misses or teammates", () => {
  const a = match("a", ["penaltiesSaved", "penaltiesScored"]);
  a.moments!.push({ id: "other", category: "Alex Sample", time_s: 10, duration_s: 10, actions: ["penaltiesSaved", "penaltiesScored"] },
    { id: "pen", category: "ASTON VILLA PENALTY", time_s: 10, duration_s: 10 });
  expect(playerPerformance({ ...options, matches: [a] }).cards.find(c => c.label === "Penalties stopped")?.value).toBe(1);
  expect(playerPerformance({ ...options, position: "Forward", matches: [a] }).cards.find(c => c.label === "Penalties scored")?.value).toBe(1);
  expect(playerPerformance({ ...options, matches: [match("b")] }).cards.find(c => c.label === "Penalties stopped")?.value).toBeNull();
});

it("counts clean sheets only for a known matching score and a sole named keeper", () => {
  const a = match("a"), b = match("b"), c = match("c");
  const entries = { a: { ...EMPTY_ENTRY, keepers: [{ name, saves: 2 }] },
    b: { ...EMPTY_ENTRY, keepers: [{ name, saves: 2 }, { name: "Alex Sample", saves: 1 }] },
    c: { ...EMPTY_ENTRY, keepers: [{ name, saves: 2 }] } };
  const result = playerPerformance({ ...options, matches: [a, b, c], entries, corrections: { a: { ours: 0, theirs: 0 }, b: { ours: 0, theirs: 0 } } });
  expect(result.cards.find(c => c.label === "Clean sheets")).toMatchObject({ value: 1 });
  expect(result.cards.find(c => c.label === "Clean sheets")?.note).toContain("1 match");
  expect(playerPerformance({ ...options, matches: [c], entries }).cards.find(c => c.label === "Clean sheets")?.value).toBeNull();
});

it("reuses supplied report corrections and respects the explicit outfield role", () => {
  const a = match("a", ["passes"]);
  const goals = { a: matchGoals(a, "Aston Villa", { ...EMPTY_ENTRY, keepers: [{ name, saves: 7 }] }) };
  const result = playerPerformance({ ...options, matches: [a], goals });
  expect(result.cards.find(c => c.label === "Goals saved")?.value).toBe(7);
  expect(playerPerformance({ ...options, position: "Forward", matches: [a], goals }).keeper).toBe(false);
});

it("does not award an individual penalty goal from a team penalty-scored overlap", () => {
  const a = match("a");
  a.moments!.push({ id: "team-pen", category: "ASTON VILLA PENALTY SCORED", time_s: 10, duration_s: 10 });
  expect(playerPerformance({ ...options, matches: [a], position: "Forward" }).cards.find(c => c.label === "Penalties scored")?.value).toBeNull();
});
