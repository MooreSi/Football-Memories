import { containRect, drawingSvg } from "./drawing";
import type { Shape } from "./viewerState";

/** Spec 240: the frame on screen plus its drawing, as a 1920x1080 PNG. The frame is
 *  letterboxed the way the player shows it, so marks land where they were drawn.
 *  `frame` is false when the browser would not let the page read the video picture;
 *  the PNG then has the drawing over a plain background. */
export async function captureDrawing(video: HTMLVideoElement | null, shapes: Shape[], note: string): Promise<{ blob: Blob; frame: boolean }> {
  const OUT_W = 1920, OUT_H = 1080;
  const make = () => {
    const canvas = document.createElement("canvas");
    canvas.width = OUT_W; canvas.height = OUT_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("This browser cannot make a screenshot.");
    ctx.fillStyle = "#05080f";
    ctx.fillRect(0, 0, OUT_W, OUT_H);
    return { canvas, ctx };
  };
  let { canvas, ctx } = make();
  let frame = false;
  // The picture on screen: the playing frame, or the poster before the stream has started.
  const picture = await framePicture(video);
  if (picture) {
    const box = containRect(picture.width, picture.height, OUT_W, OUT_H);
    try {
      ctx.drawImage(picture.source, box.x, box.y, box.w, box.h);
      ctx.getImageData(0, 0, 1, 1); // throws if the picture is not readable
      frame = true;
    } catch {
      ({ canvas, ctx } = make());
    }
  }
  const url = URL.createObjectURL(new Blob([drawingSvg(shapes, note)], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error("The drawing could not be drawn.")); img.src = url; });
    ctx.drawImage(img, 0, 0, OUT_W, OUT_H);
  } finally {
    URL.revokeObjectURL(url);
  }
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("The screenshot could not be saved.");
  return { blob, frame };
}

async function framePicture(video: HTMLVideoElement | null): Promise<{ source: CanvasImageSource; width: number; height: number } | null> {
  if (!video) return null;
  if (video.videoWidth && video.readyState >= 2) return { source: video, width: video.videoWidth, height: video.videoHeight };
  if (!video.poster) return null;
  const img = new Image();
  img.crossOrigin = "anonymous";
  try {
    await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error("poster")); img.src = video.poster; });
  } catch {
    return null;
  }
  return img.naturalWidth ? { source: img, width: img.naturalWidth, height: img.naturalHeight } : null;
}

export function saveFile(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
