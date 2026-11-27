import { useEffect, useRef } from "react";
import type { Filter, Moment, Source } from "./moments";
import { clock, teamName } from "./labTypes";

const SOURCES: [Source, string][] = [["veo", "Veo tags"], ["model", "Model suggestions"], ["you", "Added by you"], ["analytics", "Pitch analytics"]];
const TEAMS: [Filter["team"], string][] = [["own", "Our team"], ["opponent", "Opponent"], ["none", "No team yet"]];
const chip = (active: boolean) => `flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-xs ${active ? "bg-blue-600 text-white" : "text-fg-muted hover:bg-white/5"}`;
const status = { teacher: "Veo", unreviewed: "To review", approved: "Approved", rejected: "Rejected", estimated: "Analytics" };

type Props = { moments: Moment[]; visible: Moment[]; filter: Filter; setFilter: (f: Filter) => void; cursor: number | null; onPlay: (index: number) => void };

export function MomentRail({ moments, visible, filter, setFilter, cursor, onPlay }: Props) {
  const pool = moments.filter(m => filter.showRejected || m.status !== "rejected");
  const count = (test: (m: Moment) => boolean) => pool.filter(test).length;
  const types = [...new Set(pool.filter(m => (!filter.source || m.source === filter.source)).map(m => m.type))].sort();
  const list = useRef<HTMLOListElement>(null);
  useEffect(() => {
    // Scroll the list only, never the page (the video must stay in view).
    const box = list.current, item = box?.querySelector<HTMLElement>(`[data-index="${cursor}"]`);
    if (!box || !item || cursor === null) return;
    if (item.offsetTop < box.scrollTop) box.scrollTop = item.offsetTop;
    else if (item.offsetTop + item.offsetHeight > box.scrollTop + box.clientHeight) box.scrollTop = item.offsetTop + item.offsetHeight - box.clientHeight;
  }, [cursor]);
  const toggle = <K extends keyof Filter>(key: K, value: Filter[K]) => setFilter({ ...filter, [key]: filter[key] === value ? null : value });
  return <aside className="panel flex min-h-0 min-w-0 flex-col gap-3 p-3 lg:sticky lg:top-2 lg:max-h-[calc(100vh-1rem)]" aria-label="Match moments">
    <div className="space-y-1"><h2 className="px-1 text-xs uppercase tracking-widest text-fg-subtle">Source</h2>
      {SOURCES.map(([key, label]) => <button key={key} className={chip(filter.source === key)} aria-pressed={filter.source === key} onClick={() => toggle("source", key)}>{label}<span className="tabular-nums">{count(m => m.source === key)}</span></button>)}</div>
    <div className="space-y-1"><h2 className="px-1 text-xs uppercase tracking-widest text-fg-subtle">Team</h2>
      {TEAMS.map(([key, label]) => <button key={String(key)} className={chip(filter.team === key)} aria-pressed={filter.team === key} onClick={() => toggle("team", key)}>{label}<span className="tabular-nums">{count(m => key === "none" ? m.team === null : m.team === key)}</span></button>)}</div>
    <label className="block px-1 text-xs text-fg-muted">Type<select className="mt-1 w-full rounded-md border border-line bg-ink-900 p-1.5 text-sm text-fg" value={filter.type ?? ""} onChange={e => setFilter({ ...filter, type: e.target.value || null })}><option value="">All types</option>{types.map(t => <option key={t} value={t}>{t} ({count(m => m.type === t)})</option>)}</select></label>
    <label className="flex items-center gap-2 px-1 text-xs text-fg-muted"><input type="checkbox" checked={!!filter.showRejected} onChange={e => setFilter({ ...filter, showRejected: e.target.checked })} />Show rejected</label>
    <h2 className="px-1 text-sm font-semibold">Moments · {visible.length}</h2>
    {visible.length === 0 && <p className="px-1 text-xs text-fg-muted">No moments match. Clear a filter.</p>}
    <ol ref={list} className="relative min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
      {visible.map((m, i) => <li key={m.key} data-index={i}><button onClick={() => onPlay(i)} aria-current={cursor === i ? "true" : undefined}
        className={`block w-full rounded-md border px-2 py-1.5 text-left text-xs ${cursor === i ? "border-accent bg-accent/10" : "border-line hover:border-accent/60"} ${m.status === "rejected" ? "opacity-50 line-through" : ""}`}>
        <span className="flex justify-between gap-2"><span className="font-medium capitalize text-fg">{m.type}</span><span className="tabular-nums text-fg-muted">{clock(m.time)}</span></span>
        <span className="flex justify-between gap-2 text-fg-muted"><span>{teamName(m.team)}{m.teamBasis === "estimated" ? " (estimated)" : ""}</span><span>{status[m.status]}</span></span>
      </button></li>)}
    </ol>
  </aside>;
}
