import { expect, it } from "vitest";
import { seasonStories } from "./seasonStory";

// Owner request 2026-11-13: a season story on the player hub. Synthetic matches.
const m = (date: string, moments: number, opponent: string, href?: string) => ({ match_id: Number(date.replace(/-/g, "")), match_date: date, opponent, moments, href });
const TODAY = new Date("2026-11-13T12:00:00");
const series = [
  m("2025-09-06", 10, "Rovers"), m("2026-03-01", 20, "Northgate"), // 2025/26: 2 matches, 15 a match
  m("2026-09-05", 12, "Rovers"), m("2026-09-19", 30, "Town", "/hudl/t?player=Sam"), m("2026-10-03", 18, "Rovers"), // 2026/27
];

it("groups matches into football seasons, newest first", () => {
  const stories = seasonStories(series, "Sam Example", TODAY);
  expect(stories.map((s) => s.season)).toEqual(["2026/27", "2025/26"]);
  expect(stories[0]).toMatchObject({ matches: 3, moments: 60, average: 20 });
  expect(stories[1]).toMatchObject({ matches: 2, moments: 30, average: 15 });
});

it("finds the best match, busiest month, most-met opponent and the change on last season", () => {
  const [now, before] = seasonStories(series, "Sam Example", TODAY);
  expect(now.best).toMatchObject({ opponent: "Town", moments: 30 });
  expect(now.busiestMonth).toEqual({ month: "2026-09", moments: 42 });
  expect(now.opponent).toEqual({ name: "Rovers", times: 2 });
  expect(now.change).toBe(33);
  expect(before.change).toBeNull();
});

it("picks a match of the month for every month played, linked to the match", () => {
  const [now] = seasonStories(series, "Sam Example", TODAY);
  expect(now.months).toEqual([
    { month: "2026-09", moments: 42, matches: 2, pick: expect.objectContaining({ opponent: "Town", href: "/hudl/t?player=Sam" }) },
    { month: "2026-10", moments: 18, matches: 1, pick: expect.objectContaining({ opponent: "Rovers", href: "/matches/20261003" }) },
  ]);
});

it("writes the story with the player's first name and no guessed pronouns", () => {
  const [now, before] = seasonStories(series, "Sam Example", TODAY);
  expect(now.text).toBe(
    "2026/27 so far: 3 matches and 60 moments, 20 a match, up 33% on 2025/26. " +
      "Sam's best game was 30 moments vs Town on 19 Sep. September was the busiest month with 42 moments. " +
      "Rovers came up most often, 2 times.",
  );
  expect(before.text).toBe(
    "2025/26: 2 matches and 30 moments, 15 a match. Sam's best game was 20 moments vs Northgate on 1 Mar. " +
      "March was the busiest month with 20 moments.",
  );
  for (const story of [now, before]) expect(story.text).not.toMatch(/\b(he|she|his|her|him)\b/i);
});

it("has no stories without dated matches", () => {
  expect(seasonStories([], "Sam")).toEqual([]);
  expect(seasonStories([{ match_id: 1, match_date: "", opponent: "X", moments: 3 }], "Sam")).toEqual([]);
});
