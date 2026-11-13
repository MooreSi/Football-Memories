import { PlayCircle } from "lucide-react";
import { Link } from "react-router-dom";
import type { HudlMatch } from "../../api/hudl";
import { formatClock } from "../../lib/format";
import { fixtureLabel } from "../../lib/hudlFixture";
import { unfinished, useWatching } from "../../lib/viewerState";

/** Spec 230: matches started and not finished, newest first, resuming where you stopped. */
export function ContinueWatching({ library, club }: { library: HudlMatch[] | undefined; club: string | null }) {
  const watching = useWatching();
  const byId = new Map((library ?? []).map((m) => [m.id, m]));
  const rows = unfinished(watching.data, new Map([...byId].map(([id, m]) => [id, m.duration_s]))).slice(0, 6);
  if (!rows.length) return null;
  return (
    <section aria-label="Continue watching" className="panel p-5">
      <h2 className="mb-3 text-xl font-semibold">Continue watching</h2>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((w) => {
          const m = byId.get(w.match_id)!;
          const total = m.duration_s || w.duration_s;
          return (
            <li key={w.match_id}>
              <Link to={`/hudl/${encodeURIComponent(m.id)}?t=${Math.floor(w.position_s)}`} className="tile block overflow-hidden hover:border-accent/60">
                <div className="relative aspect-video bg-ink-700">
                  {m.thumbnail_url && <img crossOrigin="anonymous" src={m.thumbnail_url} alt="" className="h-full w-full object-cover" />}
                  <PlayCircle size={34} className="absolute inset-0 m-auto text-white drop-shadow" aria-hidden />
                  {total > 0 && <span className="absolute right-0 bottom-0 left-0 h-1 bg-black/50"><span className="block h-full bg-accent" style={{ width: `${Math.min(100, (w.position_s / total) * 100)}%` }} /></span>}
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-semibold">{fixtureLabel(m.title, club, m.age_group)}</p>
                  <p className="text-xs text-fg-muted">Resume at {formatClock(w.position_s)}{total > 0 ? ` of ${formatClock(total)}` : ""}</p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
