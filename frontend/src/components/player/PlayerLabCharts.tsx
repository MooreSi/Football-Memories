import { Link } from "react-router-dom";
import { aggregateCells, clipHref, compareWindows, SOURCE_LABELS, type LabRow } from "../../lib/playerLab";
export const labNumber=(n:number|null,percent=false)=>n===null?"—":`${Number(n.toFixed(1)).toLocaleString("en-GB")}${percent?"%":""}`;
export function LabChart({rows,metric,name,percent}:{rows:LabRow[];metric:string;name:string;percent:boolean}){
 const shown=rows.filter(r=>r.date).slice(0,15).reverse(),max=percent?100:Math.max(1,...shown.map(r=>r.stats[metric].value??0));
 const comparison=compareWindows(rows,metric);
 return <section className="panel min-w-0 space-y-5 p-5" aria-label="Performance over time">
  <div className="flex flex-wrap justify-between gap-2"><h2 className="text-lg font-semibold">Performance over time</h2><span className="text-xs text-fg-subtle">Oldest → newest · last 15 dated appearances</span></div>
  <ol className="flex h-60 min-w-0 items-end gap-1.5" aria-label="Recorded match values">{shown.map(r=>{const c=r.stats[metric];return <li className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2" key={r.match.id}>
   <span className="text-xs font-semibold tabular-nums">{labNumber(c.value,percent)}</span>
   <div className="flex w-full min-h-0 flex-1 items-end justify-center"><Link to={clipHref(r,name)} title={`${r.match.title}: ${labNumber(c.value,percent)} · ${SOURCE_LABELS[c.source]}`} aria-label={`Review ${r.match.title}: ${labNumber(c.value,percent)}`}
    className={`w-full max-w-10 rounded-t-lg border border-accent/30 ${c.source==="overlap"||c.source==="estimated"||c.source==="likely"?"bg-accent/20":"bg-linear-to-t from-[#2563eb] to-accent"}`}
    style={{height:c.value===null?"2px":`${Math.max(3,c.value/max*100)}%`}}/></div>
   <span className="w-full truncate text-center text-[10px] text-fg-muted" title={r.match.title}>{r.date.slice(5).split("-").reverse().join("/")}</span>
  </li>;})}</ol>
  {!shown.length&&<p className="text-sm text-fg-muted">Dated appearances will appear here.</p>}
  <p className="text-xs text-fg-subtle">Faint bars include involvement or estimates. A dash means unrecorded; zero means a recorded zero. Select a bar to review the match.</p>
  <div className="tile grid gap-4 p-4 sm:grid-cols-3" aria-label="Last five comparison">
   <div><p className="text-xs text-fg-muted">Latest five</p><p className="mt-1 text-2xl font-semibold text-accent">{labNumber(comparison?.recent??null,percent)}</p></div>
   <div><p className="text-xs text-fg-muted">Previous five</p><p className="mt-1 text-2xl font-semibold">{labNumber(comparison?.previous??null,percent)}</p></div>
   <div><p className="text-xs text-fg-muted">Recorded change {percent?"(percentage points)":"(%)"}</p><p className="mt-1 text-2xl font-semibold">{comparison?.change===null||!comparison?"—":`${comparison.change>0?"+":""}${labNumber(comparison.change)}`}</p></div>
   <p className="text-xs text-fg-subtle sm:col-span-3">{comparison?`${percent?"Weighted by recorded attempts":"Average per match"} · ${SOURCE_LABELS[comparison.source]}. A change in recorded actions is not a skill rating.`:"Needs ten consecutive dated appearances with the same individual-action, saved-assignment or manual source. Missing values, involvement and recorded position changes are excluded from comparisons."}</p>
  </div>
 </section>;
}
export function LabCoverage({rows,metric,percent}:{rows:LabRow[];metric:string;percent:boolean}){
 const known=rows.filter(r=>r.stats[metric].value!==null),sources=[...new Set(known.map(r=>r.stats[metric].source))];
 const total=aggregateCells(known.map(r=>r.stats[metric]),percent),coverage=rows.length?known.length/rows.length*100:0;
 return <section className="panel grid min-w-0 gap-5 p-5 sm:grid-cols-[9rem_1fr]" aria-label="Metric coverage">
  <div className="relative mx-auto grid size-32 place-items-center"><svg viewBox="0 0 120 120" className="absolute inset-0 size-full -rotate-90" aria-hidden><circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="8" className="text-white/10"/><circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="8" pathLength="100" strokeDasharray={`${coverage} 100`} className="text-accent"/></svg><div className="text-center"><strong className="block text-2xl">{Math.round(coverage)}%</strong><span className="text-[10px] text-fg-muted">COVERAGE</span></div></div>
  <div className="space-y-2"><h2 className="text-lg font-semibold">Know what you’re looking at</h2><p className="text-sm">{known.length} of {rows.length} appearances have this metric.</p><p className="text-2xl font-semibold text-accent">{labNumber(total,percent)} <span className="text-xs font-normal text-fg-muted">{percent?"weighted percentage":"recorded total"}</span></p>{!percent&&<p className="text-sm text-fg-muted">{labNumber(total===null?null:total/known.length)} per recorded match · {known.length} matches in this average</p>}<p className="text-xs text-fg-muted">{sources.map(s=>SOURCE_LABELS[s]).join(" · ")||"Not recorded"}</p><p className="text-xs text-fg-subtle">Totals describe available records. Coaching styles and tagging coverage can change between matches.</p></div>
 </section>;
}
