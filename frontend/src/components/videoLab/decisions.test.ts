import { describe, expect, it } from "vitest";
import { labPredictions, type RunFiles } from "./decisions";
import type { Review } from "./labTypes";

// OpenCV Lab, as the worker writes colour_lab.
const YELLOW = [105, 153, 173], RED = [80, 177, 160];
const W = 1920, H = 1080;
const obs = (track_id: number, time_s: number, colour_lab: number[], x: number) =>
  ({ track_id, time_s, team_id: null, role: "unknown", image_box: [x, 0.4, x + 0.02, 0.5], colour_lab });

const review = (labels: Review["track_labels"]): Review => ({
  revision: 1, source_sha256: "s", events: [], identities: [], reviewed_intervals: [], review_complete: false,
  track_labels: labels, group_labels: [], rejected_suggestions: [],
});

function files(labels: Review["track_labels"], extra: Partial<RunFiles> = {}): RunFiles {
  const observations = [];
  for (let i = 0; i <= 12; i++) {
    const t = Math.round((i / 3) * 1000) / 1000;
    observations.push(obs(1, t, YELLOW, 0.3), obs(2, t, RED, 0.6), obs(3, t, YELLOW, 0.45));
  }
  const detections = observations
    .filter(o => o.track_id === 1)
    .map(o => JSON.stringify({ time_s: o.time_s, detections: [{ kind: "ball", box: [950, 530, 970, 550], score: 0.9 }] }))
    .join("\n");
  return { sourceSha: "s", assignments: { image_width: W, image_height: H, observations }, review: review(labels), detections, ...extra };
}

describe("labPredictions (spec 760 exporter)", () => {
  it("gives every sample the team the lab shows, including people matched only by kit", () => {
    const out = labPredictions(files([{ track_id: 1, team: "own", role: "player" }, { track_id: 2, team: "opponent", role: "player" }]));
    expect(out.source_sha256).toBe("s");
    const at = (track: number) => out.observations.filter(o => o.track_id === track && o.time_s === 2);
    expect(at(1)[0]).toMatchObject({ team: "own", source: "you", shown: true });
    expect(at(2)[0]).toMatchObject({ team: "opponent", shown: true });
    expect(at(3)[0]).toMatchObject({ team: "own", source: "kit" }); // unlabelled, yellow shirt
    expect(out.observations).toHaveLength(39);
  });

  it("leaves people unassigned when nothing is labelled", () => {
    const out = labPredictions(files([]));
    expect(out.observations.every(o => o.team === null)).toBe(true);
  });

  it("reports the match ball in image pixels at the sample times", () => {
    const out = labPredictions(files([]));
    expect(out.ball.length).toBeGreaterThan(0);
    expect(out.ball[0].x).toBeCloseTo(960, 0);
    expect(out.ball[0].y).toBeCloseTo(540, 0);
  });

  it("gives no ball without ball detections", () => {
    expect(labPredictions(files([], { detections: "" })).ball).toEqual([]);
  });
});
