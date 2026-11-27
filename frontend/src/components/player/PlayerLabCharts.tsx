import { Activity, LineChart, Scale } from "lucide-react";
import { Link } from "react-router-dom";
import { fixtureParts } from "../../lib/hudlFixture";
import { aggregateCells, clipHref, compareWindows, LAB_METRICS, SOURCE_LABELS, teammateComparison, type LabRow } from "../../lib/playerLab";
import { recentSummary, sharedComparison } from "../../lib/playerLabTrends";
import { OURS, THEIRS } from "../../lib/teamColours";
import { Card, Figure, GradientBar, OURS_FILL, Ring, THEIRS_FILL, useSvgId } from "../match/statsUi";

/** Owner request 2026-11-27: Player Lab in the Match stats look (gradients, headline
 *  tiles, rings and versus bars), with the trend, recent five and teammate panels fixed. */
export const labNumber = (n: number | null, percent = false) => n === null ? "—" : `${Number(n.toFixed(1)).toLocaleString("en-GB")}${percent ? "%" : ""}`;
export const LAB_CARD = "min-w-0 rounded-[1.25rem] border border-line bg-gradient-to-b from-ink-800/80 to-ink-900/60 p-5 shadow-[inset_0_1px_0_rgb(255_255_255/0.04)]";
export const LAB_TILE = "rounded-2xl border border-line bg-white/[0.02] p-4";
const SOFT = new Set(["overlap", "estimated", "likely"]);
const dayMonth = (date: string) => date ? new Date(`${date}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "Undated";

/** Last 15 dated appearances as a gradient area line, oldest to newest. The plot is a
 *  0-100 box stretched to a fixed height; labels and points are HTML so they keep their size. */
export function LabChart({ rows, metric, name, percent }: { rows: LabRow[]; metric: string; name: string; percent: boolean }) {
  const id = useSvgId("lab-trend");
  const shown = rows.filter(r => r.date).slice(0, 15).reverse();
  const values = shown.map(r => r.stats[metric].value);
  const top = percent ? 100 : Math.max(1, ...values.map(v => v ?? 0));
  const x = (i: number) => shown.length < 2 ? 50 : 3 + (i / (shown.length - 1)) * 94;
  const y = (v: number) => 92 - (v / top) * 82;
  const points = shown.map((r, i) => ({ r, i, v: r.stats[metric].value })).filter((p): p is { r: LabRow; i: number; v: number } => p.v !== null);
  const line = points.map((p, k) => `${k ? "L" : "M"} ${x(p.i)} ${y(p.v)}`).join(" ");
  const summary = recentSummary(rows, metric, percent);
  const windows = compareWindows(rows, metric);
  const ticks = [...new Set([0, Math.round(top / 2), top])];
  return <section aria-label="Performance over time" className={`${LAB_CARD} space-y-5`}>
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div><h2 className="flex items-center gap-2 text-lg font-semibold"><LineChart size={18} className="text-accent" aria-hidden /> Performance over time</h2>
        <p className="mt-0.5 text-[11px] tracking-[0.18em] text-fg-subtle uppercase">Oldest → newest · last {shown.length || 15} dated appearances</p></div>
      <p className="flex items-center gap-4 text-xs text-fg-muted">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: OURS }} />Direct record</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border-2" style={{ borderColor: OURS }} />Involvement or estimate</span>
      </p>
    </div>
    {shown.length ? <div className="relative h-64 pb-6 pl-9">
      <div className="relative h-full">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" role="img" aria-label={`${LAB_METRICS.find(m => m.key === metric)?.label ?? metric} over ${shown.length} appearances`}>
          <defs>
            <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={OURS} stopOpacity="0.42" /><stop offset="1" stopColor={OURS} stopOpacity="0" /></linearGradient>
            <linearGradient id={`${id}-line`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#7c5cff" /><stop offset="1" stopColor="#22d3ee" /></linearGradient>
          </defs>
          {ticks.map(n => <line key={n} x1={0} x2={100} y1={y(n)} y2={y(n)} stroke="rgb(255 255 255 / 0.07)" vectorEffect="non-scaling-stroke" />)}
          {summary && <line x1={0} x2={100} y1={y(summary.average)} y2={y(summary.average)} stroke="rgb(255 255 255 / 0.35)" strokeDasharray="4 5" vectorEffect="non-scaling-stroke" />}
          {points.length > 1 && <path d={`${line} L ${x(points[points.length - 1].i)} 92 L ${x(points[0].i)} 92 Z`} fill={`url(#${id}-fill)`} />}
          {points.length > 1 && <path d={line} fill="none" stroke={`url(#${id}-line)`} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
        </svg>
        {ticks.map(n => <span key={n} aria-hidden className="absolute -left-9 w-7 -translate-y-1/2 text-right text-[11px] text-fg-subtle tabular-nums" style={{ top: `${y(n)}%` }}>{n}{percent ? "%" : ""}</span>)}
        {summary && <span aria-hidden className="absolute left-1 -translate-y-full rounded bg-ink-900/70 px-1 pb-0.5 text-[10px] text-fg-muted" style={{ top: `${y(summary.average)}%` }}>avg {labNumber(summary.average, percent)}</span>}
        {shown.map((r, i) => <span key={r.match.id} aria-hidden className="absolute -bottom-6 -translate-x-1/2 text-[10px] whitespace-nowrap text-fg-subtle" style={{ left: `${x(i)}%` }}>{dayMonth(r.date)}</span>)}
        {shown.map((r, i) => {
          const c = r.stats[metric];
          const opponent = fixtureParts(r.match.title, null)?.opponent ?? r.match.title;
          return <Link key={r.match.id} to={clipHref(r, name)} aria-label={`Review ${r.match.title}: ${labNumber(c.value, percent)}`}
            title={`${dayMonth(r.date)} v ${opponent}: ${labNumber(c.value, percent)} · ${SOURCE_LABELS[c.source]}`}
            style={{ left: `${x(i)}%`, top: `${c.value === null ? 92 : y(c.value)}%` }}
            className="group absolute -translate-x-1/2 -translate-y-1/2 p-1.5">
            {c.value === null ? <span className="block h-1 w-3 rounded-full bg-fg-subtle/60" />
              : <span className={`block h-3.5 w-3.5 rounded-full border-2 transition-transform group-hover:scale-150 group-focus-visible:scale-150 ${SOFT.has(c.source) ? "bg-ink-900" : ""}`}
                style={{ borderColor: OURS, background: SOFT.has(c.source) ? undefined : OURS, boxShadow: `0 0 10px ${OURS}` }} />}
            {c.value !== null && <span className="absolute bottom-full left-1/2 -translate-x-1/2 text-[11px] font-semibold tabular-nums text-fg">{labNumber(c.value, percent)}</span>}
          </Link>;
        })}
      </div>
    </div> : <p className="text-sm text-fg-muted">Dated appearances will appear here.</p>}
    <p className="text-xs text-fg-subtle">Hollow points include involvement or estimates; a dash on the baseline means unrecorded, zero means a recorded zero. Select a point to review the match.</p>
    <div aria-label="Last five comparison" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <Figure name="Latest match" value={labNumber(summary?.latest ?? null, percent)} note={summary ? `${summary.matches} recorded matches in this selection` : "Not recorded"} />
      <Figure name="Selection average" value={labNumber(summary?.average ?? null, percent)} note={percent ? "Weighted by recorded attempts" : "Per recorded match"} />
      <Figure name="Best" value={labNumber(summary?.best ?? null, percent)} note="Highest single match" glow="#7c5cff" />
      <Figure name="Last five vs previous five" value={windows?.change === null || !windows ? "—" : `${windows.change > 0 ? "+" : ""}${labNumber(windows.change)}`} unit={windows && windows.change !== null ? (percent ? " pts" : "%") : ""}
        glow={windows && (windows.change ?? 0) < 0 ? THEIRS : OURS}
        note={windows ? `${labNumber(windows.recent, percent)} vs ${labNumber(windows.previous, percent)} · ${SOURCE_LABELS[windows.source]}` : "Needs 10 dated matches, one source"} />
    </div>
  </section>;
}

export function LabCoverage({ rows, metric, percent }: { rows: LabRow[]; metric: string; percent: boolean }) {
  const known = rows.filter(r => r.stats[metric].value !== null), sources = [...new Set(known.map(r => r.stats[metric].source))];
  const total = aggregateCells(known.map(r => r.stats[metric]), percent), coverage = rows.length ? Math.round(known.length / rows.length * 100) : 0;
  return <section aria-label="Metric coverage" className={`${LAB_CARD} grid gap-6 sm:grid-cols-[11rem_1fr] sm:items-center`}>
    <Ring label="Coverage" value={coverage} colour="ours" size="h-36 w-36" note={`${known.length} of ${rows.length} appearances`} />
    <div className="space-y-2"><h2 className="text-lg font-semibold">Know what you’re looking at</h2>
      <p className="text-sm">{known.length} of {rows.length} appearances have this metric.</p>
      <p className="bg-gradient-to-r from-[#a5f3fc] to-[#7c5cff] bg-clip-text text-3xl font-bold text-transparent">{labNumber(total, percent)} <span className="text-xs font-normal text-fg-muted">{percent ? "weighted percentage" : "recorded total"}</span></p>
      {!percent && <p className="text-sm text-fg-muted">{labNumber(total === null ? null : total / known.length)} per recorded match · {known.length} matches in this average</p>}
      <p className="text-xs text-fg-muted">{sources.map(s => SOURCE_LABELS[s]).join(" · ") || "Not recorded"}</p>
      <p className="text-xs text-fg-subtle">Totals describe available records. Coaching styles and tagging coverage can change between matches.</p></div>
  </section>;
}

function result(score: LabRow["score"]) {
  if (!score) return { text: "Score —", style: "bg-white/5 text-fg-muted" };
  const r = score.ours > score.theirs ? "W" : score.ours < score.theirs ? "L" : "D";
  return { text: `${r} ${score.ours}–${score.theirs}`, style: r === "W" ? "bg-gradient-to-r from-emerald-500/30 to-emerald-400/10 text-ok" : r === "L" ? "bg-gradient-to-r from-rose-500/30 to-rose-400/10 text-danger" : "bg-white/10 text-fg" };
}

/** Up to five newest appearances in the selection; the grid fills the width whatever the count. */
export function LabRecent({ rows, metric, name, club, keeper, scope }: { rows: LabRow[]; metric: string; name: string; club: string | null; keeper: boolean; scope: string }) {
  const info = LAB_METRICS.find(m => m.key === metric)!;
  const five = rows.slice(0, 5);
  const top = Math.max(1, ...five.map(r => r.stats[metric].value ?? 0));
  const extra = (keeper ? ["saves", "conceded"] : ["goals", "assists"]).filter(k => k !== metric);
  return <section aria-label="Recent five matches" className={`${LAB_CARD} space-y-4`}>
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><h2 className="flex items-center gap-2 text-lg font-semibold"><Activity size={18} className="text-accent" aria-hidden />Recent five matches</h2>
        <p className="mt-0.5 text-[11px] tracking-[0.18em] text-fg-subtle uppercase">{info.label} · newest first</p></div>
      <span className="text-xs text-fg-subtle">{name} · {scope}{rows.length < 5 ? ` · only ${rows.length} in this selection` : ""}</span>
    </div>
    <div className="grid grid-cols-[repeat(auto-fit,minmax(11rem,1fr))] gap-3">{five.map(r => {
      const c = r.stats[metric], res = result(r.score);
      return <Link key={r.match.id} to={clipHref(r, name)} className="group relative min-w-0 space-y-3 overflow-hidden rounded-2xl border border-line bg-ink-850 p-4 transition hover:border-accent/50">
        <div aria-hidden className="pointer-events-none absolute -top-14 -right-10 h-32 w-32 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-40" style={{ background: OURS }} />
        <div className="relative flex items-center justify-between gap-2 text-xs"><span className="text-fg-muted">{dayMonth(r.date)}</span>
          <span className={`rounded-full px-2 py-1 font-semibold ${res.style}`}>{res.text}</span></div>
        <p className="relative truncate text-sm font-semibold" title={r.match.title}>vs {fixtureParts(r.match.title, club)?.opponent || r.match.title}</p>
        <div className="relative flex items-baseline gap-2"><span className="text-3xl font-bold tabular-nums">{labNumber(c.value, info.percent)}</span><span className="text-xs text-fg-muted">{info.label}</span></div>
        <div className="relative flex"><GradientBar value={c.value ?? 0} max={info.percent ? 100 : top} glow={c.value === top} /></div>
        <p className="relative text-xs text-fg-muted">{extra.map(k => `${LAB_METRICS.find(m => m.key === k)!.label} ${labNumber(r.stats[k].value)}`).join(" · ")}</p>
        <p className="relative text-[10px] text-fg-subtle">{SOURCE_LABELS[c.source]} · {r.minutes !== null ? `${r.minutes} min confirmed` : r.estimatedMinutes !== null ? `≈${r.estimatedMinutes} min estimate` : "minutes unrecorded"}</p>
      </Link>;
    })}</div>
    <p className="text-[11px] text-fg-subtle">Scores describe the team result. Appearance means tagged or assigned; a tag-based minutes estimate does not establish substitutions or full playing time.</p>
  </section>;
}

type Compared = { key: string; label: string; ours: number; theirs: number; percent: boolean; basis: "minutes" | "match"; matches: number };

/** The comparisons a teammate supports: per 30 confirmed minutes where the lab has them,
 *  otherwise per shared match from the same kind of record. Never team-tag overlap. */
export function labComparisons(own: LabRow[], other: LabRow[], metric: string): Compared[] {
  const keys = [metric, ...LAB_METRICS.map(m => m.key).filter(k => k !== metric)];
  return keys.flatMap((key): Compared[] => {
    const info = LAB_METRICS.find(m => m.key === key)!;
    const strict = teammateComparison(own, other, key);
    if (strict) return [{ key, label: info.label, ours: strict.ours, theirs: strict.theirs, percent: info.percent, basis: "minutes" as const, matches: strict.matches }];
    const loose = sharedComparison(own, other, key);
    return loose ? [{ key, label: info.label, ours: loose.ours, theirs: loose.theirs, percent: info.percent, basis: "match" as const, matches: loose.matches }] : [];
  }).slice(0, 8);
}

export function LabCompare({ name, other, teammates, list, onPick }: { name: string; other: string; teammates: { name: string; shared: number }[]; list: Compared[]; onPick: (name: string) => void }) {
  return <section aria-label="Teammate comparison" className={`${LAB_CARD} space-y-4`}>
    <div><h2 className="flex items-center gap-2 text-lg font-semibold"><Scale size={18} className="text-accent" aria-hidden />Compare on fair terms</h2>
      <p className="mt-0.5 text-[11px] tracking-[0.18em] text-fg-subtle uppercase">Same fixtures, same kind of record</p></div>
    <label className="block text-xs text-fg-muted">Teammate<select className="field mt-1 w-full" value={other} onChange={e => onPick(e.target.value)}>
      <option value="">Choose a teammate</option>{teammates.map(t => <option key={t.name} value={t.name}>{t.name} · {t.shared} shared</option>)}</select></label>
    {other && <p className="flex items-center gap-4 text-xs text-fg-muted">
      <span className="flex min-w-0 items-center gap-1.5"><span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: OURS_FILL }} /><span className="truncate">{name}</span></span>
      <span className="flex min-w-0 items-center gap-1.5"><span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: THEIRS_FILL }} /><span className="truncate">{other}</span></span></p>}
    {other && list.length > 0 && <Card title="Head to head" sub={list.every(c => c.basis === "minutes") ? "Per 30 confirmed minutes" : "Per shared match unless marked"}>
      <div className="space-y-4">{list.map(c => {
        const max = Math.max(c.percent ? 100 : 0, c.ours, c.theirs, 0.0001);
        const unit = c.basis === "minutes" ? "per 30 confirmed minutes" : "per shared match";
        return <div key={c.key} role="img" aria-label={`${c.label}: ${name} ${labNumber(c.ours, c.percent)}, ${other} ${labNumber(c.theirs, c.percent)} ${unit}`}>
          <p className="mb-1.5 text-center text-sm text-fg-muted">{c.label} <span className="text-[10px] text-fg-subtle">· {c.matches} matches{c.basis === "minutes" ? " · per 30 min" : ""}</span></p>
          <div className="flex items-center gap-3 tabular-nums">
            <span className="w-12 shrink-0 text-lg font-bold">{labNumber(c.ours, c.percent)}</span>
            <div aria-hidden className="flex flex-1 items-center gap-1">
              <div className="flex h-2 flex-1 justify-end overflow-hidden rounded-full bg-white/[0.06]"><span className="block h-full rounded-full" style={{ width: `${(c.ours / max) * 100}%`, background: OURS_FILL }} /></div>
              <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-white/[0.06]"><span className="block h-full rounded-full" style={{ width: `${(c.theirs / max) * 100}%`, background: THEIRS_FILL }} /></div>
            </div>
            <span className="w-12 shrink-0 text-right text-lg font-bold">{labNumber(c.theirs, c.percent)}</span>
          </div>
        </div>;
      })}</div>
    </Card>}
    <p className="text-xs leading-relaxed text-fg-muted">{!other ? "Choose a teammate who played in the same fixtures. The list shows how many matches you share in this selection."
      : list.length ? "Only fixtures both players appear in, with the value recorded the same way for both (individual action, saved or estimated assignment, or a lab record). Where both have confirmed lab minutes and the same position, the figure is per 30 minutes."
      : "No stat has three shared fixtures recorded the same way for both players in this selection. Team-tag involvement is excluded. Add each player’s match records below, or pick a wider season or squad."}</p>
    <p className="text-xs text-fg-subtle">Tagging coverage and responsibilities can still differ. This compares recorded activity, not ability or a squad ranking.</p>
  </section>;
}
