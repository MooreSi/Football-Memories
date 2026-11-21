import { expect, it } from "vitest";
import { EMPTY_ENTRY } from "./goals";
import { footballRecords } from "./playerRecords";

const tag = (id: string, category: string, time_s = 10, actions?: string[]) => ({ id, category, time_s, duration_s: 10, actions });
const name = "Sam Example";
const match = { id: "a", moments: [tag("s", name, 10, ["passes", "shots", "chances"]),
  tag("s2", name, 40, ["passes"]), tag("other", "Alex Sample", 10, ["passes"]),
  tag("p", "ASTON VILLA PASS", 10), tag("g", "ASTON VILLA GOAL", 10)] };

it("counts the player's actions once and respects corrected scorers", () => {
  const result = footballRecords([match], name, "Forward", "Aston Villa", {
    a: { ...EMPTY_ENTRY, scorers: { g: "Alex Sample" } },
  });
  expect(result.keeper).toBe(false);
  expect(result.cards.map(c => [c.label, c.value])).toEqual([
    ["Goals scored", 0], ["Shots on target", 1], ["Chances", 1], ["Passes", 2],
  ]);
  expect(result.cards[3].note).toContain("Player actions");
});

it("distinguishes missing metrics from recorded zero and labels overlap/likely counts", () => {
  const result = footballRecords([{ id: "b", moments: [tag("s", name), tag("g", "ASTON VILLA GOAL"),
    tag("shot", "ASTON VILLA ON TARGET", 100)] }], name, null, "Aston Villa", {});
  expect(result.cards[0]).toMatchObject({ value: 1 });
  expect(result.cards[0].note).toContain("1 likely");
  expect(result.cards[1]).toMatchObject({ value: 0 });
  expect(result.cards[1].note).toContain("Team-tag overlap");
  expect(result.cards[3]).toMatchObject({ value: null });
});

it("shows keeper totals with shots faced and a percentage from the same known sample", () => {
  const entries = { a: { ...EMPTY_ENTRY, keepers: [{ name, saves: 3 }],
    added: [{ id: "conceded", side: "theirs" as const }] },
  b: { ...EMPTY_ENTRY, keepers: [{ name, saves: null }],
    added: [{ id: "conceded2", side: "theirs" as const }] } };
  const result = footballRecords([{ id: "a" }, { id: "b" }], name, "GK", null, entries);
  expect(result.keeper).toBe(true);
  expect(result.cards.map(c => [c.label, c.value])).toEqual([
    ["Goals saved", 3], ["Goals conceded", 2], ["Shots faced", 4], ["Save percentage", 75],
  ]);
  expect(result.cards[3].note).toContain("1 match");
  expect(result.cards[0].note).toContain("1 match");
});

it("uses inferred keepers only with no explicit position and never invents missing values", () => {
  const entries = { a: { ...EMPTY_ENTRY, keepers: [{ name, saves: null }] } };
  expect(footballRecords([{ id: "a" }], name, null, null, entries).keeper).toBe(true);
  expect(footballRecords([{ id: "a" }], name, "Forward", null, entries).keeper).toBe(false);
  expect(footballRecords([], name, "Goalkeeper", null, {}).cards.map(c => c.value)).toEqual([null, null, null, null]);
});
