/**
 * Spec 670: your boxes on frames the worker picked for training the detector. The detector's
 * boxes are only a starting point; nothing trains until you confirm a frame.
 */
export type Kind = "person" | "ball";
export type Box = { kind: Kind; box: number[] };
export type Proposal = Box & { score: number };
export type Frame = { index: number; time_s: number; image: string; reasons: string[]; proposals: Proposal[] };
export type LabelSet = { id: string; match_title: string; source_sha256: string; width: number; height: number; frames: Frame[]; presort?: Record<string, { ball: "visible" | "hidden" | "unsure"; note?: string }> };
export type FrameLabel = { status: "confirmed" | "skipped"; boxes: Box[] };
export type Labels = { revision: number; source_sha256: string; frames: Record<string, FrameLabel> };
export type SetSummary = { id: string; match_title: string; frames: number; confirmed: number; revision: number };

const START = { person: 0.4, ball: 0.4 };

/** Your saved boxes for a frame, or the detector's confident ones to start from. */
export function startingBoxes(frame: Frame, saved?: FrameLabel): Box[] {
  if (saved) return saved.boxes.map(b => ({ kind: b.kind, box: [...b.box] }));
  return frame.proposals.filter(p => p.score >= START[p.kind]).map(p => ({ kind: p.kind, box: [...p.box] }));
}

const MIN_PX = 3;
const clamp = (v: number) => Math.min(1, Math.max(0, v));
const round = (v: number) => Math.round(v * 1e5) / 1e5;

/** A drag on the picture (pixels in its displayed size) to a box in 0-1 frame coordinates. */
export function boxFromDrag(from: number[], to: number[], width: number, height: number, kind: Kind): Box | null {
  if (Math.abs(to[0] - from[0]) < MIN_PX || Math.abs(to[1] - from[1]) < MIN_PX) return null;
  const [x1, x2] = [from[0], to[0]].sort((a, b) => a - b), [y1, y2] = [from[1], to[1]].sort((a, b) => a - b);
  return { kind, box: [clamp(x1 / width), clamp(y1 / height), clamp(x2 / width), clamp(y2 / height)].map(round) };
}

export function labelsBody(set: LabelSet, revision: number, frames: Record<string, FrameLabel>): Labels {
  return { revision, source_sha256: set.source_sha256, frames };
}
