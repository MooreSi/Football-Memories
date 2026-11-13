import { expect, it } from "vitest";
import { veoInsights } from "./veoInsights";

// Owner request 2026-11-13: a Veo match shows the stats it can. Synthetic highlights.
const h = (id: string, category: string, time_s: number) => ({ id, category, time_s, duration_s: 20 });
const moments = [
  h("a", "SHOT ON GOAL", 64), h("b", "GOAL", 300), h("c", "SHOT ON GOAL", 310),
  h("d", "GOAL", 1900), h("e", "SHOT ON GOAL", 2000), h("f", "Corner", 2100),
];

it("counts goals and shots, splits them by half and finds the first goal", () => {
  const s = veoInsights(moments, [[0, 1500], [1800, 3300]], 3300);
  expect(s.goals).toBe(2);
  expect(s.shots).toBe(3);
  expect(s.firstGoal).toBe(300);
  expect(s.halves).toEqual([
    { label: "1st half", goals: 1, shots: 2, highlights: 3 },
    { label: "2nd half", goals: 1, shots: 1, highlights: 3 },
  ]);
});

it("buckets highlights into 5-minute spells over the recording, busiest marked", () => {
  const s = veoInsights(moments, [[0, 1500], [1800, 3300]], 3300);
  expect(s.spells).toHaveLength(11);
  expect(s.spells[0]).toEqual({ start: 0, goals: 0, shots: 1, other: 0 });
  expect(s.spells[1]).toEqual({ start: 300, goals: 1, shots: 1, other: 0 });
  expect(s.spells[6]).toEqual({ start: 1800, goals: 1, shots: 1, other: 0 });
  expect(s.spells[7]).toEqual({ start: 2100, goals: 0, shots: 0, other: 1 });
  expect(s.busiest).toBe(300);
});

it("has nothing to show for a match without highlights", () => {
  const s = veoInsights([], [], 1200);
  expect(s.goals).toBe(0);
  expect(s.firstGoal).toBeNull();
  expect(s.busiest).toBeNull();
  expect(s.halves).toEqual([]);
});

it("falls back to the last highlight when Veo gives no duration", () => {
  expect(veoInsights([h("x", "GOAL", 610)], [], undefined).spells).toHaveLength(3);
});
