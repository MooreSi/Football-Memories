import { expect, it } from "vitest";
import { milestones } from "./milestones";
const card = (label: string, value: number | null) => ({ label, value, note: "Recorded stats" });
it("uses valuable keeper totals and positive targets without celebrating goals conceded", () => {
  const result = milestones([card("Games played", 9), card("Goals saved", 43), card("Goals conceded", 12), card("Penalties stopped", null), card("Goals scored", 8)], true);
  expect(result.map(m => m.label)).toEqual(["Games played", "Goals saved", "Goals conceded", "Penalties stopped"]);
  expect(result[0]).toMatchObject({ value: 9, next: 10, remaining: 1 });
  expect(result[1]).toMatchObject({ value: 43, next: 50, remaining: 7 });
  expect(result[2].next).toBeNull();
  expect(result[3].next).toBeNull();
});
it("selects outfield goals, penalties, assists and action milestones", () => {
  const result = milestones([card("Games played", 2), card("Goals scored", 5), card("Penalties scored", 1), card("Assists", 3), card("Goals saved", 12)], false);
  expect(result.map(m => m.label)).toEqual(["Games played", "Goals scored", "Penalties scored", "Assists"]);
  expect(result[1]).toMatchObject({ value: 5, next: 10, remaining: 5 });
  expect(milestones([], false)).toEqual([]);
});
