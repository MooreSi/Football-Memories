import { RotateCw } from "lucide-react";
import { type PointerEvent, useEffect, useRef, useState } from "react";
import { Button } from "../ui/Button";

const OUTPUT = 1024; // the server stores 512 px; 1024 keeps it sharp and well under its limit
const PREVIEW = 320;
/** The server accepts pictures up to 10 MB in JPEG, PNG or WebP. */
export const SERVER_LIMIT = 10 * 1024 * 1024;
export const SERVER_TYPES = ["image/jpeg", "image/png", "image/webp"];

type Bitmap = { width: number; height: number; close?: () => void };
type View = { zoom: number; x: number; y: number; turns: number };

function paint(canvas: HTMLCanvasElement, image: Bitmap, view: View, size: number) {
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const sideways = view.turns % 2 === 1;
  const w = sideways ? image.height : image.width;
  const h = sideways ? image.width : image.height;
  const scale = Math.max(size / w, size / h) * view.zoom;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, size, size);
  ctx.save();
  ctx.translate(size / 2 + view.x * size, size / 2 + view.y * size);
  ctx.rotate((view.turns * Math.PI) / 2);
  ctx.scale(scale, scale);
  ctx.drawImage(image as CanvasImageSource, -image.width / 2, -image.height / 2);
  ctx.restore();
}

/** Square crop with zoom, drag to position and rotate; saves a right-sized JPEG. */
export function PhotoCropper({ file, onCancel, onSave }: { file: File; onCancel: () => void; onSave: (photo: File) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<Bitmap>();
  const [failed, setFailed] = useState(false);
  const [view, setView] = useState<View>({ zoom: 1, x: 0, y: 0, turns: 0 });
  const drag = useRef<{ x: number; y: number; vx: number; vy: number } | undefined>(undefined);

  useEffect(() => {
    let live = true;
    let loaded: Bitmap | undefined;
    createImageBitmap(file).then((bitmap) => { loaded = bitmap; if (live) setImage(bitmap); }).catch(() => live && setFailed(true));
    return () => { live = false; loaded?.close?.(); };
  }, [file]);
  useEffect(() => { if (image && canvas.current) paint(canvas.current, image, view, PREVIEW * 2); }, [image, view]);

  const down = (e: PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
  };
  const move = (e: PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    if (!d) return;
    const limit = view.zoom / 2;
    const clamp = (n: number) => Math.max(-limit, Math.min(limit, n));
    setView((v) => ({ ...v, x: clamp(d.vx + (e.clientX - d.x) / PREVIEW), y: clamp(d.vy + (e.clientY - d.y) / PREVIEW) }));
  };
  const save = () => {
    if (!image) return;
    const out = document.createElement("canvas");
    paint(out, image, view, OUTPUT);
    out.toBlob((blob) => {
      if (blob) onSave(new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" }));
    }, "image/jpeg", 0.9);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink-950/75 p-4" onClick={onCancel}>
      <div role="dialog" aria-modal="true" aria-label="Crop photo" className="panel w-full max-w-sm space-y-4 p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold">Crop photo</h2>
        {failed ? (
          <p className="text-sm text-danger">The browser could not open this picture. Try a JPEG or PNG (on iPhone, share it as "Most Compatible").</p>
        ) : (
          <>
            <p className="text-sm text-fg-muted">Drag to position, zoom to fit. Any size is fine; the photo is resized before it is saved.</p>
            <canvas ref={canvas} aria-label="Photo preview" onPointerDown={down} onPointerMove={move} onPointerUp={() => { drag.current = undefined; }}
              className="mx-auto aspect-square w-full max-w-[320px] cursor-grab touch-none rounded-2xl bg-black active:cursor-grabbing" />
            <div className="flex items-center gap-3">
              <label className="flex flex-1 items-center gap-3 text-xs text-fg-muted">Zoom
                <input type="range" aria-label="Zoom" min={1} max={4} step={0.05} value={view.zoom} className="flex-1"
                  onChange={(e) => setView((v) => ({ ...v, zoom: Number(e.target.value) }))} />
              </label>
              <Button type="button" variant="ghost" aria-label="Rotate" onClick={() => setView((v) => ({ ...v, turns: (v.turns + 1) % 4, x: 0, y: 0 }))}><RotateCw size={15} aria-hidden /></Button>
            </div>
          </>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button type="button" variant="primary" disabled={!image} onClick={save}>Save photo</Button>
        </div>
      </div>
    </div>
  );
}
