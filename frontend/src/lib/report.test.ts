import { expect, it } from "vitest";
import type { HudlMatch } from "../api/hudl";
import { matchReport, seasonReport } from "./report";

const t = (id: string, category: string, time_s: number, duration_s = 0) => ({ id, category, time_s, duration_s });
const a: HudlMatch = { id: "a", title: "261101 U11 v Derby County", age_group: "U11", capture_key: "a", moments: [
  t("1", "ASTON VILLA POSSESSION", 0, 60), t("2", "OPPOSITION POSSESSION", 60, 20), t("3", "ASTON VILLA GOAL", 10), t("4", "ASTON VILLA GOAL", 30),
  t("5", "OPPOSITION GOAL", 70), t("6", "ASTON VILLA CHANCE", 9), t("7", "PAT EXAMPLE", 8, 5),
] };
const b: HudlMatch = { id: "b", title: "261108 U11 v Stoke City", age_group: "U11", capture_key: "b", moments: [t("8", "PRESSING", 1)] };

it("puts score, possession, situations and the player's involvement on a match report", () => {
  const r = matchReport(a, "Aston Villa", {}, "Pat Example");
  expect(r).toMatchObject({ title: "Aston Villa v Derby County", subtitle: "1 November 2026", headline: "2 - 1", possession: { ours: 75, theirs: 25 } });
  expect(r.lines).toContainEqual({ label: "Goal", value: "2 - 1" });
  expect(r.lines.some((l) => l.label === "Possession")).toBe(false);
  expect(r.player?.lines).toContainEqual({ label: "During our chances", value: "1" });
});

it("leaves the player out of a match he is not tagged in, and the score out when unknown", () => {
  const r = matchReport(b, "Aston Villa", {}, "Pat Example");
  expect(r.player).toBeNull();
  expect(r.headline).toBeNull();
});

it("adds up a season, counting only scored matches as results", () => {
  const r = seasonReport([a, b], "U11 · 2026-27", "Aston Villa", {}, "Pat Example");
  expect(r.headline).toBe("W1 D0 L0");
  expect(r.lines).toEqual([
    { label: "Matches", value: "2" }, { label: "Goals", value: "2 - 1" }, { label: "Opponents", value: "2" }, { label: "Most played", value: "Derby County (1)" },
  ]);
  expect(r.player?.lines[0]).toEqual({ label: "Matches tagged", value: "1" });
});
