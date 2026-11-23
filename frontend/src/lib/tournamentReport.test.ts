import { expect, it } from "vitest";
import type { Tournament } from "../api/types";
import { tournamentReport, type TournamentReportGame } from "./tournamentReport";

const cup: Tournament = { id: "cup", name: "Riverside Cup", entries: {
  "hudl:same": "Blue", "veo:same": "White", "local:12": "Blue",
  "hudl:unknown": "Blue", "hudl:missing": "White", "hudl:mixed": "Team unassigned",
} };
const games: TournamentReportGame[] = [
  { key: "hudl:same", title: "Blue v Town", date: "2026-10-26", club: "Riverside", score: { ours: 4, theirs: 1 } },
  { key: "veo:same", title: "White v City", date: "2026-10-26", club: "Riverside", score: { ours: 0, theirs: 2 } },
  { key: "local:12", title: "Blue v United", date: "2026-10-26", club: "Riverside", score: { ours: 0, theirs: 0 } },
  { key: "hudl:unknown", title: "Blue v Athletic", date: "2026-10-26", club: "Riverside", score: null },
  { key: "hudl:mixed", title: "Pitch recording", date: "2026-10-26", club: "Riverside", score: { ours: 20, theirs: 0 } },
  { key: "hudl:outside", title: "Outside fixture", date: "2026-10-26", club: "Riverside", score: { ours: 99, theirs: 0 } },
];

it("reports assigned games across sources without inventing results for unknown scores", () => {
  const report = tournamentReport(cup, [...games, games[0]]);
  expect(report.record).toEqual({ played: 5, won: 1, drawn: 1, lost: 1, unscored: 2 });
  expect(report.lines).toEqual(expect.arrayContaining([
    { label: "Goals for / against", value: "4 / 3" },
    { label: "Goal difference", value: "+1" },
    { label: "Clean sheets", value: "1" },
    { label: "Win rate", value: "33% of scored games" },
    { label: "Score coverage", value: "3 of 5 assigned games" },
  ]));
  const content = JSON.stringify(report);
  expect(content).toContain("White v City");
  expect(content).toContain("hudl:missing");
  expect(content).toContain("Needs review");
  expect(content).not.toContain("Outside fixture");
  expect(content).not.toContain("99");
});

it("filters to a squad and omits other squads and the review bucket from its report", () => {
  const report = tournamentReport(cup, games, "Blue");
  expect(report.record).toEqual({ played: 3, won: 1, drawn: 1, lost: 0, unscored: 1 });
  expect(report.subtitle).toContain("Blue");
  expect(report.lines).toContainEqual({ label: "Goals for / against", value: "4 / 1" });
  expect(JSON.stringify(report)).not.toContain("White v City");
  expect(JSON.stringify(report)).not.toContain("Pitch recording");
});

it("keeps zero-score games while displaying no stats for unavailable scores", () => {
  const report = tournamentReport({ id: "other", name: "Other Cup", entries: { "hudl:unknown": "Green", "veo:gone": "Green" } }, games);
  expect(report.record).toEqual({ played: 2, won: 0, drawn: 0, lost: 0, unscored: 2 });
  expect(report.lines).toContainEqual({ label: "Clean sheets", value: "—" });
  expect(report.lines).toContainEqual({ label: "Goals for / against", value: "—" });
  expect(JSON.stringify(report)).toContain("Score not recorded");
  expect(JSON.stringify(report)).not.toContain("0–0");
});

it("uses the Library's readable name for an unnamed automatic event", () => {
  const report = tournamentReport({ ...cup, name: "Match day · 2026-10-26 · Riverside · U11" }, games);
  expect(report.title).toBe("Tournament · 26 October 2026");
});
