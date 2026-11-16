import { expect, it } from "vitest";
import { gameState, matchSpan, seasonGameLines } from "./gameState";

// Spec 290: how the score went, only when every goal has a time and they add up to the score.
const g = (side: "ours" | "theirs", time_s: number | null) => ({ side, time_s });

it("tells a comeback: behind, level, then ahead", () => {
  const s = gameState([g("ours", 1500), g("theirs", 600), g("ours", 2400)], { ours: 2, theirs: 1 }, [[0, 3000]]);
  if (!s.complete) throw new Error(s.reason);
  expect(s.goals.map((x) => [x.time_s, x.ours, x.theirs])).toEqual([[600, 0, 1], [1500, 1, 1], [2400, 2, 1]]);
  expect(s.firstGoal).toBe("theirs");
  expect(s.biggestDeficit).toBe(1);
  expect(s.story).toBe("came-from-behind-win");
});

it("a win led from the first goal is no comeback", () => {
  const s = gameState([g("ours", 100), g("ours", 200)], { ours: 2, theirs: 0 }, [[0, 3000]]);
  expect(s.complete && [s.story, s.firstGoal, s.biggestLead]).toEqual([null, "ours", 2]);
});

it("works out the share of time ahead, level and behind", () => {
  const s = gameState([g("theirs", 600), g("ours", 1500), g("ours", 2400)], { ours: 2, theirs: 1 }, [[0, 3000]]);
  if (!s.complete) throw new Error(s.reason);
  expect(s.share).toEqual({ ahead: 0.2, level: 0.5, behind: 0.3 });
  expect(s.segments.map((x) => [x.from, x.to, x.state])).toEqual([[0, 600, "level"], [600, 1500, "behind"], [1500, 2400, "level"], [2400, 3000, "ahead"]]);
});

it("joins stretches with the same state, so two goals against make one behind stretch", () => {
  const s = gameState([g("theirs", 100), g("theirs", 200), g("ours", 300)], { ours: 1, theirs: 2 }, [[0, 400]]);
  expect(s.complete && s.segments.map((x) => [x.from, x.to, x.state])).toEqual([[0, 100, "level"], [100, 400, "behind"]]);
});

it("counts only time inside the periods, so half-time is left out", () => {
  // Halves 0-1000 and 1200-2200; our goal at 500 -> level 500, ahead 500 + 1000.
  const s = gameState([g("ours", 500)], { ours: 1, theirs: 0 }, [[0, 1000], [1200, 2200]]);
  if (!s.complete) throw new Error(s.reason);
  expect(s.share).toEqual({ ahead: 0.75, level: 0.25, behind: 0 });
});

it("tells a lead that became a draw", () => {
  const s = gameState([g("ours", 100), g("theirs", 900)], { ours: 1, theirs: 1 }, [[0, 1000]]);
  expect(s.complete && s.story).toBe("led-drew");
});

it("gives nothing but the reason when the goals do not add up to the score", () => {
  const s = gameState([g("ours", 100), g("ours", 200), g("theirs", 300)], { ours: 3, theirs: 1 }, [[0, 1000]]);
  expect(s.complete).toBe(false);
  expect(!s.complete && s.reason).toMatch(/2-1.*3-1/);
  expect("segments" in s).toBe(false);
});

it("is incomplete when a goal has no time or there is no score", () => {
  expect(gameState([g("ours", null)], { ours: 1, theirs: 0 }, [[0, 1000]]).complete).toBe(false);
  expect(gameState([g("ours", 100)], null, [[0, 1000]]).complete).toBe(false);
});

it("a goalless draw is level all game with no first goal", () => {
  const s = gameState([], { ours: 0, theirs: 0 }, [[0, 1000]]);
  expect(s.complete && [s.share, s.firstGoal, s.story]).toEqual([{ ahead: 0, level: 1, behind: 0 }, null, null]);
});

it("finds the longest run of unanswered goals", () => {
  const s = gameState([g("theirs", 10), g("ours", 20), g("ours", 30), g("ours", 40)], { ours: 3, theirs: 1 }, [[0, 100]]);
  expect(s.complete && s.longestRun).toEqual({ side: "ours", goals: 3 });
});

it("without a span it still tells the story but gives no shares", () => {
  const s = gameState([g("theirs", 10), g("ours", 20)], { ours: 1, theirs: 1 });
  expect(s.complete && [s.share, s.segments, s.firstGoal]).toEqual([null, [], "theirs"]);
});

it("takes the span from Veo periods, else the Hudl tags, else the video length", () => {
  expect(matchSpan({ halves: [[10, 1500], [1700, 3200]], duration_s: 4000 })).toEqual([[10, 1500], [1700, 3200]]);
  expect(matchSpan({ moments: [{ id: "1", category: "X", time_s: 30, duration_s: 10 }, { id: "2", category: "Y", time_s: 2900, duration_s: 20 }], duration_s: 4000 })).toEqual([[30, 2920]]);
  expect(matchSpan({ duration_s: 4000 })).toEqual([[0, 4000]]);
  expect(matchSpan({})).toBeNull();
});

it("adds up a season: scored first with results, came from behind, clean sheets, and how many matches", () => {
  const states = [
    gameState([g("ours", 1), g("theirs", 2), g("ours", 3)], { ours: 2, theirs: 1 }), // scored first, won
    gameState([g("ours", 1), g("theirs", 2)], { ours: 1, theirs: 1 }), // scored first, drew
    gameState([g("theirs", 1), g("ours", 2), g("ours", 3)], { ours: 2, theirs: 1 }), // behind, won
    gameState([g("ours", 1)], { ours: 1, theirs: 0 }), // scored first, won, clean sheet
    gameState([g("ours", 1)], { ours: 2, theirs: 0 }), // incomplete, still a clean sheet
    gameState([], null), // no score
  ];
  const scores = [{ ours: 2, theirs: 1 }, { ours: 1, theirs: 1 }, { ours: 2, theirs: 1 }, { ours: 1, theirs: 0 }, { ours: 2, theirs: 0 }, null];
  expect(seasonGameLines(states, scores)).toEqual([
    { label: "Scored first", value: "3 (won 2, drew 1, lost 0)" },
    { label: "Came from behind", value: "won 1, drew 0" },
    { label: "Clean sheets", value: "2" },
    { label: "Goal times known", value: "4 of 6 matches" },
  ]);
});

it("leaves out came from behind when it never happened, and everything when no goal times are known", () => {
  const lines = seasonGameLines([gameState([g("ours", 1)], { ours: 1, theirs: 0 })], [{ ours: 1, theirs: 0 }]);
  expect(lines.map((l) => l.label)).toEqual(["Scored first", "Clean sheets", "Goal times known"]);
  expect(seasonGameLines([gameState([g("ours", null)], { ours: 1, theirs: 0 })], [{ ours: 1, theirs: 0 }])).toEqual([]);
  expect(seasonGameLines([gameState([g("theirs", 1)], { ours: 0, theirs: 1 })], [{ ours: 0, theirs: 1 }])[0]).toEqual({ label: "Scored first", value: "0" });
});
