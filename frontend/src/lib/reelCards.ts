/** Animated highlight-reel title cards (spec 190, owner request 2026-11-10).
 *
 *  Cards are drawn on a 1920x1080 canvas frame by frame: `drawCard(ctx, card, theme, t)`
 *  with t from 0 to 1 over the card's length. The reel studio previews the animation
 *  live and records it with MediaRecorder; the desktop helper encodes the recording
 *  into the reel (the Mac's ffmpeg cannot draw text). Crests come from the app's own
 *  /api/team-logo, so the canvas is never tainted. */
import { fixtureDate, fixtureParts, ukDate } from "./hudlFixture";

export const W = 1920;
export const H = 1080;

export type CardKind = "opening" | "match" | "closing";
export interface CardSpec {
  kind: CardKind;
  title: string;
  subtitle?: string;
  /** Match cards: both clubs, the UK date and a detail line (age, venue, moments). */
  home?: string;
  away?: string;
  date?: string;
  detail?: string;
}
export type ThemeId = "floodlights" | "kickoff" | "gold" | "neon" | "matchday" | "minimal";
export const THEMES: { id: ThemeId; label: string; blurb: string }[] = [
  { id: "floodlights", label: "Floodlights", blurb: "Night match, sweeping floodlights" },
  { id: "kickoff", label: "Kick-off", blurb: "Pitch lines draw in, crests clash" },
  { id: "gold", label: "Trophy gold", blurb: "Gold foil with a shine sweep" },
  { id: "neon", label: "Neon", blurb: "Glowing outlines on a stadium grid" },
  { id: "matchday", label: "Matchday poster", blurb: "Bold stripes and a date stamp" },
  { id: "minimal", label: "Clean", blurb: "Calm type, growing underline" },
];
export const CARD_SECONDS: Record<CardKind, number> = { opening: 4, match: 3.5, closing: 3.5 };

/** A match card from a Hudl title such as "261108 U11 v Stoke (A)". */
export function matchCard(title: string, club: string | null, extra: { age?: string; moments?: number } = {}): CardSpec {
  const parts = fixtureParts(title);
  const date = fixtureDate(title);
  const home = club || "Home";
  const away = parts?.opponent ?? title;
  const detail = [extra.age, parts?.venue, extra.moments ? `${extra.moments} ${extra.moments === 1 ? "moment" : "moments"}` : ""]
    .filter(Boolean).join("  ·  ");
  return { kind: "match", title: parts ? `${home} v ${away}` : title, home, away: parts ? away : undefined,
    date: date ? ukDate(date) : undefined, detail };
}

// ---------- maths and helpers ----------
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => 1 - Math.pow(1 - clamp(x), 3);
const backOut = (x: number) => { const c = 1.70158; const v = clamp(x) - 1; return 1 + (c + 1) * v * v * v + c * v * v; };
/** 0 before `a`, 1 after `b`, eased between. */
const span = (t: number, a: number, b: number) => ease((t - a) / (b - a));
const FONT = '"Inter", "Helvetica Neue", system-ui, -apple-system, "Segoe UI", sans-serif';

function rand(seed: number) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}

export type Crests = Partial<Record<string, HTMLImageElement | null>>;

export function crestUrl(name: string): string {
  return `/api/team-logo?name=${encodeURIComponent(name)}`;
}

export function loadCrest(name: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (typeof Image === "undefined") { resolve(null); return; }
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = crestUrl(name);
  });
}

function initials(name: string) {
  return name.split(/\s+/).filter((w) => w && !/^U\d+$/i.test(w)).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function crest(ctx: CanvasRenderingContext2D, name: string, img: HTMLImageElement | null | undefined, x: number, y: number, size: number, ring: string) {
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 14;
  ctx.beginPath();
  ctx.arc(x, y, size / 2, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.96)";
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.lineWidth = size * 0.035;
  ctx.strokeStyle = ring;
  ctx.stroke();
  if (img) {
    const inner = size * 0.7;
    const ratio = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1;
    const w = ratio >= 1 ? inner : inner * ratio;
    const h = ratio >= 1 ? inner / ratio : inner;
    ctx.drawImage(img, x - w / 2, y - h / 2, w, h);
  } else {
    ctx.fillStyle = "#0b1230";
    ctx.font = `800 ${size * 0.34}px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initials(name), x, y + size * 0.02);
  }
  ctx.restore();
}

function fitFont(ctx: CanvasRenderingContext2D, text: string, weight: number, max: number, width: number) {
  let size = max;
  ctx.font = `${weight} ${size}px ${FONT}`;
  while (size > 40 && ctx.measureText(text).width > width) {
    size -= 4;
    ctx.font = `${weight} ${size}px ${FONT}`;
  }
  return size;
}

interface Palette { text: string; sub: string; accent: string; ring: string }

// ---------- backgrounds ----------
function floodlights(ctx: CanvasRenderingContext2D, t: number): Palette {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#030714"); sky.addColorStop(0.55, "#0c1838"); sky.addColorStop(1, "#06210f");
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  for (const [x, dir] of [[220, 1], [W - 220, -1]] as const) {
    const swing = Math.sin(t * Math.PI * 1.4 + (dir > 0 ? 0 : 1.2)) * 0.12;
    ctx.save();
    ctx.translate(x, 40);
    ctx.rotate(dir * (0.5 + swing));
    const beam = ctx.createLinearGradient(0, 0, 0, H * 1.2);
    beam.addColorStop(0, "rgba(255,246,220,0.55)"); beam.addColorStop(1, "rgba(255,246,220,0)");
    ctx.fillStyle = beam;
    ctx.globalCompositeOperation = "lighter";
    ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(18, 0); ctx.lineTo(260, H * 1.2); ctx.lineTo(-260, H * 1.2); ctx.closePath(); ctx.fill();
    ctx.restore();
    const glow = ctx.createRadialGradient(x, 40, 0, x, 40, 160);
    glow.addColorStop(0, "rgba(255,255,240,0.95)"); glow.addColorStop(1, "rgba(255,255,240,0)");
    ctx.fillStyle = glow; ctx.fillRect(x - 160, -120, 320, 320);
  }
  // Mown stripes on the pitch at the bottom.
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = i % 2 ? "rgba(34,120,58,0.55)" : "rgba(28,100,48,0.55)";
    ctx.beginPath();
    const x0 = (i / 12) * W, x1 = ((i + 1) / 12) * W;
    ctx.moveTo(W / 2 + (x0 - W / 2) * 0.55, 820); ctx.lineTo(W / 2 + (x1 - W / 2) * 0.55, 820);
    ctx.lineTo(x1 + (x1 - W / 2) * 0.4, H); ctx.lineTo(x0 + (x0 - W / 2) * 0.4, H); ctx.closePath(); ctx.fill();
  }
  const fade = ctx.createLinearGradient(0, 760, 0, H);
  fade.addColorStop(0, "rgba(3,7,20,1)"); fade.addColorStop(0.35, "rgba(3,7,20,0.2)"); fade.addColorStop(1, "rgba(3,7,20,0.6)");
  ctx.fillStyle = fade; ctx.fillRect(0, 760, W, H - 760);
  return { text: "#ffffff", sub: "#cbd5f5", accent: "#22d3ee", ring: "#22d3ee" };
}

function kickoff(ctx: CanvasRenderingContext2D, t: number): Palette {
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = i % 2 ? "#1f7a3a" : "#238a42";
    ctx.fillRect((i * W) / 10, 0, W / 10 + 1, H);
  }
  const vignette = ctx.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, 1200);
  vignette.addColorStop(0, "rgba(0,0,0,0)"); vignette.addColorStop(1, "rgba(0,0,0,0.6)");
  ctx.fillStyle = vignette; ctx.fillRect(0, 0, W, H);
  const draw = span(t, 0, 0.45);
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.75)"; ctx.lineWidth = 6;
  const perimeter = 2 * (W - 160 + H - 160);
  ctx.setLineDash([perimeter * draw, perimeter]);
  ctx.strokeRect(80, 80, W - 160, H - 160);
  ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(W / 2, 80); ctx.lineTo(W / 2, 80 + (H - 160) * draw); ctx.stroke();
  ctx.beginPath(); ctx.arc(W / 2, H / 2, 190, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * draw); ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.beginPath(); ctx.arc(W / 2, H / 2, 9, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.fillStyle = `rgba(4,20,10,${0.45 * span(t, 0.25, 0.5)})`;
  ctx.fillRect(0, H / 2 - 230, W, 460);
  return { text: "#ffffff", sub: "#e3f6e8", accent: "#facc15", ring: "#facc15" };
}

function gold(ctx: CanvasRenderingContext2D, t: number): Palette {
  const bg = ctx.createRadialGradient(W / 2, H * 0.45, 100, W / 2, H / 2, 1300);
  bg.addColorStop(0, "#4a3409"); bg.addColorStop(0.55, "#1f1504"); bg.addColorStop(1, "#080501");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  const r = rand(7);
  for (let i = 0; i < 70; i++) {
    const x = r() * W, y = ((r() * H - t * 220 * (0.4 + r())) % H + H) % H, s = 1.5 + r() * 3.5;
    ctx.fillStyle = `rgba(253,224,137,${0.15 + r() * 0.45})`;
    ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = "rgba(245,197,66,0.35)"; ctx.lineWidth = 3;
  ctx.strokeRect(70, 70, W - 140, H - 140);
  ctx.strokeStyle = "rgba(245,197,66,0.15)"; ctx.strokeRect(92, 92, W - 184, H - 184);
  return { text: "gold", sub: "#f3dfa6", accent: "#f5c542", ring: "#e4b33a" };
}

function neon(ctx: CanvasRenderingContext2D, t: number): Palette {
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#07020f"); bg.addColorStop(1, "#140726");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.strokeStyle = "rgba(192,38,211,0.35)"; ctx.lineWidth = 2;
  const horizon = H * 0.62;
  for (let i = -14; i <= 14; i++) { ctx.beginPath(); ctx.moveTo(W / 2 + i * 40, horizon); ctx.lineTo(W / 2 + i * 260, H); ctx.stroke(); }
  for (let i = 0; i < 9; i++) {
    const p = ((i + t * 3) % 9) / 9, y = horizon + (H - horizon) * p * p;
    ctx.globalAlpha = 0.2 + p * 0.6; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  ctx.restore();
  return { text: "neon", sub: "#f5d0fe", accent: "#22d3ee", ring: "#e879f9" };
}

function matchday(ctx: CanvasRenderingContext2D, t: number): Palette {
  ctx.fillStyle = "#0b1020"; ctx.fillRect(0, 0, W, H);
  const slide = span(t, 0, 0.4);
  ctx.save();
  ctx.translate(W / 2, H / 2); ctx.rotate(-0.32); ctx.translate(-W / 2, -H / 2);
  const stripes = [["#2563eb", -1], ["#f43f5e", 1], ["#facc15", -1], ["#ffffff", 1]] as const;
  stripes.forEach(([colour, dir], i) => {
    ctx.fillStyle = colour;
    ctx.globalAlpha = i === 3 ? 0.08 : 0.9;
    const y = 120 + i * 230;
    ctx.fillRect(-400 + dir * (1 - slide) * 2600, y, W + 800, i === 3 ? 40 : 120);
  });
  ctx.restore();
  ctx.fillStyle = "rgba(11,16,32,0.72)"; ctx.fillRect(0, H / 2 - 260, W, 520);
  return { text: "#ffffff", sub: "#dbe4ff", accent: "#facc15", ring: "#2563eb" };
}

function minimal(ctx: CanvasRenderingContext2D): Palette {
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#15171c"); bg.addColorStop(1, "#202329");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  return { text: "#ffffff", sub: "#aab2c0", accent: "#22d3ee", ring: "#2b2f38" };
}

// ---------- type ----------
function headline(ctx: CanvasRenderingContext2D, text: string, y: number, size: number, palette: Palette, t: number, theme: ThemeId) {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `900 ${size}px ${FONT}`;
  const width = ctx.measureText(text).width;
  if (palette.text === "gold") {
    const foil = ctx.createLinearGradient(W / 2 - width / 2, y - size / 2, W / 2 + width / 2, y + size / 2);
    foil.addColorStop(0, "#a8750b"); foil.addColorStop(0.3, "#ffe9a3"); foil.addColorStop(0.5, "#d9a21b"); foil.addColorStop(0.75, "#fff3c4"); foil.addColorStop(1, "#9a6b06");
    ctx.fillStyle = foil;
    ctx.shadowColor = "rgba(0,0,0,0.6)"; ctx.shadowBlur = 30; ctx.shadowOffsetY = 8;
    ctx.fillText(text, W / 2, y);
    // Shine sweep: the letters are filled again with a narrow highlight, so it stays inside the glyphs.
    const x = W / 2 - width / 2 - 300 + (width + 600) * span(t, 0.35, 0.8);
    const shine = ctx.createLinearGradient(x - 140, 0, x + 140, 0);
    shine.addColorStop(0, "rgba(255,255,255,0)"); shine.addColorStop(0.5, "rgba(255,255,255,0.85)"); shine.addColorStop(1, "rgba(255,255,255,0)");
    ctx.shadowColor = "transparent";
    ctx.fillStyle = shine; ctx.fillText(text, W / 2, y);
  } else if (palette.text === "neon") {
    const flicker = t < 0.25 ? (Math.sin(t * 120) > 0 ? 1 : 0.35) : 1;
    ctx.globalAlpha = flicker;
    ctx.lineWidth = size * 0.05;
    ctx.strokeStyle = "#f0abfc"; ctx.shadowColor = "#e879f9"; ctx.shadowBlur = 50;
    ctx.strokeText(text, W / 2, y);
    ctx.shadowBlur = 18; ctx.fillStyle = "rgba(255,240,255,0.92)"; ctx.fillText(text, W / 2, y);
  } else {
    ctx.fillStyle = palette.text;
    ctx.shadowColor = "rgba(0,0,0,0.55)"; ctx.shadowBlur = theme === "minimal" ? 0 : 28; ctx.shadowOffsetY = 6;
    ctx.fillText(theme === "matchday" ? text.toUpperCase() : text, W / 2, y);
  }
  ctx.restore();
  return width;
}

function line(ctx: CanvasRenderingContext2D, text: string, y: number, size: number, colour: string, weight = 600, spacing = 0) {
  ctx.save();
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = `${weight} ${size}px ${FONT}`;
  if (spacing && "letterSpacing" in ctx) (ctx as unknown as { letterSpacing: string }).letterSpacing = `${spacing}px`;
  ctx.fillStyle = colour;
  ctx.fillText(text, W / 2, y);
  ctx.restore();
}

/** Draws one frame. `t` runs 0..1 across the card; returns false without a 2D context. */
export function drawCard(ctx: CanvasRenderingContext2D | null, card: CardSpec, theme: ThemeId, t: number, crests: Crests = {}): boolean {
  if (!ctx) return false;
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  const palette = theme === "floodlights" ? floodlights(ctx, t) : theme === "kickoff" ? kickoff(ctx, t)
    : theme === "gold" ? gold(ctx, t) : theme === "neon" ? neon(ctx, t) : theme === "matchday" ? matchday(ctx, t) : minimal(ctx);
  const enter = span(t, 0.08, 0.42);
  const rise = (1 - enter) * 60;

  if (card.kind === "match" && card.home && card.away) {
    const size = 260;
    const fly = backOut(span(t, 0.05, 0.4) * 1.0);
    crest(ctx, card.home, crests[card.home], W / 2 - 430 - (1 - fly) * 900, 400, size, palette.ring);
    crest(ctx, card.away, crests[card.away], W / 2 + 430 + (1 - fly) * 900, 400, size, palette.ring);
    const pop = backOut(span(t, 0.3, 0.5));
    ctx.save();
    ctx.translate(W / 2, 400); ctx.scale(pop, pop);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = `900 120px ${FONT}`; ctx.fillStyle = palette.accent;
    ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 30;
    ctx.fillText("VS", 0, 4);
    ctx.restore();
    ctx.save(); ctx.globalAlpha = enter; ctx.translate(0, rise);
    const size2 = fitFont(ctx, card.title, 900, 96, W - 260);
    headline(ctx, card.title, 680, size2, palette, t, theme);
    if (card.date) line(ctx, card.date, 790, 52, palette.accent, 700, 2);
    if (card.detail) line(ctx, card.detail, 870, 36, palette.sub, 500, 1);
    ctx.restore();
  } else {
    ctx.save(); ctx.globalAlpha = enter; ctx.translate(0, rise);
    if (card.kind === "opening") line(ctx, "FOOTBALL MEMORIES", 300, 34, palette.accent, 700, 14);
    const size = fitFont(ctx, card.title, 900, card.kind === "closing" ? 120 : 150, W - 260);
    const width = headline(ctx, card.title, H / 2 - (card.subtitle ? 30 : 0), size, palette, t, theme);
    if (card.subtitle) line(ctx, card.subtitle, H / 2 + size * 0.75, 54, palette.sub, 600, 1);
    const grow = span(t, 0.3, 0.7);
    const bar = Math.min(width, 900) * grow;
    const g = ctx.createLinearGradient(W / 2 - bar / 2, 0, W / 2 + bar / 2, 0);
    g.addColorStop(0, palette.accent); g.addColorStop(1, palette.ring);
    ctx.fillStyle = g;
    ctx.fillRect(W / 2 - bar / 2, H / 2 + size * 0.75 + (card.subtitle ? 70 : -10), bar, 8);
    ctx.restore();
  }
  // Fade from black in, and to black out, so cards cut smoothly into the footage.
  const fade = Math.max(1 - span(t, 0, 0.08), span(t, 0.92, 1));
  if (fade > 0) { ctx.fillStyle = `rgba(0,0,0,${fade})`; ctx.fillRect(0, 0, W, H); }
  ctx.restore();
  return true;
}

/** Records one card's animation in real time. Resolves to a WebM (or MP4 on Safari). */
export async function recordCard(card: CardSpec, theme: ThemeId, crests: Crests): Promise<Blob> {
  const seconds = CARD_SECONDS[card.kind];
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  canvas.style.cssText = "position:fixed;left:-99999px;top:0;width:480px;height:270px;";
  document.body.appendChild(canvas);
  try {
    const ctx = canvas.getContext("2d");
    if (!ctx || typeof MediaRecorder === "undefined" || !("captureStream" in canvas)) {
      throw new Error("This browser cannot record title cards. Use Chrome, Edge or Safari.");
    }
    const mime = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"]
      .find((m) => MediaRecorder.isTypeSupported(m));
    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), videoBitsPerSecond: 14_000_000 });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    const stopped = new Promise<void>((resolve) => { recorder.onstop = () => resolve(); });
    drawCard(ctx, card, theme, 0, crests);
    recorder.start(250);
    const start = performance.now();
    await new Promise<void>((resolve) => {
      const frame = () => {
        const t = (performance.now() - start) / (seconds * 1000);
        drawCard(ctx, card, theme, Math.min(1, t), crests);
        if (t >= 1) resolve(); else requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
    recorder.stop();
    await stopped;
    stream.getTracks().forEach((track) => track.stop());
    return new Blob(chunks, { type: recorder.mimeType || mime || "video/webm" });
  } finally {
    canvas.remove();
  }
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",", 2)[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
