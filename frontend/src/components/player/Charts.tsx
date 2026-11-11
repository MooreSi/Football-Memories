import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";
import { Link } from "react-router-dom";
import type { PlayerProfile } from "../../api/types";
import { trend } from "../../lib/player";

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
      <ol className="flex h-56 items-end gap-2" aria-label="Moments per match, oldest to newest">
        {last.map((s, i) => (
          <li key={s.match_id} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
            <span className="text-sm font-semibold tabular-nums">{s.moments}</span>
            <div className="flex min-h-0 w-full flex-1 items-end justify-center">
              <Link
                to={s.href ?? `/matches/${s.match_id}`}
                title={`vs ${s.opponent}, ${s.match_date}`}
                aria-label={`${s.moments} moments vs ${s.opponent}`}
                className={`w-full max-w-10 rounded-md border transition hover:brightness-125 ${
                  i >= half ? "border-accent/60 bg-accent/35" : "border-white/15 bg-white/15"
                }`}
                style={{ height: `${Math.max(6, (s.moments / max) * 100)}%` }}
              />
            </div>
            {/* Game name reads bottom-to-top in a fixed strip, so long names never widen or grow the chart. */}
            <span data-bar-label title={s.opponent}
              className="h-24 shrink-0 truncate rotate-180 text-left text-xs leading-none text-fg-muted [writing-mode:vertical-rl]">
              {s.opponent}
            </span>
            <span className="w-full truncate text-center text-[10px] text-fg-subtle tabular-nums">
              {new Date(`${s.match_date}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
