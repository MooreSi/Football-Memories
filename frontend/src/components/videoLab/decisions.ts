import type { Appearance, Assignment, Assignments, Review } from "./labTypes";
import { bindPanorama, bridgePoses, pitchProposal, type Panorama } from "./panorama";
import { buildCamera, offPitchTracks, outlineAt, stabilise, standingOnPitch, type Camera, type CameraMotion } from "./pitch";
import { boundaryAt } from "./boundary";
import { mergeDense, type DenseTracks } from "./playArea";
import { propagateTeams } from "./teams";
import { cleanAnchors, kitTimeline, learnKits, type KitObservation, type KitPrototype, type TeamTimeline } from "./kits";
import { denseBalls, parseBalls, trackBall, type BallPoint } from "./ball";
import { indexObservations, overlayAt } from "./LabVideo";

/**
 * The Video Lab's own decisions as plain functions: the page calls them inside its memos, and the
 * spec 760 exporter calls the same ones on a run's files, so a benchmark scores what the lab shows.
 */
export type LabCamera = Camera;

export function labCamera(motion: CameraMotion | undefined, panorama: Panorama | undefined, review: Review | null | undefined, sourceSha: string | undefined): LabCamera | undefined {
  if (!motion) return undefined;
  // Views the registration left unsolved (often the opening seconds) borrow the nearest solved pose, carried with the camera motion.
  const base = buildCamera(motion), poses = panorama && bridgePoses(panorama, base);
  return { ...base, panorama: bindPanorama(poses, review?.pitch_panorama, sourceSha), proposal: pitchProposal(poses, sourceSha) };
}

export function automaticBoundariesFor(motion: CameraMotion | undefined, sourceSha: string | undefined) {
  return sourceSha && motion?.source_sha256 === sourceSha ? motion?.pitch_boundaries ?? [] : [];
}

export type TeamInputs = {
  assignments: Assignments | undefined; dense: DenseTracks | undefined; appearance: Appearance | undefined;
  review: Review | null | undefined; camera: LabCamera | undefined;
  automaticBoundaries: ReturnType<typeof automaticBoundariesFor>; remembered: KitPrototype[];
};

/** Rows the lab decides on: a whole-clip refinement that carries balls adds the ball only. */
export function labRows(assignments: Assignments | undefined, dense: DenseTracks | undefined): KitObservation[] | undefined {
  // Its people are each linked to one sampled tracklet across the whole clip, which moved labels onto the wrong people on a real run.
  const peopleDense = dense?.balls ? undefined : dense;
  return assignments ? mergeDense(assignments.observations, peopleDense) as KitObservation[] : undefined;
}

export function labOffPitch(i: TeamInputs): Set<number> {
  const { camera, review, automaticBoundaries, assignments } = i;
  const marks = review?.pitch_keyframes ?? [], boundaries = review?.pitch_boundaries ?? [];
  return camera && (marks.length || boundaries.length || automaticBoundaries.length || camera.panorama || camera.proposal)
    ? offPitchTracks(assignments?.observations ?? [], camera, marks, t => boundaryAt(camera, boundaries, automaticBoundaries, t) ?? outlineAt(camera, marks, t))
    : new Set<number>();
}

/**
 * Spec 760 Part B: the worker may add `colour_lab_balanced`, the shirt colour corrected by the
 * light on the ground beside the player. It did not pass the adoption gate (26 Nov 2026: worse
 * on the withheld matches, most in low sun), so the lab uses raw colour unless a caller asks
 * for balanced, and then only when every coloured row has one: never a mix.
 */
export type ColourSpace = "raw" | "balanced";
type Coloured = KitObservation & { colour_lab_balanced?: number[] | null };
const validLab = (c: number[] | null | undefined): c is number[] => !!c && c.length === 3 && c.every(Number.isFinite);

export function labSpace(rows: KitObservation[] | undefined, asked?: ColourSpace): ColourSpace {
  if (asked !== "balanced") return "raw";
  const list = (rows ?? []) as Coloured[];
  return list.some(r => validLab(r.colour_lab)) && list.every(r => !validLab(r.colour_lab) || validLab(r.colour_lab_balanced)) ? "balanced" : "raw";
}

function inSpace(rows: KitObservation[], space: ColourSpace): KitObservation[] {
  return space === "balanced" ? (rows as Coloured[]).map(r => ({ ...r, colour_lab: r.colour_lab_balanced ?? null })) : rows;
}

/** Kits in the run's colour space. Kits remembered from other runs are raw colours, so they apply only to raw runs. */
export function labKits(rows: KitObservation[] | undefined, review: Review | null | undefined, remembered: KitPrototype[], space: ColourSpace = labSpace(rows)) {
  return learnKits(inSpace(rows ?? [], space), review?.track_labels ?? [], space === "raw" ? remembered : []);
}

/** Spec 660: shirt colours learned from your labels decide teams moment by moment; the appearance model settles only what colour cannot. */
export function labTimeline(i: TeamInputs, rows: KitObservation[] | undefined, kits: KitPrototype[], offPitch: Set<number>, space: ColourSpace = labSpace(rows)): TeamTimeline {
  const { appearance, review, camera, automaticBoundaries } = i;
  const labels = review?.track_labels ?? [];
  // The appearance model's view colours are raw, so its anchors are checked against raw kits.
  const anchorKits = space === "raw" ? kits : learnKits(rows ?? [], labels, i.remembered);
  const marks = review?.pitch_keyframes ?? [], boundaries = review?.pitch_boundaries ?? [];
  const fallback = propagateTeams(appearance ? cleanAnchors(appearance.tracks, labels, anchorKits) : [], labels, review?.group_labels ?? [], appearance ? [] : rows ?? [], offPitch);
  // One referee, on the pitch: suggested referees seen mostly off the marked pitch are sideline people.
  const onPitch = camera && (marks.length || boundaries.length || automaticBoundaries.length || camera.panorama || camera.proposal) ? standingOnPitch(t => boundaryAt(camera, boundaries, automaticBoundaries, t) ?? outlineAt(camera, marks, t)) : undefined;
  return kitTimeline(inSpace((rows ?? []).filter(o => !offPitch.has(o.track_id)), space), kits, labels, fallback, onPitch);
}

export function labBall(dense: DenseTracks | undefined, detections: string | undefined, assignments: Assignments | undefined, camera: LabCamera | undefined): BallPoint[] {
  const w = assignments?.image_width ?? 1920, h = assignments?.image_height ?? 1080;
  const toPitch = camera ? (t: number, x: number, y: number) => stabilise(camera, t, x, y) : undefined;
  if (dense?.balls?.length) return trackBall(denseBalls(dense, w, h), w, h, toPitch);
  return detections ? trackBall(parseBalls(detections), w, h, toPitch) : [];
}

export type RunFiles = {
  sourceSha: string; assignments: Assignments; review: Review | null; appearance?: Appearance; dense?: DenseTracks;
  motion?: CameraMotion; panorama?: Panorama; detections?: string; remembered?: KitPrototype[];
  /** Ask for balanced colour (benchmark candidates); raw otherwise. */
  colour?: ColourSpace;
};
export type Prediction = { time_s: number; track_id: number; team: Assignment["team"]; role: Assignment["role"]; source: Assignment["source"] | null; shown: boolean };

/**
 * Spec 760 predictions: for every sample time, each person as the lab's overlay shows them (a person
 * the overlay hides gets no team or role) and the match ball in image pixels.
 */
export function labPredictions(f: RunFiles) {
  const camera = labCamera(f.motion, f.panorama, f.review, f.sourceSha);
  const automaticBoundaries = automaticBoundariesFor(f.motion, f.sourceSha);
  const inputs: TeamInputs = { assignments: f.assignments, dense: f.dense, appearance: f.appearance, review: f.review, camera, automaticBoundaries, remembered: f.remembered ?? [] };
  const rows = labRows(f.assignments, f.dense);
  const space = labSpace(rows, f.colour);
  const kits = labKits(rows, f.review, inputs.remembered, space);
  const offPitch = labOffPitch(inputs);
  const timeline = labTimeline(inputs, rows, kits, offPitch, space);
  const ball = labBall(f.dense, f.detections, f.assignments, camera);
  const w = f.assignments.image_width, h = f.assignments.image_height;
  const index = indexObservations(f.assignments.observations);
  const observations: Prediction[] = [], balls: { time_s: number; x: number; y: number }[] = [];
  for (const time of [...new Set(f.assignments.observations.map(o => o.time_s))].sort((a, b) => a - b)) {
    const frame = overlayAt({ w, h, index, teams: timeline.tracks, teamAt: timeline.at, selected: null, showBoxes: true, everyone: false, ball, showBall: true, camera, marks: f.review?.pitch_keyframes ?? [], boundaries: f.review?.pitch_boundaries ?? [], automaticBoundaries }, time);
    const shown = new Map(frame.people.map(p => [p.row.track_id, p.info]));
    for (const o of f.assignments.observations.filter(r => r.time_s === time)) {
      const info = shown.get(o.track_id);
      const visible = shown.has(o.track_id);
      observations.push({ time_s: time, track_id: o.track_id, team: visible ? info?.team ?? null : null, role: visible ? info?.role ?? null : null, source: visible ? info?.source ?? null : null, shown: visible });
    }
    if (frame.ball) balls.push({ time_s: time, x: frame.ball.x * w, y: frame.ball.y * h });
  }
  return { source_sha256: f.sourceSha, observations, ball: balls, kits: kits.length, colour: space };
}
