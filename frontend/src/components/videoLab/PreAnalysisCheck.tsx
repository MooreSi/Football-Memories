import { readiness, type ReadinessInput, type Status } from "./preAnalysis";
import type { GroupLabel, TrackLabel } from "./labTypes";

const BADGE: Record<Status, [string, string]> = { ready: ["Ready", "text-emerald-400"], partial: ["Partly", "text-amber-300"], missing: ["Missing", "text-warn"] };

/** What the pre-analysis gave this run: enough to show the pitch and tell people apart, or what is still needed. */
export function PreAnalysisCheck({ summary, atlas, groups, trackLabels, groupLabels }: Omit<ReadinessInput, "labels"> & { trackLabels: TrackLabel[]; groupLabels: GroupLabel[] }) {
  const labels = [...trackLabels, ...groupLabels];
  const checks = readiness({ summary, atlas, groups, labels: { own: labels.some(l => l.team === "own"), opponent: labels.some(l => l.team === "opponent"), referee: labels.some(l => l.role === "referee") } });
  const ready = checks.filter(c => c.status === "ready").length;
  return <section className="panel space-y-2 p-4" aria-label="Pre-analysis check">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">Pre-analysis check</h2><span className="text-sm text-fg-muted">{ready} of {checks.length} ready</span></div>
    <ul className="space-y-1.5">{checks.map(c => <li key={c.key} className="grid grid-cols-[minmax(0,11rem)_4.5rem_minmax(0,1fr)] gap-2 text-sm max-sm:grid-cols-[minmax(0,1fr)_4.5rem]">
      <span className="font-medium">{c.label}</span><span className={BADGE[c.status][1]}>{BADGE[c.status][0]}</span><span className="text-fg-muted max-sm:col-span-2">{c.detail}</span></li>)}</ul>
  </section>;
}
