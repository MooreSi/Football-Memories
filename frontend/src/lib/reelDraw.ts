/** Shared drawing kit for the reel title cards (reelCards.ts) and their themes
 *  (reelThemes.ts): frame size, easing, a seeded random and the theme palette. */
export const W = 1920;
export const H = 1080;

export const clamp = (x: number) => Math.max(0, Math.min(1, x));
export const ease = (x: number) => 1 - Math.pow(1 - clamp(x), 3);
export const easeInOut = (x: number) => { const v = clamp(x); return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2; };
export const backOut = (x: number) => { const c = 1.70158; const v = clamp(x) - 1; return 1 + (c + 1) * v * v * v + c * v * v; };
/** 0 before `a`, 1 after `b`, eased between. */
export const span = (t: number, a: number, b: number) => ease((t - a) / (b - a));
export const FONT = '"Inter", "Helvetica Neue", system-ui, -apple-system, "Segoe UI", sans-serif';

export function rand(seed: number) {
  let s = Math.max(1, Math.floor(seed) % 2147483647);
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}

/** What a theme's background hands back to the card layout. `headline` replaces the
 *  default title type; `overlay` draws over the finished card (bars, tickers, grain). */
export interface Palette {
  text: string;
  sub: string;
  accent: string;
  ring: string;
  headline?: (ctx: CanvasRenderingContext2D, text: string, y: number, size: number, t: number) => number;
  overlay?: (ctx: CanvasRenderingContext2D, t: number, kind: string) => void;
  /** A shadow under the small lines (date, subtitle) where the background is busy. */
  shadow?: string;
}

export function setSpacing(ctx: CanvasRenderingContext2D, px: number) {
  if ("letterSpacing" in ctx) (ctx as unknown as { letterSpacing: string }).letterSpacing = `${px}px`;
}
