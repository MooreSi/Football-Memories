import { describe, expect, it } from "vitest";
import { livePlacement, ranPlacement } from "./placement";

// 261108 U11 v Stoke (job 5b0125cf), split mode, Neural Engine player matching: the run's own summary.
const stoke = {
  model: { device: "coreml", compute_units: "ALL (OS-scheduled CPU/GPU/Neural Engine)" },
  render: { encoder: "h264_videotoolbox" },
  detection_sharing: { mini_samples: 720, macbook_samples: 914, macbook_detect_s: 80.887 },
  camera_tracking: { compute: { device: "cpu" } },
  review_preparation: { elapsed_s: 82.194, model: { device: "coreml", compute_units: "CPU_AND_NE" } },
  execution: { mode: "split", detection: "shared", tracking: "local", camera_pitch: "local", player_appearance: "remote" },
  elapsed_s: 169.211,
};

describe("ranPlacement (a finished run, from what it recorded)", () => {
  it("names each stage's Mac and compute, with the measured detection share (Stoke split run)", () => {
    const rows = ranPlacement(stoke)!;
    const by = Object.fromEntries(rows.map(r => [r.stage, r]));
    expect(by["Player detection"]).toMatchObject({ where: "Mac mini + MacBook Pro", compute: "Core ML: CPU, GPU and Neural Engine (macOS chooses)" });
    expect(by["Player detection"].detail).toBe("Mac mini 720 frames (44%), MacBook Pro 914 frames (56%)");
    expect(by["Tracking and kit colours"]).toMatchObject({ where: "Mac mini", compute: "CPU" });
    expect(by["Video render"]).toMatchObject({ where: "Mac mini", compute: "Media engine (hardware H.264)" });
    expect(by["Camera and pitch"]).toMatchObject({ where: "Mac mini", compute: "CPU" });
    expect(by["Player matching"]).toMatchObject({ where: "MacBook Pro", compute: "Neural Engine + CPU (Core ML)", detail: "82 s" });
  });
  it("a whole job sent to the MacBook ran every stage there (a pitch rebuild in split mode)", () => {
    const rows = ranPlacement({ ...stoke, detection_sharing: undefined, execution: { mode: "remote", node: "MacBook Pro" } })!;
    expect(rows.every(r => r.where === "MacBook Pro")).toBe(true);
  });
  it("a run derived from a MacBook pitch rebuild keeps the measured detection split, and lists a colour re-read (Stoke 92908cc3)", () => {
    const rows = ranPlacement({ ...stoke, execution: { mode: "remote", node: "MacBook Pro" }, team_enrichment: { elapsed_s: 55.2 } })!;
    const by = Object.fromEntries(rows.map(r => [r.stage, r]));
    expect(by["Player detection"].where).toBe("Mac mini + MacBook Pro");
    expect(by["Tracking and kit colours"].where).toBe("Mac mini");
    expect(by["Camera and pitch"].where).toBe("MacBook Pro");
    expect(by["Shirt colours re-read"]).toMatchObject({ where: "Mac mini", compute: "CPU", detail: "55 s" });
  });
  it("a local run without the newer fields: detection on the GPU through PyTorch, software render, all on the Mac mini", () => {
    const rows = ranPlacement({ model: { device: "mps" }, render: { encoder: "libx264" } })!;
    expect(rows.every(r => r.where === "Mac mini")).toBe(true);
    expect(rows.find(r => r.stage === "Player detection")?.compute).toBe("GPU (Metal)");
    expect(rows.find(r => r.stage === "Video render")?.compute).toBe("CPU (software H.264)");
  });
  it("Core AI player matching asks for the Neural Engine", () => {
    const rows = ranPlacement({ ...stoke, review_preparation: { model: { preferred_compute_unit: "neural-engine" } } })!;
    expect(rows.find(r => r.stage === "Player matching")?.compute).toBe("Neural Engine (Core AI)");
  });
  it("says nothing it does not know", () => {
    expect(ranPlacement(undefined)).toBeNull();
    expect(ranPlacement({ model: { device: "quantum" } })!.find(r => r.stage === "Player detection")?.compute).toBe("Not recorded");
  });
});

describe("livePlacement (a running job, from the mode it was started with)", () => {
  it("split: detection on both Macs first, then camera on the mini while the MacBook matches players", () => {
    expect(livePlacement({ execution: "split", reid_backend: "neural-engine", progress: 0.3 })).toMatchObject({ stage: "Detecting and tracking players", where: "Mac mini + MacBook Pro", compute: "Core ML: CPU, GPU and Neural Engine (macOS chooses); tracking on the Mac mini CPU" });
    expect(livePlacement({ execution: "split", reid_backend: "neural-engine", progress: 0.75 })).toMatchObject({ stage: "Camera and pitch, and player matching", where: "Mac mini (camera, CPU) + MacBook Pro (player matching)", compute: "CPU; Neural Engine + CPU (Core ML)" });
  });
  it("local: everything on the Mac mini; the standard model matches players on the GPU", () => {
    expect(livePlacement({ execution: "local", reid_backend: "pytorch", progress: 0.9 })).toMatchObject({ stage: "Player matching", where: "Mac mini", compute: "GPU (Metal)" });
  });
  it("remote, and pitch rebuilds in split mode, run whole on the MacBook", () => {
    expect(livePlacement({ execution: "remote", progress: 0.1 })?.where).toBe("MacBook Pro");
    expect(livePlacement({ execution: "split", mode: "camera-tracking", progress: 0.4 })).toMatchObject({ stage: "Rebuilding camera and pitch", where: "MacBook Pro", compute: "CPU" });
  });
  it("is silent for an older gateway that does not say how the job runs", () => {
    expect(livePlacement({ progress: 0.2 })).toBeNull();
  });
});
