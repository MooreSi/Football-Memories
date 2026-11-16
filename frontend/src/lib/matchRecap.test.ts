import { expect, it } from "vitest";
import { type RecapFacts, matchRecap } from "./matchRecap";
import { gameState } from "./gameState";
import type { MatchGoals } from "./goals";

// Spec 310: a written recap from facts the app holds; each sentence only when its data exists.
const date = new Date(2026, 10, 1);
const g = (side: "ours" | "theirs", time_s: number) => ({ side, time_s });
const base: RecapFacts = { ours: "Riverside", opponent: "Example Town", venue: "Home", date, score: { ours: 3, theirs: 2 },
  state: gameState([g("theirs", 400), g("theirs", 900), g("ours", 1600), g("ours", 2300), g("ours", 2900)], { ours: 3, theirs: 2 }),
  halfTime_s: 1500, goals: null, player: null, veoRows: [] };
const goal = (id: string, side: "ours" | "theirs", scorer: string | null, confirmed: boolean, candidates: string[] = []) =>
  ({ id, side, time_s: 100, added: false, candidates, scorer, confirmed, keeper: null });

it("says the result, venue and date", () => {
  expect(matchRecap(base).sentences[0]).toBe("Riverside won 3-2 at home against Example Town on 1 November 2026.");
  expect(matchRecap({ ...base, venue: "Away", score: { ours: 1, theirs: 1 }, state: gameState([], null) }).sentences[0]).toBe("Riverside drew 1-1 away at Example Town on 1 November 2026.");
  expect(matchRecap({ ...base, venue: null, score: { ours: 0, theirs: 2 }, date: null, state: gameState([], null) }).sentences[0]).toBe("Riverside lost 0-2 against Example Town.");
});

it("says when the score is not known, without a result", () => {
  const r = matchRecap({ ...base, score: null, state: gameState([], null) });
  expect(r.sentences).toEqual(["Riverside played Example Town on 1 November 2026. The score is not known."]);
});

it("tells how it went and the half-time score when every goal is timed", () => {
  const r = matchRecap(base);
  expect(r.sentences).toContain("They came from 2 goals down to win.");
  expect(r.sentences).toContain("It was 0-2 at half-time.");
});

it("tells nothing about how it went when the goals do not add up", () => {
  const r = matchRecap({ ...base, state: gameState([g("ours", 100)], { ours: 3, theirs: 2 }) });
  expect(r.sentences.some((s) => /half-time|came from|first/.test(s))).toBe(false);
});

it("names confirmed scorers and keeper only", () => {
  const goals: MatchGoals = { players: [], goals: [goal("a", "ours", "Sam Example", true), goal("b", "ours", "Sam Example", true), goal("c", "ours", "Alex Demo", false)],
    keepers: [{ name: "Chris Hands", saves: 4, conceded: 2, confirmed: true }] };
  const r = matchRecap({ ...base, goals });
  expect(r.sentences).toContain("Goals: Sam Example 2.");
  expect(r.sentences).toContain("Chris Hands kept goal and made 4 saves.");
  expect(r.sentences.join(" ")).not.toContain("Alex Demo");
});

it("says how often the player was tagged and in how many of our goals", () => {
  const goals: MatchGoals = { players: [], keepers: [], goals: [goal("a", "ours", null, false, ["Sam Example", "Alex Demo"]), goal("b", "ours", null, false, ["Alex Demo"]), goal("c", "theirs", null, false, ["Sam Example"])] };
  expect(matchRecap({ ...base, goals, player: { name: "SAM EXAMPLE", moments: 6 } }).sentences)
    .toContain("SAM EXAMPLE was tagged in 6 moments, including 1 of the 2 goals we scored.");
  expect(matchRecap({ ...base, goals, player: { name: "Sam Example", moments: 0 } }).sentences.some((s) => s.includes("tagged"))).toBe(false);
});

it("gives Veo's attempts and corners as Veo's counts", () => {
  const veoRows = [{ label: "Goals", own: 3, opponent: 2 }, { label: "Attempts", own: 10, opponent: 28 }, { label: "Corners", own: 5, opponent: 8 }];
  expect(matchRecap({ ...base, veoRows }).sentences).toContain("Veo counted 10 attempts to 28 and 5 corners to 8.");
  expect(matchRecap(base).sentences.some((s) => s.startsWith("Veo"))).toBe(false);
});

it("ends with what it is written from", () => {
  expect(matchRecap(base).note).toMatch(/confirmed/);
});

it("with no club name it says we, not a made-up name", () => {
  const r = matchRecap({ ...base, ours: null });
  expect(r.sentences.slice(0, 2)).toEqual(["We won 3-2 at home against Example Town on 1 November 2026.", "We came from 2 goals down to win."]);
});

it("uses one or many for Veo's counts", () => {
  const veoRows = [{ label: "Attempts", own: 1, opponent: 1 }, { label: "Corners", own: 1, opponent: 0 }];
  expect(matchRecap({ ...base, veoRows }).sentences).toContain("Veo counted 1 attempt to 1 and 1 corner to 0.");
});
