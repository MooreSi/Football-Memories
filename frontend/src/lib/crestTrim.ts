/** Owner report 2026-11-15: crests looked small. Many crest files carry a wide plain margin
 *  (Racing Club Warwick's is 440x512 with the crest in the middle and a faint watermark),
 *  so the badge crops to the crest itself, in the browser; the file is never changed. */

export type CrestBox = { x: number; y: number; size: number; round: boolean };

/** The square around the crest in RGBA pixels, and whether the crest is round (its corners
 *  are background), or null when nothing stands out from the background. */
export function crestBox(px: Uint8ClampedArray, w: number, h: number): CrestBox | null {
  const at = (x: number, y: number) => (y * w + x) * 4;
  // The background is the colour of the corners (most crest files share one plain colour).
  const corners = [at(0, 0), at(w - 1, 0), at(0, h - 1), at(w - 1, h - 1)];
  const bg = [0, 1, 2, 3].map((c) => corners.reduce((n, i) => n + px[i + c], 0) / 4);
  const clear = bg[3] < 128;
  const ink = (x: number, y: number) => {
    const i = at(x, y);
    if (clear) return px[i + 3] > 64;
    if (px[i + 3] < 64) return false;
    return Math.max(Math.abs(px[i] - bg[0]), Math.abs(px[i + 1] - bg[1]), Math.abs(px[i + 2] - bg[2])) > 80;
  };
  const rows = new Array<number>(h).fill(0);
  const cols = new Array<number>(w).fill(0);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (ink(x, y)) { rows[y] += 1; cols[x] += 1; }
  // A row or column counts when it holds a real share of the crest, so a faint mark
  // (a watermark, a stray pixel) does not widen the box.
  const span = (counts: number[]) => {
    const most = Math.max(...counts);
    if (!most) return null;
    const keep = Math.max(1, most * 0.15);
    const first = counts.findIndex((n) => n >= keep);
    let last = counts.length - 1;
    while (counts[last] < keep) last -= 1;
    return [first, last + 1] as const;
  };
  const ys = span(rows);
  const xs = span(cols);
  if (!ys || !xs) return null;
  const bw = xs[1] - xs[0];
  const bh = ys[1] - ys[0];
  // A little room back, for the thin edges the share rule shaves off a round crest.
  const size = Math.max(bw, bh) * 1.06;
  const x = xs[0] + bw / 2 - size / 2;
  const y = ys[0] + bh / 2 - size / 2;
  // Round when each corner of the crest's own box is (nearly) background.
  const c = Math.max(1, Math.round(Math.min(bw, bh) * 0.12));
  const cornerInk = (x0: number, y0: number) => {
    let n = 0;
    for (let yy = y0; yy < y0 + c; yy++) for (let xx = x0; xx < x0 + c; xx++) if (ink(xx, yy)) n += 1;
    return n / (c * c);
  };
  const round = [[xs[0], ys[0]], [xs[1] - c, ys[0]], [xs[0], ys[1] - c], [xs[1] - c, ys[1] - c]]
    .every(([x0, y0]) => cornerInk(x0, y0) < 0.05);
  return { x, y, size, round };
}

const trimmed = new Map<string, Promise<{ url: string; round: boolean } | null>>();

/** The crest cropped to itself as a square data URL, or null when it cannot be read
 *  (no canvas, a failed load); callers then show the original. Cached per address. */
export function trimCrest(src: string): Promise<{ url: string; round: boolean } | null> {
  const known = trimmed.get(src);
  if (known) return known;
  const job = new Promise<{ url: string; round: boolean } | null>((resolve) => {
    if (typeof document === "undefined") { resolve(null); return; }
    // No readable canvas (an old browser, the test DOM): show the crest as it is, at once.
    let probe: CanvasRenderingContext2D | null = null;
    try { probe = document.createElement("canvas").getContext("2d"); } catch { probe = null; }
    if (!probe) { resolve(null); return; }
    // A crest that never finishes loading must not hold the badge or report back.
    setTimeout(() => resolve(null), 4000);
    const img = new Image();
    img.onload = () => {
      try {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx || !w || !h) { resolve(null); return; }
        ctx.drawImage(img, 0, 0);
        const box = crestBox(ctx.getImageData(0, 0, w, h).data, w, h);
        if (!box) { resolve(null); return; }
        const out = document.createElement("canvas");
        out.width = out.height = Math.ceil(box.size);
        out.getContext("2d")?.drawImage(img, -box.x, -box.y);
        resolve({ url: out.toDataURL("image/png"), round: box.round });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
  trimmed.set(src, job);
  return job;
}
