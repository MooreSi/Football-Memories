import { describe, expect, it } from "vitest";
import { readiness, scanPlan } from "./preAnalysis";

describe("scanPlan", () => {
  it("scans ten minutes of settled play from minute five of a full match", () => {
    expect(scanPlan(3600)).toMatchObject({ start_s: 300, duration_s: 600 });
  });
  it("starts earlier so the ten minutes still fit in a short match", () => {
    expect(scanPlan(720)).toMatchObject({ start_s: 120, duration_s: 600 });
  });
  it("scans the whole of a match shorter than ten minutes, in whole minutes", () => {
    expect(scanPlan(530)).toMatchObject({ start_s: 0, duration_s: 480 });
  });
  it("refuses a match under one minute", () => {
    expect(scanPlan(45)).toBeNull();
  });
  it("starts a minute after Veo's kick-off (261122 NL vs Bournville Greens kicked off at 10:00)", () => {
    expect(scanPlan(3904, [[600, 2156], [2314, 3831]])).toMatchObject({ start_s: 660, duration_s: 600 });
  });
  it("keeps the scan inside a short first half", () => {
    expect(scanPlan(3000, [[100, 560], [700, 1200]])).toMatchObject({ start_s: 160, duration_s: 360 });
  });
  it("ignores halves that do not fit the match", () => {
    expect(scanPlan(3600, [[4000, 5000]])).toMatchObject({ start_s: 300, duration_s: 600 });
  });
  it("assumes a full match when the length is unknown", () => {
    expect(scanPlan(null)).toMatchObject({ start_s: 300, duration_s: 600 });
  });
});

const summary = { sampled_frames: 720, person_detections: 22995, ball_detections: 444, unique_tracklets: 549, ball_observation_coverage: 0.57, football_events_confirmed: 0 };
const views = (solved: number, total: number) => Array.from({ length: total }, (_, i) => (i < solved ? [1, 0, 0, 0, 1, 0, 0, 0, 1] : null));
const atlas = (unseen: boolean[], solved = 1150) => ({ projection: { kind: "cylindrical" }, frame_to_panorama: views(solved, 1199), times: views(1199, 1199).map((_, i) => i / 5),
  pitch_outline: { method: "painted_lines", unseen_sides: unseen, centre_circle: true, halfway: null } });
const status = (items: ReturnType<typeof readiness>) => Object.fromEntries(items.map(i => [i.key, i.status]));

describe("readiness", () => {
  it("is ready for the pitch when you accepted the outline and nearly every view is registered", () => {
    const items = readiness({ summary, atlas: atlas([false, false, false, false]), accepted: true, groups: 6, labels: { own: true, opponent: true, referee: true } });
    expect(status(items)).toEqual({ panorama: "ready", outline: "ready", players: "ready", ball: "ready", teams: "ready", referee: "ready" });
  });
  it("never calls an unchecked automatic outline ready (261122 Bournville: four sides found on the wrong, empty pitch)", () => {
    const outline = readiness({ summary, atlas: atlas([false, false, false, false]), groups: 6, labels: { own: true, opponent: true, referee: true } }).find(i => i.key === "outline")!;
    expect(outline.status).toBe("partial");
    expect(outline.detail).toMatch(/check that it frames the pitch the match is played on/);
  });
  it("marks the outline partial and names how many sides were estimated", () => {
    const outline = readiness({ summary, atlas: atlas([false, true, false, false]), groups: 6, labels: { own: false, opponent: false, referee: false } }).find(i => i.key === "outline")!;
    expect(outline.status).toBe("partial");
    expect(outline.detail).toMatch(/1 side estimated/);
  });
  it("marks the panorama partial when a fifth of the views did not register (NL 260926: 954 of 1199)", () => {
    expect(status(readiness({ summary, atlas: atlas([false, false, false, false], 954), groups: 6, labels: { own: true, opponent: true, referee: true } })).panorama).toBe("partial");
  });
  it("reports a missing pitch when the run has no atlas", () => {
    expect(status(readiness({ summary, atlas: undefined, groups: 0, labels: { own: false, opponent: false, referee: false } }))).toMatchObject({ panorama: "missing", outline: "missing", teams: "missing" });
  });
  it("does not claim teams or a referee from look-alike groups alone", () => {
    const items = status(readiness({ summary, atlas: atlas([false, false, false, false]), groups: 6, labels: { own: true, opponent: false, referee: false } }));
    expect(items.teams).toBe("partial");
    expect(items.referee).toBe("partial");
  });
  it("marks thin ball and player evidence", () => {
    const thin = { ...summary, person_detections: 4000, ball_observation_coverage: 0.1 };
    expect(status(readiness({ summary: thin, atlas: atlas([false, false, false, false]), groups: 6, labels: { own: true, opponent: true, referee: true } }))).toMatchObject({ players: "partial", ball: "missing" });
  });
});
