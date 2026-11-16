import { describe, expect, it } from "vitest";
import type { HudlMoment } from "../api/hudl";
import { matchGoals, matchGoalLines, topScorers, type GoalsEntry } from "./goals";

// Spec 270: goals and keepers per match. Made-up names only.
const t = (id: string, category: string, time_s: number, duration_s = 0): HudlMoment => ({ id, category, time_s, duration_s });
const CLUB = "Aston Villa";
const hudl = { moments: [
  t("g1", "ASTON VILLA GOAL", 100, 25),
  t("p1", "Sam Example", 95, 15), // 10 s overlap
  t("p2", "Alex Demo", 110, 15), // 15 s overlap: most, so likely scorer
  t("g2", "OPPOSITION GOAL", 500, 25),
  t("p3", "Jo Back", 505, 15),
  t("gk", "ASTON VILLA GOAL KICK", 300, 10), // not a goal
  t("c1", "ASTON VILLA CHANCE", 100, 25),
  t("k1", "1 GOAL KEEPER", 700, 15), t("p4", "Chris Hands", 700, 15),
  t("k2", "1 GOAL KEEPER", 900, 15), t("p5", "Chris Hands", 905, 15), t("p6", "Jo Back", 905, 15),
  t("o1", "OPPOSITION ON TARGET", 498, 20), // the goal itself, not a save
  t("o2", "OPPOSITION ON TARGET", 800, 10), t("o3", "OPPOSITION ON TARGET", 850, 10),
  t("a1", "ASTON VILLA ON TARGET", 98, 20),
  t("x1", "Analyst Clip", 100, 25), // not a player
] };
const veo = { source: "veo" as const, team_data: { stats: {}, events: [
  { type: "GOAL", side: "own" as const, time_s: 61, period: 1 },
  { type: "SHOT", side: "own" as const, time_s: 70, period: 1 },
  { type: "GOAL", side: "opponent" as const, time_s: 1200.5, period: 2 },
  { type: "GOAL", side: null, time_s: 1300, period: 2 },
] } };

describe("goals from Hudl tags", () => {
  it("lists each side's goals with the players tagged at them, most overlap first", () => {
    const { goals } = matchGoals(hudl, CLUB);
    expect(goals.map((g) => [g.id, g.side, g.time_s])).toEqual([["g1", "ours", 100], ["g2", "theirs", 500]]);
    expect(goals[0]).toMatchObject({ candidates: ["Alex Demo", "Sam Example"], scorer: "Alex Demo", confirmed: false });
    expect(goals[1]).toMatchObject({ scorer: null });
  });

  it("guesses the keeper from the goalkeeper codes and saves from shots on target not scored", () => {
    const { keepers, goals } = matchGoals(hudl, CLUB);
    expect(keepers).toEqual([{ name: "Chris Hands", saves: 2, conceded: 1, confirmed: false }]);
    expect(goals[1].keeper).toBe("Chris Hands");
  });

  it("has no likely keeper or saves when nothing points to one", () => {
    const { keepers } = matchGoals({ moments: [t("g2", "OPPOSITION GOAL", 10, 5)] }, CLUB);
    expect(keepers).toEqual([{ name: null, saves: null, conceded: 1, confirmed: false }]);
    expect(matchGoals({ moments: [t("p", "Sam Example", 1, 5)] }, CLUB).keepers).toEqual([]);
  });

  it("lists the match's players for picking a scorer, without situation codes", () => {
    expect(matchGoals(hudl, CLUB).players).toEqual(["Alex Demo", "Chris Hands", "Jo Back", "Sam Example"]);
  });
});

describe("goals from Veo", () => {
  it("takes own and opponent GOAL events, with ids like its team moments and no names", () => {
    const { goals, keepers } = matchGoals(veo, null);
    expect(goals.map((g) => [g.id, g.side, g.time_s, g.scorer])).toEqual([
      ["t-own-goal-61000", "ours", 61, null], ["t-opponent-goal-1200500", "theirs", 1200.5, null],
    ]);
    expect(keepers).toEqual([{ name: null, saves: null, conceded: 1, confirmed: false }]);
  });
});

describe("the owner's entry", () => {
  const entry: GoalsEntry = {
    scorers: { g1: "Sam Example", a1: "Pat Demo" }, added: [{ id: "a1", side: "ours" }, { id: "a2", side: "theirs" }], removed: [],
    keepers: [{ name: "Chris Hands", saves: 3 }, { name: "Jo Back", saves: 1 }], beaten: { a2: "Jo Back" },
  };

  it("replaces the likely scorer and keeper, and adds the goals the tags missed", () => {
    const { goals, keepers } = matchGoals(hudl, CLUB, entry);
    expect(goals.map((g) => [g.id, g.side, g.scorer, g.confirmed, g.added])).toEqual([
      ["g1", "ours", "Sam Example", true, false], ["g2", "theirs", null, false, false],
      ["a1", "ours", "Pat Demo", true, true], ["a2", "theirs", null, false, true],
    ]);
    expect(keepers).toEqual([
      { name: "Chris Hands", saves: 3, conceded: 1, confirmed: true },
      { name: "Jo Back", saves: 1, conceded: 1, confirmed: true },
    ]);
  });

  it("drops a tagged goal the owner removed", () => {
    const { goals } = matchGoals(hudl, CLUB, { ...entry, removed: ["g1"], added: [] });
    expect(goals.map((g) => g.id)).toEqual(["g2"]);
  });
});

describe("report lines and top scorers (confirmed only)", () => {
  const confirmed = matchGoals(hudl, CLUB, { scorers: { g1: "Sam Example" }, added: [{ id: "a1", side: "ours" }], removed: [],
    keepers: [{ name: "Chris Hands", saves: 3 }], beaten: {} });
  const likely = matchGoals(hudl, CLUB);

  it("names confirmed scorers and keepers on a match report, never a guess", () => {
    expect(matchGoalLines(confirmed)).toEqual([
      { label: "Scorers", value: "Sam Example" },
      { label: "Keeper", value: "Chris Hands: 3 saves, 1 conceded" },
    ]);
    expect(matchGoalLines(likely)).toEqual([]);
  });

  it("ranks a season's confirmed scorers, top three, ties by name, own goals left out", () => {
    const own = matchGoals({ moments: [] }, CLUB, { scorers: { a: "own goal", b: "Pat Demo", c: "Ali Test", d: "Zed Other", e: "SAM EXAMPLE" },
      added: ["a", "b", "c", "d", "e"].map((id) => ({ id, side: "ours" as const })), removed: [], keepers: [], beaten: {} });
    expect(topScorers([confirmed, likely, own])).toEqual({
      top: [{ name: "Sam Example", goals: 2 }, { name: "Ali Test", goals: 1 }, { name: "Pat Demo", goals: 1 }],
      unconfirmed: 2, // likely's g1 and confirmed's a1
    });
  });
});
