import { describe, expect, it, vi } from "vitest";
import { exportAnalysedVideo, paintOverlay, pickRecording, type ExportDeps } from "./analysedRecording";
import { overlayAt, TEAM_COLOUR } from "./LabVideo";
import { indexObservations } from "./LabVideo";
import type { Assignment, Observation } from "./labTypes";

const row = (track_id: number, time_s: number, image_box: number[]): Observation => ({ track_id, time_s, team_id: null, role: "unknown", image_box });
const own: Assignment = { team: "own", role: "player", source: "you", confidence: 1 };

/** Records canvas calls so a drawing can be checked without a real canvas. */
function fakeContext() {
  const calls: { op: string; args: unknown[]; strokeStyle?: unknown; fillStyle?: unknown }[] = [];
  const ctx: Record<string, unknown> = { strokeStyle: "", fillStyle: "", lineWidth: 1, globalAlpha: 1, font: "", textBaseline: "" };
  for (const op of ["save", "restore", "scale", "beginPath", "moveTo", "lineTo", "closePath", "ellipse", "arc", "stroke", "fill", "setLineDash", "drawImage", "fillText"])
    ctx[op] = (...args: unknown[]) => { calls.push({ op, args, strokeStyle: ctx.strokeStyle, fillStyle: ctx.fillStyle }); };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
}

describe("analysed frame", () => {
  it("carries each person's team colour and the ball at the playhead, the same data the player draws", () => {
    const index = indexObservations([row(2, 0, [0.1, 0.1, 0.2, 0.4]), row(3, 0, [0.5, 0.1, 0.6, 0.4])]);
    const frame = overlayAt({ w: 1920, h: 1080, index, teams: new Map([[2, own]]), selected: null, showBoxes: true, everyone: true, ball: [{ time_s: 0, x: 0.5, y: 0.5, r: 0.01 }], showBall: true }, 0);
    expect(frame.people.map(p => [p.row.track_id, p.colour])).toEqual([[2, TEAM_COLOUR.own], [3, TEAM_COLOUR.none]]);
    expect(frame.ball).toMatchObject({ x: 0.5, y: 0.5 });
  });

  it("leaves people and ball out when they are switched off in the player", () => {
    const index = indexObservations([row(2, 0, [0.1, 0.1, 0.2, 0.4])]);
    const frame = overlayAt({ w: 1920, h: 1080, index, teams: new Map(), selected: null, showBoxes: false, everyone: true, ball: [{ time_s: 0, x: 0.5, y: 0.5, r: 0.01 }], showBall: false }, 0);
    expect(frame.people).toEqual([]);
    expect(frame.ball).toBeNull();
  });
});

describe("painting", () => {
  it("draws a team-coloured ring for a labelled player, the pitch outline, the halfway line and the ball", () => {
    const { ctx, calls } = fakeContext();
    const index = indexObservations([row(2, 0, [0.1, 0.1, 0.2, 0.4])]);
    const frame = { ...overlayAt({ w: 1920, h: 1080, index, teams: new Map([[2, own]]), selected: null, showBoxes: true, everyone: true, ball: [{ time_s: 0, x: 0.5, y: 0.5, r: 0.01 }], showBall: true }, 0),
      outline: [[0.1, 0.5], [0.9, 0.5], [0.95, 0.9], [0.05, 0.9]] as [number, number][], halfway: [[0.5, 0.5], [0.5, 0.9]] as [number, number][] };
    paintOverlay(ctx, frame, 1280, 720);
    const ring = calls.findIndex(c => c.op === "ellipse");
    expect(ring).toBeGreaterThan(-1);
    expect(calls.slice(ring).filter(c => c.op === "stroke").map(c => c.strokeStyle).slice(0, 2)).toEqual(["black", TEAM_COLOUR.own]);
    expect(calls.filter(c => c.op === "stroke").map(c => c.strokeStyle)).toEqual(expect.arrayContaining(["white", "#f59e0b", "#fde047"]));
    expect(calls.find(c => c.op === "scale")?.args).toEqual([1280 / 1920, 720 / 1080]);
  });

  it("draws nothing but the experimental caption on an empty frame", () => {
    const { ctx, calls } = fakeContext();
    paintOverlay(ctx, { w: 1920, h: 1080, outline: null, halfway: null, people: [], ball: null }, 1920, 1080);
    expect(calls.filter(c => ["ellipse", "arc", "lineTo"].includes(c.op))).toEqual([]);
    expect(calls.filter(c => c.op === "fillText")).toHaveLength(1);
  });
});

describe("recording format", () => {
  it("prefers H.264 MP4 and falls back to WebM", () => {
    expect(pickRecording(t => t.startsWith("video/mp4"))).toEqual({ mimeType: "video/mp4;codecs=avc1.640028,mp4a.40.2", ext: "mp4" });
    expect(pickRecording(t => t.startsWith("video/webm"))?.ext).toBe("webm");
    expect(pickRecording(() => false)).toBeNull();
  });
});

/** A video that plays three frames then ends, and a recorder that keeps what it is given. */
function fakes() {
  const listeners = new Map<string, (() => void)[]>();
  const frameCallbacks: ((now: number, meta: { mediaTime: number }) => void)[] = [];
  const video = {
    src: "", muted: false, currentTime: 0, duration: 3, videoWidth: 1280, videoHeight: 720, paused: true, crossOrigin: null as string | null, preload: "",
    addEventListener: (name: string, fn: () => void) => listeners.set(name, [...(listeners.get(name) ?? []), fn]),
    removeEventListener: vi.fn(),
    play: vi.fn(async () => { video.paused = false; }),
    pause: vi.fn(() => { video.paused = true; }),
    load: vi.fn(), removeAttribute: vi.fn(),
    requestVideoFrameCallback: (cb: (now: number, meta: { mediaTime: number }) => void) => { frameCallbacks.push(cb); return frameCallbacks.length; },
    cancelVideoFrameCallback: vi.fn(),
  };
  const emit = (name: string) => (listeners.get(name) ?? []).forEach(fn => fn());
  const { ctx, calls } = fakeContext();
  const track = { kind: "video", stop: vi.fn() };
  const canvas = { width: 0, height: 0, getContext: () => ctx, captureStream: vi.fn(() => ({ getTracks: () => [track], addTrack: vi.fn() })) };
  const recorders: FakeRecorder[] = [];
  class FakeRecorder {
    static isTypeSupported = (t: string) => t.startsWith("video/mp4");
    state = "inactive"; ondataavailable: ((e: { data: Blob }) => void) | null = null; onstop: (() => void) | null = null;
    constructor(public stream: unknown, public options: { mimeType: string }) { recorders.push(this); }
    start() { this.state = "recording"; }
    stop() { this.state = "inactive"; this.ondataavailable?.({ data: new Blob(["frames"]) }); this.onstop?.(); }
  }
  const deps: ExportDeps = { createVideo: () => video as unknown as HTMLVideoElement, createCanvas: () => canvas as unknown as HTMLCanvasElement, Recorder: FakeRecorder as unknown as typeof MediaRecorder };
  const step = async (mediaTime: number) => { const cb = frameCallbacks.shift(); video.currentTime = mediaTime; cb?.(0, { mediaTime }); await Promise.resolve(); };
  return { video, emit, calls, recorders, deps, step, track };
}

describe("export", () => {
  it("records every played frame with the overlay painted on top, then hands back an MP4", async () => {
    const f = fakes(); const painted: number[] = []; const progress: number[] = [];
    const done = exportAnalysedVideo({ src: "/clip.mp4", draw: (_ctx, t) => painted.push(t), onProgress: p => progress.push(p), deps: f.deps });
    await vi.waitFor(() => expect(f.video.play).toHaveBeenCalledTimes(1));
    f.emit("seeked");
    await vi.waitFor(() => expect(f.recorders[0]?.state).toBe("recording"));
    await f.step(1); await f.step(2);
    f.emit("ended");
    const result = await done;
    expect(f.recorders[0].options.mimeType).toMatch(/^video\/mp4/);
    expect(painted).toEqual([0, 1, 2]);
    expect(f.calls.filter(c => c.op === "drawImage")).toHaveLength(3);
    expect(progress.at(-1)).toBe(1);
    expect(result.ext).toBe("mp4");
    expect(await result.blob.text()).toBe("frames");
    expect(f.track.stop).toHaveBeenCalled();
    expect(f.video.removeAttribute).toHaveBeenCalledWith("src");
  });

  it("stops recording and keeps nothing when cancelled", async () => {
    const f = fakes(); const controller = new AbortController();
    const done = exportAnalysedVideo({ src: "/clip.mp4", draw: () => undefined, onProgress: () => undefined, signal: controller.signal, deps: f.deps });
    await vi.waitFor(() => expect(f.video.play).toHaveBeenCalled());
    f.emit("seeked");
    await vi.waitFor(() => expect(f.recorders[0]?.state).toBe("recording"));
    controller.abort();
    await expect(done).rejects.toThrow(/cancelled/i);
    expect(f.recorders[0].state).toBe("inactive");
    expect(f.video.pause).toHaveBeenCalled();
  });

  it("refuses up front when the browser cannot record", async () => {
    const f = fakes();
    (f.deps.Recorder as unknown as { isTypeSupported: (t: string) => boolean }).isTypeSupported = () => false;
    await expect(exportAnalysedVideo({ src: "/clip.mp4", draw: () => undefined, onProgress: () => undefined, deps: f.deps })).rejects.toThrow(/cannot record/i);
    expect(f.video.play).not.toHaveBeenCalled();
  });
});
