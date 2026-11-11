import { Radar } from "lucide-react";
import type { HudlMoment } from "../../api/hudl";
import { looksLikePlayer } from "../../lib/hudlPlayer";
import { radarPoints } from "../../lib/player";

type Kind = { name: string; count: number };
const NOISE = new Set(["BALL OUT OF PLAY"]);

/** Situation codes in one match, most frequent first. Player-name codes and noise are left
 *  out: they describe who was involved, which My Player covers, not what happened. */
export function matchProfile(moments: HudlMoment[]): Kind[] {
  const counts = new Map<string, number>();
  for (const m of moments) {
    if (NOISE.has(m.category) || looksLikePlayer(m.category)) continue;
    counts.set(m.category, (counts.get(m.category) ?? 0) + 1);
  }
  return [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function ProfileRadar({ axes }: { axes: Kind[] }) {
  const max = Math.max(...axes.map((a) => a.count));
  const c = 120;
  const r = 88;
  const ring = (f: number) => radarPoints(axes.map(() => max * f), max, r, c, c).map((p) => p.join(",")).join(" ");
  const shape = radarPoints(axes.map((a) => a.count), max, r, c, c);
  const marks = radarPoints(axes.map(() => max), max, r + 16, c, c);
  // The column is narrow, so points carry numbers and the full codes sit in the key below.
  return (
    <>
      <svg viewBox="0 0 240 240" role="img" aria-label={`Match profile: ${axes.map((a) => `${a.name} ${a.count}`).join(", ")}`} className="mx-auto w-full max-w-[260px]">
        {[1, 0.66, 0.33].map((f) => <polygon key={f} points={ring(f)} fill="none" stroke="rgb(255 255 255 / 0.12)" />)}
        <polygon points={shape.map((p) => p.join(",")).join(" ")} fill="rgb(34 211 238 / 0.28)" stroke="#22d3ee" strokeWidth={2} />
        {marks.map(([x, y], i) => (
          <text key={axes[i].name} x={x} y={y + 4} textAnchor="middle" className="fill-accent text-[12px] font-semibold">{i + 1}</text>
        ))}
      </svg>
      <ol className="mt-3 space-y-1.5" aria-hidden>
        {axes.map((a, i) => (
          <li key={a.name} title={a.name} className="grid grid-cols-[1.25rem_1fr_auto] items-baseline gap-2 text-xs">
            <span className="font-semibold text-accent tabular-nums">{i + 1}</span>
            <span className="truncate">{a.name}</span>
            <span className="text-fg-muted tabular-nums">{a.count}</span>
          </li>
        ))}
      </ol>
    </>
  );
}

/** Library left column: what happened in the match on screen (replaces "Most tagged"). */
export function MatchProfile({ kinds, scope }: { kinds: Kind[]; scope: string }) {
  const top = kinds.slice(0, 6);
  const max = Math.max(1, ...top.map((t) => t.count));
  return (
    <section aria-label="Match profile" className="panel p-5">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="font-semibold">Match Profile</h2>
        <Radar size={16} className="text-fg-subtle" aria-hidden />
      </div>
      <p className="mb-2 text-xs text-fg-subtle">{scope}</p>
      {top.length >= 3 ? <ProfileRadar axes={top} /> : top.length > 0 ? (
        <ul className="space-y-3">
          {top.map((t) => (
            <li key={t.name} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1">
              <span className="truncate text-sm">{t.name}</span>
              <span className="text-sm text-fg-muted tabular-nums">{t.count}</span>
              <span className="col-span-2 h-1.5 overflow-hidden rounded-full bg-ink-700">
                <span className="block h-full rounded-full bg-gradient-to-r from-ok to-accent" style={{ width: `${(t.count / max) * 100}%` }} />
              </span>
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-fg-muted">No tags yet.</p>}
    </section>
  );
}
