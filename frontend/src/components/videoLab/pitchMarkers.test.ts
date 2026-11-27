import { describe, expect, it } from "vitest";
import { boundaryAt, halfwayAt } from "./boundary";
import { labCamera, usableMarks } from "./decisions";
import { fixesPitch, PITCH_CORNERS, type Point } from "./landmarks";
import { imageToPitch } from "./metres";
import type { Panorama } from "./panorama";
import type { CameraMotion, PitchKeyframe } from "./pitch";
import { landmarksToSave, markingStart } from "./markingStart";
import { rayPanorama } from "./atlasGeometry";
import { buildMarkers, markerBoxesAt, markerHalfwayAt, markerImageToPitch, markerOutlineAt, markerPointsAt, penaltyBoxes } from "./pitchMarkers";
import { indexObservations, overlayAt } from "./LabVideo";
import type { Review } from "./labTypes";

/* A synthetic rotating, zooming camera 10 m above level ground (y down). The pitch runs X -30..30 m
 * along the near touchline and Z 20..60 m away from the camera: normalised u = (X+30)/60,
 * v = (Z-20)/40 (near touchline v = 0). Each sample's registered pose maps image -> world ray. */
const TILT = 0.3, HASH = "a".repeat(64), ID = "b".repeat(64);
const yawAt = (t: number) => 0.05 * t, zoomAt = (t: number) => 1 + 0.1 * t;
const mul = (a: number[], b: number[]) => [0, 1, 2].flatMap(r => [0, 1, 2].map(c => a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c]));
function inv(m: number[]) {
  const [a, b, c, d, e, f, g, h, i] = m;
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g, det = a * A + b * B + c * C;
  return [A, -(b * i - c * h), b * f - c * e, B, a * i - c * g, -(a * f - c * d), C, -(a * h - b * g), a * e - b * d].map(v => v / det);
}
function pose(yaw: number, zoom: number) {
  const k = [2 / zoom, 0, -1 / zoom, 0, 9 / 8 / zoom, -9 / 16 / zoom, 0, 0, 1];
  const rx = [1, 0, 0, 0, Math.cos(TILT), Math.sin(TILT), 0, -Math.sin(TILT), Math.cos(TILT)];
  const ry = [Math.cos(yaw), 0, Math.sin(yaw), 0, 1, 0, -Math.sin(yaw), 0, Math.cos(yaw)];
  return mul(ry, mul(rx, k));
}
function imageOf(m: number[], [u, v]: Point): Point {
  const w = inv(m), p = [u * 60 - 30, 10, v * 40 + 20];
  const q = [0, 1, 2].map(r => w[r * 3] * p[0] + w[r * 3 + 1] * p[1] + w[r * 3 + 2] * p[2]);
  return [q[0] / q[2], q[1] / q[2]];
}
const truth = (t: number, p: Point) => imageOf(pose(yawAt(t), zoomAt(t)), p);
const TIMES = [0, 1, 2, 3, 4, 5, 6, 7, 8];
function atlas(missing: number[] = []): Panorama {
  return {
    panorama_id: ID, source_sha256: HASH, image: "pitch_atlas.jpg", width: 2000, height: 800, times: TIMES, cuts: TIMES.slice(1).map(() => false),
    frame_to_panorama: TIMES.map(() => null), frame_to_world: TIMES.map(t => missing.includes(t) ? null : pose(yawAt(t), zoomAt(t))),
    projection: { kind: "cylindrical", origin: [-1.6, -1], span: [3.2, 2] }, suggested_boundary: [], keyframe_times: [],
  };
}
const HALFWAY: Point[] = [[0.5, 0], [0.5, 1]];
const NAMES = ["Near halfway intersection", "Far halfway intersection"];
function mark(time_s: number, image: (p: Point) => Point, extra: Partial<PitchKeyframe> = {}): PitchKeyframe {
  return { time_s, corners: PITCH_CORNERS.map(image), landmarks: HALFWAY.map((p, i) => ({ name: NAMES[i], pitch: p, image: image(p) })), ...extra };
}
const near = (a: Point | null, b: Point, digits = 6) => { expect(a).not.toBeNull(); expect(a![0]).toBeCloseTo(b[0], digits); expect(a![1]).toBeCloseTo(b[1], digits); };

describe("pitch markers on the atlas", () => {
  it("carries a mark made at one moment through the camera's pan and zoom", () => {
    const model = buildMarkers(atlas(), [mark(0, p => truth(0, p))])!;
    const corners = markerPointsAt(model, 4, PITCH_CORNERS)!;
    PITCH_CORNERS.forEach((p, i) => near(corners[i], truth(4, p)));
    // Negative control: the camera really moved, so standing still would be wrong.
    expect(Math.hypot(truth(4, [1, 1])[0] - truth(0, [1, 1])[0], truth(4, [1, 1])[1] - truth(0, [1, 1])[1])).toBeGreaterThan(0.05);
  });

  it("is exact at every mark even where the registration drifts between them", () => {
    // At 8 s the registered pose is 0.02 rad off; the owner placed the markers on what they see.
    const seen = (p: Point) => imageOf(pose(yawAt(8) + 0.02, zoomAt(8)), p);
    const model = buildMarkers(atlas(), [mark(0, p => truth(0, p)), mark(8, seen)])!;
    PITCH_CORNERS.forEach((p, i) => { near(markerPointsAt(model, 0, PITCH_CORNERS)![i], truth(0, p)); near(markerPointsAt(model, 8, PITCH_CORNERS)![i], seen(p)); });
    const first = buildMarkers(atlas(), [mark(0, p => truth(0, p))])!, second = buildMarkers(atlas(), [mark(8, seen)])!;
    const a = markerPointsAt(first, 4, [[1, 1]])![0]!, b = markerPointsAt(second, 4, [[1, 1]])![0]!, mid = markerPointsAt(model, 4, [[1, 1]])![0]!;
    const gap = Math.hypot(a[0] - b[0], a[1] - b[1]);
    expect(gap).toBeGreaterThan(1e-3);
    expect(Math.hypot(mid[0] - a[0], mid[1] - a[1])).toBeLessThan(gap);
    expect(Math.hypot(mid[0] - b[0], mid[1] - b[1])).toBeLessThan(gap);
  });

  it("maps a foot in the picture to its pitch position", () => {
    const model = buildMarkers(atlas(), [mark(0, p => truth(0, p))])!;
    const h = markerImageToPitch(model, 4)!, [x, y] = truth(4, [0.3, 0.7]);
    const d = h[6] * x + h[7] * y + h[8];
    expect((h[0] * x + h[1] * y + h[2]) / d).toBeCloseTo(0.3, 6);
    expect((h[3] * x + h[4] * y + h[5]) / d).toBeCloseTo(0.7, 6);
  });

  it("leaves an unticked guessed corner out of the fit", () => {
    const wrong = (extra: Partial<PitchKeyframe>) => { const k = mark(0, p => truth(0, p), extra); k.corners[0] = [0.4, 0.4]; return k; };
    near(markerPointsAt(buildMarkers(atlas(), [wrong({ fit_corner_indices: [1, 2, 3] })])!, 4, [[0, 0]])![0], truth(4, [0, 0]));
    // Ticked, the same wrong corner pulls the pitch away.
    const pulled = markerPointsAt(buildMarkers(atlas(), [wrong({})])!, 4, [[0, 0]])![0]!;
    expect(Math.hypot(pulled[0] - truth(4, [0, 0])[0], pulled[1] - truth(4, [0, 0])[1])).toBeGreaterThan(0.01);
  });

  it("ignores a mark that was saved with the editor's default handles, never placed (6c216d41)", () => {
    const untouched = { time_s: 0, corners: [[0.05, 0.95], [0.95, 0.95], [0.8, 0.35], [0.2, 0.35]] as Point[], landmarks: [{ image: [0.49999999999999956, 0.5899999999999995] as Point, pitch: [0.5, 0.5] as Point, name: "Centre spot" }] };
    expect(buildMarkers(atlas(), [untouched])).toBeNull();
    expect(buildMarkers(atlas(), [{ ...untouched, landmarks: [] }])).toBeNull();
    // One handle moved and it is a real mark.
    expect(buildMarkers(atlas(), [{ ...untouched, landmarks: [{ ...untouched.landmarks[0], image: [0.52, 0.6] }] }])).not.toBeNull();
  });

  it("ignores a mark made where the camera has no registered pose", () => {
    expect(buildMarkers(atlas([2]), [mark(2, p => truth(2, p))])).toBeNull();
    expect(buildMarkers(atlas([2]), [mark(2, p => truth(2, p)), mark(0, p => truth(0, p))])).not.toBeNull();
    expect(buildMarkers(atlas(), [])).toBeNull();
  });

  it("draws the halfway line on the true halfway line and clips the box to the frame", () => {
    const model = buildMarkers(atlas(), [mark(0, p => truth(0, p))])!;
    const line = markerHalfwayAt(model, 4)!, a = truth(4, [0.5, 0]), b = truth(4, [0.5, 1]);
    expect(line.length).toBeGreaterThanOrEqual(2);
    for (const [x, y] of line) expect(((b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0])) / Math.hypot(b[0] - a[0], b[1] - a[1])).toBeCloseTo(0, 6);
    const box = markerOutlineAt(model, 0)!;
    expect(box.length).toBeGreaterThanOrEqual(3);
    for (const p of box) for (const v of p) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); }
  });
});

const motion: CameraMotion = { times: TIMES, steps: TIMES.slice(1).map(() => [1, 0, 0, 0, 1, 0, 0, 0, 1]), cuts: TIMES.slice(1).map(() => false) };
const review = (extra: Partial<Review>): Review => ({ revision: 1, source_sha256: HASH, events: [], identities: [], reviewed_intervals: [], review_complete: false, track_labels: [], group_labels: [], rejected_suggestions: [], ...extra });
// An accepted atlas review whose corners are placed wrongly (a 9v9 laid inside a bigger pitch).
const WRONG: Point[] = [[0.2, 0.3], [0.5, 0.35], [0.55, 0.6], [0.25, 0.65]];
const accepted = { panorama_id: ID, points: WRONG, corners: WRONG, accepted: true as const };

describe("the lab camera with pitch markers", () => {
  it("draws, measures and tests 'on the pitch' from the markers ahead of the atlas", () => {
    const camera = labCamera(motion, atlas(), review({ pitch_panorama: accepted, pitch_keyframes: [mark(0, p => truth(0, p))] }), HASH)!;
    expect(camera.markers).toBeDefined();
    expect(boundaryAt(camera, [], [], 0)).toEqual(markerOutlineAt(camera.markers!, 0));
    expect(halfwayAt(camera, 4)).toEqual(markerHalfwayAt(camera.markers!, 4));
    const h = imageToPitch(camera, [], { length_m: 60, width_m: 40 }, 4)!, [x, y] = truth(4, [0.25, 0.5]), d = h[6] * x + h[7] * y + h[8];
    expect((h[0] * x + h[1] * y + h[2]) / d).toBeCloseTo(15, 4);
    expect((h[3] * x + h[4] * y + h[5]) / d).toBeCloseTo(20, 4);
  });

  it("keeps the atlas outline when there are no markers", () => {
    const camera = labCamera(motion, atlas(), review({ pitch_panorama: accepted }), HASH)!;
    expect(camera.markers).toBeUndefined();
    const h = imageToPitch(camera, [], { length_m: 60, width_m: 40 }, 4)!, [x, y] = truth(4, [0.25, 0.5]), d = h[6] * x + h[7] * y + h[8];
    expect(Math.abs((h[0] * x + h[1] * y + h[2]) / d - 15)).toBeGreaterThan(1);
  });

  it("opens the editor on the pitch as drawn, with the halfway ends and the off-screen corners unticked where four points remain", () => {
    const camera = labCamera(motion, atlas(), review({ pitch_keyframes: [mark(0, p => truth(0, p))] }), HASH)!;
    const start = markingStart(camera, camera.markers ? [mark(0, p => truth(0, p))] : [], 6);
    PITCH_CORNERS.forEach((p, i) => near(start.corners[i], truth(6, p)));
    expect(start.landmarks.map(l => l.name)).toEqual(NAMES);
    start.landmarks.forEach((l, i) => near(l.image, truth(6, HALFWAY[i])));
    const onScreen = [0, 1, 2, 3].filter(i => start.corners[i].every(v => v >= -0.02 && v <= 1.02));
    expect(onScreen.length).toBe(1);
    // One corner on screen plus the two halfway ends: the nearest off-screen corner makes the fourth point.
    const away = (i: number) => Math.hypot(Math.max(0, -start.corners[i][0], start.corners[i][0] - 1), Math.max(0, -start.corners[i][1], start.corners[i][1] - 1));
    const nearest = [0, 1, 2, 3].filter(i => !onScreen.includes(i)).sort((a, b) => away(a) - away(b))[0];
    expect(start.cornerIndices).toEqual([...onScreen, nearest].sort());
  });

  it("reopens an existing mark as it was saved", () => {
    const saved = mark(0, p => truth(0, p), { fit_corner_indices: [2, 3] });
    const camera = labCamera(motion, atlas(), review({ pitch_keyframes: [saved] }), HASH)!;
    const start = markingStart(camera, [saved], 0.01);
    expect(start.corners).toEqual(saved.corners);
    expect(start.cornerIndices).toEqual([2, 3]);
    expect(start.landmarks).toEqual(saved.landmarks);
  });
});

// The accepted outline of 261108 Stoke (92908cc3) has six points and no reviewed corners.
const ground = (p: Point) => { const [u, v] = p; return rayPanorama(atlas(), [u * 60 - 30, 10, v * 40 + 20]); };
const SIX: Point[] = ([[0, 0], [0.5, 0], [1, 0], [1, 1], [0.5, 1], [0, 1]] as Point[]).map(p => ground(p));
const outlineOnly = { panorama_id: ID, points: SIX, halfway: [ground([0.5, 0]), ground([0.5, 1])], accepted: true as const };

describe("opening the editor on an outline without reviewed corners", () => {
  it("starts the corners on the outline's rectangle on the level ground, as the live 2D pitch reads it", () => {
    const camera = labCamera(motion, atlas(), review({ pitch_panorama: outlineOnly }), HASH)!;
    const start = markingStart(camera, [], 2);
    PITCH_CORNERS.forEach((p, i) => near(start.corners[i], truth(2, p), 3));
    start.landmarks.forEach((l, i) => near(l.image, truth(2, HALFWAY[i]), 3));
  });

  it("does not save an off-screen halfway end you did not move, unless it is needed for four points", () => {
    const start = { corners: [[0.1, 0.9], [0.9, 0.9], [0.7, 0.3], [0.3, 0.3]] as Point[], cornerIndices: [0, 1, 2, 3], landmarks: [{ name: NAMES[0], pitch: HALFWAY[0], image: [0.5, 0.9] as Point }, { name: NAMES[1], pitch: HALFWAY[1], image: [-0.4, 0.3] as Point }] };
    expect(landmarksToSave(start.landmarks, start.landmarks, 4).map(l => l.name)).toEqual([NAMES[0]]);
    // Dragged into view, it is yours and is kept.
    const moved = [start.landmarks[0], { ...start.landmarks[1], image: [0.45, 0.3] as Point }];
    expect(landmarksToSave(moved, start.landmarks, 4).map(l => l.name)).toEqual(NAMES);
    // With only two corners in use, the off-screen end is still needed for four points.
    expect(landmarksToSave(start.landmarks, start.landmarks, 2).map(l => l.name)).toEqual(NAMES);
  });
});

// The test pitch is 60 x 40 m; a 7v7-length pitch, so its penalty boxes are 9 m deep and 16 m wide (FA guide).
const SIZE = { length_m: 60, width_m: 40 };
const onLine = (a: Point, b: Point, p: Point) => ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])) / Math.hypot(b[0] - a[0], b[1] - a[1]);

describe("penalty boxes", () => {
  it("uses the FA guide's box for each format, and Law 1's for the adult pitch", () => {
    const front = (size: { length_m: number; width_m: number }) => penaltyBoxes(size)[0].points[1].pitch;
    // Left box, near front corner: depth along the pitch, half the box width either side of the middle.
    expect(front({ length_m: 37, width_m: 27 })).toEqual([8 / 37, (27 - 15) / 2 / 27]);
    expect(front({ length_m: 55, width_m: 37 })).toEqual([9 / 55, (37 - 16) / 2 / 37]);
    expect(front({ length_m: 73, width_m: 46 })).toEqual([12 / 73, (46 - 29) / 2 / 46]);
    expect(front({ length_m: 91, width_m: 55 })).toEqual([16 / 91, (55 - 40) / 2 / 55]);
    expect(front({ length_m: 100, width_m: 64 })).toEqual([16.5 / 100, (64 - 40.3) / 2 / 64]);
    // A 9v9 marked across a full pitch (FA option 1, 68 x 46 m) still has the 9v9 box.
    expect(front({ length_m: 68, width_m: 46 })).toEqual([12 / 68, (46 - 29) / 2 / 46]);
    const [left, right] = penaltyBoxes({ length_m: 73, width_m: 46 });
    expect(left.points.map(p => p.pitch[0])).toEqual([0, 12 / 73, 12 / 73, 0]);
    expect(right.points.map(p => p.pitch[0])).toEqual([1, 1 - 12 / 73, 1 - 12 / 73, 1]);
    expect(new Set([...left.points, ...right.points].map(p => p.name)).size).toBe(8);
  });

  it("draws both boxes on the video from your marks, on the true box lines", () => {
    const model = buildMarkers(atlas(), [mark(0, p => truth(0, p))])!;
    const boxes = markerBoxesAt(model, 4, SIZE);
    expect(boxes.length).toBeGreaterThan(0);
    const all = penaltyBoxes(SIZE).flatMap(b => [0, 1, 2].map(k => [b.points[k].pitch, b.points[k + 1].pitch]));
    for (const line of boxes) for (const p of line) {
      // Every drawn point lies on one of the six true box sides.
      expect(Math.min(...all.map(([a, b]) => Math.abs(onLine(truth(4, a), truth(4, b), p))))).toBeLessThan(1e-6);
    }
  });

  it("puts the boxes in the frame the player and the analysed export draw", () => {
    const camera = labCamera(motion, atlas(), review({ pitch_keyframes: [mark(0, p => truth(0, p))] }), HASH)!;
    const input = { w: 1920, h: 1080, index: indexObservations([]), teams: new Map(), selected: null, showBoxes: false, everyone: false, showBall: false, camera };
    expect(overlayAt({ ...input, size: SIZE }, 4).boxes).toEqual(markerBoxesAt(camera.markers!, 4, SIZE));
    // Without marks there is no exact pitch, so no boxes.
    expect(overlayAt({ ...input, size: SIZE, camera: labCamera(motion, atlas(), review({}), HASH)! }, 4).boxes ?? []).toEqual([]);
  });

  it("opens the editor with the box handles that are in view, at the boxes of the pitch as drawn", () => {
    const camera = labCamera(motion, atlas(), review({ pitch_keyframes: [mark(0, p => truth(0, p))] }), HASH)!;
    const start = markingStart(camera, [mark(0, p => truth(0, p))], 6, SIZE);
    const box = start.landmarks.filter(l => / box, /.test(l.name ?? ""));
    expect(box.length).toBeGreaterThan(0);
    for (const l of box) {
      near(l.image, truth(6, l.pitch));
      expect(l.image.every(v => v >= -0.15 && v <= 1.15)).toBe(true);
    }
    // Every box handle in view is offered.
    const inView = penaltyBoxes(SIZE).flatMap(b => b.points).filter(p => truth(6, p.pitch).every(v => v >= -0.15 && v <= 1.15));
    expect(box.map(l => l.name).sort()).toEqual(inView.map(p => p.name).sort());
  });

  it("saves a box handle only when you placed it", () => {
    const [left] = penaltyBoxes(SIZE);
    const handle = { ...left.points[1], image: [0.4, 0.6] as Point };
    const ends = [{ name: NAMES[0], pitch: HALFWAY[0], image: [0.5, 0.9] as Point }, { name: NAMES[1], pitch: HALFWAY[1], image: [0.5, 0.3] as Point }];
    expect(landmarksToSave([...ends, handle], [...ends, handle], 4).map(l => l.name)).toEqual(NAMES);
    const placed = { ...handle, image: [0.42, 0.61] as Point };
    expect(landmarksToSave([...ends, placed], [...ends, handle], 4).map(l => l.name)).toEqual([...NAMES, handle.name]);
  });
});

// 92908cc3 at 0:30 (harness): two right corners, the near halfway end and the right box's goal-line end.
// Three of those lie on the goal line, so four points did not fix the pitch and it swung wildly.
describe("a mark needs four points with no three on one pitch line", () => {
  const goalLineEnd = penaltyBoxes({ length_m: 73, width_m: 46 })[1].points[0];
  it("tells a spread set from one with three points on a line", () => {
    expect(fixesPitch(PITCH_CORNERS)).toBe(true);
    expect(fixesPitch([[1, 0], [1, 1], goalLineEnd.pitch, [0.5, 0]])).toBe(false);
    expect(fixesPitch([[1, 0], [1, 1], goalLineEnd.pitch, [0.5, 0], [0.5, 1]])).toBe(true);
    expect(fixesPitch([[0, 0], [1, 0], [1, 1]])).toBe(false);
  });

  it("keeps adding spare points when the first four do not fix the pitch", () => {
    const ends = HALFWAY.map((pitch, i) => ({ name: NAMES[i], pitch, image: [-0.3, 1.3 - i] as Point }));
    const placed = { name: goalLineEnd.name, pitch: goalLineEnd.pitch, image: [0.8, 0.4] as Point };
    const start = [...ends, { ...placed, image: [0.79, 0.38] as Point }];
    const saved = landmarksToSave([...ends, placed], start, 2, [[1, 0], [1, 1]]);
    expect(saved.map(l => l.name)).toEqual([...NAMES, goalLineEnd.name]);
  });

  it("does not let a mark that cannot fix the pitch replace it on its own", () => {
    const weak: PitchKeyframe = { time_s: 0, corners: PITCH_CORNERS.map(p => truth(0, p)), fit_corner_indices: [1, 2], landmarks: [
      { name: NAMES[0], pitch: HALFWAY[0], image: truth(0, HALFWAY[0]) },
      { name: goalLineEnd.name, pitch: [1, 0.3], image: [truth(0, [1, 0.3])[0] + 0.02, truth(0, [1, 0.3])[1]] }] };
    expect(buildMarkers(atlas(), [weak])).toBeNull();
    // Beside a good mark it borrows that mark's points and stays close to the truth.
    const model = buildMarkers(atlas(), [weak, mark(8, p => truth(8, p))])!;
    const p = markerPointsAt(model, 0, [[0.5, 0.5]])![0]!, t = truth(0, [0.5, 0.5]);
    expect(Math.hypot(p[0] - t[0], p[1] - t[1])).toBeLessThan(0.02);
  });
});

describe("marks the atlas cannot use", () => {
  it("count as no marks on an atlas run, so the old camera-motion path never draws them", () => {
    const weak: PitchKeyframe = { time_s: 0, corners: PITCH_CORNERS.map(p => truth(0, p)), fit_corner_indices: [1, 2], landmarks: [
      { name: NAMES[0], pitch: HALFWAY[0], image: truth(0, HALFWAY[0]) }, { name: "Right box, near goal-line end", pitch: [1, 0.3], image: [0.9, 0.4] }] };
    const r = review({ pitch_panorama: outlineOnly, pitch_keyframes: [weak] });
    const camera = labCamera(motion, atlas(), r, HASH)!;
    expect(usableMarks(camera, r)).toEqual([]);
    expect(imageToPitch(camera, usableMarks(camera, r), SIZE, 4)).toBeNull();
    // A usable mark is passed through; a run without an atlas keeps its marks as before.
    const good = review({ pitch_keyframes: [mark(0, p => truth(0, p))] });
    expect(usableMarks(labCamera(motion, atlas(), good, HASH)!, good)).toEqual(good.pitch_keyframes);
    expect(usableMarks(labCamera(motion, undefined, r, HASH)!, r)).toEqual([weak]);
  });
});
