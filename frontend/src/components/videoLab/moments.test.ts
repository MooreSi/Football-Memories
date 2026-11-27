import { describe, expect, it } from "vitest";
import { buildMoments, filterMoments, momentCounts } from "./moments";
import { propagateTeams } from "./teams";
import type { Review } from "./labTypes";

const review: Review = {
  revision: 1, source_sha256: "a".repeat(64), identities: [], reviewed_intervals: [], review_complete: false,
  track_labels: [{ track_id: 3, team: "opponent", role: "player" }], group_labels: [],
  rejected_suggestions: ["m-reject"],
  events: [
    { id: "m-approve", type: "header", time_s: 20, track_id: null, confirmed: true, team: "own" },
    { id: "mine-1", type: "tackle", time_s: 40, track_id: null, confirmed: true, team: "opponent" },
  ],
};
const suggestions = [
  { id: "m-approve", type: "pass", time_s: 20 },
  { id: "m-reject", type: "drive", time_s: 25 },
  { id: "m-open", type: "pass", time_s: 30, actor_candidates: [{ track_id: 3, evidence: "ball_nearest" as const, distance: 0.3 }] },
];
const veo = { events: [{ id: "veo-1", type: "corner", side: "own", time_s: 12 }], highlights: [{ source_id: "h1", source_label: "SHOT ON GOAL", time_s: 8 }] };
const teams = propagateTeams([], review.track_labels, [], []);

describe("buildMoments", () => {
  const moments = buildMoments({ veo, suggestions, review, teams });
  it("orders every source by time and keeps Veo sides", () => {
    expect(moments.map(m => m.time)).toEqual([8, 12, 20, 25, 30, 40]);
    expect(moments[1]).toMatchObject({ source: "veo", type: "corner", team: "own", status: "teacher" });
    expect(moments[0]).toMatchObject({ type: "shot on goal", team: null });
  });
  it("applies your approval (with your type and team) and rejection to model suggestions", () => {
    expect(moments.find(m => m.id === "m-approve")).toMatchObject({ status: "approved", type: "header", team: "own", teamBasis: "approved" });
    expect(moments.find(m => m.id === "m-reject")).toMatchObject({ status: "rejected" });
  });
  it("estimates an unreviewed action's team from the nearest labelled player and says so", () => {
    expect(moments.find(m => m.id === "m-open")).toMatchObject({ status: "unreviewed", team: "opponent", teamBasis: "estimated" });
  });
  it("includes actions you added yourself once", () => {
    expect(moments.filter(m => m.id === "mine-1")).toHaveLength(1);
    expect(moments.find(m => m.id === "mine-1")).toMatchObject({ source: "you", status: "approved" });
  });
});

describe("filterMoments", () => {
  const moments = buildMoments({ veo, suggestions, review, teams });
  it("filters by source, team and type together and hides rejected unless asked", () => {
    expect(filterMoments(moments, { source: "model", team: null, type: null }).map(m => m.id)).toEqual(["m-approve", "m-open"]);
    expect(filterMoments(moments, { source: null, team: "own", type: null }).map(m => m.id)).toEqual(["veo-1", "m-approve"]);
    expect(filterMoments(moments, { source: null, team: null, type: "pass" }).map(m => m.id)).toEqual(["m-open"]);
    expect(filterMoments(moments, { source: "model", team: null, type: null, showRejected: true })).toHaveLength(3);
  });
  it("counts per team split by source", () => {
    const counts = momentCounts(moments.filter(m => m.status !== "rejected"));
    expect(counts.own).toEqual({ veo: 1, model: 1, you: 0 });
    expect(counts.opponent).toEqual({ veo: 0, model: 1, you: 1 });
  });
});

describe("pitch analytics tags", () => {
  const analytics = [
    { id: "analytics-pass-own-1500", type: "pass" as const, team: "own" as const, time_s: 15, end_s: 16, track_id: 3, evidence: "Ball from one player to a team-mate, 14 m" },
    { id: "analytics-ball_out_of_play-none-2000", type: "ball_out_of_play" as const, team: null, time_s: 20, end_s: 31, track_id: null, evidence: "Players stopped and the ball was not in play" },
  ];
  const moments = buildMoments({ veo, suggestions, review, teams, analytics });
  it("join the timeline as their own source, estimated, with their team and evidence", () => {
    expect(moments.find(m => m.id === "analytics-pass-own-1500")).toMatchObject({ source: "analytics", type: "pass", team: "own", teamBasis: "estimated", status: "estimated", evidence: "Ball from one player to a team-mate, 14 m", time: 15 });
    expect(moments.find(m => m.id === "analytics-ball_out_of_play-none-2000")).toMatchObject({ source: "analytics", type: "ball out of play", team: null, teamBasis: "none" });
  });
  it("never replace or hide Veo tags, suggestions or your actions", () => {
    expect(moments.filter(m => m.source !== "analytics").map(m => m.id)).toEqual(buildMoments({ veo, suggestions, review, teams }).map(m => m.id));
  });
  it("filter as their own source and stay out of the tagged-action counts", () => {
    expect(filterMoments(moments, { source: "analytics", team: null, type: null }).map(m => m.id)).toEqual(["analytics-pass-own-1500", "analytics-ball_out_of_play-none-2000"]);
    expect(momentCounts(moments)).toEqual(momentCounts(buildMoments({ veo, suggestions, review, teams })));
  });
});
