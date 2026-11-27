import type { HudlMatch } from "../../api/hudl";
import { useGoalEntries } from "../../lib/goals";
import { useScoreCorrections } from "../../lib/matchScore";
import { milestones } from "../../lib/milestones";
import { playerPerformance } from "../../lib/playerPerformance";
import { FILL_CLASS } from "../match/statsUi";
export function MilestonesTimeline({ library, name, position, club, importedGames = 0 }: { library: HudlMatch[] | undefined; name: string; position: string | null; club: string | null; importedGames?: number }) {
  const entries = useGoalEntries();
  const corrections = useScoreCorrections();
  const performance = playerPerformance({ matches: library ?? [], name, position, club, entries: entries.data, corrections: corrections.data, importedGames });
  const found = milestones(performance.cards, performance.keeper);
  if (!library?.length && !importedGames) return null;
  return <section aria-label="Milestones" className="panel space-y-4 p-5">
    <div><h2 className="text-lg font-semibold">Milestones</h2><p className="mt-1 text-xs text-fg-muted">{performance.keeper ? "Goalkeeper" : "Outfield"} career totals and next targets</p></div>
    {entries.isError ? <p role="alert" className="text-sm text-warn">Could not load saved goals and keepers. Refresh to see milestones.</p>
      : entries.isPending ? <p className="text-sm text-fg-muted">Loading milestones…</p>
      : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{found.map(m => <div key={m.label} role="group" aria-label={m.label} className="tile min-w-0 space-y-2 p-4">
        <h3 className="text-sm text-fg-muted">{m.label}</h3><p className="text-3xl font-bold text-accent tabular-nums">{m.value === null ? "—" : m.value.toLocaleString("en-GB")}</p>
        <p className="text-[11px] text-fg-subtle">{m.note}</p>
        {m.next !== null && <><p className="text-xs text-fg-muted">Next: {m.next.toLocaleString("en-GB")} · {m.remaining!.toLocaleString("en-GB")} to go</p>
          <div role="progressbar" aria-label={`${m.label} next milestone`} aria-valuemin={0} aria-valuemax={m.next} aria-valuenow={m.value!} className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className={`h-full ${FILL_CLASS}`} style={{ width: `${m.fraction! * 100}%` }} /></div></>}
      </div>)}</div>}
  </section>;
}
