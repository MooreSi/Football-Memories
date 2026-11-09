import { ChevronLeft, ChevronRight, ListVideo, Play } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import type { MatchSummary } from "../../api/types";
import { formatClock, formatDate } from "../../lib/format";
import { Badge } from "../ui/Badge";

/** Reference 1's centre hero: the newest matches as a large, cycling feature. */
export function FeaturedHero({ matches }: { matches: MatchSummary[] }) {
  const [i, setI] = useState(0);
  const m = matches[Math.min(i, matches.length - 1)];
  if (!m) return null;
  const go = (d: number) => setI((x) => (x + d + matches.length) % matches.length);

  return (
    <section aria-label="Featured match" className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-ink-900">
      <div className="relative aspect-[16/8] min-h-[260px]">
        {m.thumbnail_url && <img src={m.thumbnail_url} alt="" className="absolute inset-0 size-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/40 to-ink-950/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink-950/80 via-transparent to-transparent" />

        <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-4 p-6 sm:p-8">
          <div className="max-w-xl">
            <div className="mb-3 flex flex-wrap gap-1.5">
              <Badge tone="accent">Latest</Badge>
              {m.age_group && <Badge tone="violet">{m.age_group}</Badge>}
              <Badge>{m.season_label}</Badge>
              {m.competition && <Badge>{m.competition}</Badge>}
            </div>
            <p className="text-sm text-fg-muted">{m.team_name}</p>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              <span className="text-fg-muted">vs</span> {m.opponent}
            </h2>
            <p className="mt-2 text-sm text-fg-muted">
              {formatDate(m.match_date)}
              {m.duration_s != null && ` · ${formatClock(m.duration_s)}`} · {m.event_count} moments
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              to={`/matches/${m.id}`}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-gradient-to-r from-[#2563eb] to-accent-strong px-5 text-sm font-semibold text-white shadow-[0_10px_30px_-10px_rgb(37_99_235/0.9)] hover:brightness-110"
            >
              <Play size={16} aria-hidden /> Watch match
            </Link>
            {m.event_count > 0 && (
              <Link
                to={`/matches/${m.id}?moments=1`}
                className="inline-flex h-11 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 text-sm backdrop-blur hover:bg-white/10"
              >
                <ListVideo size={16} aria-hidden /> Moments
              </Link>
            )}
          </div>
        </div>

        {matches.length > 1 && (
          <>
            <button type="button" aria-label="Previous featured match" onClick={() => go(-1)}
              className="absolute top-1/2 left-4 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-ink-950/50 backdrop-blur hover:bg-ink-950/80">
              <ChevronLeft size={18} />
            </button>
            <button type="button" aria-label="Next featured match" onClick={() => go(1)}
              className="absolute top-1/2 right-4 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-ink-950/50 backdrop-blur hover:bg-ink-950/80">
              <ChevronRight size={18} />
            </button>
            <div className="absolute top-5 right-6 flex gap-1.5" role="tablist" aria-label="Featured matches">
              {matches.map((x, n) => (
                <button key={x.id} type="button" role="tab" aria-selected={n === i} aria-label={`Show ${x.opponent}`}
                  onClick={() => setI(n)}
                  className={`h-2 rounded-full transition-all ${n === i ? "w-6 bg-fg" : "w-2 bg-fg/35 hover:bg-fg/60"}`} />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
