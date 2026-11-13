import type { Shape } from "./viewerState";

/** Spec 240: the drawing board's geometry. Marks are stored in 0..1 frame space and
 *  drawn in a 1600x900 box, so the overlay, the editor and the PNG export share one
 *  picture and it lands where it was drawn at any size. */
export const W = 1600, H = 900;
export const COLOURS = ["#facc15", "#ffffff", "#f87171", "#22d3ee", "#4ade80", "#fb923c"];
export const DEFAULT_COLOUR = COLOURS[0];
const STROKE = { 1: 6, 2: 10, 3: 16 } as const;
const FONT = { 1: 30, 2: 40, 3: 54 } as const;
const MARKER = { 1: 20, 2: 27, 3: 36 } as const;
const MAX_POINTS = 400;

export type Mark = { tag: "line" | "path" | "ellipse" | "rect" | "polygon" | "text" | "circle"; attrs: Record<string, string | number>; text?: string };

const r = (v: number) => Math.round(v * 10) / 10;
const px = (x: number) => r(x * W), py = (y: number) => r(y * H);

function head(tipX: number, tipY: number, fromX: number, fromY: number, sw: number, colour: string): { mark: Mark; back: [number, number] } {
  const angle = Math.atan2(tipY - fromY, tipX - fromX);
  const len = sw * 2.4 + 18, half = sw * 1.5 + 12;
  const bx = tipX - Math.cos(angle) * len, by = tipY - Math.sin(angle) * len;
  const nx = -Math.sin(angle) * half, ny = Math.cos(angle) * half;
  const points = [[tipX, tipY], [bx + nx, by + ny], [bx - nx, by - ny]].map(([x, y]) => `${r(x)},${r(y)}`).join(" ");
  // The shaft stops inside the head so its round cap never pokes past the tip.
  const inset = len * 0.6;
  return { mark: { tag: "polygon", attrs: { points, fill: colour, "stroke-linejoin": "round" } }, back: [r(tipX - Math.cos(angle) * inset), r(tipY - Math.sin(angle) * inset)] };
}

/** The SVG elements one mark draws, in W x H space. The first element carries
 *  `data-shape` (its kind). */
export function marks(s: Shape): Mark[] {
  const colour = s.colour ?? DEFAULT_COLOUR;
  const size = s.width ?? 2;
  const sw = STROKE[size];
  const stroke = { stroke: colour, "stroke-width": sw, "stroke-linecap": "round", fill: "none" } as const;
  const [x1, y1, x2, y2] = [px(s.x1), py(s.y1), px(s.x2), py(s.y2)];
  switch (s.kind) {
    case "arrow":
    case "dashed": {
      const h = head(x2, y2, x1, y1, sw, colour);
      const dash: Record<string, string> = s.kind === "dashed" ? { "stroke-dasharray": `${r(sw * 1.6)} ${r(sw * 1.8)}` } : {};
      return [{ tag: "line", attrs: { "data-shape": s.kind, x1, y1, x2: h.back[0], y2: h.back[1], ...stroke, ...dash } }, h.mark];
    }
    case "line":
      return [{ tag: "line", attrs: { "data-shape": "line", x1, y1, x2, y2, ...stroke } }];
    case "curve": {
      const cx = px(s.cx ?? (s.x1 + s.x2) / 2), cy = py(s.cy ?? (s.y1 + s.y2) / 2);
      const h = head(x2, y2, cx, cy, sw, colour);
      // The path runs to the tip; the head covers its end.
      return [{ tag: "path", attrs: { "data-shape": "curve", d: `M${x1} ${y1} Q${cx} ${cy} ${x2} ${y2}`, ...stroke } }, h.mark];
    }
    case "pen":
      return [{ tag: "path", attrs: { "data-shape": "pen", d: smoothPath(s.points ?? [[s.x1, s.y1], [s.x2, s.y2]]), ...stroke, "stroke-linejoin": "round" } }];
    case "spotlight": {
      const rx = Math.max(20, r(Math.abs(x2 - x1)));
      const ry = Math.max(r(rx * 0.38), r(Math.abs(y2 - y1)));
      return [
        { tag: "ellipse", attrs: { "data-shape": "spotlight", cx: x1, cy: y1, rx, ry, fill: colour, "fill-opacity": 0.18, stroke: colour, "stroke-width": sw * 0.8 } },
        { tag: "ellipse", attrs: { cx: x1, cy: y1, rx: r(rx * 0.62), ry: r(ry * 0.62), fill: "none", stroke: colour, "stroke-opacity": 0.55, "stroke-width": Math.max(2, sw * 0.35) } },
      ];
    }
    case "zone":
      return [{ tag: "rect", attrs: {
        "data-shape": "zone", x: Math.min(x1, x2), y: Math.min(y1, y2), width: r(Math.abs(x2 - x1)), height: r(Math.abs(y2 - y1)), rx: 14,
        fill: colour, "fill-opacity": 0.2, stroke: colour, "stroke-width": Math.max(3, sw * 0.5), "stroke-dasharray": `${sw * 2} ${sw * 1.2}`,
      } }];
    case "text": {
      const font = FONT[size], label = s.label ?? "";
      const width = r(label.length * font * 0.58 + font * 0.9), height = r(font * 1.45);
      return [
        { tag: "rect", attrs: { "data-shape": "text", x: x1, y: r(y1 - height / 2), width, height, rx: r(height / 2), fill: "#0b1220", "fill-opacity": 0.82, stroke: colour, "stroke-width": 3 } },
        { tag: "text", attrs: { x: r(x1 + font * 0.45), y: r(y1 + font * 0.35), fill: colour, "font-size": font, "font-weight": 700, "font-family": "Inter, system-ui, sans-serif" }, text: label },
      ];
    }
    case "marker": {
      const radius = MARKER[size];
      return [
        { tag: "circle", attrs: { "data-shape": "marker", cx: x1, cy: y1, r: radius, fill: colour, stroke: "#0b1220", "stroke-width": 4 } },
        { tag: "text", attrs: { x: x1, y: r(y1 + radius * 0.36), fill: "#0b1220", "font-size": r(radius * 1.05), "font-weight": 800, "text-anchor": "middle", "font-family": "Inter, system-ui, sans-serif" }, text: s.label ?? "" },
      ];
    }
  }
}

/** A pen stroke as one smooth path: quadratic curves through the midpoints. */
export function smoothPath(points: [number, number][]): string {
  const p = points.map(([x, y]) => [px(x), py(y)]);
  if (p.length < 3) return p.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ");
  let d = `M${p[0][0]} ${p[0][1]}`;
  for (let i = 1; i < p.length - 1; i++) {
    d += ` Q${p[i][0]} ${p[i][1]} ${r((p[i][0] + p[i + 1][0]) / 2)} ${r((p[i][1] + p[i + 1][1]) / 2)}`;
  }
  const last = p[p.length - 1];
  return `${d} L${last[0]} ${last[1]}`;
}

/** At most `max` points, evenly picked, always keeping the first and the last. */
export function thin(points: [number, number][], max = MAX_POINTS): [number, number][] {
  if (points.length <= max) return points;
  const step = (points.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => points[Math.round(i * step)]);
}

const clamp = (v: number) => Math.min(1, Math.max(0, r(v * 1000) / 1000));

/** The control point that makes the curve pass through the swoop's furthest point. */
export function curveThrough(x1: number, y1: number, x2: number, y2: number, path: [number, number][]): { cx: number; cy: number } {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  let far: [number, number] = [mx, my], best = -1;
  for (const [x, y] of path) {
    const d = Math.abs((x2 - x1) * (y1 - y) - (x1 - x) * (y2 - y1)) / len;
    if (d > best) { best = d; far = [x, y]; }
  }
  return { cx: clamp(2 * far[0] - mx), cy: clamp(2 * far[1] - my) };
}

/** The mark to keep from a finished drag, or null when the drag drew nothing. */
export function finish(s: Shape): Shape | null {
  if (s.kind === "text" || s.kind === "marker") return s.label?.trim() ? s : null;
  if (s.kind === "pen") {
    const points = thin(s.points ?? []);
    return points.length >= 2 ? { ...s, points } : null;
  }
  return Math.hypot(s.x2 - s.x1, s.y2 - s.y1) > 0.015 ? s : null;
}

const esc = (v: string | number) => String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const SHADOW_ID = "fm-mark-shadow";
/** The soft shadow that lifts marks off grass and floodlight glare. */
export const SHADOW = `<filter id="${SHADOW_ID}" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="3" stdDeviation="5" flood-color="#000" flood-opacity="0.55"/></filter>`;

/** The marks (and an optional note caption) as one standalone SVG, for the PNG export. */
export function drawingSvg(shapes: Shape[], note = ""): string {
  const body = shapes.flatMap(marks).map((m) => {
    const attrs = Object.entries(m.attrs).map(([k, v]) => `${k}="${esc(v)}"`).join(" ");
    return m.text === undefined ? `<${m.tag} ${attrs}/>` : `<${m.tag} ${attrs}>${esc(m.text)}</${m.tag}>`;
  }).join("");
  const caption = note.trim()
    ? `<rect x="28" y="28" width="${Math.min(W - 56, r(note.length * 17 + 48))}" height="64" rx="16" fill="#0b1220" fill-opacity="0.8"/><text x="52" y="70" fill="#fff" font-size="30" font-family="Inter, system-ui, sans-serif">${esc(note.trim().slice(0, 90))}</text>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs>${SHADOW}</defs><g filter="url(#${SHADOW_ID})">${body}</g>${caption}</svg>`;
}

/** The mark moved by (dx, dy), stopping at the frame edge so its shape never changes. */
export function moveShape(s: Shape, dx: number, dy: number): Shape {
  const xs = [s.x1, s.x2, ...(s.cx === undefined ? [] : [s.cx]), ...(s.points ?? []).map((p) => p[0])];
  const ys = [s.y1, s.y2, ...(s.cy === undefined ? [] : [s.cy]), ...(s.points ?? []).map((p) => p[1])];
  const mx = Math.min(1 - Math.max(...xs), Math.max(-Math.min(...xs), dx));
  const my = Math.min(1 - Math.max(...ys), Math.max(-Math.min(...ys), dy));
  const fx = (v: number) => Math.round((v + mx) * 1e4) / 1e4, fy = (v: number) => Math.round((v + my) * 1e4) / 1e4;
  return {
    ...s, x1: fx(s.x1), y1: fy(s.y1), x2: fx(s.x2), y2: fy(s.y2),
    ...(s.cx === undefined ? {} : { cx: fx(s.cx) }), ...(s.cy === undefined ? {} : { cy: fy(s.cy) }),
    ...(s.points ? { points: s.points.map(([x, y]) => [fx(x), fy(y)] as [number, number]) } : {}),
  };
}

/** A drawing on a frame that is not a tagged moment is keyed by match and time. */
export function frameNoteId(matchId: string, time: number): string {
  return `frame:${matchId}:${time.toFixed(1)}`;
}

export function isFrameNote(n: { moment_id: string }): boolean {
  return n.moment_id.startsWith("frame:");
}

export function drawingFileName(title: string, time: number): string {
  const t = Math.max(0, Math.floor(time));
  const clock = `${String(Math.floor(t / 60)).padStart(2, "0")}-${String(t % 60).padStart(2, "0")}`;
  return `${title.replace(/[\\/:*?"<>|]+/g, "-").trim()} ${clock} drawing.png`;
}

/** Where a vw x vh frame sits inside a bw x bh box with object-fit: contain. */
export function containRect(vw: number, vh: number, bw: number, bh: number): { x: number; y: number; w: number; h: number } {
  const scale = Math.min(bw / vw, bh / vh);
  const w = r(vw * scale), h = r(vh * scale);
  return { x: r((bw - w) / 2), y: r((bh - h) / 2), w, h };
}
