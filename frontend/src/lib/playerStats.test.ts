import { expect, it } from "vitest";
import { EMPTY_ENTRY, matchGoals } from "./goals";
import { playerStats } from "./playerStats";
const t = (id: string, category: string, time_s: number, duration_s = 10) => ({ id, category, time_s, duration_s });
const moments = [t("p1", "SAM EXAMPLE", 20), t("p2", "Sam Example", 22), t("p3", "Ali Demo", 80),
  t("pass", "ASTON VILLA PASS", 25), t("opp", "OPPOSITION PASS", 25),
  t("edge", "ASTON VILLA PASS", 32), t("far", "ASTON VILLA PASS", 100),
  t("shot", "ASTON VILLA ON TARGET", 21, 0)];
const match = { moments };
it("merges player spellings and counts an event once despite overlapping player tags", () => {
  const rows = playerStats(match, "Aston Villa", matchGoals(match, "Aston Villa"));
  expect(rows.map(r => r.name)).toEqual(["Ali Demo", "Sam Example"]);
  expect(rows[1].events.passes?.map(e => e.id)).toEqual(["pass"]);
  expect(rows[1].events.shots?.map(e => e.id)).toEqual(["shot"]);
  expect(rows[0].events.passes).toEqual([]);
  expect(rows[1].events.chances).toBeNull();
});
it("does not turn possession or player tags into passes", () => {
  const m = { moments: [t("p", "Sam Example", 1), t("pos", "ASTON VILLA POSSESSION", 1)] };
  expect(playerStats(m, "Aston Villa", matchGoals(m, "Aston Villa"))[0].events.passes).toBeNull();
});
it("keeps outfield activity after a keeper spell but excludes events while in goal", () => {
  const m = { moments: [t("p1", "Sam Example", 95, 20), t("p2", "Sam Example", 200),
    t("a", "ASTON VILLA PASS", 105, 0), t("b", "ASTON VILLA PASS", 202, 0)] };
  const goals = { ...matchGoals(m, "Aston Villa", EMPTY_ENTRY),
    spells: [{ name: "Sam Example", from_s: 100, to_s: 150 }] };
  expect(playerStats(m, "Aston Villa", goals)[0].events.passes?.map(e => e.id)).toEqual(["b"]);
});
it("leaves out an owner-named keeper without timed spells", () => {
  const goals = { ...matchGoals(match, "Aston Villa"), keepers: [{ name: "Sam Example", saves: 1, conceded: 0, confirmed: true }] };
  expect(playerStats(match, "Aston Villa", goals).map(r => r.name)).toEqual(["Ali Demo"]);
});
it("cannot invent player rows for Veo or an empty match", () => {
  expect(playerStats({ source: "veo", moments }, null, matchGoals(match, null))).toEqual([]);
  expect(playerStats({}, null, matchGoals({}, null))).toEqual([]);
});
it("counts goals by saved scorer instead of giving every overlapping player a goal", () => {
  const m = { moments: [t("sam", "Sam Example", 100, 30), t("ali", "Ali Demo", 100, 30),
    t("goal", "ASTON VILLA GOAL", 100, 25), t("opposition", "OPPOSITION GOAL", 100, 25)] };
  const entry = { ...EMPTY_ENTRY, scorers: { goal: "SAM EXAMPLE" } };
  const rows = playerStats(m, "Aston Villa", matchGoals(m, "Aston Villa", entry));
  expect(rows[0].events.goals).toEqual([]);
  expect(rows[1].events.goals?.map(g => [g.id, g.time_s, g.category])).toEqual([["goal", 100, "Goal · confirmed"]]);
});
it("preserves an owner-added goal without inventing a timestamp", () => {
  const entry = { ...EMPTY_ENTRY, added: [{ id: "manual-goal", side: "ours" as const }], scorers: { "manual-goal": "Sam Example" } };
  const row = playerStats(match, "Aston Villa", matchGoals(match, "Aston Villa", entry))[1];
  expect(row.events.goals?.map(g => [g.id, g.time_s])).toEqual([["manual-goal", null]]);
});
it("counts overlapping own offsides once and leaves missing offside codes unrecorded", () => {
  const m = { moments: [...moments, t("off", "ASTON VILLA OFFSIDE", 25, 0),
    t("opp-off", "OPPOSITION OFFSIDE", 25, 0), t("far-off", "ASTON VILLA OFFSIDE", 120)] };
  const rows = playerStats(m, "Aston Villa", matchGoals(m, "Aston Villa"));
  expect(rows[1].events.offsides?.map(e => e.id)).toEqual(["off"]);
  expect(rows[0].events.offsides).toEqual([]);
  expect(playerStats(match, "Aston Villa", matchGoals(match, "Aston Villa"))[1].events.offsides).toBeNull();
});
it("prefers player-linked Passing labels without crediting overlapping teammates or doubling team events", () => {
  const m = { moments: [
    { ...t("sam", "Sam Example", 20), actions: ["passes"] }, t("ali", "Ali Demo", 20),
    t("team", "ASTON VILLA PASS", 22),
  ] };
  const rows = playerStats(m, "Aston Villa", matchGoals(m, "Aston Villa"));
  expect(rows[1].events.passes?.map(e => e.id)).toEqual(["sam"]);
  expect(rows[0].events.passes).toEqual([]);
  expect(rows[1].sources.passes).toBe("actions");
});
it("counts each requested player action explicitly and does not turn unnamed dribbling into success", () => {
  const m = { moments: [{ ...t("sam", "Sam Example", 20), actions: ["assists", "keyPasses", "interceptions", "blocks", "clearances",
    "foulsWon", "foulsConceded", "successfulDribbles", "possessionLost"] }, t("ali", "Ali Demo", 20),
    t("generic", "ASTON VILLA DRIBBLING", 20)] };
  const rows = playerStats(m, "Aston Villa", matchGoals(m, "Aston Villa"));
  expect(rows[1].events.assists?.map(e => e.id)).toEqual(["sam"]);
  expect(rows[1].events.keyPasses).toHaveLength(1);
  expect(rows[1].events.interceptions).toHaveLength(1);
  expect(rows[1].events.blocks).toHaveLength(1);
  expect(rows[1].events.clearances).toHaveLength(1);
  expect(rows[1].events.foulsWon).toHaveLength(1);
  expect(rows[1].events.foulsConceded).toHaveLength(1);
  expect(rows[1].events.successfulDribbles).toHaveLength(1);
  expect(rows[1].events.possessionLost).toHaveLength(1);
  expect(rows[0].events.assists).toEqual([]);
});
it("keeps explicit team-event fallback separate from unavailable individual stats", () => {
  const m = { moments: [t("sam", "Sam Example", 20), t("block", "ASTON VILLA BLOCK", 22), t("foul", "ASTON VILLA FOUL", 22)] };
  const row = playerStats(m, "Aston Villa", matchGoals(m, "Aston Villa"))[0];
  expect(row.events.blocks?.map(e => e.id)).toEqual(["block"]);
  expect(row.sources.blocks).toBe("overlap");
  expect(row.events.foulsWon).toBeNull();
  expect(row.events.successfulDribbles).toBeNull();
});

it("excludes period and set-piece labels from match player rows", () => {
  const m = { moments: [t("person", "Sam Start", 10), t("period", "PERIOD START", 10),
    t("yellow", "YELLOW SET PIECE", 20), t("bib", "BIB SET PIECE", 30)] };
  expect(playerStats(m, "Example FC", matchGoals(m, "Example FC")).map(p => p.name)).toEqual(["Sam Start"]);
});
