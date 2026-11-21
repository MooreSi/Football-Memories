import { BookOpen } from "lucide-react";
import { useId, useMemo, useState } from "react";
import type { HudlMatch } from "../../api/hudl";
import { useGoalEntries, type GoalsEntries } from "../../lib/goals";
import { useScoreCorrections } from "../../lib/matchScore";
import type { MatchCount } from "../../lib/records";
import { seasonStories } from "../../lib/seasonStory";
import { GoalkeepingSeason, OutfieldSeason } from "./SeasonPerformance";
const EMPTY_ENTRIES: GoalsEntries = {};

/** Reference 03 hierarchy in the shared dark palette, with whole-season action totals. */
export function SeasonStory({ library, series, name, position, club, today }: { library: HudlMatch[] | undefined; series: MatchCount[]; name: string; position: string | null; club: string | null; today?: Date }) {
  const entries = useGoalEntries();
  const corrections = useScoreCorrections();
  const stories = useMemo(() => seasonStories({ library, series, name, position, club, entries: entries.data ?? EMPTY_ENTRIES, corrections: corrections.data, today }),
    [library, series, name, position, club, entries.data, corrections.data, today]);
  const [chosen, setChosen] = useState<string | null>(null);
  const id = useId();
  if (!stories.length) return null;
  const story = stories.find(s => s.season === chosen) ?? stories[0];
  return <section aria-label="Season story" className="panel min-w-0 space-y-5 p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="flex items-center gap-2 text-lg font-semibold"><BookOpen size={18} className="text-accent" aria-hidden />Season story</h2>
        <p className="mt-1 text-xs text-fg-subtle">A season of football, broken down by role</p></div>
      <div role="tablist" aria-label="Seasons" className="flex flex-wrap gap-1.5">
        {stories.map(s => <button key={s.season} id={`${id}-${s.season}`} type="button" role="tab" aria-selected={s.season === story.season} aria-controls={`${id}-panel`}
          onClick={() => setChosen(s.season)}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${s.season === story.season ? "bg-accent text-ink-950" : "border border-line text-fg-muted hover:text-fg"}`}>{s.season}</button>)}
      </div>
    </div>
    {entries.isError ? <p role="alert" className="text-sm text-warn">Could not load saved goals and keepers. Refresh to see the season stats.</p>
      : entries.isPending ? <p className="text-sm text-fg-muted">Loading season stats…</p>
      : <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-${story.season}`} className="space-y-5">
        <div className="rounded-2xl border border-line bg-linear-to-br from-accent/10 to-transparent p-4 sm:p-5">
          <p className="mb-2 text-xs font-semibold tracking-widest text-accent uppercase">{story.season} · Season overview</p>
          <p className="max-w-4xl text-[15px] leading-relaxed text-fg">{story.text}</p>
        </div>
        {story.goalkeeping && <GoalkeepingSeason cards={story.goalkeeping} games={story.keeperMatches} />}
        {story.outfield && <OutfieldSeason cards={story.outfield} games={story.outfieldMatches} />}
        <p className="text-xs leading-relaxed text-fg-subtle">Whole-season totals from cached match data. — means unrecorded; zero means a recorded category with no matching events. Each stat shows its source and coverage. Imported moment counts alone do not provide action stats.</p>
      </div>}
  </section>;
}
