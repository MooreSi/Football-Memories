import { expect, it } from "vitest";
import { EMPTY_ENTRY, matchGoals } from "./goals";
import { playerStats } from "./playerStats";
const t = (id: string, category: string, time_s: number, duration_s = 10) => ({ id, category, time_s, duration_s });
const moments = [t("p1", "SAM EXAMPLE", 20), t("p2", "Sam Example", 22), t("p3", "Ali Demo", 80),
  t("pass", "ASTON VILLA PASS", 25), t("opp", "OPPOSITION PASS", 25),
  t("edge", "ASTON VILLA PASS", 32), t("far", "ASTON VILLA PASS", 100),
  t("shot", "ASTON VILLA ON TARGET", 21, 0)];
const match = { moments };
it("merges player spellings and counts an event once despite overlapping player tags", () => {
  const rows = playerStats(match, "Aston Villa", matchGoals(match, "Aston Villa"));
  expect(rows.map(r => r.name)).toEqual(["Ali Demo", "Sam Example"]);
  expect(rows[1].events.passes?.map(e => e.id)).toEqual(["pass"]);
  expect(rows[1].events.shots?.map(e => e.id)).toEqual(["shot"]);
  expect(rows[0].events.passes).toEqual([]);
  expect(rows[1].events.chances).toBeNull();
});
it("does not turn possession or player tags into passes", () => {
  const m = { moments: [t("p", "Sam Example", 1), t("pos", "ASTON VILLA POSSESSION", 1)] };
  expect(playerStats(m, "Aston Villa", matchGoals(m, "Aston Villa"))[0].events.passes).toBeNull();
});
it("keeps outfield activity after a keeper spell but excludes events while in goal", () => {
  const m = { moments: [t("p1", "Sam Example", 95, 20), t("p2", "Sam Example", 200),
    t("a", "ASTON VILLA PASS", 105, 0), t("b", "ASTON VILLA PASS", 202, 0)] };
  const goals = { ...matchGoals(m, "Aston Villa", EMPTY_ENTRY),
    spells: [{ name: "Sam Example", from_s: 100, to_s: 150 }] };
  expect(playerStats(m, "Aston Villa", goals)[0].events.passes?.map(e => e.id)).toEqual(["b"]);
});
it("leaves out an owner-named keeper without timed spells", () => {
  const goals = { ...matchGoals(match, "Aston Villa"), keepers: [{ name: "Sam Example", saves: 1, conceded: 0, confirmed: true }] };
  expect(playerStats(match, "Aston Villa", goals).map(r => r.name)).toEqual(["Ali Demo"]);
});
it("cannot invent player rows for Veo or an empty match", () => {
  expect(playerStats({ source: "veo", moments }, null, matchGoals(match, null))).toEqual([]);
  expect(playerStats({}, null, matchGoals({}, null))).toEqual([]);
});
