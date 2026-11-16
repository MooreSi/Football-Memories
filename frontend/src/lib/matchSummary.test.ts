import { describe, expect, it } from "vitest";
import type { MatchGoals } from "./goals";
import { keeperLine, summaryCells } from "./matchSummary";

// Spec 320: the summary strip under a match's video. Made-up names only.
const row = (label: string, own: number, opponent: number) => ({ label, own, opponent });

describe("summary cells", () => {
  it("picks possession, chances, on target and corners from a Hudl match's rows, in that order", () => {
    const rows = [row("Possession %", 46, 54), row("Goals", 13, 2), row("Chances", 34, 19), row("On target", 17, 12),
      row("Crosses", 16, 11), row("Corners", 13, 7), row("Fouls", 7, 12)];
    expect(summaryCells(rows)).toEqual([
      { label: "Possession", value: "46–54%" }, { label: "Chances", value: "34–19" },
      { label: "On target", value: "17–12" }, { label: "Corners", value: "13–7" },
    ]);
  });

  it("uses Veo's attempts where there are no chances", () => {
    expect(summaryCells([row("Goals", 2, 1), row("Attempts", 7, 3), row("Corners", 1, 4), row("Fouls", 2, 2)]))
      .toEqual([{ label: "Attempts", value: "7–3" }, { label: "Corners", value: "1–4" }]);
  });

  it("shows nothing when the match has no team stats", () => {
    expect(summaryCells([])).toEqual([]);
    expect(summaryCells([row("Goals", 1, 0), row("Fouls", 3, 1)])).toEqual([]);
  });
});

const goals = (over: Partial<MatchGoals>): MatchGoals => ({ goals: [], keepers: [], players: [], spells: [], ...over });
const keeper = (name: string | null, confirmed = false) => ({ name, saves: null, conceded: 0, confirmed });

describe("keeper line", () => {
  it("names the likely keepers in order with the time of the change", () => {
    const line = keeperLine(goals({
      keepers: [keeper("Sam Example"), keeper("Alex Demo")],
      spells: [{ name: "Sam Example", from_s: 0, to_s: 2454 }, { name: "Alex Demo", from_s: 2454, to_s: null }],
    }));
    expect(line).toEqual({ names: "Sam Example then Alex Demo", change: 2454, likely: true });
  });

  it("names one likely keeper with no change", () => {
    expect(keeperLine(goals({ keepers: [keeper("Sam Example")], spells: [{ name: "Sam Example", from_s: 0, to_s: null }] })))
      .toEqual({ names: "Sam Example", change: null, likely: true });
  });

  it("uses the keepers the owner saved over the guessed spells", () => {
    const line = keeperLine(goals({
      keepers: [keeper("Jo Back", true)],
      spells: [{ name: "Sam Example", from_s: 0, to_s: 100 }, { name: "Alex Demo", from_s: 100, to_s: null }],
    }));
    expect(line).toEqual({ names: "Jo Back", change: null, likely: false });
  });

  it("says nothing when no keeper is known", () => {
    expect(keeperLine(goals({ keepers: [keeper(null)] }))).toBeNull();
    expect(keeperLine(goals({}))).toBeNull();
  });
});
