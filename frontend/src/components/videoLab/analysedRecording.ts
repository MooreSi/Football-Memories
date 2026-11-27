import { footRing, type OverlayFrame } from "./LabVideo";

/**
 * Owner request 2026-11-26: download the analysed clip as it looks in Video Lab, with the
 * pitch outline, halfway line, team-coloured players and ball, instead of annotated.mp4
 * (the worker's first-pass detection boxes, rendered before tracking, pitch and reviews).
 *
 * The clean sample is played once in the background and each frame is drawn to a canvas
 * with the same overlay the player shows, then recorded by the browser. It runs at real
 * playback speed and nothing is uploaded or saved on the server.
 */

const SOURCE_STRENGTH: Record<string, number> = { you: 1, kit: 0.9 };
const CAPTION = "Video Lab analysis · estimated, not confirmed";

/** Paints one overlay frame onto a canvas the size of the video (the overlay's own space is w x h). */
export function paintOverlay(ctx: CanvasRenderingContext2D, frame: OverlayFrame, width: number, height: number) {
  const { w, h } = frame;
  ctx.save();
  ctx.scale(width / w, height / h);
  const line = (points: [number, number][], close: boolean) => {
    ctx.beginPath();
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x * w, y * h) : ctx.moveTo(x * w, y * h)));
    if (close) ctx.closePath();
  };
  if (frame.outline) {
    line(frame.outline, true);
    ctx.globalAlpha = 0.05; ctx.fillStyle = "#22c55e"; ctx.fill();
    ctx.globalAlpha = 0.7; ctx.strokeStyle = "white"; ctx.lineWidth = h / 400; ctx.setLineDash([h / 60, h / 90]); ctx.stroke();
  }
  if (frame.halfway) {
    line(frame.halfway, false);
    ctx.globalAlpha = 0.85; ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = h / 350; ctx.setLineDash([h / 50, h / 80]); ctx.stroke();
  }
  for (const box of frame.boxes ?? []) {
    line(box, false);
    ctx.globalAlpha = 0.7; ctx.strokeStyle = "white"; ctx.lineWidth = h / 400; ctx.setLineDash([h / 60, h / 90]); ctx.stroke();
  }
  ctx.setLineDash([]);
  for (const { row, info, colour } of frame.people) {
    const ring = footRing(row.image_box!, w, h);
    const yours = info?.source === "you";
    ctx.beginPath(); ctx.ellipse(ring.cx, ring.cy, ring.rx, ring.ry, 0, 0, Math.PI * 2);
    ctx.globalAlpha = 0.35; ctx.strokeStyle = "black"; ctx.lineWidth = h / 260 + h / 400; ctx.stroke();
    if (yours) { ctx.globalAlpha = 0.12; ctx.fillStyle = colour; ctx.fill(); }
    ctx.globalAlpha = SOURCE_STRENGTH[info?.source ?? ""] ?? 0.7; ctx.strokeStyle = colour;
    ctx.lineWidth = yours ? h / 300 : info?.source === "kit" ? h / 340 : h / 420; ctx.stroke();
  }
  if (frame.ball) {
    const { x, y, r } = frame.ball, radius = Math.max(r * w * 1.7, h / 80);
    ctx.beginPath(); ctx.arc(x * w, y * h, radius, 0, Math.PI * 2);
    ctx.globalAlpha = 0.4; ctx.strokeStyle = "black"; ctx.lineWidth = h / 250; ctx.stroke();
    ctx.globalAlpha = 0.15; ctx.fillStyle = "#fde047"; ctx.fill();
    ctx.globalAlpha = 1; ctx.strokeStyle = "#fde047"; ctx.lineWidth = h / 360; ctx.stroke();
  }
  ctx.globalAlpha = 0.85; ctx.fillStyle = "white"; ctx.font = `600 ${Math.round(h / 45)}px system-ui, sans-serif`; ctx.textBaseline = "bottom";
  ctx.fillText(CAPTION, h / 60, h - h / 60);
  ctx.restore();
}

const FORMATS = [
  { mimeType: "video/mp4;codecs=avc1.640028,mp4a.40.2", ext: "mp4" },
  { mimeType: "video/mp4", ext: "mp4" },
  { mimeType: "video/webm;codecs=vp9,opus", ext: "webm" },
  { mimeType: "video/webm", ext: "webm" },
] as const;

/** MP4 (H.264) where the browser can record it, otherwise WebM. */
export function pickRecording(isSupported: (type: string) => boolean): { mimeType: string; ext: string } | null {
  const found = FORMATS.find(f => isSupported(f.mimeType));
  return found ? { mimeType: found.mimeType, ext: found.ext } : null;
}

export type ExportDeps = {
  createVideo: () => HTMLVideoElement;
  createCanvas: () => HTMLCanvasElement;
  Recorder: typeof MediaRecorder;
  /** Routes the clip's sound into the recording without playing it through the speakers. */
  AudioContext?: typeof AudioContext;
};

export function browserDeps(): ExportDeps | null {
  if (typeof MediaRecorder === "undefined" || typeof HTMLCanvasElement === "undefined" || !("captureStream" in HTMLCanvasElement.prototype)) return null;
  return {
    createVideo: () => document.createElement("video"),
    createCanvas: () => document.createElement("canvas"),
    Recorder: MediaRecorder,
    AudioContext: typeof AudioContext === "undefined" ? undefined : AudioContext,
  };
}

type FrameVideo = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: (now: number, meta: { mediaTime: number }) => void) => number;
  cancelVideoFrameCallback?: (id: number) => void;
};

/**
 * Plays `src` once from the start and records it with `draw` painted over every frame.
 * Call it straight from a click: browsers only allow sound playback after a user action.
 */
export function exportAnalysedVideo({ src, draw, onProgress, signal, deps }: {
  src: string;
  draw: (ctx: CanvasRenderingContext2D, time: number, width: number, height: number) => void;
  onProgress: (fraction: number) => void;
  signal?: AbortSignal;
  deps: ExportDeps;
}): Promise<{ blob: Blob; ext: string; mimeType: string }> {
  const format = pickRecording(t => deps.Recorder.isTypeSupported(t));
  if (!format) return Promise.reject(new Error("This browser cannot record video. Try the latest Chrome, Edge or Safari."));
  const video = deps.createVideo() as FrameVideo;
  video.preload = "auto";
  video.src = src;
  // Created inside the click so the browser lets it run; failures just mean a silent export.
  let audio: AudioContext | null = null, sound: MediaStream | null = null;
  try {
    if (deps.AudioContext) {
      audio = new deps.AudioContext();
      const destination = audio.createMediaStreamDestination();
      audio.createMediaElementSource(video).connect(destination);
      sound = destination.stream;
    }
  } catch { audio = null; sound = null; }
  if (!sound) video.muted = true;
  const canvas = deps.createCanvas();
  const ctx = canvas.getContext("2d");
  let stream: MediaStream | null = null, recorder: MediaRecorder | null = null, handle = 0, finished = false;

  return new Promise((resolve, reject) => {
    const chunks: Blob[] = [];
    const cleanup = () => {
      finished = true;
      if (video.cancelVideoFrameCallback) video.cancelVideoFrameCallback(handle); else cancelAnimationFrame(handle);
      video.pause();
      stream?.getTracks().forEach(t => t.stop());
      sound?.getTracks().forEach(t => t.stop());
      void audio?.close().catch(() => undefined);
      video.removeAttribute("src");
      video.load();
      signal?.removeEventListener("abort", cancel);
    };
    const fail = (error: Error) => {
      if (finished) return;
      if (recorder && recorder.state !== "inactive") { recorder.onstop = null; recorder.stop(); }
      cleanup();
      reject(error);
    };
    function cancel() { fail(new Error("Export cancelled. Nothing was saved.")); }
    signal?.addEventListener("abort", cancel);
    if (!ctx) { fail(new Error("This browser cannot draw the analysis overlay.")); return; }

    const paint = (time: number) => {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      draw(ctx, time, canvas.width, canvas.height);
      if (video.duration > 0) onProgress(Math.min(1, time / video.duration));
    };
    const schedule = () => {
      if (finished) return;
      if (video.requestVideoFrameCallback) handle = video.requestVideoFrameCallback((_, meta) => { paint(meta.mediaTime); schedule(); });
      else handle = requestAnimationFrame(() => { paint(video.currentTime); schedule(); });
    };
    const record = () => {
      if (finished) return;
      canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      paint(0);
      stream = canvas.captureStream(30);
      sound?.getAudioTracks().forEach(t => stream!.addTrack(t));
      recorder = new deps.Recorder(stream, { mimeType: format.mimeType, videoBitsPerSecond: 8_000_000 });
      recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      recorder.onstop = () => {
        cleanup();
        onProgress(1);
        resolve({ blob: new Blob(chunks, { type: format.mimeType.split(";")[0] }), ext: format.ext, mimeType: format.mimeType });
      };
      recorder.start(1000);
      schedule();
      void Promise.resolve(video.play()).catch(() => fail(new Error("The clip could not be played for export.")));
    };
    video.addEventListener("error", () => fail(new Error("The clip could not be loaded for export.")));
    video.addEventListener("ended", () => { if (!finished && recorder?.state === "recording") recorder.stop(); });
    video.addEventListener("seeked", record, { once: true } as AddEventListenerOptions);
    // Start playing inside the click (it unlocks this element), then rewind and record from 0.
    void Promise.resolve(video.play()).then(() => { if (finished) return; video.pause(); video.currentTime = 0; },
      () => fail(new Error("The browser blocked playback for export. Click Export again.")));
  });
}

/** Saves a finished recording through a normal browser download. */
export function saveRecording(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = name; link.rel = "noopener";
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
