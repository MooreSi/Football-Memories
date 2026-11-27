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

// Spec 760 Part B: a shirt in shade reads darker and bluer; the worker's balanced colour
// (corrected by the ground beside the player) puts it back on the labelled kit.
const SHADED_YELLOW = [70, 140, 150]; // still colourful, but over 20 units from the yellow kit
function balancedFiles(withBalanced: (track: number) => boolean, extra: Partial<RunFiles> = {}): RunFiles {
  const observations = [];
  for (let i = 0; i <= 12; i++) {
    const t = Math.round((i / 3) * 1000) / 1000;
    observations.push(
      { ...obs(1, t, YELLOW, 0.3), ...(withBalanced(1) ? { colour_lab_balanced: YELLOW } : {}) },
      { ...obs(2, t, RED, 0.6), ...(withBalanced(2) ? { colour_lab_balanced: RED } : {}) },
      { ...obs(3, t, SHADED_YELLOW, 0.45), ...(withBalanced(3) ? { colour_lab_balanced: YELLOW } : {}) },
    );
  }
  return { sourceSha: "s", assignments: { image_width: W, image_height: H, observations }, review: review([{ track_id: 1, team: "own", role: "player" }, { track_id: 2, team: "opponent", role: "player" }]), ...extra };
}
const track3 = (out: ReturnType<typeof labPredictions>) => out.observations.find(o => o.track_id === 3 && o.time_s === 2)!;

describe("balanced kit colour (spec 760 Part B)", () => {
  // The adoption gate failed on the withheld matches (26 Nov 2026), so balanced colour is off
  // unless asked for; it stays available for benchmark candidates.
  it("stays on the raw colour by default, even when every row has a balanced colour", () => {
    const out = labPredictions(balancedFiles(() => true));
    expect(out.colour).toBe("raw");
    expect(track3(out).source).not.toBe("kit");
  });

  it("matches a shaded shirt to its kit when balanced colour is asked for", () => {
    const out = labPredictions({ ...balancedFiles(() => true), colour: "balanced" });
    expect(out.colour).toBe("balanced");
    expect(track3(out)).toMatchObject({ team: "own", source: "kit" });
  });

  it("uses the raw colour for the whole run when any coloured row lacks a balanced colour", () => {
    const partial = labPredictions({ ...balancedFiles(t => t !== 2), colour: "balanced" });
    const raw = labPredictions({ ...balancedFiles(() => true), colour: "raw" });
    expect(partial.colour).toBe("raw");
    expect(partial.observations).toEqual(raw.observations);
    expect(track3(raw).source).not.toBe("kit");
  });

  it("does not apply kits remembered from other runs to balanced colours", () => {
    const remembered = [{ team: "own" as const, role: "player" as const, lab: SHADED_YELLOW, examples: 9 },
      { team: "opponent" as const, role: "player" as const, lab: RED, examples: 9 }];
    const files = (colour: "raw" | "balanced") => ({ ...balancedFiles(() => true), review: review([]), remembered, colour });
    expect(track3(labPredictions(files("raw"))).team).toBe("own"); // raw: remembered kit applies
    expect(track3(labPredictions(files("balanced"))).team).toBeNull(); // balanced: not reused
  });
});
