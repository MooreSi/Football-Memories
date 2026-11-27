import { ArrowDownRight, ArrowUpRight, BarChart3 } from "lucide-react";
import { formatClock } from "../../lib/format";
import {
  type Form, type StatEvent, type Step, SPELL_S, attemptsOverTime, formDelta, periodSplit, shotSummary, spells, standouts,
} from "../../lib/matchStats";
import { OURS, THEIRS } from "../../lib/teamColours";
import type { TeamRow } from "../../lib/veoTeamSplit";
import { Card, OURS_COLUMN, OURS_FILL, Ring, StatsHeader, Standouts, THEIRS_COLUMN, THEIRS_FILL, useSvgId, VersusBars } from "./statsUi";

/** Owner request 2026-11-26: the match's own numbers as charts, beside Team stats.
 *  References: docs/design/reference/04-07 (key bars, headline tiles, charts, what stood
 *  out). Layout and mood from those; the figures are only this match's sided rows and
 *  events, so there is no passing data and no invented trend. */
const HEADLINES: string[][] = [["Goals"], ["Attempts", "Chances"], ["On target"], ["Corners"], ["Possession %"], ["Fouls"]];
const LOWER_IS_BETTER = new Set(["Fouls"]);

type Props = {
  rows: TeamRow[]; events: StatEvent[]; halves?: number[][]; duration: number; ours: string; theirs: string;
  previous: TeamRow[][]; onSeek: (time: number) => void; source: string;
};

export function MatchStatsPanel({ rows, events, halves, duration, ours, theirs, previous, onSeek, source }: Props) {
  if (!rows.length && !events.length) return null;
  const shots = shotSummary(rows);
  const notes = standouts(rows, events, halves, duration);
  const periods = periodSplit(events, halves);
  const heads = HEADLINES.map(labels => rows.find(r => labels.includes(r.label))).filter((r): r is TeamRow => Boolean(r)).slice(0, 4);
  const hasAttempts = events.some(e => e.kind === "attempt" || e.kind === "goal");
  return <section aria-label="Match stats" className="panel space-y-6 p-5">
    <StatsHeader icon={<BarChart3 size={18} className="text-accent" aria-hidden />} title="Match stats" sub="This match in numbers, both teams">
      <Legend ours={ours} theirs={theirs} />
    </StatsHeader>

    {notes.length > 0 && <Standouts notes={notes} footnote="Worked out from this match's numbers below; nothing here is a guess." />}

    {heads.length > 0 && <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {heads.map(r => <Headline key={r.label} row={r} theirs={theirs} form={formDelta(rows, previous, r.label)} />)}
    </div>}

    {rows.length > 0 && <Card title="Key match stats" sub="Headline numbers for both teams">
      {/* Three ruled columns on wide screens (reference 04); below that the bars flow two a row. */}
      <div role="group" aria-label="Key match stats" className="grid gap-x-8 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
        {columns(rows, 3).map((col, i) => <div key={i} className={`contents xl:block xl:space-y-5 ${i ? "xl:border-l xl:border-line xl:pl-8" : ""}`}>
          {col.map(r => <VersusBar key={r.label} row={r} ours={ours} theirs={theirs} />)}
        </div>)}
      </div>
    </Card>}

    {shots && <Card title="Shot breakdown" sub="Goals as a share of attempts">
      <div className="grid gap-6 sm:grid-cols-3">
        <Ring label={`${ours} conversion rate`} value={shots.ours.conversion} colour="ours"
          note={`${shots.ours.goals} of ${shots.ours.attempts} attempts`} />
        <Ring label={`${theirs} conversion rate`} value={shots.theirs.conversion} colour="theirs"
          note={`${shots.theirs.goals} of ${shots.theirs.attempts} attempts`} />
        {shots.ours.onTarget !== null && shots.ours.attempts > 0
          ? <Ring label={`${ours} on target`} value={Math.min(100, Math.round((shots.ours.onTarget / shots.ours.attempts) * 100))} colour="ours"
              note={`${shots.ours.onTarget} of ${shots.ours.attempts} attempts on target`} />
          : <Ring label={`${ours} share of attempts`} value={shots.share} colour="ours"
              note={`${shots.ours.attempts} of ${shots.ours.attempts + shots.theirs.attempts} in the match`} />}
      </div>
    </Card>}

    {hasAttempts && <div className="grid gap-5 xl:grid-cols-[3fr_2fr]">
      <Card title="Attempts through the match" sub="Running total, goals marked · click one to watch">
        <AttemptsChart events={events} halves={halves} duration={duration} ours={ours} theirs={theirs} onSeek={onSeek} />
      </Card>
      <Card title="Attempts by spell" sub="Each 15 minutes of the recording">
        <SpellBars events={events} duration={duration} ours={ours} theirs={theirs} onSeek={onSeek} />
      </Card>
    </div>}

    {periods.length > 0 && <Card title="Half by half" sub="Goals, attempts and corners in each period">
      <div className={`grid gap-4 md:grid-cols-2 ${periods.length > 2 ? "xl:grid-cols-3" : ""}`}>
        {periods.map(p => <div key={p.label} className="rounded-2xl border border-line bg-white/[0.02] p-4">
          <p className="mb-3 text-sm font-semibold">{p.label}</p>
          <div className="space-y-3">
            {(["goals", "attempts", "corners"] as const).map(k => <VersusBar key={k} compact ours={ours} theirs={theirs}
              row={{ label: k[0].toUpperCase() + k.slice(1), own: p.ours[k], opponent: p.theirs[k] }} />)}
          </div>
        </div>)}
      </div>
    </Card>}

    <p className="text-xs text-fg-subtle">From {source}'s sided events and team stats for this match. Recent form compares with the average of this club's earlier dated matches that have the same figure.</p>
  </section>;
}

function columns<T>(list: T[], n: number): T[][] {
  const size = Math.ceil(list.length / n);
  return Array.from({ length: n }, (_, i) => list.slice(i * size, (i + 1) * size)).filter(c => c.length);
}

function Legend({ ours, theirs }: { ours: string; theirs: string }) {
  return <p className="flex items-center gap-4 text-xs text-fg-muted">
    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: OURS_FILL }} />{ours}</span>
    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: THEIRS_FILL }} />{theirs}</span>
  </p>;
}

function Headline({ row, theirs, form }: { row: TeamRow; theirs: string; form: Form | null }) {
  const pctSign = row.label.endsWith("%") ? "%" : "";
  const name = row.label.replace(/ %$/, "");
  const good = form && (LOWER_IS_BETTER.has(row.label) ? form.pct <= 0 : form.pct >= 0);
  return <figure aria-label={`${name} headline`}
    className="relative overflow-hidden rounded-[1.25rem] border border-line bg-ink-850 p-4 sm:p-5">
    <div aria-hidden className="pointer-events-none absolute -top-16 -right-10 h-40 w-40 rounded-full opacity-25 blur-2xl" style={{ background: OURS }} />
    <p className="relative text-sm font-medium text-fg-muted">{name}</p>
    <p className="relative mt-3 flex items-baseline gap-2 tabular-nums">
      <span className="text-4xl font-bold tracking-tight sm:text-5xl">{row.own}{pctSign}</span>
      <span className="text-base font-semibold text-fg-subtle sm:text-lg">vs {row.opponent}{pctSign}</span>
    </p>
    <div className="relative mt-5 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs">
      {form ? <>
        <span className="text-fg-subtle">vs last {form.matches} avg ({form.average}{pctSign})</span>
        <span className={`flex items-center gap-0.5 font-semibold ${good ? "text-ok" : "text-danger"}`}>
          {form.pct >= 0 ? <ArrowUpRight size={14} aria-hidden /> : <ArrowDownRight size={14} aria-hidden />}{form.pct > 0 ? "+" : ""}{form.pct}%</span>
      </> : <span className="text-fg-subtle">{theirs} {row.opponent}{pctSign}</span>}
    </div>
  </figure>;
}

/** Two bars growing out from the middle, as in reference 04. */
function VersusBar({ row, ours, theirs, compact = false }: { row: TeamRow; ours: string; theirs: string; compact?: boolean }) {
  const max = Math.max(1, row.own, row.opponent);
  const unit = row.label.endsWith("%") ? "%" : "";
  const name = row.label.replace(/ %$/, "");
  const lead = row.own === row.opponent ? null : row.own > row.opponent ? "ours" : "theirs";
  return <div aria-label={`${name}: ${ours} ${row.own}${unit}, ${theirs} ${row.opponent}${unit}`} role="img">
    {!compact && <p className="mb-2 text-center text-sm text-fg-muted">{name}</p>}
    <div className="flex items-center gap-3 tabular-nums">
      <span className={`w-12 shrink-0 font-bold ${compact ? "text-base" : "text-xl"} ${lead === "theirs" ? "text-fg-muted" : ""}`}>{row.own}{unit}</span>
      {compact && <span className="w-16 shrink-0 text-xs text-fg-subtle">{name}</span>}
      <VersusBars ours={row.own} theirs={row.opponent} max={max} />
      <span className={`w-12 shrink-0 text-right font-bold ${compact ? "text-base" : "text-xl"} ${lead === "ours" ? "text-fg-muted" : ""}`}>{row.opponent}{unit}</span>
    </div>
  </div>;
}

const W = 600, H = 220, PAD = 28;

function stepPath(steps: Step[], end: number, top: number): string {
  const x = (t: number) => PAD + (t / end) * (W - PAD * 2);
  const y = (n: number) => H - PAD - (n / top) * (H - PAD * 2);
  let d = `M ${x(0)} ${y(0)}`;
  for (const s of steps) d += ` H ${x(s.time_s)} V ${y(s.total)}`;
  return `${d} H ${x(end)}`;
}

function AttemptsChart({ events, halves, duration, ours, theirs, onSeek }: { events: StatEvent[]; halves?: number[][]; duration: number; ours: string; theirs: string; onSeek: (t: number) => void }) {
  const id = useSvgId("att");
  const series = attemptsOverTime(events);
  const end = Math.max(duration, ...events.map(e => e.time_s + 1), 1);
  const top = Math.max(1, series.ours.length, series.theirs.length);
  const ticks = Array.from(new Set([0, Math.ceil(top / 2), top]));
  const base = H - PAD;
  const lines: ["ours" | "theirs", string][] = [["theirs", THEIRS], ["ours", OURS]];
  return <div className="relative">
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Attempts over time: ${ours} ${series.ours.length}, ${theirs} ${series.theirs.length}`}>
      <defs>{lines.map(([side, colour]) => <linearGradient key={side} id={`${id}-${side}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={colour} stopOpacity="0.38" /><stop offset="1" stopColor={colour} stopOpacity="0" /></linearGradient>)}</defs>
      {ticks.map(n => { const y = H - PAD - (n / top) * (H - PAD * 2); return <g key={n}>
        <line x1={PAD} x2={W - PAD} y1={y} y2={y} stroke="rgb(255 255 255 / 0.06)" />
        <text x={PAD - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#64728f">{n}</text></g>; })}
      {(halves ?? []).slice(0, -1).map(h => { const x = PAD + (h[1] / end) * (W - PAD * 2); return <g key={h[1]}>
        <line x1={x} x2={x} y1={PAD - 8} y2={base} stroke="rgb(255 255 255 / 0.25)" strokeDasharray="3 4" />
        <text x={x} y={PAD - 12} textAnchor="middle" fontSize="10" fill="#64728f">HT</text></g>; })}
      {lines.map(([side, colour]) => series[side].length > 0 && <g key={side}>
        <path d={`${stepPath(series[side], end, top)} V ${base} H ${PAD} Z`} fill={`url(#${id}-${side})`} />
        <path d={stepPath(series[side], end, top)} fill="none" stroke={colour} strokeWidth="2.5" strokeLinejoin="round" />
      </g>)}
      <text x={PAD} y={H - 8} fontSize="11" fill="#64728f">0:00</text>
      <text x={W - PAD} y={H - 8} textAnchor="end" fontSize="11" fill="#64728f">{formatClock(end)}</text>
    </svg>
    {lines.flatMap(([side, colour]) => series[side].filter(s => s.goal).map(s => {
      const name = side === "ours" ? ours : theirs;
      return <button key={`${side}-${s.time_s}`} type="button" aria-label={`${name} goal at ${formatClock(s.time_s)}`} title={`${name} goal at ${formatClock(s.time_s)}`}
        onClick={() => onSeek(s.time_s)}
        className="absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white transition-transform hover:scale-150 focus-visible:scale-150"
        style={{ left: `${((PAD + (s.time_s / end) * (W - PAD * 2)) / W) * 100}%`, top: `${((H - PAD - (s.total / top) * (H - PAD * 2)) / H) * 100}%`, background: colour, boxShadow: `0 0 10px ${colour}` }} />;
    }))}
  </div>;
}

function SpellBars({ events, duration, ours, theirs, onSeek }: { events: StatEvent[]; duration: number; ours: string; theirs: string; onSeek: (t: number) => void }) {
  const list = spells(events, duration);
  const top = Math.max(1, ...list.flatMap(s => [s.ours.attempts, s.theirs.attempts]));
  return <div>
    <div role="group" aria-label="Attempts by 15-minute spell" className="flex h-48 items-end gap-2 border-b border-line pb-px">
      {list.map(s => {
        const label = `${formatClock(s.start)} to ${formatClock(s.start + SPELL_S)}: ${ours} ${s.ours.attempts}, ${theirs} ${s.theirs.attempts}`;
        return <button key={s.start} type="button" aria-label={label} title={label} onClick={() => onSeek(s.start)}
          className="group flex h-full min-w-0 flex-1 items-end justify-center gap-1 rounded-t-md hover:bg-white/[0.03]">
          {(["ours", "theirs"] as const).map(side => <span key={side} className="relative flex w-full max-w-7 flex-col items-center justify-end" style={{ height: "100%" }}>
            {s[side].attempts > 0 && <span className="mb-1 text-[11px] font-semibold tabular-nums text-fg-muted">{s[side].attempts}</span>}
            <span className="block w-full rounded-t-md transition-[height] duration-700 group-hover:brightness-110"
              style={{ height: `${(s[side].attempts / top) * 80}%`, minHeight: s[side].attempts ? 4 : 0,
                background: side === "ours" ? OURS_COLUMN : THEIRS_COLUMN }} />
            {s[side].goals > 0 && <span aria-hidden className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-white" />}
          </span>)}
        </button>;
      })}
    </div>
    <div className="mt-2 flex gap-2 text-center text-[11px] text-fg-subtle">{list.map(s => <span key={s.start} className="min-w-0 flex-1 truncate">{Math.round(s.start / 60)}'</span>)}</div>
    <p className="mt-3 text-[11px] text-fg-subtle">White dot: the spell had a goal. Click a spell to watch from its start.</p>
  </div>;
}
