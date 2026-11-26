import { describe, expect, it } from "vitest";
import type { HudlMoment } from "../api/hudl";
import {
  attemptsOverTime, earlier, formDelta, hudlStatEvents, periodSplit, shotSummary, spells, standouts, veoStatEvents,
} from "./matchStats";
import type { TeamRow } from "./veoTeamSplit";

const rows: TeamRow[] = [
  { label: "Goals", own: 2, opponent: 4 }, { label: "Attempts", own: 6, opponent: 15 },
  { label: "Corners", own: 3, opponent: 7 }, { label: "Fouls", own: 12, opponent: 9 },
];

describe("veoStatEvents", () => {
  it("keeps sided events it knows and drops unsided ones", () => {
    expect(veoStatEvents([
      { type: "GOAL", side: "own", time_s: 100, period: 1 }, { type: "SHOT", side: "opponent", time_s: 50, period: 1 },
      { type: "CORNER KICK", side: "own", time_s: 70, period: 1 }, { type: "SHOT", side: null, time_s: 80, period: 1 },
      { type: "THROW IN", side: "own", time_s: 90, period: 1 },
    ])).toEqual([
      { side: "theirs", kind: "attempt", time_s: 50 }, { side: "ours", kind: "corner", time_s: 70 }, { side: "ours", kind: "goal", time_s: 100 },
    ]);
  });
});

describe("veoStatEvents goals", () => {
  // Real Veo data (2026-11-26): each goal is a SHOT then a GOAL about a second later, and
  // Veo's own attempts total counts it once. The pair is one attempt that scored.
  it("folds a goal into the shot just before it from the same side", () => {
    expect(veoStatEvents([
      { type: "SHOT", side: "own", time_s: 1170.1, period: 1 }, { type: "GOAL", side: "own", time_s: 1171.4, period: 1 },
      { type: "SHOT", side: "opponent", time_s: 1200, period: 1 }, { type: "GOAL", side: "own", time_s: 1201, period: 1 },
      { type: "SHOT", side: "own", time_s: 1300, period: 1 }, { type: "GOAL", side: "own", time_s: 1320, period: 1 },
    ])).toEqual([
      { side: "ours", kind: "goal", time_s: 1170.1 }, { side: "theirs", kind: "attempt", time_s: 1200 },
      { side: "ours", kind: "goal", time_s: 1201 }, { side: "ours", kind: "attempt", time_s: 1300 },
      { side: "ours", kind: "goal", time_s: 1320 },
    ]);
  });
});

describe("hudlStatEvents", () => {
  it("places each tag on a side by its code", () => {
    const m = (category: string, time_s: number): HudlMoment => ({ id: `${category}${time_s}`, category, time_s, duration_s: 5 });
    expect(hudlStatEvents([m("ASTON VILLA CHANCE", 40), m("OPPOSITION CHANCE", 20), m("ASTON VILLA GOAL", 41),
      m("OPPOSITION CORNER", 60), m("Sam Example", 10)], "Aston Villa")).toEqual([
      { side: "theirs", kind: "attempt", time_s: 20 }, { side: "ours", kind: "attempt", time_s: 40 },
      { side: "ours", kind: "goal", time_s: 41 }, { side: "theirs", kind: "corner", time_s: 60 },
    ]);
  });
});

describe("shotSummary", () => {
  it("works out conversion and share of attempts from the rows", () => {
    expect(shotSummary(rows)).toEqual({
      ours: { goals: 2, attempts: 6, onTarget: null, conversion: 33 },
      theirs: { goals: 4, attempts: 15, onTarget: null, conversion: 27 }, share: 29,
    });
  });
  it("reads Hudl's chances and on target, and never converts above 100%", () => {
    const s = shotSummary([{ label: "Goals", own: 3, opponent: 0 }, { label: "Chances", own: 2, opponent: 4 }, { label: "On target", own: 2, opponent: 1 }]);
    expect(s?.ours).toEqual({ goals: 3, attempts: 3, onTarget: 2, conversion: 100 });
    expect(s?.theirs.conversion).toBe(0);
  });
  it("is null when there are no attempts or goals at all", () => {
    expect(shotSummary([{ label: "Corners", own: 1, opponent: 2 }])).toBeNull();
  });
});

describe("attemptsOverTime", () => {
  it("counts goals as attempts and steps up at each one", () => {
    const series = attemptsOverTime([
      { side: "ours", kind: "attempt", time_s: 30 }, { side: "ours", kind: "goal", time_s: 90 },
      { side: "theirs", kind: "attempt", time_s: 60 }, { side: "ours", kind: "corner", time_s: 10 },
    ]);
    expect(series.ours).toEqual([{ time_s: 30, total: 1, goal: false }, { time_s: 90, total: 2, goal: true }]);
    expect(series.theirs).toEqual([{ time_s: 60, total: 1, goal: false }]);
  });
});

describe("spells", () => {
  it("buckets attempts and goals into 15-minute spells covering the whole match", () => {
    const out = spells([{ side: "ours", kind: "attempt", time_s: 100 }, { side: "ours", kind: "goal", time_s: 950 },
      { side: "theirs", kind: "attempt", time_s: 1000 }], 2000);
    expect(out).toEqual([
      { start: 0, ours: { attempts: 1, goals: 0 }, theirs: { attempts: 0, goals: 0 } },
      { start: 900, ours: { attempts: 1, goals: 1 }, theirs: { attempts: 1, goals: 0 } },
      { start: 1800, ours: { attempts: 0, goals: 0 }, theirs: { attempts: 0, goals: 0 } },
    ]);
  });
});

describe("periodSplit", () => {
  it("counts each half by the period boundaries", () => {
    const out = periodSplit([{ side: "ours", kind: "goal", time_s: 100 }, { side: "ours", kind: "attempt", time_s: 2000 },
      { side: "theirs", kind: "corner", time_s: 2100 }], [[0, 1500], [1600, 3000]]);
    expect(out).toEqual([
      { label: "1st half", ours: { goals: 1, attempts: 1, corners: 0 }, theirs: { goals: 0, attempts: 0, corners: 0 } },
      { label: "2nd half", ours: { goals: 0, attempts: 1, corners: 0 }, theirs: { goals: 0, attempts: 0, corners: 1 } },
    ]);
  });
  it("is empty without two periods", () => {
    expect(periodSplit([{ side: "ours", kind: "goal", time_s: 100 }], [[0, 1500]])).toEqual([]);
  });
});

describe("formDelta", () => {
  it("compares this match with the average of the earlier ones", () => {
    const before = [[{ label: "Goals", own: 1, opponent: 0 }], [{ label: "Goals", own: 3, opponent: 0 }], [{ label: "Corners", own: 3, opponent: 0 }]];
    expect(formDelta(rows, before, "Goals")).toEqual({ average: 2, pct: 0, matches: 2 });
    expect(formDelta([{ label: "Goals", own: 3, opponent: 0 }], before, "Goals")).toEqual({ average: 2, pct: 50, matches: 2 });
  });
  it("is null with no earlier match or an average of zero", () => {
    expect(formDelta(rows, [], "Goals")).toBeNull();
    expect(formDelta(rows, [[{ label: "Goals", own: 0, opponent: 1 }]], "Goals")).toBeNull();
  });
});

describe("earlier", () => {
  it("keeps the dated matches before this one, newest first, up to the limit", () => {
    const list = [{ title: "260901 A v B" }, { title: "260915 A v C" }, { title: "261001 A v D" }, { title: "Friendly" }, { title: "260801 A v E" }];
    expect(earlier(list, "261001 A v D", x => x.title, 2).map(x => x.title)).toEqual(["260915 A v C", "260901 A v B"]);
    expect(earlier(list, "Friendly", x => x.title)).toEqual([]);
  });
});

describe("standouts", () => {
  it("states the finishing, shot volume, best spell and set pieces from the numbers", () => {
    const events = [
      { side: "ours" as const, kind: "corner" as const, time_s: 1000 }, { side: "ours" as const, kind: "goal" as const, time_s: 1010 },
      { side: "ours" as const, kind: "attempt" as const, time_s: 1100 }, { side: "ours" as const, kind: "attempt" as const, time_s: 1200 },
    ];
    const out = standouts(rows, events, [[0, 1500], [1600, 3000]], 3000);
    expect(out.map(s => s.lead)).toEqual(["Finishing", "Shot volume", "Best spell", "Set pieces"]);
    expect(out[0].parts.join("")).toBe("6 attempts produced 2 goals, a 33% conversion rate (opponent 27%).");
    expect(out[2].parts.join("")).toBe("15:00–30:00 brought 3 attempts and 1 goal.");
    expect(out[3].parts.join("")).toBe("3 corners won; 1 was followed by a goal within 30 seconds.");
  });
  it("says nothing it cannot back with numbers", () => {
    expect(standouts([{ label: "Fouls", own: 1, opponent: 1 }], [], [], 0)).toEqual([]);
  });
});
