import { type KeyboardEvent, type ReactNode, useId, useMemo, useRef, useState } from "react";
import { formatClock } from "../../lib/format";
import { type GoalsSource, matchGoals, useGoalEntries } from "../../lib/goals";
import type { Minute } from "../../lib/insights";
import { keeperLine, summaryCells } from "../../lib/matchSummary";
import type { TeamRow } from "../../lib/veoTeamSplit";
import { MomentumBars } from "./MatchInsights";
import { PlayerStatsPanel } from "./PlayerStatsPanel";

type Section = { id: string; label: string; content: ReactNode | null };

/** Spec 320 (owner request 2026-11-16, "option A"): under the video, the match timeline
 *  and a summary strip, then the page's panels as tabs with Moments first. A tab with
 *  nothing to show is left out. Inactive panels stay mounted (an edit in Goals and
 *  keepers survives a tab switch) and are hidden with CSS. */
export function MatchSections({ match, club, rows, flow, ours, theirs, now, onSeek, moments, momentsCount, stats, matchStats = null, goals, record = null }: {
  match: GoalsSource & { id: string }; club: string | null; rows: TeamRow[]; flow: { minutes: Minute[]; halves: number[] };
  ours: string; theirs: string; now: number; onSeek: (time: number) => void;
  moments: ReactNode | null; momentsCount: number; stats: ReactNode | null; matchStats?: ReactNode | null; goals: ReactNode; record?: ReactNode | null;
}) {
  const entries = useGoalEntries();
  const data = useMemo(() => matchGoals(match, club, entries.data?.[match.id]), [match, club, entries.data]);
  const sections: Section[] = [
    { id: "moments", label: `Moments · ${momentsCount}`, content: moments },
    { id: "stats", label: "Team stats", content: stats },
    // Owner request 2026-11-26: the match's numbers as charts, next to Team stats.
    // Owner request 2026-11-27: Insights left the tabs (its numbers are in the others);
    // the record against this opponent moved here so it is not lost.
    { id: "match-stats", label: "Match stats", content: matchStats || record ? <>{matchStats}{record}</> : null },
    // Owner request 2026-11-27: no score in this title.
    { id: "goals", label: "Goals & Keepers", content: goals },
    { id: "players", label: "Player stats", content: <PlayerStatsPanel match={match} club={club} goals={data} onSeek={onSeek} /> },
  ];
  const shown = sections.filter((s) => s.content);
  return <>
    {flow.minutes.length > 0 && <div className="panel px-4 py-3">
      <MomentumBars rows={flow.minutes} halves={flow.halves} ours={ours} theirs={theirs} onSeek={onSeek} now={now} compact
        label="Match timeline" title="Momentum · click a bar to watch" />
    </div>}
    <SummaryStrip cells={summaryCells(rows)} keeper={keeperLine(data)} />
    <Tabs sections={shown} />
  </>;
}

function SummaryStrip({ cells, keeper }: { cells: { label: string; value: string }[]; keeper: ReturnType<typeof keeperLine> }) {
  if (!cells.length && !keeper) return null;
  return <section aria-label="Match summary" className="panel flex flex-wrap items-stretch">
    {cells.map((c) => <div key={c.label} className="min-w-[7rem] border-r border-line px-4 py-2.5">
      <p className="text-xl font-semibold tabular-nums">{c.value}</p><p className="text-[11px] tracking-wider text-fg-subtle uppercase">{c.label}</p>
    </div>)}
    {keeper && <div className="px-4 py-2.5">
      <p className="flex flex-wrap items-center gap-2 pt-1 font-semibold">{keeper.names}
        {keeper.likely && <span className="rounded-full border border-line px-2 py-0.5 text-[11px] font-normal text-fg-subtle">Likely</span>}</p>
      <p className="text-[11px] tracking-wider text-fg-subtle uppercase">In goal{keeper.change !== null ? ` · change ${formatClock(keeper.change)}` : ""}</p>
    </div>}
  </section>;
}

/** WAI-ARIA tabs: arrow keys, Home and End move and select. */
function Tabs({ sections }: { sections: Section[] }) {
  const base = useId();
  const [picked, setPicked] = useState(sections[0]?.id);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = sections.some((s) => s.id === picked) ? picked : sections[0]?.id;
  if (!sections.length) return null;
  const go = (i: number) => { const s = sections[(i + sections.length) % sections.length]; setPicked(s.id); tabs.current[(i + sections.length) % sections.length]?.focus(); };
  const onKey = (e: KeyboardEvent, i: number) => {
    const to = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? sections.length - 1 : null;
    if (to === null) return;
    e.preventDefault();
    go(to);
  };
  return <div className="space-y-5">
    <div role="tablist" aria-label="Match sections" className="flex flex-wrap border-b border-line">
      {sections.map((s, i) => {
        const on = s.id === current;
        return <button key={s.id} ref={(el) => { tabs.current[i] = el; }} type="button" role="tab" id={`${base}-tab-${s.id}`}
          aria-selected={on} aria-controls={`${base}-panel-${s.id}`} tabIndex={on ? 0 : -1}
          onClick={() => setPicked(s.id)} onKeyDown={(e) => onKey(e, i)}
          className={`-mb-px min-h-11 border-b-2 px-4 text-sm font-semibold ${on ? "border-accent text-fg" : "border-transparent text-fg-muted hover:text-fg"}`}>
          {s.label}
        </button>;
      })}
    </div>
    {sections.map((s) => <div key={s.id} role="tabpanel" id={`${base}-panel-${s.id}`} aria-labelledby={`${base}-tab-${s.id}`}
      className={`space-y-5 ${s.id === current ? "" : "hidden"}`}>{s.content}</div>)}
  </div>;
}
