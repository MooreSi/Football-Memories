/** A measured stage percentage, or indeterminate activity when no total is known. */
export function AnalysisProgress({label,fraction,detail}:{label:string;fraction?:number|null;detail?:string}) {
  const percent=typeof fraction==='number' && Number.isFinite(fraction) ? Math.round(Math.max(0,Math.min(1,fraction))*100) : null;
  return <div className="space-y-2" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent ?? undefined} aria-valuetext={percent===null ? detail || label : `${percent}%`}>
    <div className="flex items-center justify-between gap-3 text-sm"><span className="font-medium text-fg">{label}</span><span className="text-accent tabular-nums">{percent===null ? "In progress" : `${percent}%`}</span></div>
    <div className="h-2.5 overflow-hidden rounded-full bg-white/5 ring-1 ring-white/10">
      <div className={`h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500 shadow-[0_0_14px_rgba(59,130,246,0.4)] motion-safe:transition-[width] motion-safe:duration-700 ${percent===null ? "motion-safe:animate-pulse" : ""}`} style={{width:percent===null?"100%":`${percent}%`}} />
    </div>
    {detail && <p className="text-xs leading-relaxed text-fg-muted" role="status">{detail}</p>}
  </div>;
}
