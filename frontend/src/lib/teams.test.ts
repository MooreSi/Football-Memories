import { expect, it } from "vitest";
import type { HudlMatch } from "../api/hudl";
import { ageIn, cohortOf, inCohort, seasonStart, teamSeasons } from "./teams";

const match = (id: string, season: string, ...ages: string[]): HudlMatch =>
  ({ id, title: id, age_group: ages[0], age_groups: ages, capture_key: id, season_label: season });

it("reads the season's first year, and nothing from undated videos", () => {
  expect(seasonStart("2026/27")).toBe(2026);
  expect(seasonStart("2025-26")).toBe(2025);
  expect(seasonStart("Unclassified")).toBeNull();
});

it("follows one team as it moves up an age group each season", () => {
  const team = cohortOf("U11", "2026/27");
  expect(team).toBe(cohortOf("U10", "2025/26"));
  expect(team).toBe(cohortOf("U9", "2024/25"));
  expect(team).not.toBe(cohortOf("U11", "2025/26"));
  expect(ageIn(team!, "2024/25")).toBe("U9");
  expect(cohortOf("Unclassified", "2026/27")).toBeNull();
});

it("keeps only that team's matches, whichever membership says so", () => {
  const lib = [match("a", "2026/27", "U11"), match("b", "2025/26", "U10"), match("c", "2025/26", "U11"),
    match("d", "2026/27", "U12", "U11"), match("e", "Unclassified", "U11"), match("f", "2024/25", "U9/U10")];
  const team = cohortOf("U11", "2026/27")!;
  expect(lib.filter((m) => inCohort(m, team)).map((m) => m.id)).toEqual(["a", "b", "d", "f"]);
  expect(teamSeasons(lib, team)).toEqual([{ season: "2026/27", age: "U11" }, { season: "2025/26", age: "U10" }, { season: "2024/25", age: "U9" }]);
});
