import { expect, it } from "vitest";
import { teamSplit, veoMomentum } from "./veoTeamSplit";

// Decision 009 (owner, 2026-11-14): Veo's events service and match report give each
// event's team. Synthetic data only.
const e = (type: string, side: "own" | "opponent" | null, time_s: number) => ({ type, side, time_s, period: 1 });
const events = [
  e("KICK OFF", "own", 51), e("SHOT", "own", 120), e("GOAL", "own", 125), e("THROW IN", "opponent", 200),
  e("THROW IN", "own", 210), e("GOAL KICK", "opponent", 300), e("SHOT", "opponent", 410), e("SHOT", null, 500),
];

it("prefers Veo's key stats and adds the event counts it does not cover", () => {
  const rows = teamSplit({ stats: { goals: { own: 3, opponent: 1 }, total_attempts: { own: 9, opponent: 4 } }, events });
  expect(rows).toEqual([
    { label: "Goals", own: 3, opponent: 1 },
    { label: "Attempts", own: 9, opponent: 4 },
    { label: "Throw-ins", own: 1, opponent: 1 },
    { label: "Goal kicks", own: 0, opponent: 1 },
  ]);
});

it("counts the events when there is no match report", () => {
  const rows = teamSplit({ stats: {}, events });
  expect(rows.slice(0, 2)).toEqual([{ label: "Goals", own: 1, opponent: 0 }, { label: "Attempts", own: 2, opponent: 1 }]);
});

it("has nothing to show without team data", () => {
  expect(teamSplit(null)).toEqual([]);
  expect(teamSplit({ stats: {}, events: [] })).toEqual([]);
});

// Owner request 2026-11-15: each side's totals from Veo's events service.
it("uses each side's totals from Veo for the counts it gives", () => {
  const totals = {
    missed_shots: { own: 8, opponent: 5 }, out_of_play: { own: 13, opponent: 17 },
    throw_in: { own: 4, opponent: 6 }, penalty_kick: { own: 0, opponent: 1 },
  };
  const rows = teamSplit({ stats: { goals: { own: 3, opponent: 1 } }, events, totals });
  expect(rows).toEqual([
    { label: "Goals", own: 3, opponent: 1 },
    { label: "Attempts", own: 2, opponent: 1 },
    { label: "Missed shots", own: 8, opponent: 5 },
    { label: "Penalties", own: 0, opponent: 1 },
    { label: "Throw-ins", own: 4, opponent: 6 },
    { label: "Goal kicks", own: 0, opponent: 1 },
    { label: "Out of play", own: 13, opponent: 17 },
  ]);
});

// Owner request 2026-11-15: Hudl-style momentum from Veo's team events.
it("weighs each side's events per minute, with goals and half-time", () => {
  const ev = [
    e("CORNER KICK", "own", 30), e("SHOT", "own", 40), e("GOAL", "own", 45),
    e("SHOT", "opponent", 130), e("THROW IN", "opponent", 140), e("SHOT", null, 150),
  ];
  const { minutes, halves } = veoMomentum(ev, [[0, 100], [120, 200]], 200);
  expect(minutes).toHaveLength(4);
  expect(minutes[0]).toMatchObject({ ours: 9, theirs: 0, oursAt: 30, goals: { ours: 1, theirs: 0 } });
  expect(minutes[2]).toMatchObject({ ours: 0, theirs: 3, theirsAt: 130 });
  expect(halves).toEqual([100]);
  expect(veoMomentum([e("THROW IN", "own", 5)], undefined, 60).minutes).toEqual([]);
});
