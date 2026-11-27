import { describe, expect, it } from "vitest";
import { analyticsTags, attackDirection, ballsHeld, type AnalyticsTag } from "./analyticsTags";
import type { Assignment, Observation, Team } from "./labTypes";
import type { PitchPoint } from "./livePitch";

/* Synthetic 2D pitches: 60 x 40 m, people and ball sampled every 0.2 s. Our keeper stands at the
 * left goal (x = 2), theirs at the right (x = 58), so we attack towards x = 60. */
const SIZE = { length_m: 60, width_m: 40 };
const STEP = 0.2;
type Leg = [t0: number, t1: number, x0: number, y0: number, x1: number, y1: number];
function move(...legs: Leg[]): PitchPoint[] {
  const out: PitchPoint[] = [];
  for (const [t0, t1, x0, y0, x1, y1] of legs)
    for (let t = t0; t <= t1 + 1e-9; t += STEP) {
      const f = t1 > t0 ? (t - t0) / (t1 - t0) : 0;
      out.push({ time_s: Math.round(t * 100) / 100, x: x0 + (x1 - x0) * f, y: y0 + (y1 - y0) * f });
    }
  return out;
}
const still = (t0: number, t1: number, x: number, y: number) => move([t0, t1, x, y, x, y]);
const OWN_GK = 1, OPP_GK = 2;
function teamsOf(map: Record<number, [Team | null, Assignment["role"]]>) {
  return (track: number): Assignment | undefined => {
    const v = map[track];
    return v ? { team: v[0], role: v[1], source: "you", confidence: 1 } : undefined;
  };
}
function run(players: Record<number, PitchPoint[]>, ball: PitchPoint[], roles: Record<number, [Team | null, Assignment["role"]]>, end = 20, held?: { time_s: number; track_id: number }[]) {
  const paths = new Map<number, PitchPoint[]>([[OWN_GK, still(0, end, 2, 20)], [OPP_GK, still(0, end, 58, 20)], ...Object.entries(players).map(([k, v]) => [Number(k), v] as [number, PitchPoint[]])]);
  const teamOf = teamsOf({ [OWN_GK]: ["own", "goalkeeper"], [OPP_GK]: ["opponent", "goalkeeper"], ...roles });
  return analyticsTags({ paths, ball, size: SIZE, teamAt: (track) => teamOf(track), held });
}
const of = (tags: AnalyticsTag[], type: string) => tags.filter(t => t.type === type);

describe("attackDirection", () => {
  it("reads which way each team attacks from where its keeper stands", () => {
    const paths = new Map([[OWN_GK, still(0, 10, 2, 20)], [OPP_GK, still(0, 10, 58, 20)]]);
    const teamOf = teamsOf({ [OWN_GK]: ["own", "goalkeeper"], [OPP_GK]: ["opponent", "goalkeeper"] });
    expect(attackDirection(paths, teamOf, SIZE)).toBe(1);
    const flipped = new Map([[OWN_GK, still(0, 10, 58, 20)], [OPP_GK, still(0, 10, 2, 20)]]);
    expect(attackDirection(flipped, teamOf, SIZE)).toBe(-1);
  });
  it("without keepers, the team whose deepest player is nearer an end defends that end", () => {
    const paths = new Map([[3, still(0, 10, 8, 20)], [4, still(0, 10, 30, 20)], [5, still(0, 10, 25, 20)], [6, still(0, 10, 50, 10)]]);
    const teamOf = teamsOf({ 3: ["own", "player"], 4: ["own", "player"], 5: ["opponent", "player"], 6: ["opponent", "player"] });
    expect(attackDirection(paths, teamOf, SIZE)).toBe(1);
  });
  it("says nothing when no team is placed", () => {
    expect(attackDirection(new Map(), () => undefined, SIZE)).toBeNull();
  });
});

describe("analyticsTags", () => {
  it("gives possession to the team on the ball and changes it when the other team wins it", () => {
    // Our 3 dribbles 0-4 s; their 4 takes it at 5 s and runs off with it.
    const ball = [...move([0, 4, 20, 20, 28, 20]), ...move([4.2, 10, 28.5, 20, 22, 25])];
    const tags = run({ 3: move([0, 4, 20, 20.5, 28, 20.5], [4.2, 10, 28, 20.5, 28, 20.5]), 4: move([0, 4, 32, 21, 29, 21], [4.2, 10, 28.5, 20.5, 22, 25.5]) }, ball, { 3: ["own", "player"], 4: ["opponent", "player"] });
    const possession = of(tags, "possession");
    expect(possession.map(t => t.team)).toEqual(["own", "opponent"]);
    expect(possession[0].time_s).toBeLessThan(0.5);
    // Both players are at the ball for a moment (the tackle): contested until one is clearly on it.
    expect(possession[1].time_s).toBeGreaterThan(3.9);
    expect(possession[1].time_s).toBeLessThan(6);
    expect(possession[0].end_s).toBeCloseTo(possession[1].time_s, 6);
  });

  it("never gives possession to a referee or an unassigned person beside the ball", () => {
    const ball = still(0, 6, 30, 20);
    const tags = run({ 7: still(0, 6, 30, 20.3), 8: still(0, 6, 30.3, 20) }, ball, { 7: [null, "referee"], 8: [null, "player"] });
    expect(of(tags, "possession")).toEqual([]);
  });

  it("tags a pass between two of our players, from the passer, at the moment it leaves him", () => {
    // 3 holds at x 20 until 2 s, the ball travels 15 m in 1 s, 5 receives it at x 35.
    const ball = [...still(0, 2, 20, 20), ...move([2.2, 3, 22, 20, 35, 20]), ...still(3.2, 6, 35, 20)];
    const tags = run({ 3: still(0, 6, 20, 20.4), 5: still(0, 6, 35, 20.4) }, ball, { 3: ["own", "player"], 5: ["own", "player"] });
    const passes = of(tags, "pass");
    expect(passes).toHaveLength(1);
    expect(passes[0]).toMatchObject({ team: "own", track_id: 3 });
    expect(passes[0].time_s).toBeGreaterThanOrEqual(1.8);
    expect(passes[0].time_s).toBeLessThanOrEqual(2.4);
    expect(passes[0].evidence).toMatch(/15 m/);
  });

  it("does not call a pass when the ball goes to the other team: that is possession changing", () => {
    const ball = [...still(0, 2, 20, 20), ...move([2.2, 3, 22, 20, 35, 20]), ...still(3.2, 6, 35, 20)];
    const tags = run({ 3: still(0, 6, 20, 20.4), 5: still(0, 6, 35, 20.4) }, ball, { 3: ["own", "player"], 5: ["opponent", "player"] });
    expect(of(tags, "pass")).toEqual([]);
    expect(of(tags, "possession").map(t => t.team)).toEqual(["own", "opponent"]);
  });

  it("puts the ball out of play over a touchline and gives the throw to the other team", () => {
    // Our 3 plays it over the far touchline at about 2 s; their 4 throws it in at 8 s.
    const ball = [...move([0, 1, 30, 30, 30, 36]), ...move([1.2, 2.4, 30, 37, 30, 44]), ...move([8, 9, 30, 40, 30, 34])];
    const tags = run({ 3: move([0, 1, 30, 30.4, 30, 36]), 4: move([0, 7.8, 25, 30, 30, 40.4], [8, 9, 30, 40.4, 30, 40.4]) }, ball, { 3: ["own", "player"], 4: ["opponent", "player"] });
    const out = of(tags, "ball_out_of_play");
    expect(out).toHaveLength(1);
    expect(out[0].time_s).toBeGreaterThan(1);
    expect(out[0].time_s).toBeLessThan(2.6);
    expect(out[0].end_s).toBeGreaterThan(7.5);
    expect(of(tags, "throw")).toMatchObject([{ team: "opponent" }]);
    expect(of(tags, "corner")).toEqual([]);
  });

  it("over the goal line: a goal kick when the attackers touched it last, a corner when the defenders did", () => {
    // We attack x = 60. The ball leaves over that goal line, wide of the goal.
    const ball = [...move([0, 1, 50, 8, 57, 8]), ...move([1.2, 2, 59, 8, 64, 8]), ...still(8, 9, 55, 18)];
    const attackerLast = run({ 3: move([0, 1, 50, 8.4, 57, 8.4]), 4: still(0, 9, 55, 18.4) }, ball, { 3: ["own", "player"], 4: ["opponent", "player"] });
    expect(of(attackerLast, "goal_kick")).toMatchObject([{ team: "opponent" }]);
    expect(of(attackerLast, "corner")).toEqual([]);
    const defenderLast = run({ 3: move([0, 1, 50, 8.4, 57, 8.4]), 4: still(0, 9, 59.6, 1.4) }, [...move([0, 1, 50, 8, 57, 8]), ...move([1.2, 2, 59, 8, 64, 8]), ...still(8, 9, 59.5, 1)], { 3: ["opponent", "player"], 4: ["own", "player"] });
    expect(of(defenderLast, "corner")).toMatchObject([{ team: "own" }]);
  });

  describe("a stoppage nobody sees the ball leave: everyone stands, the ball rests, then play restarts", () => {
    // Players run 0-4 s, stand 4-14 s while the ball rests at `spot`, then run again 14-20 s.
    function stoppage(spot: [number, number], nearest: Team) {
      const runner = (x: number, y: number) => move([0, 4, x - 8, y, x, y], [4.2, 14, x, y, x, y], [14.2, 20, x, y, x + 10, y]);
      const ball = [...move([0, 3, 30, 20, 34, 20]), ...still(6, 14, spot[0], spot[1]), ...move([14.2, 15, spot[0], spot[1], 30, 20])];
      return run({ 3: runner(spot[0] + 0.5, spot[1] + 0.5), 4: runner(spot[0] + 6, spot[1] + 6), 5: runner(20, 25), 6: runner(40, 15), 7: runner(35, 30) }, ball,
        { 3: [nearest, "player"], 4: [nearest === "own" ? "opponent" : "own", "player"], 5: ["own", "player"], 6: ["opponent", "player"], 7: ["own", "player"] });
    }
    it("is ball out of play from when they stop until it is played again", () => {
      const out = of(stoppage([30, 39.5], "opponent"), "ball_out_of_play");
      expect(out).toHaveLength(1);
      expect(out[0].time_s).toBeGreaterThan(2.5);
      expect(out[0].time_s).toBeLessThan(5);
      expect(out[0].end_s).toBeGreaterThan(13);
      expect(out[0].end_s).toBeLessThan(15.5);
    });
    it("on a touchline: a throw to the team of the player at the ball", () => {
      const tags = stoppage([30, 39.5], "opponent");
      expect(of(tags, "throw")).toMatchObject([{ team: "opponent", track_id: 3 }]);
      expect([...of(tags, "corner"), ...of(tags, "goal_kick"), ...of(tags, "free_kick")]).toEqual([]);
    });
    it("at a corner flag: a corner to the team attacking that end", () => {
      expect(of(stoppage([59, 1], "own"), "corner")).toMatchObject([{ team: "own" }]);
      expect(of(stoppage([1, 39], "opponent"), "corner")).toMatchObject([{ team: "opponent" }]);
    });
    it("by a goal: a goal kick to the team defending it", () => {
      expect(of(stoppage([4, 21], "own"), "goal_kick")).toMatchObject([{ team: "own" }]);
      expect(of(stoppage([56, 19], "opponent"), "goal_kick")).toMatchObject([{ team: "opponent" }]);
    });
    it("anywhere else: a free kick to the team of the player at the ball", () => {
      const tags = stoppage([25, 15], "own");
      expect(of(tags, "free_kick")).toMatchObject([{ team: "own", track_id: 3 }]);
      expect(of(tags, "throw")).toEqual([]);
    });
  });

  it("when the ball is seen leaving, that decides the restart even if the next sighting is misplaced", () => {
    // Our 3 plays it over the far touchline; the next sighting is 10 m inside (the far side is approximate).
    const ball = [...move([0, 1, 30, 30, 30, 36]), ...move([1.2, 2.4, 30, 37, 30, 44]), ...still(8, 9, 30, 30)];
    const tags = run({ 3: move([0, 1, 30, 30.4, 30, 36]), 4: still(0, 9, 31, 30.5) }, ball, { 3: ["own", "player"], 4: ["own", "player"] });
    expect(of(tags, "throw")).toMatchObject([{ team: "opponent" }]);
    expect(of(tags, "free_kick")).toEqual([]);
    // Over the goal line we attack, wide, our player last: their goal kick, though a ball shows up at the far end.
    const kick = [...move([0, 1, 50, 8, 57, 8]), ...move([1.2, 2, 59, 8, 64, 8]), ...still(8, 9, 4, 20)];
    const goalKick = run({ 3: move([0, 1, 50, 8.4, 57, 8.4]), 4: still(0, 9, 4, 20.5) }, kick, { 3: ["own", "player"], 4: ["own", "player"] });
    expect(of(goalKick, "goal_kick")).toMatchObject([{ team: "opponent" }]);
  });

  it("a ball held overhead by a player on the touchline at the restart is a throw, wherever the ball itself projects", () => {
    // Everyone stands 4-14 s; our 3 stands on the near touchline holding the ball up, which projects 9 m in.
    const runner = (x: number, y: number) => move([0, 4, x - 8, y, x, y], [4.2, 14, x, y, x, y], [14.2, 20, x, y, x + 10, y]);
    const ball = [...move([0, 3, 30, 20, 34, 20]), ...still(6, 14, 30, 9), ...move([14.2, 15, 30, 2, 30, 12])];
    const tags = run({ 3: runner(30, 0.5), 4: runner(30, 12), 5: runner(20, 25), 6: runner(40, 15), 7: runner(35, 30) }, ball,
      { 3: ["own", "player"], 4: ["opponent", "player"], 5: ["own", "player"], 6: ["opponent", "player"], 7: ["own", "player"] }, 20,
      [{ time_s: 12, track_id: 3 }, { time_s: 13.6, track_id: 3 }]);
    expect(of(tags, "throw")).toMatchObject([{ team: "own", track_id: 3 }]);
    expect(of(tags, "free_kick")).toEqual([]);
  });

  it("a stoppage that ends with no sighting of the ball restarts as a free kick to the team that next has it", () => {
    const runner = (x: number, y: number) => move([0, 4, x - 8, y, x, y], [4.2, 14, x, y, x, y], [14.2, 20, x, y, x + 10, y]);
    const ball = [...move([0, 3, 30, 20, 34, 20]), ...move([15.6, 20, 30.5, 20, 40, 20])];
    const tags = run({ 3: runner(30, 20.5), 4: runner(36, 12), 5: runner(20, 25), 6: runner(40, 15), 7: runner(35, 30) }, ball,
      { 3: ["own", "player"], 4: ["opponent", "player"], 5: ["own", "player"], 6: ["opponent", "player"], 7: ["own", "player"] });
    expect(of(tags, "ball_out_of_play")).toHaveLength(1);
    expect(of(tags, "free_kick")).toMatchObject([{ team: "own" }]);
  });

  it("a quick throw: a player holding the ball up on a touchline is a throw even when play barely stopped", () => {
    const ball = [...move([0, 3, 30, 20, 30, 38]), ...move([5, 7, 30, 30, 30, 20])];
    const tags = run({ 3: move([0, 3, 30, 18, 30, 39.6], [3.2, 7, 30, 39.6, 30, 39.6]), 4: move([0, 7, 20, 20, 28, 30]), 5: move([0, 7, 40, 10, 34, 25]) }, ball,
      { 3: ["opponent", "player"], 4: ["own", "player"], 5: ["own", "player"] }, 20,
      [{ time_s: 4, track_id: 3 }, { time_s: 4.4, track_id: 3 }, { time_s: 4.8, track_id: 3 }]);
    expect(of(tags, "throw")).toMatchObject([{ team: "opponent", track_id: 3 }]);
    expect(of(tags, "throw")[0].time_s).toBeCloseTo(4.8, 6);
  });

  it("a keeper holding the ball is never a throw", () => {
    const ball = still(0, 6, 2, 20);
    const tags = run({}, ball, {}, 20, [{ time_s: 3, track_id: OWN_GK }, { time_s: 3.4, track_id: OWN_GK }]);
    expect(of(tags, "throw")).toEqual([]);
  });

  it("a restart from the centre spot is a kick-off: the stoppage before it was a goal for the other team", () => {
    // Everyone stands 4-14 s; the ball waits on the centre spot; their 4 kicks off.
    const runner = (x: number, y: number) => move([0, 4, x - 8, y, x, y], [4.2, 14, x, y, x, y], [14.2, 20, x, y, x + 10, y]);
    const ball = [...move([0, 3, 50, 20, 61, 20]), ...still(8, 14, 30, 20), ...move([14.2, 15, 30, 20, 25, 20])];
    const tags = run({ 3: runner(50, 22), 4: runner(30.5, 20.5), 5: runner(20, 25), 6: runner(40, 15), 7: runner(35, 30) }, ball,
      { 3: ["own", "player"], 4: ["opponent", "player"], 5: ["own", "player"], 6: ["opponent", "player"], 7: ["own", "player"] });
    expect(of(tags, "goal")).toMatchObject([{ team: "own" }]);
    expect(of(tags, "goal")[0].time_s).toBeLessThan(5);
    expect([...of(tags, "free_kick"), ...of(tags, "throw"), ...of(tags, "goal_kick")]).toEqual([]);
  });

  it("does not stop play while the ball is being moved, even if most people stand", () => {
    // Our 3 carries the ball the length of the pitch while everyone else watches.
    const ball = move([0, 12, 5, 20, 55, 20]);
    const tags = run({ 3: move([0, 12, 5, 20.5, 55, 20.5]), 4: still(0, 12, 30, 10), 5: still(0, 12, 30, 30) }, ball, { 3: ["own", "player"], 4: ["opponent", "player"], 5: ["opponent", "player"] });
    expect(of(tags, "ball_out_of_play")).toEqual([]);
  });

  it("tags the third a possession starts in, each third it is carried into, and entering the box", () => {
    // Our 3 wins it at x 10 (our defensive third) and carries it to x 55 (inside their box).
    const ball = move([0, 9, 10, 20, 55, 20]);
    const tags = run({ 3: move([0, 9, 10, 20.5, 55, 20.5]) }, ball, { 3: ["own", "player"] });
    expect(tags.filter(t => t.type.endsWith("third_entry")).map(t => [t.type, t.team])).toEqual([
      ["defensive_third_entry", "own"], ["midfield_third_entry", "own"], ["attacking_third_entry", "own"],
    ]);
    const box = of(tags, "penalty_area_entry");
    expect(box).toMatchObject([{ team: "own" }]);
    expect(box[0].time_s).toBeGreaterThan(7.5);
  });

  it("calls a fast ball into the goal they attack a chance, and on target when it crosses between the posts", () => {
    // Our 3 shoots from x 45 into the goal at x 60 (posts at y 20 +- 2.2 on this pitch).
    const ball = [...still(0, 1, 45, 20), ...move([1.2, 2, 48, 20, 61, 20.5])];
    const tags = run({ 3: still(0, 3, 45, 20.4) }, ball, { 3: ["own", "player"] });
    expect(of(tags, "chance")).toMatchObject([{ team: "own", track_id: 3 }]);
    expect(of(tags, "on_target")).toMatchObject([{ team: "own" }]);
  });

  it("calls a ball from the wing into the box a cross", () => {
    const ball = [...still(0, 1, 48, 3), ...move([1.2, 2, 50, 6, 54, 19]), ...still(2.2, 4, 54, 20)];
    const tags = run({ 3: still(0, 4, 48, 3.4), 5: still(0, 4, 54, 20.4) }, ball, { 3: ["own", "player"], 5: ["own", "player"] });
    expect(of(tags, "cross")).toMatchObject([{ team: "own", track_id: 3 }]);
  });

  it("gives every tag a stable id, a team or none, and says it came from the pitch analytics", () => {
    const ball = move([0, 9, 10, 20, 55, 20]);
    const a = run({ 3: move([0, 9, 10, 20.5, 55, 20.5]) }, ball, { 3: ["own", "player"] });
    const b = run({ 3: move([0, 9, 10, 20.5, 55, 20.5]) }, ball, { 3: ["own", "player"] });
    expect(a.map(t => t.id)).toEqual(b.map(t => t.id));
    expect(new Set(a.map(t => t.id)).size).toBe(a.length);
    for (const t of a) expect(t.id.startsWith("analytics-")).toBe(true);
  });

  it("produces nothing without a ball on the pitch", () => {
    expect(run({ 3: still(0, 5, 20, 20) }, [], { 3: ["own", "player"] })).toEqual([]);
  });
});

describe("ballsHeld", () => {
  const person = (track: number, time: number, x0: number, y0: number, x1: number, y1: number): Observation => ({ track_id: track, time_s: time, team_id: null, role: "player", image_box: [x0, y0, x1, y1] });
  const rows = [person(3, 1, 0.40, 0.50, 0.44, 0.62), person(4, 1, 0.60, 0.50, 0.64, 0.62)];
  it("finds the person holding the ball up: the ball at or just above the top of their box", () => {
    expect(ballsHeld(rows, [{ time_s: 1, x: 0.42, y: 0.495, r: 0.004 }])).toEqual([{ time_s: 1, track_id: 3 }]);
    expect(ballsHeld(rows, [{ time_s: 1, x: 0.62, y: 0.52, r: 0.004 }])).toEqual([{ time_s: 1, track_id: 4 }]);
  });
  it("a ball at someone's feet, beside them or at another moment is not held", () => {
    expect(ballsHeld(rows, [{ time_s: 1, x: 0.42, y: 0.615, r: 0.004 }])).toEqual([]);
    expect(ballsHeld(rows, [{ time_s: 1, x: 0.50, y: 0.50, r: 0.004 }])).toEqual([]);
    expect(ballsHeld(rows, [{ time_s: 2, x: 0.42, y: 0.495, r: 0.004 }])).toEqual([]);
  });
});
