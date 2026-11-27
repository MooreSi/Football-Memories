/**
 * Where an analysis ran and on what hardware (owner request 27 November 2026), so you can see what a
 * run used: the Mac mini, the MacBook Pro or both, and CPU, GPU, Neural Engine or media engine.
 *
 * A finished run is described from what its summary recorded (the worker's execution record, the
 * measured detection split, each model's device and compute units, the video encoder). A running job
 * is described from the mode it was started with and the stage its progress is in: that is the
 * worker's plan, not a measurement. Core ML "ALL" lets macOS choose CPU, GPU or Neural Engine per
 * layer, so it is never reported as one of them.
 */
export type Placement = { stage: string; where: string; compute: string; detail?: string };
type Rec = Record<string, unknown>;
const rec = (v: unknown): Rec => (v && typeof v === "object" ? v as Rec : {});
const MINI = "Mac mini", MACBOOK = "MacBook Pro";
const CORE_ML_ALL = "Core ML: CPU, GPU and Neural Engine (macOS chooses)";
const REID: Record<string, string> = { pytorch: "GPU (Metal)", "neural-engine": "Neural Engine + CPU (Core ML)", "core-ai": "Neural Engine (Core AI)" };

function modelCompute(model: Rec): string {
  const units = String(model.compute_units ?? "");
  if (model.device === "coreml") return units.startsWith("ALL") ? CORE_ML_ALL : units === "CPU_AND_NE" ? REID["neural-engine"] : units === "CPU_AND_GPU" ? "GPU + CPU (Core ML)" : units === "CPU_ONLY" ? "CPU (Core ML)" : CORE_ML_ALL;
  if (model.device === "coreai" || model.preferred_compute_unit === "neural-engine") return REID["core-ai"];
  if (model.device === "mps") return "GPU (Metal)";
  if (model.device === "cpu") return "CPU";
  return "Not recorded";
}

/** The stages of a finished run, from its summary.json; null without one. */
export function ranPlacement(summary: unknown): Placement[] | null {
  if (!summary || typeof summary !== "object") return null;
  const s = summary as Rec, ex = rec(s.execution), sharing = rec(s.detection_sharing);
  const remote = ex.mode === "remote";
  const host = (part: unknown) => (remote || part === "remote" ? MACBOOK : MINI);
  const mini = Number(sharing.mini_samples), macbook = Number(sharing.macbook_samples);
  const shared = !remote && Number.isFinite(mini) && Number.isFinite(macbook) && mini + macbook > 0;
  const encoder = rec(s.render).encoder;
  const reid = rec(s.review_preparation), reidModel = rec(reid.model);
  const rows: Placement[] = [
    {
      stage: "Player detection", where: shared ? `${MINI} + ${MACBOOK}` : host(ex.detection ?? ex.detection_tracking), compute: modelCompute(rec(s.model)),
      ...(shared ? { detail: `${MINI} ${mini} frames (${Math.round((mini / (mini + macbook)) * 100)}%), ${MACBOOK} ${macbook} frames (${Math.round((macbook / (mini + macbook)) * 100)}%)` } : {}),
    },
    { stage: "Tracking and kit colours", where: host(ex.tracking ?? ex.detection_tracking), compute: "CPU" },
    { stage: "Video render", where: host(ex.tracking ?? ex.detection_tracking), compute: encoder === "h264_videotoolbox" ? "Media engine (hardware H.264)" : encoder === "libx264" ? "CPU (software H.264)" : "Not recorded" },
  ];
  if (s.camera_tracking) rows.push({ stage: "Camera and pitch", where: host(ex.camera_pitch), compute: rec(rec(s.camera_tracking).compute).device === "cpu" ? "CPU" : "Not recorded" });
  if (s.review_preparation) {
    const compute = Object.keys(reidModel).some(k => k === "device" || k === "preferred_compute_unit") ? modelCompute(reidModel) : REID.pytorch;
    rows.push({ stage: "Player matching", where: host(ex.player_appearance), compute, ...(typeof reid.elapsed_s === "number" ? { detail: `${Math.round(reid.elapsed_s)} s` } : {}) });
  }
  return rows;
}

export type LiveJob = { execution?: string; reid_backend?: string; mode?: string; progress?: number };

/** What a running job is doing now and where, from the mode it was started with; null when unknown. */
export function livePlacement(job: LiveJob): Placement | null {
  const execution = job.execution;
  if (execution !== "local" && execution !== "remote" && execution !== "split") return null;
  const reid = REID[job.reid_backend ?? "pytorch"] ?? REID.pytorch;
  const p = job.progress ?? 0;
  // Split sends pitch rebuilds and player matching of a finished run to the MacBook whole (worker.py).
  const whole = execution === "remote" || (execution === "split" && (job.mode === "camera-tracking" || job.mode === "review-preparation"));
  const where = whole ? MACBOOK : MINI;
  if (job.mode === "camera-tracking") return { stage: "Rebuilding camera and pitch", where, compute: "CPU" };
  if (job.mode === "review-preparation") return { stage: "Player matching", where, compute: reid };
  if (job.mode === "shirt-numbers") return { stage: "Reading shirt numbers", where: MINI, compute: "GPU (Metal) where available (EasyOCR)" };
  if (job.mode === "team-enrichment") return { stage: "Kit colours", where: MINI, compute: "CPU" };
  if (job.mode === "moment-refinement") return { stage: "Refining moments", where: MINI, compute: CORE_ML_ALL };
  // A new analysis: detection and tracking to 70%, camera and pitch to 85%, then player matching (worker.py).
  if (p < 0.7) return { stage: "Detecting and tracking players", where: execution === "split" ? `${MINI} + ${MACBOOK}` : where, compute: `${CORE_ML_ALL}; tracking on the ${where} CPU` };
  if (execution === "split") return { stage: "Camera and pitch, and player matching", where: `${MINI} (camera, CPU) + ${MACBOOK} (player matching)`, compute: `CPU; ${reid}` };
  if (p < 0.85) return { stage: "Camera and pitch", where, compute: "CPU" };
  return { stage: "Player matching", where, compute: reid };
}
