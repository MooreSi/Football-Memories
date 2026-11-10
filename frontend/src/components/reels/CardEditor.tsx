import { useEffect, useRef } from "react";
import { H, THEMES, type ThemeId, W, drawCard } from "../../lib/reelCards";

/** Still title card for imported-clip reels: the chosen theme's fully revealed frame.
 *  The same canvas is uploaded when rendering. Spec 190 themes, shared with Hudl reels. */
export function CardEditor({ kind, enabled, onEnabled, title, subtitle, onTitle, onSubtitle, canvasRef, theme, onTheme }: {
  kind: "opening" | "closing";
  enabled: boolean;
  onEnabled: (v: boolean) => void;
  title: string;
  subtitle?: string;
  onTitle: (v: string) => void;
  onSubtitle?: (v: string) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  theme: ThemeId;
  onTheme: (t: ThemeId) => void;
}) {
  const local = useRef<HTMLCanvasElement>(null);
  const ref = canvasRef ?? local;
  useEffect(() => {
    if (ref.current) drawStill(ref.current, kind, title, subtitle, theme);
  }, [ref, kind, title, subtitle, theme]);
  const label = kind === "opening" ? "Opening title" : "Closing card";
  return (
    <div className="tile space-y-3 p-4">
      <label className="flex items-center justify-between text-sm font-medium">
        {label}
        <input type="checkbox" className="accent-[#22d3ee]" checked={enabled} onChange={(e) => onEnabled(e.target.checked)} aria-label={`Include ${label.toLowerCase()}`} />
      </label>
      <canvas ref={ref} width={W} height={H} className={`aspect-video w-full rounded-lg border border-white/10 ${enabled ? "" : "opacity-30"}`} aria-label={`${label} preview`} role="img" />
      <input className="field" disabled={!enabled} placeholder={kind === "opening" ? "Best saves of the season" : "Thanks for watching"}
        value={title} onChange={(e) => onTitle(e.target.value)} aria-label={`${label} text`} maxLength={200} />
      {onSubtitle && (
        <input className="field" disabled={!enabled} placeholder="e.g. Riverside U12 · 2026/27" value={subtitle ?? ""}
          onChange={(e) => onSubtitle(e.target.value)} aria-label={`${label} subtitle`} maxLength={200} />
      )}
      <label className="block text-xs text-fg-muted">Style
        <select className="field mt-1" disabled={!enabled} value={theme} onChange={(e) => onTheme(e.target.value as ThemeId)} aria-label={`${label} style`}>
          {THEMES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </label>
    </div>
  );
}

/** Draws the card's fully revealed frame; false when the browser has no 2D canvas. */
export function drawStill(canvas: HTMLCanvasElement, kind: "opening" | "closing", title: string, subtitle: string | undefined, theme: ThemeId): boolean {
  canvas.width = W;
  canvas.height = H;
  let ctx: CanvasRenderingContext2D | null = null;
  try { ctx = canvas.getContext("2d"); } catch { ctx = null; }
  return drawCard(ctx, { kind, title: title || " ", subtitle: subtitle || undefined }, theme, 0.6);
}
