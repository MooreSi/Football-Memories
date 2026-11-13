import { expect, it } from "vitest";
import { REPORT_WIDTH, fitTitle, layoutRows, textWidth, wrapText } from "./reportLayout";

const inner = REPORT_WIDTH - 180;

it("keeps short label and value on one line", () => {
  const [row] = layoutRows([{ label: "Matches", value: "24" }], 0);
  expect(row).toMatchObject({ stacked: false, value: ["24"] });
});

it("puts a long value under its label, wrapped inside the card, never over the label", () => {
  const value = "Chris Demo, Alex Sample, Jo Tester, Pat Example, Sam Example";
  const [row, next] = layoutRows([{ label: "Plays alongside", value }, { label: "Matches", value: "2" }], 100);
  expect(row.stacked).toBe(true);
  expect(row.value.join(" ")).toBe(value);
  for (const line of row.value) expect(textWidth(line, 36)).toBeLessThanOrEqual(inner);
  expect(next.y).toBeGreaterThan(row.y + row.value.length * 40);
});

it("wraps at word breaks", () => {
  expect(wrapText("aaa bbb ccc", 36, textWidth("aaa bbb", 36) + 1)).toEqual(["aaa bbb", "ccc"]);
});

it("shrinks a long title to fit, down to a floor", () => {
  expect(fitTitle("Short v Name")).toBe(60);
  const size = fitTitle("Wolverhampton Wanderers v Brighton & Hove Albion");
  expect(size).toBeLessThan(60);
  expect(textWidth("Wolverhampton Wanderers v Brighton & Hove Albion", size)).toBeLessThanOrEqual(inner);
});
