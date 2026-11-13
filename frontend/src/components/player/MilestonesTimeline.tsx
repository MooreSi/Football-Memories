import type { LucideIcon } from "lucide-react";
import { CalendarPlus, Flag, Goal, Hash, Medal, Sparkles, TrendingUp } from "lucide-react";
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { type Milestone, type MilestoneMatch, milestones } from "../../lib/milestones";

const ICONS: Record<Milestone["kind"], LucideIcon> = {
  first: Flag, season: CalendarPlus, age: TrendingUp, moments: Sparkles, matches: Hash, best: Medal, goal: Goal,
};
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day = (date: string) => `${Number(date.slice(8, 10))} ${MONTHS[Number(date.slice(5, 7)) - 1]} ${date.slice(0, 4)}`;

/** Owner request 2026-11-13: milestones as badges along a timeline, oldest at the left;
 *  it opens scrolled to the newest. */
export function MilestonesTimeline({ series, name }: { series: MilestoneMatch[]; name: string }) {
  const found = milestones(series, name);
  const strip = useRef<HTMLOListElement>(null);
  useEffect(() => { const el = strip.current; if (el) el.scrollLeft = el.scrollWidth; }, [found.length]);
  if (found.length === 0) return null;
  return <section aria-label="Milestones" className="panel space-y-4 p-5">
    <div className="flex items-baseline justify-between gap-2">
      <h2 className="text-lg font-semibold">Milestones</h2>
      <span className="text-xs text-fg-subtle">{found.length} so far</span>
    </div>
    <ol ref={strip} aria-label="Milestones, oldest first" className="relative flex gap-3 overflow-x-auto pb-2 [scrollbar-width:thin]">
      {found.map((x, i) => {
        const Icon = ICONS[x.kind];
        return <li key={`${x.kind}-${x.title}-${i}`} className="relative flex w-40 shrink-0 flex-col items-center text-center">
          {i > 0 && <span aria-hidden className="absolute top-6 right-1/2 h-0.5 w-[calc(100%+0.75rem)] bg-linear-to-r from-[#1e3a8a] to-[#2563eb]" />}
          <Link to={x.href} className="relative z-10 grid size-12 place-items-center rounded-full bg-linear-to-br from-[#2563eb] to-[#38bdf8] text-white shadow-[0_0_16px_#3b82f660] ring-2 ring-white/20 transition hover:scale-105"
            aria-label={`${x.title}, ${x.detail}, ${day(x.date)}`}>
            <Icon size={20} aria-hidden />
          </Link>
          <h3 className="mt-2 text-sm font-semibold leading-snug">{x.title}</h3>
          <p className="truncate text-xs text-fg-muted" title={x.detail}>{x.detail}</p>
          <p className="text-[11px] text-fg-subtle tabular-nums">{day(x.date)}</p>
        </li>;
      })}
    </ol>
  </section>;
}
