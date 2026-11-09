import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";
import { Link } from "react-router-dom";
import type { PlayerProfile } from "../../api/types";
import { radarPoints, trend } from "../../lib/player";

/** Reference 03's "Skills profile" radar, built from tag counts. */
export function TagRadar({ categories }: { categories: PlayerProfile["categories"] }) {
  const axes = categories.slice(0, 6);
  if (axes.length < 3) {
    return <p className="p-6 text-center text-sm text-fg-muted">The tag profile appears once there are at least three kinds of moments.</p>;
  }
  const max = Math.max(...axes.map((a) => a.count));
  const size = 300;
  const c = size / 2;
  const r = 92;
  const ring = (f: number) => radarPoints(axes.map(() => max * f), max, r, c, c).map((p) => p.join(",")).join(" ");
  const shape = radarPoints(axes.map((a) => a.count), max, r, c, c);
  const labels = radarPoints(axes.map(() => max), max, r + 30, c, c);
  return (
    <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Tag profile: ${axes.map((a) => `${a.name} ${a.count}`).join(", ")}`} className="mx-auto w-full max-w-[340px]">
      {[1, 0.66, 0.33].map((f) => (
        <polygon key={f} points={ring(f)} fill="none" stroke="rgb(255 255 255 / 0.12)" />
      ))}
      <polygon points={shape.map((p) => p.join(",")).join(" ")} fill="rgb(34 211 238 / 0.28)" stroke="#22d3ee" strokeWidth={2} />
      {labels.map(([x, y], i) => (
        <g key={axes[i].name}>
          <text x={x} y={y - 4} textAnchor="middle" className="fill-fg text-[11px] font-medium">{axes[i].name}</text>
          <text x={x} y={y + 10} textAnchor="middle" className="fill-accent text-[12px] font-semibold">{axes[i].count}</text>
        </g>
      ))}
    </svg>
  );
}

/** Reference 03's "Dynamics" bar chart: moments per match, last 10 matches. */
export function MomentsPerMatch({ series }: { series: PlayerProfile["per_match"] }) {
  const last = series.slice(-10);
  if (last.length === 0) return <p className="p-6 text-center text-sm text-fg-muted">No matches yet.</p>;
  const max = Math.max(...last.map((s) => s.moments));
  const t = trend(last.map((s) => s.moments));
  const Arrow = t === "up" ? ArrowUp : t === "down" ? ArrowDown : ArrowRight;
  const half = Math.floor(last.length / 2);
  return (
    <div>
      <p className="mb-4 flex items-center gap-2 text-sm font-medium">
        <Arrow size={16} className={t === "up" ? "text-ok" : t === "down" ? "text-warn" : "text-fg-muted"} aria-hidden />
        Moments per match
        <span className="sr-only">trend {t}</span>
      </p>
      <ol className="flex h-44 items-end gap-2" aria-label="Moments per match, oldest to newest">
        {last.map((s, i) => (
          <li key={s.match_id} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <span className="text-sm font-semibold tabular-nums">{s.moments}</span>
            <Link
              to={`/matches/${s.match_id}`}
              title={`vs ${s.opponent}, ${s.match_date}`}
              aria-label={`${s.moments} moments vs ${s.opponent}`}
              className={`w-full max-w-10 rounded-md border transition hover:brightness-125 ${
                i >= half ? "border-accent/60 bg-accent/35" : "border-white/15 bg-white/15"
              }`}
              style={{ height: `${Math.max(6, (s.moments / max) * 100)}%` }}
            />
            <span className="w-full truncate text-center text-[10px] text-fg-subtle">
              {new Date(`${s.match_date}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
