import { BookOpen, Play } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import type { MatchCount } from "../../lib/records";
import { monthName, seasonStories } from "../../lib/seasonStory";

/** Owner request 2026-11-13: each season told in a few sentences, with a match of the
 *  month to watch. Newest season first. */
export function SeasonStory({ series, name, today }: { series: MatchCount[]; name: string; today?: Date }) {
  const stories = seasonStories(series, name, today);
  const [chosen, setChosen] = useState<string | null>(null);
  if (stories.length === 0) return null;
  const story = stories.find((s) => s.season === chosen) ?? stories[0];
  return <section aria-label="Season story" className="panel space-y-4 p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-lg font-semibold"><BookOpen size={18} className="text-accent" aria-hidden /> Season story</h2>
      <div role="tablist" aria-label="Seasons" className="flex flex-wrap gap-1.5">
        {stories.map((s) => <button key={s.season} type="button" role="tab" aria-selected={s.season === story.season}
          onClick={() => setChosen(s.season)}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${s.season === story.season ? "bg-accent text-ink-950" : "border border-line text-fg-muted hover:text-fg"}`}>{s.season}</button>)}
      </div>
    </div>
    <p role="tabpanel" className="max-w-3xl text-[15px] leading-relaxed text-fg">{story.text}</p>
    <ul aria-label="Match of the month" className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {story.months.map((m) => <li key={m.month} className="tile flex min-w-0 flex-col gap-1.5 p-3.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-semibold">{monthName(m.month)}</span>
          <span className="shrink-0 text-xs tabular-nums text-fg-subtle">{m.moments.toLocaleString("en-GB")} in {m.matches}</span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-linear-to-r from-[#2563eb] to-[#38bdf8]"
          style={{ width: `${Math.max(4, (m.moments / Math.max(...story.months.map((x) => x.moments))) * 100)}%` }} /></div>
        <Link to={m.pick.href} className="flex min-w-0 items-center gap-2 text-xs text-fg-muted hover:text-accent">
          <Play size={12} className="shrink-0 text-accent" aria-hidden />
          <span className="truncate">Match of the month: vs {m.pick.opponent}</span>
          <span className="ml-auto shrink-0 tabular-nums text-pin">{m.pick.moments}</span>
        </Link>
      </li>)}
    </ul>
  </section>;
}
