/** Broadcast-style reel card themes and the GTA 6 style "Sunset Heist" (owner request
 *  2026-11-26). Each draws its background for one frame and returns a Palette that may
 *  bring its own title type and an overlay (bugs, tickers, letterbox, grain).
 *  All original artwork: no channel, competition or game logos, names or fonts. */
import { FONT, H, type Palette, W, backOut, clamp, ease, easeInOut, rand, setSpacing, span } from "./reelDraw";

const TAU = Math.PI * 2;

/** Shrinks a title until it fits `max` wide; returns the font size. */
function fit(ctx: CanvasRenderingContext2D, text: string, font: (size: number) => string, size: number, max: number) {
  let s = size;
  ctx.font = font(s);
  while (s > 36 && ctx.measureText(text).width > max) { s -= 4; ctx.font = font(s); }
  return s;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
}

function grain(ctx: CanvasRenderingContext2D, t: number, amount: number, alpha: number) {
  const r = rand(1 + Math.floor(t * 300));
  ctx.save();
  for (let i = 0; i < amount; i++) {
    ctx.fillStyle = r() > 0.5 ? `rgba(255,255,255,${alpha * r()})` : `rgba(0,0,0,${alpha * r()})`;
    ctx.fillRect(r() * W, r() * H, 2, 2);
  }
  ctx.restore();
}

function vignette(ctx: CanvasRenderingContext2D, strength: number) {
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.75);
  v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
}

// ---------- Prime Time: a network sports graphics package ----------
function primeHeadline(ctx: CanvasRenderingContext2D, raw: string, y: number, max: number, t: number) {
  const text = raw.toUpperCase();
  const font = (s: number) => `italic 900 ${s}px ${FONT}`;
  const size = fit(ctx, text, font, max, W - 280);
  ctx.save();
  ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = font(size);
  const width = ctx.measureText(text).width;
  const reveal = easeInOut((t - 0.1) / 0.3);
  const half = (width / 2 + 60) * reveal;
  ctx.beginPath(); ctx.rect(W / 2 - half, y - size, half * 2, size * 2); ctx.clip();
  const fill = ctx.createLinearGradient(0, y - size / 2, 0, y + size / 2);
  fill.addColorStop(0, "#ffffff"); fill.addColorStop(0.55, "#eef2ff"); fill.addColorStop(1, "#a5b4fc");
  ctx.shadowColor = "rgba(56,189,248,0.55)"; ctx.shadowBlur = 36;
  ctx.fillStyle = fill; ctx.fillText(text, W / 2, y);
  ctx.restore();
  if (reveal > 0 && reveal < 1) {
    // The wipe's leading edges: two bright slivers that open out from the centre.
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const x of [W / 2 - half, W / 2 + half]) {
      const g = ctx.createLinearGradient(x - 30, 0, x + 30, 0);
      g.addColorStop(0, "rgba(56,189,248,0)"); g.addColorStop(0.5, "rgba(220,240,255,0.95)"); g.addColorStop(1, "rgba(168,85,247,0)");
      ctx.fillStyle = g; ctx.fillRect(x - 30, y - size * 0.75, 60, size * 1.5);
    }
    ctx.restore();
  }
  return width;
}

function primeOverlay(ctx: CanvasRenderingContext2D, t: number) {
  const inn = span(t, 0.05, 0.35);
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, "#38bdf8"); g.addColorStop(1, "#a855f7");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W * inn, 6);
  ctx.fillRect(W * (1 - inn), H - 6, W * inn, 6);
  // Corner bug, top right.
  ctx.save();
  ctx.globalAlpha = span(t, 0.2, 0.4);
  ctx.translate((1 - span(t, 0.2, 0.4)) * 60, 0);
  ctx.fillStyle = "rgba(10,14,40,0.75)"; roundRect(ctx, W - 330, 52, 260, 54, 10); ctx.fill();
  ctx.fillStyle = g; ctx.fillRect(W - 330, 52, 8, 54);
  ctx.font = `800 24px ${FONT}`; ctx.fillStyle = "#ffffff"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
  setSpacing(ctx, 5); ctx.fillText("HIGHLIGHTS", W - 302, 80);
  ctx.restore();
}

export function primetime(ctx: CanvasRenderingContext2D, t: number): Palette {
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#04051a"); bg.addColorStop(0.5, "#101848"); bg.addColorStop(1, "#22073a");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 900);
  glow.addColorStop(0, "rgba(79,110,255,0.38)"); glow.addColorStop(1, "rgba(79,110,255,0)");
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  for (let x = 24; x < W; x += 48) for (let y = 24; y < H; y += 48) ctx.fillRect(x, y, 2, 2);
  // Angled glass panels slide in from both sides and keep drifting.
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const slide = easeInOut(t / 0.45);
  for (let i = 0; i < 6; i++) {
    const left = i % 2 === 0;
    const base = left ? -200 + i * 90 : W - 420 - i * 90;
    const x = base + (left ? -1 : 1) * (1 - slide) * 1500 + (left ? 1 : -1) * t * 60;
    const p = ctx.createLinearGradient(x, 0, x + 380, 0);
    const a = 0.05 + (i % 3) * 0.04;
    p.addColorStop(0, `rgba(120,160,255,${a})`); p.addColorStop(1, "rgba(168,85,247,0.01)");
    ctx.fillStyle = p;
    ctx.beginPath(); ctx.moveTo(x + 260, 0); ctx.lineTo(x + 380 + 260, 0); ctx.lineTo(x + 380, H); ctx.lineTo(x, H); ctx.closePath(); ctx.fill();
  }
  // A light streak crosses once.
  const sx = -400 + (W + 800) * span(t, 0.25, 0.75);
  const streak = ctx.createLinearGradient(sx - 200, 0, sx + 200, 0);
  streak.addColorStop(0, "rgba(255,255,255,0)"); streak.addColorStop(0.5, "rgba(200,225,255,0.22)"); streak.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = streak;
  ctx.beginPath(); ctx.moveTo(sx - 60, 0); ctx.lineTo(sx + 140, 0); ctx.lineTo(sx - 80, H); ctx.lineTo(sx - 280, H); ctx.closePath(); ctx.fill();
  ctx.restore();
  return { text: "#ffffff", sub: "#c7d2fe", accent: "#38bdf8", ring: "#a855f7", headline: primeHeadline, overlay: primeOverlay };
}

// ---------- Studio: the matchday highlights show ----------
function studioHeadline(ctx: CanvasRenderingContext2D, raw: string, y: number, max: number, t: number) {
  const text = raw.toUpperCase();
  const font = (s: number) => `900 ${s}px ${FONT}`;
  const size = fit(ctx, text, font, max * 0.9, W - 360);
  ctx.save();
  ctx.font = font(size); ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const width = ctx.measureText(text).width;
  const slabW = width + 120, slabH = size * 1.25;
  const wipe = easeInOut((t - 0.05) / 0.25);
  const left = W / 2 - slabW / 2;
  ctx.fillStyle = "#e11d2e";
  ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 40; ctx.shadowOffsetY = 12;
  ctx.fillRect(left, y - slabH / 2, slabW * wipe, slabH);
  ctx.shadowColor = "transparent";
  ctx.fillStyle = "#ffffff"; ctx.fillRect(left, y + slabH / 2, slabW * wipe, 6);
  const text0 = easeInOut((t - 0.18) / 0.22);
  ctx.beginPath(); ctx.rect(left, y - slabH / 2, slabW * text0, slabH); ctx.clip();
  ctx.fillStyle = "#ffffff"; ctx.fillText(text, W / 2, y + 2);
  ctx.restore();
  return width;
}

function studioOverlay(ctx: CanvasRenderingContext2D, t: number) {
  const inn = span(t, 0.1, 0.3);
  ctx.save();
  ctx.globalAlpha = inn;
  // REPLAY bug, top left (this is a highlights reel, never live).
  ctx.fillStyle = "rgba(10,11,15,0.85)"; roundRect(ctx, 70, 54, 210, 52, 8); ctx.fill();
  ctx.fillStyle = "#e11d2e"; ctx.beginPath(); ctx.arc(102, 80, 9 + Math.sin(t * TAU * 3) * 2, 0, TAU); ctx.fill();
  ctx.font = `800 24px ${FONT}`; ctx.fillStyle = "#ffffff"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
  setSpacing(ctx, 4); ctx.fillText("REPLAY", 124, 81);
  ctx.restore();
  // Ticker along the bottom.
  ctx.save();
  const y = H - 64 + (1 - inn) * 64;
  ctx.fillStyle = "rgba(8,9,12,0.92)"; ctx.fillRect(0, y, W, 64);
  ctx.fillStyle = "#e11d2e"; ctx.fillRect(0, y, 260, 64);
  ctx.font = `900 26px ${FONT}`; ctx.fillStyle = "#ffffff"; ctx.textBaseline = "middle"; ctx.textAlign = "left";
  setSpacing(ctx, 4); ctx.fillText("HIGHLIGHTS", 40, y + 33);
  ctx.beginPath(); ctx.rect(270, y, W - 270, 64); ctx.clip();
  ctx.font = `600 26px ${FONT}`; setSpacing(ctx, 2); ctx.fillStyle = "#e5e7eb";
  const msg = "FOOTBALL MEMORIES   •   MATCH HIGHLIGHTS   •   EVERY GOAL, EVERY CHANCE   •   ";
  const mw = Math.max(400, ctx.measureText(msg).width);
  const off = (t * 520) % mw;
  for (let x = 300 - off; x < W; x += mw) ctx.fillText(msg, x, y + 33);
  ctx.restore();
}

export function studio(ctx: CanvasRenderingContext2D, t: number): Palette {
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#0b0c11"); bg.addColorStop(1, "#191b23");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  const rim = ctx.createRadialGradient(W / 2, H * 1.05, 0, W / 2, H * 1.05, 1100);
  rim.addColorStop(0, "rgba(225,29,46,0.45)"); rim.addColorStop(1, "rgba(225,29,46,0)");
  ctx.fillStyle = rim; ctx.fillRect(0, 0, W, H);
  // LED floor in perspective.
  const horizon = H * 0.66;
  ctx.save();
  ctx.strokeStyle = "rgba(255,80,90,0.22)"; ctx.lineWidth = 2;
  for (let i = -16; i <= 16; i++) { ctx.beginPath(); ctx.moveTo(W / 2 + i * 36, horizon); ctx.lineTo(W / 2 + i * 220, H); ctx.stroke(); }
  for (let i = 0; i < 8; i++) {
    const p = ((i + t * 2) % 8) / 8, y = horizon + (H - horizon) * p * p;
    ctx.globalAlpha = 0.15 + p * 0.5; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  ctx.restore();
  // A ring of light segments switches on in turn and turns slowly.
  ctx.save();
  ctx.translate(W / 2, H * 0.47); ctx.rotate(t * 0.6);
  const lit = Math.floor(span(t, 0, 0.4) * 48);
  for (let i = 0; i < 48; i++) {
    if (i >= lit) break;
    const a = (i / 48) * TAU;
    ctx.strokeStyle = i % 4 === 0 ? "rgba(255,255,255,0.55)" : "rgba(225,29,46,0.55)";
    ctx.lineWidth = 14;
    ctx.beginPath(); ctx.arc(0, 0, 470, a, a + TAU / 48 * 0.7); ctx.stroke();
  }
  ctx.restore();
  vignette(ctx, 0.55);
  return { text: "#ffffff", sub: "#d1d5db", accent: "#f43f5e", ring: "#e11d2e", headline: studioHeadline, overlay: studioOverlay };
}

// ---------- Star Night: a continental cup night ----------
function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.42 : r;
    if (i) ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fill();
}

function silverHeadline(ctx: CanvasRenderingContext2D, text: string, y: number, size: number, t: number) {
  ctx.save();
  ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = `900 ${size}px ${FONT}`;
  const width = ctx.measureText(text).width;
  const foil = ctx.createLinearGradient(0, y - size / 2, 0, y + size / 2);
  foil.addColorStop(0, "#ffffff"); foil.addColorStop(0.45, "#dbe4f0"); foil.addColorStop(0.55, "#8fa3bf"); foil.addColorStop(1, "#f1f5f9");
  ctx.fillStyle = foil; ctx.shadowColor = "rgba(0,10,40,0.8)"; ctx.shadowBlur = 34; ctx.shadowOffsetY = 8;
  ctx.fillText(text, W / 2, y);
  const x = W / 2 - width / 2 - 300 + (width + 600) * span(t, 0.4, 0.85);
  const shine = ctx.createLinearGradient(x - 120, 0, x + 120, 0);
  shine.addColorStop(0, "rgba(255,255,255,0)"); shine.addColorStop(0.5, "rgba(255,255,255,0.9)"); shine.addColorStop(1, "rgba(255,255,255,0)");
  ctx.shadowColor = "transparent"; ctx.fillStyle = shine; ctx.fillText(text, W / 2, y);
  ctx.restore();
  return width;
}

export function starnight(ctx: CanvasRenderingContext2D, t: number): Palette {
  const bg = ctx.createRadialGradient(W / 2, H * 0.45, 50, W / 2, H / 2, 1250);
  bg.addColorStop(0, "#123a9c"); bg.addColorStop(0.45, "#071a5c"); bg.addColorStop(1, "#010616");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.translate(W / 2, H * 0.45); ctx.rotate(t * 0.25);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * TAU;
    ctx.fillStyle = "rgba(150,190,255,0.045)";
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 1400, a, a + 0.09); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  const r = rand(11);
  for (let i = 0; i < 170; i++) {
    const x = r() * W, y = r() * H, s = 0.8 + r() * 2.2, ph = r() * TAU;
    ctx.fillStyle = `rgba(220,232,255,${0.25 + 0.75 * Math.abs(Math.sin(t * 7 + ph))})`;
    ctx.fillRect(x, y, s, s);
  }
  // A slow ellipse of eight stars, gathering in at the start.
  const gather = easeInOut(t / 0.5);
  ctx.save();
  ctx.fillStyle = "rgba(235,242,255,0.75)"; ctx.shadowColor = "rgba(160,200,255,0.9)"; ctx.shadowBlur = 24;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + t * 0.5;
    const rx = 860 + (1 - gather) * 500, ry = 430 + (1 - gather) * 300;
    star(ctx, W / 2 + Math.cos(a) * rx, H / 2 + Math.sin(a) * ry, 26);
  }
  ctx.restore();
  vignette(ctx, 0.5);
  return { text: "#ffffff", sub: "#c9d6f2", accent: "#e2e8f0", ring: "#93c5fd", headline: silverHeadline };
}

// ---------- Cinematic: letterbox, flare and grain ----------
function cineHeadline(ctx: CanvasRenderingContext2D, raw: string, y: number, max: number, t: number) {
  const text = raw.toUpperCase();
  const open = ease((t - 0.05) / 0.5);
  ctx.save();
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  let size = Math.min(max, 120);
  const spacing = (s: number) => s * (0.42 - 0.24 * open);
  const font = (s: number) => `300 ${s}px ${FONT}`;
  ctx.font = font(size); setSpacing(ctx, spacing(size));
  while (size > 36 && ctx.measureText(text).width > W - 320) { size -= 4; ctx.font = font(size); setSpacing(ctx, spacing(size)); }
  const width = ctx.measureText(text).width;
  ctx.globalAlpha *= clamp(open * 1.4);
  ctx.fillStyle = "#fff8ee"; ctx.shadowColor = "rgba(255,190,120,0.45)"; ctx.shadowBlur = 30;
  ctx.fillText(text, W / 2, y);
  ctx.restore();
  return width;
}

function cineOverlay(ctx: CanvasRenderingContext2D, t: number, kind: string) {
  // Anamorphic flare drifting across the middle.
  const fx = -300 + (W + 600) * span(t, 0.2, 0.9);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const streak = ctx.createLinearGradient(0, 0, W, 0);
  const at = clamp(fx / W);
  streak.addColorStop(0, "rgba(90,170,255,0)"); streak.addColorStop(at, "rgba(140,200,255,0.35)"); streak.addColorStop(1, "rgba(90,170,255,0)");
  ctx.fillStyle = streak; ctx.fillRect(0, H * 0.42 - 2, W, 4);
  const bloom = ctx.createRadialGradient(fx, H * 0.42, 0, fx, H * 0.42, 160);
  bloom.addColorStop(0, "rgba(200,230,255,0.4)"); bloom.addColorStop(1, "rgba(200,230,255,0)");
  ctx.fillStyle = bloom; ctx.fillRect(fx - 160, H * 0.42 - 160, 320, 320);
  ctx.restore();
  grain(ctx, t, 1400, 0.22);
  vignette(ctx, 0.5);
  // 2.39:1 letterbox (thinner on the stats card, whose rows run near the edges).
  const bar = (kind === "stats" ? 48 : 138) * span(t, 0, 0.18);
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, W, bar); ctx.fillRect(0, H - bar, W, bar);
}

export function cinematic(ctx: CanvasRenderingContext2D, t: number): Palette {
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#021316"); bg.addColorStop(0.5, "#0b2a30"); bg.addColorStop(1, "#331a0b");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  const warm = ctx.createRadialGradient(W * (0.62 + t * 0.08), H * 0.38, 0, W * 0.65, H * 0.4, 900);
  warm.addColorStop(0, "rgba(255,160,80,0.32)"); warm.addColorStop(1, "rgba(255,160,80,0)");
  ctx.fillStyle = warm; ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const r = rand(5);
  for (let i = 0; i < 26; i++) {
    const x = (r() * W + t * 90 * (r() - 0.3)), y = r() * H, s = 30 + r() * 110;
    const b = ctx.createRadialGradient(x, y, 0, x, y, s);
    const warmish = r() > 0.5;
    b.addColorStop(0, warmish ? "rgba(255,180,110,0.09)" : "rgba(110,200,220,0.08)"); b.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = b; ctx.fillRect(x - s, y - s, s * 2, s * 2);
  }
  ctx.restore();
  return { text: "#fff8ee", sub: "#e7d9c6", accent: "#f6b26b", ring: "#f6b26b", headline: cineHeadline, overlay: cineOverlay };
}

// ---------- Stadium LED: the ribbon board ----------
function ledHeadline(ctx: CanvasRenderingContext2D, raw: string, y: number, max: number, t: number) {
  const text = raw.toUpperCase();
  const font = (s: number) => `900 ${s}px ${FONT}`;
  const size = fit(ctx, text, font, max, W - 260);
  ctx.save();
  ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = font(size);
  const width = ctx.measureText(text).width;
  // Columns light up left to right, like a board drawing a message.
  const lit = W / 2 - width / 2 - 40 + (width + 80) * span(t, 0.08, 0.4);
  ctx.beginPath(); ctx.rect(0, y - size, lit, size * 2); ctx.clip();
  const hue = (t * 120) % 360;
  ctx.shadowColor = `hsla(${hue + 180},100%,60%,0.95)`; ctx.shadowBlur = 50;
  ctx.fillStyle = "#ffffff"; ctx.fillText(text, W / 2, y);
  ctx.restore();
  return width;
}

function ledOverlay(ctx: CanvasRenderingContext2D, t: number) {
  // The pixel mask: dark gaps between LEDs over the whole board.
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.42)";
  for (let x = 0; x < W; x += 6) ctx.fillRect(x, 0, 2, H);
  for (let y = 0; y < H; y += 6) ctx.fillRect(0, y, W, 2);
  // A refresh band rolls down the board.
  const by = ((t * 1.6) % 1) * (H + 300) - 150;
  const band = ctx.createLinearGradient(0, by - 150, 0, by + 150);
  band.addColorStop(0, "rgba(255,255,255,0)"); band.addColorStop(0.5, "rgba(255,255,255,0.05)"); band.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = band; ctx.fillRect(0, by - 150, W, 300);
  ctx.restore();
}

export function ledboard(ctx: CanvasRenderingContext2D, t: number): Palette {
  ctx.fillStyle = "#020306"; ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const shift = t * W * 0.8;
  for (let i = -1; i < 3; i++) {
    const x = i * W * 0.8 + shift - W * 0.4;
    const g = ctx.createLinearGradient(x, 0, x + W * 0.8, 0);
    g.addColorStop(0, "rgba(34,211,238,0)"); g.addColorStop(0.3, "rgba(34,211,238,0.35)");
    g.addColorStop(0.6, "rgba(168,85,247,0.35)"); g.addColorStop(1, "rgba(236,72,153,0)");
    ctx.fillStyle = g; ctx.fillRect(x, H * 0.08, W * 0.8, H * 0.12); ctx.fillRect(x, H * 0.8, W * 0.8, H * 0.12);
  }
  // Chevrons racing outwards between the bands.
  ctx.fillStyle = "rgba(34,211,238,0.22)";
  for (let i = 0; i < 12; i++) {
    const p = ((i / 12 + t * 0.8) % 1);
    for (const dir of [-1, 1]) {
      const x = W / 2 + dir * (200 + p * 800);
      ctx.beginPath(); ctx.moveTo(x, H * 0.24); ctx.lineTo(x + dir * 50, H * 0.27); ctx.lineTo(x, H * 0.3); ctx.lineTo(x - dir * 20, H * 0.3); ctx.lineTo(x + dir * 30, H * 0.27); ctx.lineTo(x - dir * 20, H * 0.24); ctx.closePath(); ctx.fill();
    }
  }
  ctx.restore();
  const centre = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 700);
  centre.addColorStop(0, "rgba(60,90,160,0.35)"); centre.addColorStop(1, "rgba(60,90,160,0)");
  ctx.fillStyle = centre; ctx.fillRect(0, 0, W, H);
  return { text: "#ffffff", sub: "#a5f3fc", accent: "#22d3ee", ring: "#a855f7", headline: ledHeadline, overlay: ledOverlay };
}

// ---------- Sunset Heist: GTA 6 style (original art, no game logos or fonts) ----------
function palm(ctx: CanvasRenderingContext2D, x: number, base: number, height: number, lean: number, sway: number) {
  const topX = x + lean * height + sway * height, topY = base - height;
  ctx.save();
  ctx.strokeStyle = "#14061f"; ctx.fillStyle = "#14061f"; ctx.lineCap = "round";
  for (let k = 0; k < 4; k++) {
    ctx.lineWidth = 26 - k * 6;
    ctx.beginPath(); ctx.moveTo(x, base);
    ctx.quadraticCurveTo(x + lean * height * 0.2, base - height * 0.55, topX, topY + k * 2); ctx.stroke();
  }
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI + (i / 7) * Math.PI + sway * 2 + (i % 2 ? 0.12 : -0.08);
    const len = height * (0.42 + (i % 3) * 0.06);
    const ex = topX + Math.cos(a) * len, ey = topY + Math.sin(a) * len * 0.55 + len * 0.35;
    const cx = topX + Math.cos(a) * len * 0.5, cy = topY + Math.sin(a) * len * 0.6 - len * 0.12;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(cx, cy - 18, ex, ey);
    ctx.quadraticCurveTo(cx, cy + 14, topX, topY + 6);
    ctx.fill();
  }
  ctx.restore();
}

function heistHeadline(ctx: CanvasRenderingContext2D, raw: string, y: number, max: number, t: number) {
  const text = raw.toUpperCase();
  const font = (s: number) => `italic 900 ${s}px ${FONT}`;
  const size = fit(ctx, text, font, max * 1.05, W - 340);
  ctx.save();
  ctx.shadowColor = "transparent";
  ctx.font = font(size); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
  const width = ctx.measureText(text).width;
  const pop = backOut(span(t, 0.1, 0.34));
  ctx.translate(W / 2, y); ctx.rotate(-0.045); ctx.scale(pop, pop);
  const depth = size * 0.09;
  ctx.fillStyle = "#ff2f7d"; ctx.fillText(text, depth, depth);
  ctx.fillStyle = "#7a1fa2"; ctx.fillText(text, depth * 1.7, depth * 1.7);
  ctx.lineWidth = size * 0.11; ctx.strokeStyle = "#12051c"; ctx.strokeText(text, 0, 0);
  const fill = ctx.createLinearGradient(0, -size / 2, 0, size / 2);
  fill.addColorStop(0, "#ffffff"); fill.addColorStop(0.6, "#fff1d6"); fill.addColorStop(1, "#ffc46b");
  ctx.fillStyle = fill; ctx.fillText(text, 0, 0);
  ctx.restore();
  return width;
}

function heistOverlay(ctx: CanvasRenderingContext2D, t: number) {
  grain(ctx, t, 700, 0.14);
  vignette(ctx, 0.45);
}

export function heist(ctx: CanvasRenderingContext2D, t: number): Palette {
  const horizon = H * 0.72;
  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, "#160935"); sky.addColorStop(0.38, "#5d1a78"); sky.addColorStop(0.66, "#e0457b");
  sky.addColorStop(0.86, "#ff8c42"); sky.addColorStop(1, "#ffc46b");
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, horizon);
  // The setting sun, striped by the sky as it sinks into the sea.
  const rise = (1 - ease(t / 0.6)) * 90;
  const sunY = horizon - 120 + rise, sunR = 290;
  const sun = ctx.createLinearGradient(0, sunY - sunR, 0, sunY + sunR);
  sun.addColorStop(0, "#fff0a8"); sun.addColorStop(0.5, "#ffb15c"); sun.addColorStop(1, "#ff4f8b");
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, W, horizon); ctx.clip();
  ctx.shadowColor = "rgba(255,140,90,0.9)"; ctx.shadowBlur = 120;
  ctx.fillStyle = sun; ctx.beginPath(); ctx.arc(W / 2, sunY, sunR, 0, TAU); ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.fillStyle = sky;
  for (let i = 0; i < 7; i++) {
    const h = 4 + i * 3.5, y = sunY + 20 + i * 34 - ((t * 40) % 34);
    ctx.fillRect(W / 2 - sunR, y, sunR * 2, h);
  }
  ctx.restore();
  // City skyline on the far shore.
  const r = rand(23);
  ctx.fillStyle = "#2b0f3f";
  for (let x = 260; x < W - 260;) {
    const w = 30 + r() * 70, h = 30 + r() * (Math.abs(x - W / 2) < 300 ? 60 : 150);
    ctx.fillRect(x, horizon - h, w, h);
    if (r() > 0.7) ctx.fillRect(x + w / 2 - 3, horizon - h - 40, 6, 40);
    x += w + r() * 10;
  }
  // The sea, with the sun's reflection shimmering.
  const sea = ctx.createLinearGradient(0, horizon, 0, H);
  sea.addColorStop(0, "#4a1660"); sea.addColorStop(1, "#0e0519");
  ctx.fillStyle = sea; ctx.fillRect(0, horizon, W, H - horizon);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 18; i++) {
    const y = horizon + 10 + i * 16, w = (300 - i * 12) * (0.75 + 0.25 * Math.sin(t * TAU * 2 + i));
    ctx.fillStyle = `rgba(255,${150 + i * 4},110,${0.38 - i * 0.018})`;
    ctx.fillRect(W / 2 - w / 2 + Math.sin(t * TAU + i * 0.7) * 20, y, w, 4);
  }
  ctx.restore();
  // Palms frame both sides and sway.
  const sway = (k: number) => Math.sin(t * TAU * 0.8 + k) * 0.03;
  palm(ctx, 120, H + 20, 760, 0.22, sway(0));
  palm(ctx, 330, H + 40, 560, 0.12, sway(1.3));
  palm(ctx, W - 120, H + 20, 800, -0.24, sway(2.1));
  palm(ctx, W - 360, H + 40, 520, -0.1, sway(0.6));
  return { text: "#ffffff", sub: "#ffffff", accent: "#ff2f7d", ring: "#ff2f7d", headline: heistHeadline, overlay: heistOverlay, shadow: "rgba(18,5,28,0.95)" };
}
