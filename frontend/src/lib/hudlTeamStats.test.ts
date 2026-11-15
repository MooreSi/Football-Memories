import { expect, it } from "vitest";
import { hudlTeamStats } from "./hudlTeamStats";

// Owner request 2026-11-15: team stats for a Hudl match, as on a Veo match, from the
// tags that name a side ("ASTON VILLA CORNER", "OPPOSITION CORNER", "AVFC GOAL KICK").
// Synthetic data only.
const m = (category: string, time_s: number, duration_s = 1) => ({ id: `${category}-${time_s}`, category, time_s, duration_s });

it("counts each side's tags into named rows, with possession first", () => {
  const moments = [
    m("RIVERSIDE FC POSSESSION", 0, 60), m("OPPOSITION POSSESSION", 60, 20),
    m("RIVERSIDE FC GOAL", 10), m("OPPOSITION GOAL", 70),
    m("RIVERSIDE FC CORNER", 20), m("RIVERSIDE FC CORNER", 30), m("OPPOSITION CORNER", 80),
    m("RFC GOAL KICK", 40), m("OPP GOAL KICK", 90), m("SAM EXAMPLE", 95), m("BALL OUT OF PLAY", 99),
  ];
  expect(hudlTeamStats(moments, "Riverside")).toEqual([
    { label: "Possession %", own: 75, opponent: 25 },
    { label: "Goals", own: 1, opponent: 1 },
    { label: "Corners", own: 2, opponent: 1 },
    { label: "Goal kicks", own: 1, opponent: 1 },
  ]);
});

it("has no rows when no tag names a side", () => {
  expect(hudlTeamStats([m("SAM EXAMPLE", 1)], "Riverside")).toEqual([]);
});
