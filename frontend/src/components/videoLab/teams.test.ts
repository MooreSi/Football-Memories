import { describe, expect, it } from "vitest";
import { estimateActionTeam, propagateTeams } from "./teams";
import type { AppearanceTrack } from "./labTypes";

const track = (track_id: number, group: number, v: number[]): AppearanceTrack => ({ track_id, group, start_s: 0, end_s: 1, thumb: 0, v });
const tracks = [track(1, 0, [1, 0]), track(2, 0, [0.95, 0.05]), track(3, 1, [0, 1]), track(4, 2, [0.9, 0.1]), track(5, 3, [-1, -1])];

describe("propagateTeams", () => {
  it("prefers your own label, then the group's, then similar labelled players", () => {
    const result = propagateTeams(tracks, [{ track_id: 1, team: "own", role: "player" }], [{ group_id: 1, team: "opponent", role: "player" }], []);
    expect(result.get(1)).toMatchObject({ team: "own", source: "you" });
    expect(result.get(3)).toMatchObject({ team: "opponent", source: "group" });
    expect(result.get(4)).toMatchObject({ team: "own", source: "similar" });
  });
  it("shirt colour outweighs a similar build: same look, different kit is not the same team", () => {
    const kitTracks = [{ ...track(1, 0, [1, 0]), kit: [150, 170, 150] }, { ...track(2, 0, [1, 0]), kit: [90, 175, 150] }, { ...track(3, 0, [0.9, 0.1]), kit: [120, 125, 190] }];
    const result = propagateTeams(kitTracks, [{ track_id: 1, team: "own", role: "player" }], [], []);
    expect(result.get(2)).toMatchObject({ team: "own", source: "similar" });
    expect(result.get(3)).toMatchObject({ team: null, source: "none" });
  });
  it("a close match to players you labelled outranks a look-alike group label", () => {
    const result = propagateTeams(tracks, [{ track_id: 1, team: "own", role: "player" }], [{ group_id: 2, team: null, role: "other" }], []);
    expect(result.get(4)).toMatchObject({ team: "own", role: "player", source: "similar" });
  });
  it("with both teams labelled, a player goes to the clearly closer team and ties stay open", () => {
    const both = [track(1, 0, [1, 0]), track(2, 0, [0, 1]), track(3, 0, [0.9, 0.2]), track(4, 0, [0.7, 0.7])];
    const result = propagateTeams(both, [{ track_id: 1, team: "own", role: "player" }, { track_id: 2, team: "opponent", role: "player" }], [], []);
    expect(result.get(3)).toMatchObject({ team: "own", source: "similar" });
    expect(result.get(4)).toMatchObject({ team: null, source: "none" });
  });
  it("leaves dissimilar people unassigned instead of guessing", () => {
    const result = propagateTeams(tracks, [{ track_id: 1, team: "own", role: "player" }], [], []);
    expect(result.get(5)).toMatchObject({ team: null, source: "none" });
  });
  it("a goalkeeper label carries its role and team", () => {
    const result = propagateTeams(tracks, [{ track_id: 5, team: "opponent", role: "goalkeeper" }], [], []);
    expect(result.get(5)).toMatchObject({ team: "opponent", role: "goalkeeper" });
  });
  it("without appearance data, model kit teams named own/opponent are used and nothing else", () => {
    const result = propagateTeams([], [], [], [{ track_id: 9, time_s: 1, team_id: "own", role: "player_candidate" }, { track_id: 10, time_s: 1, team_id: "team_a", role: "player_candidate" }]);
    expect(result.get(9)).toMatchObject({ team: "own", source: "model" });
    expect(result.get(10)?.team ?? null).toBeNull();
  });
});

describe("estimateActionTeam", () => {
  const teams = propagateTeams(tracks, [{ track_id: 1, team: "own", role: "player" }, { track_id: 3, team: "opponent", role: "player" }], [], []);
  it("credits the team of the player nearest the ball", () => {
    expect(estimateActionTeam([{ track_id: 3, evidence: "ball_nearest", distance: 0.2 }, { track_id: 1, evidence: "ball_nearest", distance: 2 }], teams)).toMatchObject({ team: "opponent", evidence: "ball_nearest" });
  });
  it("stays unknown when nearby players are split or unassigned", () => {
    expect(estimateActionTeam([{ track_id: 1, evidence: "camera_focus", distance: 0.1 }, { track_id: 3, evidence: "camera_focus", distance: 0.1 }], teams).team).toBeNull();
    expect(estimateActionTeam([{ track_id: 5, evidence: "ball_nearest", distance: 0.1 }], teams).team).toBeNull();
    expect(estimateActionTeam([], teams).team).toBeNull();
  });
  it("never credits a referee with an action", () => {
    const withRef = propagateTeams(tracks, [{ track_id: 1, team: null, role: "referee" }], [], []);
    expect(estimateActionTeam([{ track_id: 1, evidence: "ball_nearest", distance: 0 }], withRef).team).toBeNull();
  });
});
