import { describe, expect, it } from "vitest";
import type { HudlMatch, HudlMoment } from "../api/hudl";
import { involvement, journey, momentum, partnerships, phases, possession, possessionTotals, sameCode } from "./insights";

let n = 0;
const m = (category: string, time_s: number, duration_s = 0): HudlMoment => ({ id: `m${n++}`, category, time_s, duration_s });
const CLUB = "Aston Villa";

describe("sameCode", () => {
  it("matches spellings that differ only in case and spacing", () => {
    expect(sameCode("Chris Demo", "CHRIS  DEMO")).toBe(true);
    expect(sameCode("Chris Demo", "CHRIS DEM")).toBe(false);
  });
});

describe("possession", () => {
  it("is time on the ball from tag lengths, not the number of tags", () => {
    const p = possession([
      m("ASTON VILLA POSSESSION", 0, 60), m("ASTON VILLA POSSESSION", 100, 30),
      ...Array.from({ length: 10 }, (_, i) => m("OPPOSITION POSSESSION", 200 + i * 5, 3)),
      m("CONTESTED POSSESSION", 400, 20), m("OPPOSITION CHANCE", 210, 1),
    ], CLUB);
    expect(p).toEqual({ ours: 90, theirs: 30, contested: 20, oursPct: 75, theirsPct: 25 });
  });

  it("is null when nothing says who had the ball", () => {
    expect(possession([m("ASTON VILLA CHANCE", 1, 1), m("CONTESTED POSSESSION", 4, 9)], CLUB)).toBeNull();
  });

  it("adds up across matches, each read with its own codes", () => {
    const a = [m("ASTON VILLA POSSESSION", 0, 30), m("OPPOSITION POSSESSION", 40, 10)];
    const b = [m("ASTON VILLA POSSESSION", 0, 10), m("OPPOSITION POSSESSION", 40, 50)];
    expect(possessionTotals([a, b, [m("PRESSING", 1, 1)]], CLUB)).toEqual({ ours: 40, theirs: 60, contested: 0, oursPct: 40, theirsPct: 60, matches: 2 });
  });
});

describe("momentum", () => {
  const tags = [
    m("ASTON VILLA ATTACKING THIRD ENTRY", 5), m("ASTON VILLA PENALTY AREA ENTRY", 20), m("ASTON VILLA CHANCE", 30),
    m("OPPOSITION CHANCE", 70), m("OPPOSITION GOAL", 75), m("END HALF", 125),
    m("ASTON VILLA GOAL", 130), m("SAM EXAMPLE", 131), m("ASTON VILLA POSSESSION", 0, 200),
  ];
  it("weights each minute's attacking moments per side and marks goals", () => {
    const t = momentum(tags, CLUB);
    expect(t.minutes.slice(0, 3)).toEqual([
      { minute: 0, ours: 6, theirs: 0, oursAt: 5, theirsAt: null, goals: { ours: 0, theirs: 0 } },
      { minute: 1, ours: 0, theirs: 8, oursAt: null, theirsAt: 70, goals: { ours: 0, theirs: 1 } },
      { minute: 2, ours: 5, theirs: 0, oursAt: 130, theirsAt: null, goals: { ours: 1, theirs: 0 } },
    ]);
    expect(t.halves).toEqual([125]);
  });

  it("is empty when no attacking codes are tagged", () => {
    expect(momentum([m("SAM EXAMPLE", 3), m("ASTON VILLA POSSESSION", 0, 90)], CLUB).minutes).toEqual([]);
  });
});

describe("involvement", () => {
  const tags = [
    m("PAT EXAMPLE", 10, 5), m("PAT EXAMPLE", 100, 4),
    m("ASTON VILLA CHANCE", 12, 1), m("ASTON VILLA GOAL", 13, 1), m("OPPOSITION CHANCE", 101, 1),
    m("ASTON VILLA CORNER", 102, 1), m("DEF IN FINAL 3RD", 99, 3), m("PRESSING", 100, 2),
    m("ASTON VILLA CHANCE", 300, 1), m("OPPOSITION CHANCE", 500, 1), m("ASTON VILLA POSSESSION", 0, 600),
  ];
  it("counts the situations his moments overlap, grouped, and only those", () => {
    const v = involvement(tags, "Pat Example", CLUB);
    expect(v.moments).toBe(2);
    expect(v.headline).toEqual({ ourChances: 1, ourGoals: 1, theirChances: 1, theirGoals: 0 });
    expect(v.groups).toEqual({ attacking: 2, defending: 3, setPieces: 1 });
    expect(v.items.find((i) => i.code === "ASTON VILLA CHANCE")).toMatchObject({ count: 1, group: "attacking", side: "ours" });
    expect(v.items.some((i) => /POSSESSION/.test(i.code))).toBe(false);
  });
});

const match = (id: string, title: string, season: string, moments: HudlMoment[]): HudlMatch =>
  ({ id, title, age_group: season === "2025-26" ? "U10" : "U11", capture_key: id, season_label: season, moments });

describe("partnerships", () => {
  it("ranks teammates by moments shared with him, with matches together", () => {
    const lib = [
      match("a", "250901 Aston Villa v Rovers", "2025-26", [m("PAT EXAMPLE", 10, 5), m("ALEX SAMPLE", 12, 2), m("JO TESTER", 12, 2), m("JO TESTER", 90, 2)]),
      match("b", "250908 Aston Villa v City", "2025-26", [m("PAT EXAMPLE", 50, 5), m("ALEX SAMPLE", 51, 1), m("JO TESTER", 200, 2)]),
      match("c", "250915 Aston Villa v Town", "2025-26", [m("ALEX SAMPLE", 51, 1)]),
    ];
    expect(partnerships(lib, "Pat Example")).toEqual([
      { name: "ALEX SAMPLE", shared: 2, matches: 2 },
      { name: "JO TESTER", shared: 1, matches: 2 },
    ]);
  });
});

describe("journey", () => {
  it("summarises each season: moments per match and attacking/defending share", () => {
    const lib = [
      match("a", "250901 Aston Villa v Rovers", "2025-26", [m("PAT EXAMPLE", 10, 5), m("PAT EXAMPLE", 40, 5), m("ASTON VILLA CHANCE", 11, 1), m("OPPOSITION CHANCE", 41, 1)]),
      match("b", "260901 Aston Villa v City", "2026-27", [m("PAT EXAMPLE", 10, 5), m("PAT EXAMPLE", 30, 5), m("PAT EXAMPLE", 60, 5), m("PAT EXAMPLE", 90, 1), m("ASTON VILLA PENALTY AREA ENTRY", 11, 1)]),
      match("c", "260908 Aston Villa v Town", "2026-27", [m("PRESSING", 1, 1)]),
    ];
    expect(journey(lib, "Pat Example", CLUB)).toEqual([
      { season: "2025-26", age: "U10", matches: 1, moments: 2, perMatch: 2, attackingPct: 50, defendingPct: 50 },
      { season: "2026-27", age: "U11", matches: 1, moments: 4, perMatch: 4, attackingPct: 25, defendingPct: 0 },
    ]);
  });
});

it("names a season by the age group most of its matches belong to", () => {
  const one = (id: string, age: string) => ({ ...match(id, `26090${id.length} v X`, "2026-27", [m("PAT EXAMPLE", 1, 1)]), age_group: age });
  expect(journey([one("a", "U10"), one("b", "U11"), one("c", "U11")], "Pat Example", CLUB)[0].age).toBe("U11");
});

describe("phases", () => {
  const poss = m("ASTON VILLA POSSESSION", 100, 30);
  const tags = [
    poss, m("ASTON VILLA MIDFIELD THIRD ENTRY", 104), m("ASTON VILLA ATTACKING THIRD ENTRY", 110),
    m("ASTON VILLA PENALTY AREA ENTRY", 118), m("ASTON VILLA CHANCE", 122),
    m("ASTON VILLA POSSESSION", 200, 30), m("ASTON VILLA ATTACKING THIRD ENTRY", 205),
    m("OPPOSITION POSSESSION", 300, 30), m("OPPOSITION CHANCE", 310),
    m("ASTON VILLA POSSESSION", 400, 20), m("ASTON VILLA GOAL", 415), m("PAT EXAMPLE", 401, 2),
  ];
  it("turns each of our possessions that ends in a chance or goal into one clip", () => {
    const p = phases(tags, CLUB);
    expect(p.map((x) => [x.moment.id, x.outcome])).toEqual([[poss.id, "chance"], [tags[9].id, "goal"]]);
    expect(p[0].steps).toEqual(["Midfield third entry", "Attacking third entry", "Penalty area entry", "Chance"]);
  });
  it("ends the steps at the goal, even when the possession tag runs on past it", () => {
    const long = m("ASTON VILLA POSSESSION", 0, 60);
    const p = phases([long, m("ASTON VILLA CHANCE", 5), m("ASTON VILLA GOAL", 10), m("ASTON VILLA MIDFIELD THIRD ENTRY", 30)], CLUB);
    expect(p[0].steps).toEqual(["Chance", "Goal"]);
  });
  it("keeps only the phases a player was in when one is named", () => {
    expect(phases(tags, CLUB, "PAT EXAMPLE").map((x) => x.outcome)).toEqual(["goal"]);
  });
});
