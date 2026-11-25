import { describe, expect, it } from "vitest";
import { boxFromDrag, labelsBody, startingBoxes, type LabelSet } from "./frameLabels";

const frame = {
  index: 1, time_s: 12, image: "frames/0001.jpg", reasons: ["ball unseen"],
  proposals: [
    { kind: "person" as const, box: [0.1, 0.2, 0.12, 0.3], score: 0.9 },
    { kind: "person" as const, box: [0.5, 0.2, 0.52, 0.3], score: 0.2 },
    { kind: "ball" as const, box: [0.4, 0.4, 0.405, 0.41], score: 0.5 },
    { kind: "ball" as const, box: [0.7, 0.4, 0.705, 0.41], score: 0.31 },
  ],
};

describe("startingBoxes", () => {
  it("starts from the detector's confident boxes; weak ones are left for you to add", () => {
    expect(startingBoxes(frame).map(b => b.box[0])).toEqual([0.1, 0.4]);
  });
  it("proposals the assistant judged not to be balls (cones, kit) start unticked; you can still draw them", () => {
    expect(startingBoxes(frame, undefined, { ball: "visible", balls: [2], not_balls: [0], unsure: [] }).map(b => b.box[0])).toEqual([0.4]);
  });
  it("a frame you already saved starts from what you saved, not the proposals", () => {
    expect(startingBoxes(frame, { status: "confirmed", boxes: [{ kind: "ball", box: [0.6, 0.6, 0.61, 0.62] }] })).toEqual([{ kind: "ball", box: [0.6, 0.6, 0.61, 0.62] }]);
  });
});

describe("boxFromDrag", () => {
  it("turns a drag in either direction into a normalised box inside the frame", () => {
    expect(boxFromDrag([500, 300], [400, 200], 1000, 1000, "ball")).toEqual({ kind: "ball", box: [0.4, 0.2, 0.5, 0.3] });
    expect(boxFromDrag([-50, 10], [100, 1200], 1000, 1000, "person")!.box).toEqual([0, 0.01, 0.1, 1]);
  });
  it("ignores a click without a drag", () => {
    expect(boxFromDrag([400, 400], [401, 402], 1000, 1000, "ball")).toBeNull();
  });
});

describe("labelsBody", () => {
  it("sends the revision, the recording and only the frames you decided", () => {
    const set = { source_sha256: "c".repeat(64) } as LabelSet;
    const body = labelsBody(set, 3, { 1: { status: "confirmed", boxes: [{ kind: "ball", box: [0.4, 0.4, 0.41, 0.41] }] } });
    expect(body).toEqual({ revision: 3, source_sha256: "c".repeat(64), frames: { 1: { status: "confirmed", boxes: [{ kind: "ball", box: [0.4, 0.4, 0.41, 0.41] }] } } });
  });
});
