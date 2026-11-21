import { expect, it } from "vitest";
import type { HudlMoment } from "../api/hudl";
import { estimatePlayerMinutes } from "./estimatedMinutes";
const tag = (id: string, category: string, time_s: number, duration_s = 0): HudlMoment => ({ id, category, time_s, duration_s });
it("uses involvement spans per period, not clip lengths or the halftime gap", () => {
  expect(estimatePlayerMinutes([
    tag("a", "Sam Example", 60), tag("b", "Sam Example", 1260),
    tag("half", "END HALF", 1500), tag("c", "Sam Example", 2100), tag("d", "Sam Example", 3300),
  ], "sam example", [])).toBe(40);
});
it("subtracts overlapping keeper spells only once", () => {
  expect(estimatePlayerMinutes([tag("a", "Sam Example", 0), tag("b", "Sam Example", 1800)], "Sam Example", [
    { name: "Sam Example", from_s: 600, to_s: 1200 }, { name: "Sam Example", from_s: 900, to_s: 1500 },
  ])).toBe(15);
});
it("does not turn one isolated clip into playing time", () => {
  expect(estimatePlayerMinutes([tag("a", "Sam Example", 100, 15)], "Sam Example", [])).toBeNull();
});
it("ignores another player's tags and invalid timing", () => {
  expect(estimatePlayerMinutes([tag("a", "Other Example", 100), tag("b", "Sam Example", NaN)], "Sam Example", [])).toBeNull();
});
it("uses estimated touch times rather than padded clip endpoints", () => {
  expect(estimatePlayerMinutes([tag("a", "Sam Example", 0, 15), tag("b", "Sam Example", 600, 15)], "Sam Example", [])).toBe(10);
});
