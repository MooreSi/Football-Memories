import { expect, it } from "vitest";
import { reelPresets } from "./reelPresets";

// Spec 300: one-click reels from one match's cached moments. Made-up names.
const t = (id: string, category: string, time_s: number, duration_s = 10) => ({ id, category, time_s, duration_s });
const hudl = { id: "m1", moments: [
  t("p2", "Sam Example", 400), t("p1", "Sam Example", 95), t("x1", "Alex Demo", 600),
  t("g1", "ASTON VILLA GOAL", 100), t("c1", "ASTON VILLA CHANCE", 402), t("g2", "ASTON VILLA GOAL", 900),
  t("o1", "OPPOSITION GOAL", 405), t("o2", "OPPOSITION CHANCE", 1200),
] };
const ids = (list: ReturnType<typeof reelPresets>, id: string) => list.find((p) => p.id === id)?.momentIds;

it("offers the player's own moments in match order", () => {
  const list = reelPresets(hudl, "Aston Villa", "SAM EXAMPLE");
  expect(ids(list, "player")).toEqual(["p1", "p2"]);
  expect(list.find((p) => p.id === "player")).toMatchObject({ label: "Sam Example's moments", name: "Sam Example highlights" });
});

it("team moments with the player: our goals and chances overlapping their tags, not theirs or the player's own", () => {
  expect(ids(reelPresets(hudl, "Aston Villa", "Sam Example"), "with-player")).toEqual(["g1", "c1"]);
});

it("our goals, every goal, and our goals and chances", () => {
  const list = reelPresets(hudl, "Aston Villa", null);
  expect(ids(list, "our-goals")).toEqual(["g1", "g2"]);
  expect(ids(list, "every-goal")).toEqual(["g1", "o1", "g2"]);
  expect(ids(list, "our-attacks")).toEqual(["g1", "c1", "g2"]);
  expect(list.some((p) => p.id === "player" || p.id === "with-player")).toBe(false);
});

it("leaves out a goal the owner removed", () => {
  const entry = { scorers: {}, added: [{ id: "a-1", side: "ours" as const }], removed: ["g2"], keepers: [], beaten: {} };
  expect(ids(reelPresets(hudl, "Aston Villa", null, entry), "our-goals")).toEqual(["g1"]);
});

it("uses Veo's team events: our goals and shots, never the opponent's", () => {
  const team = (id: string, category: string, side: "own" | "opponent", time_s: number) => ({ id, category, side, time_s, duration_s: 15, team: true });
  const veo = { id: "veo-1", source: "veo", moments: [{ id: "h1", category: "GOAL", time_s: 3, duration_s: 20 }],
    team_moments: [team("t-own-goal-500000", "OUR GOAL", "own", 490), team("t-own-shot-200000", "OUR SHOT", "own", 190),
      team("t-opponent-shot-300000", "OPPONENT SHOT", "opponent", 290), team("t-opponent-goal-700000", "OPPONENT GOAL", "opponent", 690)],
    team_data: { stats: {}, events: [{ type: "GOAL", side: "own" as const, time_s: 500, period: 1 }, { type: "GOAL", side: "opponent" as const, time_s: 700, period: 2 }] } };
  const list = reelPresets(veo, null, "Sam Example");
  expect(ids(list, "our-goals")).toEqual(["t-own-goal-500000"]);
  expect(ids(list, "every-goal")).toEqual(["t-own-goal-500000", "t-opponent-goal-700000"]);
  expect(ids(list, "our-attacks")).toEqual(["t-own-shot-200000", "t-own-goal-500000"]);
  expect(list.some((p) => p.id === "player")).toBe(false);
});

it("does not offer an empty preset or one with the same moments as an earlier one", () => {
  const onlyOurs = { id: "m2", moments: [t("g1", "ASTON VILLA GOAL", 100), t("o9", "OPPOSITION CHANCE", 300)] };
  const list = reelPresets(onlyOurs, "Aston Villa", "Sam Example");
  expect(list.map((p) => p.id)).toEqual(["our-goals"]);
});

it("with no home club set, the goals matchGoals finds still count as ours for the team presets", () => {
  const plain = { id: "m3", moments: [t("p1", "Sam Example", 95), t("g1", "RIVERSIDE GOAL", 100), t("o1", "OPPOSITION GOAL", 500)] };
  const list = reelPresets(plain, null, "Sam Example");
  expect(ids(list, "with-player")).toEqual(["g1"]);
  expect(list.map((p) => p.id)).toEqual(["player", "with-player", "every-goal"]);
});
