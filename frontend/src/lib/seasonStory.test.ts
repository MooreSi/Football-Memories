import { expect, it } from "vitest";
import type { HudlMatch } from "../api/hudl";
import { EMPTY_ENTRY, type GoalsEntries } from "./goals";
import { seasonStories } from "./seasonStory";
const name = "Sam Example";
const tag = (id: string, category = name, actions?: string[]) => ({ id, category, time_s: 10, duration_s: 10, actions });
const match = (id: string, title: string, moments = [tag(id)]): HudlMatch => ({ id, title, moments, age_group: "U11", capture_key: id });
const options = { library: [] as HudlMatch[], series: [], name, position: null, club: "Aston Villa", entries: {} as GoalsEntries, today: new Date("2026-11-21T12:00:00Z") };

it("aggregates each season's football actions without counting unrelated players or duplicate matches", () => {
  const m = match("a", "260701 U11 v Rovers", [tag("s", name, ["passes", "shots", "chances", "crosses", "regains", "fouls", "defensive1v1", "attacking1v1"]),
    tag("other", "Alex Sample", ["passes"]), tag("g", "ASTON VILLA GOAL")]);
  const stories = seasonStories({ ...options, library: [m, m, match("b", "260630 U10 v Town", [tag("old", name, ["passes"])]),
    match("other", "270701 U12 v Town", [tag("a", "Alex Sample", ["passes"])])],
    entries: { a: { ...EMPTY_ENTRY, scorers: { g: name } } } });
  expect(stories.map(s => s.season)).toEqual(["2026/27", "2025/26"]);
  expect(stories[0].matches).toBe(1);
  expect(stories[0].goalkeeping).toBeNull();
  expect(stories[0].outfield?.filter(c => c.value !== null).map(c => [c.label, c.value])).toEqual([
    ["Games played", 1], ["Goals scored", 1], ["Passes", 1], ["Shots on target", 1], ["Chances", 1], ["Crosses", 1],
    ["Defensive 1v1s", 1], ["Attacking 1v1s", 1], ["Fouls", 1], ["Regains", 1],
  ]);
  expect(stories[0].text).toContain("Sam's 2026/27 so far");
  expect(stories[0].text).toContain("1 goal");
  expect(stories[0].text).toContain("1 pass");
  expect(stories[0].text).not.toMatch(/moment|busiest|best game|\b(he|she|his|her)\b/i);
  expect(stories[1].outfield?.find(c => c.label === "Passes")?.value).toBe(1);
});

it("keeps only goalkeeper stats for a selected goalkeeper and weights save percentage", () => {
  const library = [match("k1", "260901 U11 v Town"), match("k2", "260908 U11 v City"), match("k3", "260915 U11 v Rovers"),
    match("out", "260920 U11 v Town", [tag("pass", name, ["passes"])])];
  const keeperEntry = (id: string, saves: number | null, conceded: number) => ({ ...EMPTY_ENTRY, keepers: [{ name, saves }],
    added: Array.from({ length: conceded }, (_, i) => ({ id: `${id}-${i}`, side: "theirs" as const })) });
  const [story] = seasonStories({ ...options, position: "Goalkeeper", library,
    entries: { k1: keeperEntry("a", 9, 1), k2: keeperEntry("b", 1, 3), k3: keeperEntry("c", null, 2) } });
  expect(story.keeperMatches).toBe(3);
  expect(story.outfieldMatches).toBe(1);
  expect(story.goalkeeping?.slice(0, 4).map(c => c.value)).toEqual([10, 6, 14, 71]);
  expect(story.goalkeeping?.[3].note).toContain("2 matches");
  expect(story.outfield).toBeNull();
  expect(story.text).toContain("10 saves");
  expect(story.text).toContain("6 goals conceded");
  expect(story.text).toContain("71% save percentage");
  expect(story.text).not.toContain("Outfield");
});

it("preserves missing versus recorded zero, labels likely goals and team overlaps", () => {
  const [story] = seasonStories({ ...options, library: [match("a", "260901 U11 v Town", [tag("s"),
    { ...tag("shot", "ASTON VILLA ON TARGET"), time_s: 100 }, tag("g", "ASTON VILLA GOAL")])] });
  expect(story.outfield?.find(c => c.label === "Shots on target")).toMatchObject({ value: 0 });
  expect(story.outfield?.find(c => c.label === "Passes")).toMatchObject({ value: null });
  expect(story.outfield?.find(c => c.label === "Goals scored")?.note).toContain("1 likely");
  expect(story.text).toContain("likely");
  expect(story.text).not.toContain("0 passes");
});

it("retains imported-only seasons without turning moment volume into performance", () => {
  const [story] = seasonStories({ ...options, position: "GK", series: [{ match_id: 1, match_date: "2025-10-01", opponent: "Town", moments: 200 }] });
  expect(story.season).toBe("2025/26");
  expect(story.goalkeeping?.slice(0, 4).map(c => c.value)).toEqual([null, null, null, null]);
  expect(story.outfield).toBeNull();
  expect(story.text).toContain("No goalkeeping stats recorded");
  expect(story.importedMatches).toBe(1);
});

it("keeps undated matches unclassified and counts saved assignments without player tags", () => {
  const [story] = seasonStories({ ...options, library: [match("a", "Undated fixture", [])],
    entries: { a: { ...EMPTY_ENTRY, added: [{ id: "g", side: "ours" }], scorers: { g: name } } } });
  expect(story.season).toBe("Unclassified");
  expect(story.outfield?.find(c => c.label === "Goals scored")?.value).toBe(1);
  expect(seasonStories(options)).toEqual([]);
});

it("uses explicit My Player position for every season rather than showing a second role", () => {
  const library = [match("a", "260901 U11 v Town", [tag("pass", name, ["passes"])])];
  const [keeper] = seasonStories({ ...options, library, position: "Goalkeeper" });
  expect(keeper.outfield).toBeNull();
  expect(keeper.goalkeeping).not.toBeNull();
  const [outfield] = seasonStories({ ...options, library, position: "Forward", entries: { a: { ...EMPTY_ENTRY, keepers: [{ name, saves: 3 }] } } });
  expect(outfield.goalkeeping).toBeNull();
  expect(outfield.outfield).not.toBeNull();
});
