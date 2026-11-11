import { ChevronLeft, ChevronRight, ListVideo, Play } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { type HudlMatch, hudlAgeGroups } from "../../api/hudl";
import { fixtureDate, fixtureLabel, fixtureParts } from "../../lib/hudlFixture";
import { TeamBadge } from "../TeamBadge";
import { Badge } from "../ui/Badge";

/** Reference 1's centre hero, fed by the connected Hudl library: newest first,
 *  right arrow steps to the next (older) match, left arrow back towards the latest. */
export function HudlHero({ matches, club, age, index, onIndex }: { matches: HudlMatch[]; club: string | null; age: string; index?: number; onIndex?: (i: number) => void }) {
  const [own, setOwn] = useState(0);
  // Controlled by the Library page so the side panels follow the match on show.
  const i = index ?? own;
  const setI = (next: (x: number) => number) => { const v = next(i); setOwn(v); onIndex?.(v); };
  const m = matches[Math.min(i, matches.length - 1)];
  if (!m) return null;
  const group = age || hudlAgeGroups(m)[0];
  const date = fixtureDate(m.title);
  const parts = fixtureParts(m.title);
  const venue = parts?.venue;
  const home = club || "Home";
  const moments = m.moments?.length ?? 0;
  const link = `/hudl/${encodeURIComponent(m.id)}`;
  return (
    <section aria-label="Featured match" className="featured-hero relative overflow-hidden">
      <div className="hero-stage relative">
        {m.thumbnail_url && <img crossOrigin="anonymous" src={m.thumbnail_url} alt="" className="absolute inset-0 size-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/40 to-ink-950/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink-950/80 via-transparent to-transparent" />
        {parts && (
          <div role="group" aria-label={`${home} vs ${parts.opponent}`}
            className="hero-crests absolute top-5 left-5 flex items-center gap-2 rounded-full border border-white/10 bg-ink-950/55 p-1.5 pr-2 backdrop-blur-md">
            <TeamBadge name={home} size="sm" tone="home" />
            <span className="text-[11px] font-bold tracking-widest text-fg-muted uppercase">v</span>
            <TeamBadge name={parts.opponent} size="sm" tone="away" />
          </div>
        )}
        <div className="hero-caption absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-5 p-6 sm:p-8">
          <div className="max-w-xl">
            <div className="mb-3 flex flex-wrap gap-1.5">
              {i === 0 && <Badge tone="accent">Latest</Badge>}
              {group && <Badge tone="violet">{group}</Badge>}
              {m.season_label && m.season_label !== "Unclassified" && <Badge>{m.season_label}</Badge>}
              {venue && <Badge>{venue}</Badge>}
              <Badge>Hudl</Badge>
            </div>
            <h2 className="hero-title font-semibold tracking-tight">{fixtureLabel(m.title, club, group)}</h2>
            <p className="mt-2 text-sm text-fg-muted">
              {date ? date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : m.title}
              {moments > 0 && ` · ${moments} tagged moments`} · {i + 1} of {matches.length}
            </p>
          </div>
          <div className="flex gap-2">
            <Link to={link} className="inline-flex h-11 items-center gap-2 rounded-full bg-gradient-to-r from-[#2563eb] to-accent-strong px-5 text-sm font-semibold text-white shadow-[0_10px_30px_-10px_rgb(37_99_235/0.9)] hover:brightness-110">
              <Play size={16} aria-hidden /> Watch match
            </Link>
            {moments > 0 && (
              <Link to={link} className="inline-flex h-11 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 text-sm backdrop-blur hover:bg-white/10">
                <ListVideo size={16} aria-hidden /> Moments
              </Link>
            )}
          </div>
        </div>
        <button type="button" aria-label="Previous match" disabled={i === 0} onClick={() => setI(x => Math.max(0, x - 1))}
          className="absolute top-1/2 left-4 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-ink-950/50 backdrop-blur hover:bg-ink-950/80 disabled:opacity-30">
          <ChevronLeft size={18} />
        </button>
        <button type="button" aria-label="Next match" disabled={i >= matches.length - 1} onClick={() => setI(x => Math.min(matches.length - 1, x + 1))}
          className="absolute top-1/2 right-4 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-ink-950/50 backdrop-blur hover:bg-ink-950/80 disabled:opacity-30">
          <ChevronRight size={18} />
        </button>
      </div>
    </section>
  );
}
