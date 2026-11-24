/**
 * The match ball on the clean video (spec 660). The worker's `detections.jsonl` lists every ball the
 * detector saw at each sample (about three a second), including spare balls by the touchline and
 * balls on other pitches. One ball path is chosen across the clip: confident sightings, smooth
 * movement, and nearer the middle of the picture, because Veo's camera follows the play.
 */
export type BallSample = { time_s: number; balls: { box: number[]; score: number }[] };
export type BallPoint = { time_s: number; x: number; y: number; r: number };

export function parseBalls(text: string): BallSample[] {
  const out: BallSample[] = [];
  for (const raw of text.split("\n")) {
    if (!raw.trim()) continue;
    try {
      const row = JSON.parse(raw) as { time_s?: unknown; detections?: unknown };
      if (typeof row.time_s !== "number" || !Array.isArray(row.detections)) continue;
      const balls = (row.detections as { kind?: unknown; box?: unknown; score?: unknown }[])
        .filter(d => d.kind === "ball" && Array.isArray(d.box) && d.box.length === 4 && (d.box as unknown[]).every(n => typeof n === "number" && Number.isFinite(n)) && typeof d.score === "number")
        .map(d => ({ box: d.box as number[], score: d.score as number }));
      out.push({ time_s: row.time_s, balls });
    } catch { /* one damaged line must not hide the ball everywhere */ }
  }
  return out.sort((a, b) => a.time_s - b.time_s);
}

const MAX_GAP_S = 1.5;   // a path may skip unseen samples up to this long
const MISS = 1.0;        // cost of a sample without the ball on the path
const BREAK = 3.0;       // cost of losing the ball and picking it up somewhere else
const CENTRE = 1.2;      // preference for the middle of the picture (the camera follows play)
const JUMP = 2.0;        // cost per picture width moved between sightings
const FAST = 4.0, CRUISE = 0.6; // extra cost per picture width per second above a fast shot's pace

const SPARE_S = 6, SPARE_SEEN = 15, SPARE_PX = 12, SPARE_LOOK_S = 8;

/**
 * Balls resting in one spot for many seconds are spares by the bags or beyond a fence; a match ball
 * waiting for a free kick or goal kick rests only a few seconds. (On the RCW run: spares 10-11 s,
 * 24-34 sightings; a free kick 4-5 s.)
 */
function withoutSpares(samples: BallSample[]): BallSample[] {
  const all = samples.flatMap(s => s.balls.map(b => ({ t: s.time_s, x: (b.box[0] + b.box[2]) / 2, y: (b.box[1] + b.box[3]) / 2 })));
  const spare = (t: number, box: number[]) => {
    const x = (box[0] + box[2]) / 2, y = (box[1] + box[3]) / 2;
    let first = Infinity, last = -Infinity, seen = 0;
    for (const b of all) if (Math.abs(b.t - t) <= SPARE_LOOK_S && Math.abs(b.x - x) <= SPARE_PX && Math.abs(b.y - y) <= SPARE_PX) { seen++; first = Math.min(first, b.t); last = Math.max(last, b.t); }
    return seen >= SPARE_SEEN && last - first >= SPARE_S;
  };
  return samples.map(s => ({ ...s, balls: s.balls.filter(b => !spare(s.time_s, b.box)) }));
}

export function trackBall(input: BallSample[], width: number, height: number): BallPoint[] {
  // A ball cut off at the left or right edge is a spare by the touchline; Veo keeps play inside the frame.
  const samples = withoutSpares(input).map(s => ({ ...s, balls: s.balls.filter(b => b.box[0] > 2 && b.box[2] < width - 2) }));
  type Node = { i: number; time_s: number; x: number; y: number; r: number; cost: number; best: number; back: number };
  const nodes: Node[] = [];
  const firstOf: number[] = [];
  samples.forEach((sample, i) => {
    firstOf.push(nodes.length);
    for (const { box, score } of sample.balls) {
      const x = (box[0] + box[2]) / 2 / width, y = (box[1] + box[3]) / 2 / height;
      nodes.push({ i, time_s: sample.time_s, x, y, r: Math.abs(box[2] - box[0]) / 2 / width, cost: -Math.log(Math.max(score, 1e-3)) + CENTRE * Math.abs(x - 0.5) - MISS, best: 0, back: -1 });
    }
  });
  firstOf.push(nodes.length);
  // Best path ending at each sighting; a path may also start fresh after the best earlier ending.
  let bestEnded = 0, bestEndedNode = -1, scan = 0;
  for (let n = 0; n < nodes.length; n++) {
    const node = nodes[n];
    while (scan < firstOf[node.i]) { if (nodes[scan].best < bestEnded) { bestEnded = nodes[scan].best; bestEndedNode = scan; } scan++; }
    node.best = node.cost + BREAK + bestEnded; node.back = bestEndedNode;
    if (bestEndedNode < 0) node.best = node.cost; // the first sighting needs no break
    for (let p = firstOf[node.i] - 1; p >= 0 && node.time_s - nodes[p].time_s <= MAX_GAP_S; p--) {
      const prev = nodes[p], gap = node.time_s - prev.time_s;
      if (gap <= 0) continue;
      const dist = Math.hypot(node.x - prev.x, (node.y - prev.y) * height / width);
      const total = prev.best + JUMP * dist + FAST * Math.max(0, dist / gap - CRUISE) + node.cost;
      if (total < node.best) { node.best = total; node.back = p; }
    }
  }
  let end = -1, lowest = 0;
  nodes.forEach((node, n) => { if (node.best < lowest) { lowest = node.best; end = n; } });
  const path: BallPoint[] = [];
  for (let n = end; n >= 0; n = nodes[n].back) path.push({ time_s: nodes[n].time_s, x: nodes[n].x, y: nodes[n].y, r: nodes[n].r });
  return path.reverse();
}

const GLIDE_S = 1.5, HOLD_S = 0.2;

/** Ball position at the playhead: interpolated between close sightings, otherwise nothing. */
export function ballAt(path: BallPoint[], at: number): BallPoint | null {
  let lo = 0, hi = path.length - 1, found = -1;
  while (lo <= hi) { const mid = (lo + hi) >> 1; if (path[mid].time_s <= at) { found = mid; lo = mid + 1; } else hi = mid - 1; }
  const a = path[found], b = path[found + 1];
  if (a && b && b.time_s - a.time_s <= GLIDE_S) {
    const f = (at - a.time_s) / (b.time_s - a.time_s);
    return { time_s: at, x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, r: a.r + (b.r - a.r) * f };
  }
  if (a && at - a.time_s <= HOLD_S) return a;
  if (b && b.time_s - at <= HOLD_S) return b;
  return null;
}

/** Balls kept by whole-clip refinement (about ten checks a second), as samples in pixels. */
export function denseBalls(dense: { balls?: { time_s: number; image_box: number[]; score: number }[] }, width: number, height: number): BallSample[] {
  const byTime = new Map<number, BallSample>();
  for (const b of dense.balls ?? []) {
    if (b.image_box?.length !== 4 || !b.image_box.every(Number.isFinite)) continue;
    const sample = byTime.get(b.time_s) ?? { time_s: b.time_s, balls: [] };
    sample.balls.push({ box: [b.image_box[0] * width, b.image_box[1] * height, b.image_box[2] * width, b.image_box[3] * height], score: b.score });
    byTime.set(b.time_s, sample);
  }
  return [...byTime.values()].sort((a, b) => a.time_s - b.time_s);
}
