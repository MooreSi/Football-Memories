import { expect, it } from "vitest";
import { phaseInvolvement } from "./phaseInvolvement";

const t = (id: string, category: string, time_s: number, duration_s = 10) => ({ id, category, time_s, duration_s });

it("counts a player clip when at least half of it is inside the phase", () => {
  const moments = [t("press", "PRESSING", 100, 20)];
  const clips = [t("half", "SAM", 95, 10), t("less", "SAM", 116, 10), t("inside", "SAM", 105, 10)];
  const [pressing] = phaseInvolvement(moments, clips);
  expect(pressing.key).toBe("pressing");
  expect(pressing.clips.map(c => c.id)).toEqual(["half", "inside"]);
  expect(pressing.total).toBe(3);
  expect(pressing.share).toBeCloseTo(2 / 3);
});

it("does not count clips that only touch a phase edge", () => {
  const [pressing] = phaseInvolvement([t("press", "PRESSING", 100, 20)], [t("before", "SAM", 90, 10), t("after", "SAM", 120, 10)]);
  expect(pressing.clips).toEqual([]);
  expect(pressing.share).toBe(0);
});

it("joins overlapping or adjacent phase clips before measuring", () => {
  const moments = [t("a", "QCC", 100, 4), t("b", "QCC", 104, 4)];
  const [qcc] = phaseInvolvement(moments, [t("p", "SAM", 101, 8)]);
  expect(qcc.clips.map(c => c.id)).toEqual(["p"]);
});

it("counts a zero-length clip whose instant is inside the phase", () => {
  const [def] = phaseInvolvement([t("d", "TRANSITION DEF", 50, 10)], [t("in", "SAM", 55, 0), t("out", "SAM", 60, 0)]);
  expect(def.clips.map(c => c.id)).toEqual(["in"]);
});

it("omits phases the match never tagged and keeps a fixed order", () => {
  const moments = [t("q", "QCC", 0, 30), t("tdef", "Transition  def", 0, 30), t("p", "poftb", 0, 30)];
  const rows = phaseInvolvement(moments, [t("x", "SAM", 5, 10)]);
  expect(rows.map(r => r.key)).toEqual(["transitionDef", "poftb", "qcc"]);
  expect(rows.map(r => r.label)).toEqual(["Transition def", "POFTB", "QCC"]);
});

it("returns nothing when the player has no clips", () => {
  expect(phaseInvolvement([t("press", "PRESSING", 0, 20)], [])).toEqual([]);
});
