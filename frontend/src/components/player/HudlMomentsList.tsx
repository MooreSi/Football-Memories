import { Play } from "lucide-react";
import { Link } from "react-router-dom";
import { formatClock } from "../../lib/format";
import type { HudlPlayerMatch } from "../../lib/hudlPlayer";
import { watchedHudlMoments } from "../../lib/hudlWatched";

/** The hub's right-hand feed for a player whose moments live in Hudl: newest match first. */
export function HudlMomentsList({ matches }: { matches: HudlPlayerMatch[] }) {
  const watched = watchedHudlMoments();
  return (
    <section aria-label="Latest Hudl moments" className="panel max-h-[760px] space-y-4 overflow-y-auto p-4">
      <h2 className="text-lg font-semibold">Latest moments</h2>
      {[...matches].reverse().slice(0, 6).map((m) => (
        <div key={m.id} className="space-y-2">
          <Link to={`/hudl/${encodeURIComponent(m.id)}`} className="block overflow-hidden rounded-xl bg-ink-800">
            {m.thumbnail_url && <img crossOrigin="anonymous" src={m.thumbnail_url} alt="" loading="lazy" className="aspect-video w-full object-cover" />}
            <p className="truncate px-3 py-2 text-sm font-semibold">vs {m.opponent}</p>
          </Link>
          <ul className="flex flex-wrap gap-1.5">
            {m.moments.slice(0,6).map((x) => (
              <li key={x.id}>
                <Link to={`/hudl/${encodeURIComponent(m.id)}?moment=${encodeURIComponent(x.id)}`}
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] hover:border-accent/60 ${watched.has(x.id) ? "border-white/10 text-fg-muted" : "border-accent/40 text-fg"}`}>
                  <Play size={9} aria-hidden /><span className="font-mono text-pin">{formatClock(x.time_s)}</span>
                </Link>
              </li>
            ))}
          </ul>
          {m.moments.length>6&&<Link className="block text-xs text-accent hover:underline" to={`/hudl/${encodeURIComponent(m.id)}?player=${encodeURIComponent(m.moments[0].category)}`}>View all {m.moments.length} moments →</Link>}
        </div>
      ))}
    </section>
  );
}
