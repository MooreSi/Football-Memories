import { expect, it } from "vitest";
import { playerRecords } from "./records";

// Owner request 2026-11-13: records and streaks on the player hub. Synthetic matches.
const m = (date: string, moments: number, opponent = `Team ${date}`) => ({ match_id: Number(date.replace(/-/g, "")), match_date: date, opponent, moments });

it("finds the best match, the best month and the average", () => {
  const r = playerRecords([m("2026-09-06", 10), m("2026-09-13", 30, "Rovers"), m("2026-10-04", 20), m("2026-10-11", 20)])!;
  expect(r.best).toMatchObject({ moments: 30, opponent: "Rovers", match_date: "2026-09-13" });
  expect(r.bestMonth).toEqual({ month: "2026-10", moments: 40, matches: 2 });
  expect(r.average).toBe(20);
  expect(r.total).toBe(80);
});

it("counts the current and the longest run of matches at or above the average", () => {
  const r = playerRecords([m("2026-01-01", 30), m("2026-01-08", 25), m("2026-01-15", 28), m("2026-01-22", 5), m("2026-01-29", 10), m("2026-02-05", 24)])!;
  expect(r.average).toBe(20.33);
  expect(r.longestRun).toBe(3);
  expect(r.currentRun).toBe(1);
});

it("marks a personal best when the latest match is the best, and only then", () => {
  expect(playerRecords([m("2026-01-01", 5), m("2026-01-08", 9)])!.personalBest).toBe(true);
  expect(playerRecords([m("2026-01-01", 9), m("2026-01-08", 9)])!.personalBest).toBe(false);
  expect(playerRecords([m("2026-01-01", 9), m("2026-01-08", 3)])!.personalBest).toBe(false);
});

it("gives the next milestone and how far there is to go", () => {
  expect(playerRecords([m("2026-01-01", 1210)])!.milestone).toEqual({ next: 1250, previous: 1000, remaining: 40, fraction: 0.84 });
  expect(playerRecords([m("2026-01-01", 30)])!.milestone).toEqual({ next: 50, previous: 0, remaining: 20, fraction: 0.6 });
  expect(playerRecords([m("2026-01-01", 5000)])!.milestone.next).toBe(6000);
});

it("has nothing to show without matches, and ignores the order it is given", () => {
  expect(playerRecords([])).toBeNull();
  const r = playerRecords([m("2026-02-01", 4), m("2026-01-01", 8)])!;
  expect(r.latest.match_date).toBe("2026-02-01");
  expect(r.personalBest).toBe(false);
});
