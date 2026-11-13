import { expect, it } from "vitest";
import { opponentMap, rankHudlMoments } from "./hubExtras";

// Owner request 2026-11-13: opponent map and top moments on the player hub. Synthetic data.
const pm = (n: number, date: string, opponent: string, moments: number, href?: string) => ({ match_id: n, match_date: date, opponent, moments, href });

it("groups the clubs played with how often and the latest match", () => {
  const map = opponentMap([
    pm(1, "2026-09-01", "Rovers", 10), pm(2, "2026-09-08", "Town", 5),
    pm(3, "2026-10-01", "rovers", 20, "/hudl/r2?player=Sam"), pm(4, "2026-10-08", "Northgate", 30),
  ]);
  expect(map.map((c) => [c.name, c.matches, c.moments])).toEqual([["Rovers", 2, 30], ["Northgate", 1, 30], ["Town", 1, 5]]);
  expect(map[0]).toMatchObject({ last: "2026-10-01", href: "/hudl/r2?player=Sam" });
});

const t = (id: string, category: string, time_s: number, duration_s = 10) => ({ id, category, time_s, duration_s });
const library = [
  { id: "a", title: "260901 U11 v Rovers (H)", age_group: "U11", capture_key: "a", moments: [
    t("a1", "Sam Example", 100), t("ag", "GOAL", 105), t("a2", "Sam Example", 300), t("ac", "CHANCE", 302), t("a3", "Sam Example", 500),
  ] },
  { id: "b", title: "261001 U11 v Town (A)", age_group: "U11", capture_key: "b", thumbnail_url: "/thumb-b", moments: [
    t("b1", "Sam Example", 50), t("bs", "OPPOSITION SHOT ON TARGET", 52), t("bv", "SAVE", 55), t("b2", "Sam Example", 900), t("bg", "GOAL", 905),
  ] },
];

it("ranks a player's Hudl moments by the play they overlapped, newest first on a tie", () => {
  const top = rankHudlMoments(library, "Sam Example", 5);
  expect(top.map((m) => [m.moment_id, m.reason])).toEqual([
    ["b2", "Team goal"], ["a1", "Team goal"], ["b1", "Save"], ["a2", "Chance"],
  ]);
  expect(top[0]).toMatchObject({ match_id: "b", href: "/hudl/b?moment=b2", thumbnail: "/thumb-b", opponent: "Town", date: "2026-10-01" });
});

it("leaves out moments that overlapped nothing notable, and limits the count", () => {
  expect(rankHudlMoments(library, "Sam Example", 2).map((m) => m.moment_id)).toEqual(["b2", "a1"]);
  expect(rankHudlMoments(library, "Nobody Here", 5)).toEqual([]);
});
