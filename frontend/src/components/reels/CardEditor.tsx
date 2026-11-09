import { useEffect, useRef } from "react";
import { drawTitleCard } from "../../lib/titleCard";

/** Live preview of a title card; the same canvas is uploaded when rendering. */
export function CardEditor({ kind, enabled, onEnabled, title, subtitle, onTitle, onSubtitle, canvasRef }: {
  kind: "opening" | "closing";
  enabled: boolean;
  onEnabled: (v: boolean) => void;
  title: string;
  subtitle?: string;
  onTitle: (v: string) => void;
  onSubtitle?: (v: string) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}) {
  const local = useRef<HTMLCanvasElement>(null);
  const ref = canvasRef ?? local;
  useEffect(() => {
    if (ref.current) drawTitleCard(ref.current, { kind, title: title || " ", subtitle });
  }, [ref, kind, title, subtitle]);
  const label = kind === "opening" ? "Opening title" : "Closing card";
  return (
    <div className="tile space-y-3 p-4">
      <label className="flex items-center justify-between text-sm font-medium">
        {label}
        <input type="checkbox" className="accent-[#22d3ee]" checked={enabled} onChange={(e) => onEnabled(e.target.checked)} aria-label={`Include ${label.toLowerCase()}`} />
      </label>
      <canvas ref={ref} className={`aspect-video w-full rounded-lg border border-white/10 ${enabled ? "" : "opacity-30"}`} aria-label={`${label} preview`} role="img" />
      <input className="field" disabled={!enabled} placeholder={kind === "opening" ? "Best saves of the season" : "Thanks for watching"}
        value={title} onChange={(e) => onTitle(e.target.value)} aria-label={`${label} text`} maxLength={200} />
      {onSubtitle && (
        <input className="field" disabled={!enabled} placeholder="e.g. Riverside U12 · 2026/27" value={subtitle ?? ""}
          onChange={(e) => onSubtitle(e.target.value)} aria-label={`${label} subtitle`} maxLength={200} />
      )}
    </div>
  );
}
