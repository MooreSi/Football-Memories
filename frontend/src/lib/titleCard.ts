/** Title cards for highlight reels, drawn in the browser (spec 080: the Mac's ffmpeg cannot draw text). */

export const CARD_W = 1920;
export const CARD_H = 1080;

/** Greedy word wrap. `measure` returns a pixel width; at most `maxLines` lines, last one ellipsised. */
export function wrapLines(text: string, maxWidth: number, measure: (s: string) => number, maxLines = 3): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (measure(next) <= maxWidth || !line) line = next;
    else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = `${kept[maxLines - 1]}…`;
    return kept;
  }
  return lines;
}

export interface CardText {
  kind: "opening" | "closing";
  title: string;
  subtitle?: string;
}

/** Draws the card. Returns false when the browser cannot draw (no 2D canvas). */
export function drawTitleCard(canvas: HTMLCanvasElement, card: CardText): boolean {
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  let ctx: CanvasRenderingContext2D | null = null;
  try {
    ctx = canvas.getContext("2d");
  } catch {
    ctx = null;
  }
  if (!ctx) return false;

  // Night-pitch background in the app's palette.
  const bg = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
  bg.addColorStop(0, "#060a14");
  bg.addColorStop(0.55, "#0e1a3a");
  bg.addColorStop(1, "#2a1b5c");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  const glow = ctx.createRadialGradient(CARD_W * 0.2, -100, 0, CARD_W * 0.2, -100, 900);
  glow.addColorStop(0, "rgba(255,236,200,0.18)");
  glow.addColorStop(1, "rgba(255,236,200,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // Faint pitch markings.
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 4;
  ctx.strokeRect(120, 120, CARD_W - 240, CARD_H - 240);
  ctx.beginPath();
  ctx.moveTo(CARD_W / 2, 120);
  ctx.lineTo(CARD_W / 2, CARD_H - 120);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(CARD_W / 2, CARD_H / 2, 180, 0, Math.PI * 2);
  ctx.stroke();

  const font = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.font = `600 34px ${font}`;
  ctx.fillStyle = "#22d3ee";
  ctx.fillText(card.kind === "opening" ? "FOOTBALL MEMORIES" : "", CARD_W / 2, 250);

  ctx.font = `800 120px ${font}`;
  ctx.fillStyle = "#e8eef8";
  const lines = wrapLines(card.title, CARD_W - 400, (s) => ctx!.measureText(s).width);
  const lineH = 140;
  const top = CARD_H / 2 - ((lines.length - 1) * lineH) / 2 - (card.subtitle ? 40 : 0);
  lines.forEach((l, i) => ctx!.fillText(l, CARD_W / 2, top + i * lineH));

  if (card.subtitle) {
    ctx.font = `500 52px ${font}`;
    ctx.fillStyle = "#facc15";
    ctx.fillText(card.subtitle, CARD_W / 2, top + lines.length * lineH + 10);
  }

  // Accent bar.
  const bar = ctx.createLinearGradient(CARD_W / 2 - 200, 0, CARD_W / 2 + 200, 0);
  bar.addColorStop(0, "#22d3ee");
  bar.addColorStop(1, "#7c5cff");
  ctx.fillStyle = bar;
  ctx.fillRect(CARD_W / 2 - 200, CARD_H - 230, 400, 8);
  return true;
}

export function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob((b) => resolve(b), "image/png");
    } catch {
      resolve(null);
    }
  });
}
