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
  it("lists each side's goals with the players tagged at them, likeliest scorer first", () => {
    const { goals } = matchGoals(hudl, CLUB);
    expect(goals.map((g) => [g.id, g.side, g.time_s])).toEqual([["g1", "ours", 100], ["g2", "theirs", 500]]);
    expect(goals[0]).toMatchObject({ candidates: ["Alex Demo", "Sam Example"], scorer: "Alex Demo", confirmed: false });
    expect(goals[1]).toMatchObject({ scorer: null });
  });

  // Owner report 2026-11-16: the most-overlap player was often the build-up, not the
  // finisher. A goal tag's ball-in moment is 5 s before its end, a player tag's touch
  // about a third of its length (at most 5 s) before its end.
  it("picks the player whose touch is nearest the ball going in, not the longest overlap", () => {
    const { goals } = matchGoals({ moments: [
      t("g", "ASTON VILLA GOAL", 1000, 25), // ball in at 1020
      t("a", "Ben Builder", 1001, 18), // 18 s overlap (the most), touch at 1014
      t("b", "Late Finisher", 1012, 10), // 10 s overlap, touch at about 1018.7
      t("c", "After Whistle", 1018, 15), // touch at 1028, after the goal
    ] }, CLUB);
    expect(goals[0]).toMatchObject({ candidates: ["Late Finisher", "Ben Builder", "After Whistle"], scorer: "Late Finisher" });
  });

  it("falls back to the most overlap when no touch is near the ball going in", () => {
    const { goals } = matchGoals({ moments: [
      t("g", "ASTON VILLA GOAL", 1000, 25),
      t("a", "Early One", 990, 15), // touch at 1000, 20 s before
      t("b", "Earlier Two", 985, 17), // touch at about 996.3, 2 s overlap
    ] }, CLUB);
    expect(goals[0]).toMatchObject({ candidates: ["Early One", "Earlier Two"], scorer: "Early One" });
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

  // Owner request 2026-11-16: most matches have no GOAL KEEPER code, but every one has
  // our goal kicks, and the keeper's tag is running at each, started up to 12 s before
  // (measured on the cache). Others: tagged too early, and the player receiving it after.
  const kick = (id: string, at: number, keeper: string, others: string[] = []) => [
    t(`gk-${id}`, "ASTON VILLA GOAL KICK", at, 20),
    t(`k-${id}`, keeper, at - 4, 15),
    ...others.flatMap((o, i) => [t(`o-${id}-${i}`, o, at - 14, 15), t(`r-${id}-${i}`, o, at + 2, 15)]),
  ];
  // A keeper change at half-time: Sam in goal for the first half, Jo for the second.
  const swap = { moments: [
    ...kick("1", 300, "Sam Gloves", ["Ben Stone"]), ...kick("2", 900, "Sam Gloves"), ...kick("3", 1500, "Sam Gloves", ["Ben Stone"]),
    ...kick("4", 1800, "Ben Stone"), // one odd kick is not a change
    ...kick("5", 2100, "Sam Gloves"),
    ...kick("6", 3300, "Jo Palms", ["Ben Stone"]), ...kick("7", 3900, "Jo Palms"), ...kick("8", 4500, "Jo Palms"),
    t("c1", "OPPOSITION GOAL", 1000, 25), t("c2", "OPPOSITION GOAL", 4000, 25), t("c3", "OPPOSITION GOAL", 4200, 25),
    t("s1", "OPPOSITION ON TARGET", 600, 25), t("s2", "OPPOSITION ON TARGET", 3600, 25), t("s3", "OPPOSITION ON TARGET", 4600, 25),
    t("s4", "OPPOSITION ON TARGET", 4000, 25), // the goal at 4000, not a save
  ] };

  it("finds the keeper from the player tagged at our goal kicks, with no goalkeeper code", () => {
    const { keepers } = matchGoals({ moments: [...kick("1", 300, "Sam Gloves", ["Ben Stone"]), ...kick("2", 900, "Sam Gloves", ["Ben Stone"]), ...kick("3", 1500, "Sam Gloves")] }, CLUB);
    expect(keepers).toEqual([{ name: "Sam Gloves", saves: null, conceded: 0, confirmed: false }]);
  });

  it("counts a keeper tag started well before the kick, but not the player who receives it", () => {
    const { keepers } = matchGoals({ moments: [
      ...[300, 900, 1500].flatMap((at, i) => [t(`gk${i}`, "ASTON VILLA GOAL KICK", at, 20), t(`k${i}`, "Sam Gloves", at - 9, 20), t(`r${i}`, "Ben Stone", at + 0.5, 15)]),
    ] }, CLUB);
    expect(keepers.map((k) => k.name)).toEqual(["Sam Gloves"]);
  });

  it("puts a keeper change at the END HALF tag between the two spells", () => {
    expect(matchGoals({ moments: [...swap.moments, t("h1", "END HALF", 2500, 1), t("h0", "END HALF", 1200, 1)] }, CLUB).spells)
      .toEqual([{ name: "Sam Gloves", from_s: 0, to_s: 2500 }, { name: "Jo Palms", from_s: 2500, to_s: null }]);
  });

  it("follows a keeper change, giving each keeper the saves and goals in their spell", () => {
    const { keepers, goals, spells } = matchGoals(swap, CLUB);
    expect(keepers).toEqual([
      { name: "Sam Gloves", saves: 1, conceded: 1, confirmed: false },
      { name: "Jo Palms", saves: 2, conceded: 2, confirmed: false },
    ]);
    expect(goals.filter((g) => g.side === "theirs").map((g) => g.keeper)).toEqual(["Sam Gloves", "Jo Palms", "Jo Palms"]);
    // With no END HALF tag, the change goes halfway between the two spells' nearest kicks.
    expect(spells).toEqual([{ name: "Sam Gloves", from_s: 0, to_s: 2700 }, { name: "Jo Palms", from_s: 2700, to_s: null }]);
  });

  it("puts a conceded goal on the confirmed keeper who was in goal then, unless the owner named one", () => {
    const entry: GoalsEntry = { scorers: {}, added: [], removed: [], beaten: { c3: "Sam Gloves" },
      keepers: [{ name: "Sam Gloves", saves: 2 }, { name: "Jo Palms", saves: 4 }] };
    const { keepers, goals } = matchGoals(swap, CLUB, entry);
    expect(goals.filter((g) => g.side === "theirs").map((g) => g.keeper)).toEqual(["Sam Gloves", "Jo Palms", "Sam Gloves"]);
    expect(keepers.map((k) => [k.name, k.conceded])).toEqual([["Sam Gloves", 2], ["Jo Palms", 1]]);
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

describe("report lines and top scorers (likely scorers counted, keepers confirmed only)", () => {
  const confirmed = matchGoals(hudl, CLUB, { scorers: { g1: "Sam Example" }, added: [{ id: "a1", side: "ours" }], removed: [],
    keepers: [{ name: "Chris Hands", saves: 3 }], beaten: {} });
  const likely = matchGoals(hudl, CLUB);

  // Owner request 2026-11-17: the match report shows who scored, the likely scorer marked.
  it("names the scorers on a match report, likely ones marked, and confirmed keepers only", () => {
    expect(matchGoalLines(confirmed)).toEqual([
      { label: "Scorers", value: "Sam Example, 1 unknown" },
      { label: "Keeper", value: "Chris Hands: 3 saves, 1 conceded" },
    ]);
    expect(matchGoalLines(likely)).toEqual([{ label: "Scorers", value: "Alex Demo (likely)" }]);
    expect(matchGoalLines(matchGoals({ moments: [t("g", "ASTON VILLA GOAL", 100, 25)] }, CLUB))).toEqual([]);
  });

  // Owner request 2026-11-17: the season's top scorers count the likely scorer until one is confirmed.
  it("ranks a season's scorers, confirmed or likely, top three, ties by name, own goals left out", () => {
    const own = matchGoals({ moments: [] }, CLUB, { scorers: { a: "own goal", b: "Pat Demo", c: "Ali Test", d: "Zed Other", e: "SAM EXAMPLE" },
      added: ["a", "b", "c", "d", "e"].map((id) => ({ id, side: "ours" as const })), removed: [], keepers: [], beaten: {} });
    expect(topScorers([confirmed, likely, own])).toEqual({
      top: [{ name: "Sam Example", goals: 2 }, { name: "Alex Demo", goals: 1 }, { name: "Ali Test", goals: 1 }],
      likely: 1, // likely's g1, Alex Demo
      unnamed: 1, // confirmed's a1: added by the owner with no scorer
    });
  });
});

// Spec 400: invented names and timings, exercising rotating keepers and false overlaps.
describe("keeper attribution across periods", () => {
  const kick = (id: string, at: number, name: string, lead = 4, duration = 15) => [
    t(`kick-${id}`, "ASTON VILLA GOAL KICK", at, 20), t(`player-${id}`, name, at - lead, duration),
  ];
  it("finds returning keepers in four periods instead of suppressing short spells", () => {
    const moments = [
      ...kick("a", 100, "Sam Gloves"), t("receiver-a", "Ali Demo", 99.7, 20),
      ...kick("b", 200, "Sam Gloves"), t("receiver-b", "Ali Demo", 199.7, 20),
      ...kick("c", 300, "Sam Gloves", 13, 25),
      t("h1", "END HALF", 400),
      ...kick("d", 500, "Jo Palms"), ...kick("e", 600, "Jo Palms"),
      t("h2", "END HALF", 800),
      ...kick("f", 900, "Sam Gloves"), ...kick("g", 1000, "Sam Gloves"),
      t("h3", "END HALF", 1200),
      ...kick("h", 1300, "Jo Palms"), ...kick("i", 1400, "Jo Palms", 19, 31),
      ...[350, 750, 1150, 1550].map((at, i) => t(`goal-${i}`, "OPPOSITION GOAL", at, 25)),
    ];
    const result = matchGoals({ moments }, CLUB);
    expect(result.spells).toEqual([
      { name: "Sam Gloves", from_s: 0, to_s: 400 }, { name: "Jo Palms", from_s: 400, to_s: 800 },
      { name: "Sam Gloves", from_s: 800, to_s: 1200 }, { name: "Jo Palms", from_s: 1200, to_s: null },
    ]);
    expect(result.goals.map(g => g.keeper)).toEqual(["Sam Gloves", "Jo Palms", "Sam Gloves", "Jo Palms"]);
    expect(result.keepers.map(k => [k.name, k.conceded])).toEqual([["Sam Gloves", 2], ["Jo Palms", 2]]);
  });
  it("does not choose alphabetically when kick evidence ties", () => {
    const result = matchGoals({ moments: [
      ...kick("a", 100, "Sam Gloves"), ...kick("b", 200, "Sam Gloves"),
      ...kick("c", 300, "Jo Palms"), ...kick("d", 400, "Jo Palms"),
      t("goal", "OPPOSITION GOAL", 150, 25),
    ] }, CLUB);
    expect(result.spells).toEqual([]);
    expect(result.goals[0].keeper).toBeNull();
  });
  it("does not extend a known keeper into a period with no evidence", () => {
    const result = matchGoals({ moments: [
      ...kick("a", 100, "Sam Gloves"), ...kick("b", 200, "Sam Gloves"),
      t("half", "END HALF", 400), t("goal", "OPPOSITION GOAL", 500, 25),
    ] }, CLUB);
    expect(result.spells).toEqual([{ name: "Sam Gloves", from_s: 0, to_s: 400 }]);
    expect(result.goals[0].keeper).toBeNull();
    expect(result.keepers.find(k => k.name === "Sam Gloves")?.conceded).toBe(0);
  });
  it("requires repeated goal-kick evidence", () => {
    expect(matchGoals({ moments: kick("a", 100, "Sam Gloves") }, CLUB).spells).toEqual([]);
  });
  // Owner report 2026-11-27 (a U11 match, four quarters, three of our goal kicks): the
  // keeper led the kicks in quarters 1 and 3, one kick each, and was named before spec 400.
  it("accepts a keeper who leads one kick in each of two periods", () => {
    const result = matchGoals({ moments: [
      ...kick("a", 100, "Sam Gloves"), t("near-a", "Ali Demo", 98, 15),
      t("h1", "END HALF", 400),
      t("h2", "END HALF", 800),
      ...kick("b", 900, "Sam Gloves"), t("near-b", "Ali Demo", 898, 15),
      t("h3", "END HALF", 1200),
      ...kick("c", 1300, "Ben Stone", 2),
      ...[150, 500, 1350].map((at, i) => t(`goal-${i}`, "OPPOSITION GOAL", at, 25)),
    ] }, CLUB);
    expect(result.spells).toEqual([
      { name: "Sam Gloves", from_s: 0, to_s: 400 }, { name: "Sam Gloves", from_s: 800, to_s: 1200 },
    ]);
    // The quarter with no kick and the quarter led once by someone else stay unknown.
    expect(result.goals.map(g => g.keeper)).toEqual(["Sam Gloves", null, null]);
  });
  // Owner report 2026-11-27, same match: two keepers alternating by quarter, the second
  // never tagged at one of our goal kicks but tagged at every shot on target they faced.
  // Measured on the cached tags (197 matches whose kicks name the keeper): the keeper's
  // tag starts 11-14 s into the opposition's on-target tag; alone in that window it is
  // the keeper 284 times, another player 26.
  const shot = (id: string, at: number, keeper: string, others: [string, number][] = []) => [
    t(`shot-${id}`, "OPPOSITION ON TARGET", at, 25), t(`saver-${id}`, keeper, at + 12.5, 15),
    ...others.map(([name, lead], i) => t(`def-${id}-${i}`, name, at + lead, 15)),
  ];
  it("finds a keeper from the opposition's shots on target, alternating by quarter", () => {
    const result = matchGoals({ moments: [
      ...kick("a", 100, "Sam Gloves"), ...shot("a", 500, "Sam Gloves", [["Ali Demo", 8]]),
      t("h1", "END HALF", 1200),
      ...shot("b", 1500, "Jo Palms", [["Ali Demo", 5]]), ...shot("c", 1800, "Jo Palms", [["Ben Stone", -10]]),
      t("h2", "END HALF", 2400),
      ...kick("c", 2600, "Sam Gloves"), ...shot("d", 3000, "Sam Gloves"),
      t("h3", "END HALF", 3600),
      ...kick("d", 3800, "Ben Stone", 2), t("late-d", "Jo Palms", 3783, 29),
      ...shot("e", 4000, "Jo Palms", [["Ben Stone", 10]]), ...shot("f", 4300, "Jo Palms", [["Ali Demo", -3]]),
      ...[1500, 1800, 4300].map((at, i) => t(`goal-${i}`, "OPPOSITION GOAL", at, 25)),
    ] }, CLUB);
    expect(result.spells.map(s => [s.name, s.from_s, s.to_s])).toEqual([
      ["Sam Gloves", 0, 1200], ["Jo Palms", 1200, 2400], ["Sam Gloves", 2400, 3600], ["Jo Palms", 3600, null],
    ]);
    expect(result.goals.map(g => g.keeper)).toEqual(["Jo Palms", "Jo Palms", "Jo Palms"]);
  });
  // Owner 2026-11-27: who is in goal also shows in every other tag. A keeper's tags sit in
  // the opposition's attacks and never in ours; an outfield player's in both.
  const defending = (id: string, at: number, keeper: string) => [
    t(`opp-entry-${id}`, "OPPOSITION PENALTY AREA ENTRY", at, 20), t(`opp-chance-${id}`, "OPPOSITION CHANCE", at, 20),
    t(`k-${id}`, keeper, at + 5, 10),
  ];
  const attacking = (id: string, at: number, player: string) => [
    t(`our-entry-${id}`, "ASTON VILLA ATTACKING THIRD ENTRY", at, 20), t(`our-cross-${id}`, "ASTON VILLA CROSS", at, 20),
    t(`o-${id}`, player, at + 5, 10),
  ];
  it("finds the keeper in a period with no kicks or shots from where their tags fall", () => {
    const result = matchGoals({ moments: [
      ...kick("a", 100, "Sam Gloves"), ...kick("b", 300, "Sam Gloves"),
      t("h1", "END HALF", 1200),
      ...defending("1", 1300, "Jo Palms"), ...defending("2", 1600, "Jo Palms"),
      ...attacking("1", 1400, "Sam Gloves"), ...attacking("2", 1700, "Ali Demo"), ...defending("3", 1900, "Ali Demo"),
      t("goal", "OPPOSITION GOAL", 2000, 25),
    ] }, CLUB);
    expect(result.spells).toEqual([{ name: "Sam Gloves", from_s: 0, to_s: 1200 }, { name: "Jo Palms", from_s: 1200, to_s: null }]);
    expect(result.goals[0].keeper).toBe("Jo Palms");
  });
  it("leaves a period blank when no player's tags clearly read as the keeper's", () => {
    const result = matchGoals({ moments: [
      ...defending("1", 100, "Jo Palms"), ...attacking("1", 200, "Jo Palms"),
      ...defending("2", 300, "Ali Demo"), ...attacking("2", 400, "Ali Demo"),
    ] }, CLUB);
    expect(result.spells).toEqual([]);
  });
  it("takes no shot evidence when two players' tags start in the keeper's window", () => {
    const result = matchGoals({ moments: [
      ...shot("a", 100, "Sam Gloves", [["Ali Demo", 13]]), ...shot("b", 400, "Sam Gloves", [["Ali Demo", 12]]),
    ] }, CLUB);
    expect(result.spells).toEqual([]);
  });
  it("does not accept a teammate who is near two kicks but never the likeliest", () => {
    const result = matchGoals({ moments: [
      ...kick("a", 100, "Sam Gloves"), t("near-a", "Ali Demo", 98, 15),
      t("h1", "END HALF", 400),
      ...kick("b", 500, "Jo Palms"), t("near-b", "Ali Demo", 498, 15),
    ] }, CLUB);
    expect(result.spells).toEqual([]);
  });
  it("uses the ball-in time when the goal clip starts before a keeper change", () => {
    const result = matchGoals({ moments: [
      ...kick("a", 100, "Sam Gloves"), ...kick("b", 200, "Sam Gloves"),
      t("half", "END HALF", 400),
      ...kick("c", 500, "Jo Palms"), ...kick("d", 600, "Jo Palms"),
      t("goal", "OPPOSITION GOAL", 390, 25),
    ] }, CLUB);
    expect(result.goals[0].keeper).toBe("Jo Palms");
  });
  it("keeps multiple confirmed keepers unassigned without timing, while honoring a named goal", () => {
    const source = { moments: [t("a", "OPPOSITION GOAL", 100, 25), t("b", "OPPOSITION GOAL", 200, 25)] };
    const entry: GoalsEntry = { scorers: {}, added: [], removed: [],
      keepers: [{ name: "Sam Gloves", saves: null }, { name: "Jo Palms", saves: null }], beaten: { b: "Jo Palms" } };
    const result = matchGoals(source, CLUB, entry);
    expect(result.goals.map(g => g.keeper)).toEqual([null, "Jo Palms"]);
    expect(result.keepers.map(k => k.conceded)).toEqual([0, 1, 1]);
  });
});

it("combines timing evidence across kicks when a different teammate is nearer on one kick", () => {
  const result = matchGoals({ moments: [
    t("k1", "ASTON VILLA GOAL KICK", 100, 20),
    t("p1", "Sam Gloves", 95.4, 15), t("q1", "Ali Demo", 96.1, 16), t("r1", "Ben Stone", 99.6, 20),
    t("k2", "ASTON VILLA GOAL KICK", 200, 20),
    t("p2", "Sam Gloves", 187, 25), t("r2", "Ben Stone", 199.7, 20),
    t("k3", "ASTON VILLA GOAL KICK", 300, 20),
    t("p3", "Sam Gloves", 296, 15), t("r3", "Ben Stone", 292, 31),
  ] }, CLUB);
  expect(result.keepers.map(k => k.name)).toEqual(["Sam Gloves"]);
});

it("keeps a clipped final shot with its keeper when END HALF closes the recording", () => {
  const result = matchGoals({ moments: [
    t("k1", "ASTON VILLA GOAL KICK", 100, 20), t("p1", "Sam Gloves", 96, 15),
    t("k2", "ASTON VILLA GOAL KICK", 200, 20), t("p2", "Sam Gloves", 196, 15),
    t("shot", "OPPOSITION ON TARGET", 390, 16), t("end", "END HALF", 400, 6),
  ] }, CLUB);
  expect(result.keepers).toEqual([{ name: "Sam Gloves", saves: 1, conceded: 0, confirmed: false }]);
});

it("retains saves in an unknown period without assigning them to the known keeper", () => {
  const result = matchGoals({ moments: [
    t("k1", "ASTON VILLA GOAL KICK", 100, 20), t("p1", "Sam Gloves", 96, 15),
    t("k2", "ASTON VILLA GOAL KICK", 200, 20), t("p2", "Sam Gloves", 196, 15),
    t("end", "END HALF", 400), t("shot", "OPPOSITION ON TARGET", 500, 25),
  ] }, CLUB);
  expect(result.keepers).toEqual([
    { name: "Sam Gloves", saves: 0, conceded: 0, confirmed: false },
    { name: null, saves: 1, conceded: 0, confirmed: false },
  ]);
});

it("does not treat a duplicated kick record as repeated evidence", () => {
  const kick = t("kick", "ASTON VILLA GOAL KICK", 100, 20);
  expect(matchGoals({ moments: [kick, { ...kick }, t("p", "Sam Gloves", 96, 15)] }, CLUB).spells).toEqual([]);
});
