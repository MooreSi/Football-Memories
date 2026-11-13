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
    t("a1", "Sam Example", 100), t("ag", "RIVERSIDE GOAL", 105), t("a2", "Sam Example", 300), t("ac", "RIVERSIDE CHANCE", 302), t("a3", "Sam Example", 500),
    t("og", "OPPOSITION GOAL", 1500), t("oc", "OPPOSITION CHANCE", 1600),
  ] },
  { id: "b", title: "261001 U11 v Town (A)", age_group: "U11", capture_key: "b", thumbnail_url: "/thumb-b", moments: [
    t("b1", "Sam Example", 50), t("bs", "OPPOSITION SHOT ON TARGET", 52), t("bv", "SAVE", 55), t("b2", "Sam Example", 900), t("bg", "RIVERSIDE GOAL", 905),
    t("bo", "OPPOSITION GOAL", 2000),
  ] },
];

it("ranks a player's Hudl moments by the play they overlapped, newest first on a tie", () => {
  const top = rankHudlMoments(library, "Sam Example", 5, "Riverside");
  expect(top.map((m) => [m.moment_id, m.reason])).toEqual([
    ["b2", "Team goal"], ["a1", "Team goal"], ["b1", "Save"], ["a2", "Chance"],
  ]);
  expect(top[0]).toMatchObject({ match_id: "b", href: "/hudl/b?moment=b2", thumbnail: "/thumb-b", opponent: "Town", date: "2026-10-01" });
});

it("leaves out moments that overlapped nothing notable, and limits the count", () => {
  expect(rankHudlMoments(library, "Sam Example", 2, "Riverside").map((m) => m.moment_id)).toEqual(["b2", "a1"]);
  expect(rankHudlMoments(library, "Nobody Here", 5, "Riverside")).toEqual([]);
});

it("never counts a goalkeeper code, a goal kick or a goal conceded as a team goal", () => {
  const match = { id: "c", title: "261101 U11 v City (H)", age_group: "U11", capture_key: "c", moments: [
    t("c1", "Sam Example", 10), t("k", "1 GOAL KEEPER", 10), t("c2", "Sam Example", 100), t("gk", "RIVERSIDE GOAL KICK", 100),
    t("c3", "Sam Example", 200), t("og", "OPPOSITION GOAL", 200), t("rg", "RIVERSIDE GOAL", 5000),
  ] };
  expect(rankHudlMoments([match], "Sam Example", 5, "Riverside")).toEqual([]);
});

it("takes the best moment from each match before a second from the same match", () => {
  const busy = { id: "d", title: "261108 U11 v City (H)", age_group: "U11", capture_key: "d", moments: [
    t("d1", "Sam Example", 10), t("g1", "RIVERSIDE GOAL", 10), t("d2", "Sam Example", 100), t("g2", "RIVERSIDE GOAL", 100),
    t("d3", "Sam Example", 200), t("g3", "RIVERSIDE GOAL", 200), t("og", "OPPOSITION GOAL", 900),
  ] };
  const quiet = { id: "e", title: "261001 U11 v Town (A)", age_group: "U11", capture_key: "e", moments: [
    t("e1", "Sam Example", 10), t("c", "RIVERSIDE CHANCE", 10), t("oc", "OPPOSITION CHANCE", 900),
  ] };
  expect(rankHudlMoments([busy, quiet], "Sam Example", 4, "Riverside").map((m) => m.moment_id)).toEqual(["d3", "e1", "d2", "d1"]);
});
