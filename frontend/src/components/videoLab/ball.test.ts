import { describe, expect, it } from "vitest";
import { ballAt, denseBalls, parseBalls, trackBall } from "./ball";

const W = 1920, H = 1080;
const ball = (x: number, y: number, score = 0.8) => ({ kind: "ball", box: [x - 15, y - 15, x + 15, y + 15], score });
const person = { kind: "person", box: [100, 100, 150, 300], score: 0.9, track_id: 1 };
const line = (time_s: number, detections: object[]) => JSON.stringify({ time_s, source_time_s: 960 + time_s, detections });

describe("parseBalls", () => {
  it("reads ball detections per sample from the worker's detections.jsonl and ignores people", () => {
    const text = [line(0, [person, ball(960, 540)]), line(1 / 3, [person]), "", line(2 / 3, [ball(980, 545, 0.6)])].join("\n");
    const samples = parseBalls(text);
    expect(samples.map(s => s.time_s)).toEqual([0, 1 / 3, 2 / 3]);
    expect(samples[0].balls).toEqual([{ box: [945, 525, 975, 555], score: 0.8 }]);
    expect(samples[1].balls).toEqual([]);
  });
  it("skips malformed lines instead of failing the whole overlay", () => {
    expect(parseBalls(`{oops\n${line(0, [ball(1, 1)])}`)).toHaveLength(1);
  });
});

describe("trackBall", () => {
  it("follows the moving match ball and ignores a spare ball resting at the edge of the picture", () => {
    const samples = Array.from({ length: 12 }, (_, i) => ({ time_s: i / 3, balls: [ball(800 + i * 20, 600).box, ball(60, 1000).box].map((box, j) => ({ box, score: j ? 0.85 : 0.75 })) }));
    const path = trackBall(samples, W, H);
    expect(path).toHaveLength(12);
    expect(path.every(p => p.x > 0.3)).toBe(true);
  });
  it("ignores a ball resting in one spot for many seconds (a spare by the bags), but keeps a ball waiting for a free kick", () => {
    const samples = Array.from({ length: 36 }, (_, i) => ({ time_s: i / 3, balls: [
      { box: ball(1770, 608).box, score: 0.75 },                                   // spare: 12 s in one spot
      ...(i < 15 ? [{ box: ball(1200, 536).box, score: 0.6 }] : i < 21 || i > 27 ? [{ box: ball(1200 - (i - 15) * 15, 520).box, score: 0.6 }] : []), // free kick: 5 s rest, played, then unseen 2 s
    ] }));
    const path = trackBall(samples, W, H);
    expect(path.every(p => p.x < 1700 / W)).toBe(true);
    expect(path.filter(p => p.time_s < 5)).toHaveLength(15);
  });
  it("ignores a ball cut off at the side of the picture (Veo keeps the match ball inside the frame)", () => {
    const samples = Array.from({ length: 6 }, (_, i) => ({ time_s: i / 3, balls: [{ box: [1895, 590, 1920, 612], score: 0.95 }] }));
    expect(trackBall(samples, W, H)).toEqual([]);
  });
  it("does not jump to a far-away ball for one sample", () => {
    const samples = Array.from({ length: 9 }, (_, i) => ({ time_s: i / 3, balls: [{ box: ball(900 + i * 10, 500).box, score: 0.7 }, ...(i === 4 ? [{ box: ball(1800, 100).box, score: 0.9 }] : [])] }));
    const path = trackBall(samples, W, H);
    expect(path.find(p => Math.abs(p.time_s - 4 / 3) < 1e-6)!.x).toBeCloseTo(940 / W, 2);
  });
  it("leaves gaps where no ball was seen", () => {
    const samples = [{ time_s: 0, balls: [{ box: ball(900, 500).box, score: 0.8 }] }, { time_s: 1 / 3, balls: [] }, { time_s: 2 / 3, balls: [{ box: ball(920, 500).box, score: 0.8 }] }];
    expect(trackBall(samples, W, H).map(p => p.time_s)).toEqual([0, 2 / 3]);
  });
});

describe("ballAt", () => {
  const path = [{ time_s: 0, x: 0.4, y: 0.5, r: 0.01 }, { time_s: 0.5, x: 0.5, y: 0.5, r: 0.01 }, { time_s: 3, x: 0.9, y: 0.5, r: 0.01 }];
  it("glides between neighbouring sightings", () => {
    expect(ballAt(path, 0.25)!.x).toBeCloseTo(0.45, 5);
  });
  it("glides across a short unseen stretch (up to a second and a half) between sightings", () => {
    const gap = [{ time_s: 10, x: 0.4, y: 0.5, r: 0.01 }, { time_s: 11.4, x: 0.54, y: 0.5, r: 0.01 }];
    expect(ballAt(gap, 10.7)!.x).toBeCloseTo(0.47, 5);
  });
  it("shows nothing across a long gap or far from any sighting", () => {
    expect(ballAt(path, 1.6)).toBeNull();
    expect(ballAt(path, 9)).toBeNull();
  });
});

describe("denseBalls", () => {
  it("turns whole-clip refinement balls (normalised boxes) into per-time samples in pixels", () => {
    const samples = denseBalls({ balls: [{ time_s: 0.1, image_box: [0.5, 0.5, 0.51, 0.52], score: 0.7 }, { time_s: 0.1, image_box: [0.1, 0.1, 0.11, 0.12], score: 0.4 }, { time_s: 0.2, image_box: [0.52, 0.5, 0.53, 0.52], score: 0.7 }] }, W, H);
    expect(samples.map(s => [s.time_s, s.balls.length])).toEqual([[0.1, 2], [0.2, 1]]);
    expect(samples[0].balls[0].box[0]).toBeCloseTo(960, 5);
  });
  it("is empty when the refinement kept no balls", () => {
    expect(denseBalls({}, W, H)).toEqual([]);
  });
});
