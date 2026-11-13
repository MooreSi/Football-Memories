import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useVeoLibrary, veoExpiry } from "../api/veo";
import { formatClock } from "../lib/format";

const HALF = ["1st half", "2nd half", "Extra time 1", "Extra time 2"];

/** Spec 260 task 1: one cached Veo match. Playback and download come with tasks 2 and 3. */
export function VeoMatchPage() {
  const id = useParams().id!;
  const library = useVeoLibrary();
  const match = library.data?.find(m => m.id === id);
  const back = <Link to="/" className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg"><ArrowLeft size={14} aria-hidden /> All matches</Link>;
  if (library.isPending) return <div className="p-6 text-sm text-fg-muted">Loading the Veo match…</div>;
  if (library.isError) return <div className="space-y-3 p-6">{back}<p role="alert" className="text-sm text-danger">Veo matches unavailable. Start the desktop helper.</p></div>;
  if (!match) return <div className="space-y-3 p-6">{back}<p className="text-sm text-fg-muted">This match is not in the Veo cache. Select Refresh matches in Settings → Connections → Veo.</p></div>;
  const highlights = [...(match.moments ?? [])].sort((a, b) => a.time_s - b.time_s);
  const types = [...highlights.reduce((all, h) => all.set(h.category, (all.get(h.category) ?? 0) + 1), new Map<string, number>())]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const expiry = veoExpiry(match);
  return <div className="mx-auto grid max-w-6xl gap-5 p-4 md:grid-cols-[250px_1fr] md:p-6">
    <aside className="space-y-4">
      {back}
      <div className="tile space-y-2 p-4">
        <h1 className="text-base font-semibold leading-snug">{match.title}</h1>
        <p className="text-xs text-fg-subtle">{[match.team, match.season_label].filter(Boolean).join(" · ")}</p>
        {match.score && <p className="text-3xl font-semibold">{match.score.ours}–{match.score.theirs}</p>}
        <p className="text-xs text-fg-muted">{[match.home_or_away === "home" ? "Home" : match.home_or_away === "away" ? "Away" : null,
          match.duration_s ? `${Math.round(match.duration_s / 60)} min recorded` : null].filter(Boolean).join(" · ")}</p>
        {expiry && <p className="text-xs text-warn">{expiry}</p>}
      </div>
      {types.length > 0 && <ul aria-label="Highlight types" className="tile divide-y divide-line">
        {types.map(([type, n]) => <li key={type} className="flex justify-between px-4 py-2 text-xs font-semibold uppercase tracking-wide"><span>{type}</span><span className="text-fg-subtle">{n}</span></li>)}
      </ul>}
    </aside>
    <section className="space-y-4">
      {!match.available && <p className="tile p-4 text-sm text-fg-muted">Veo no longer has the video for this match, so only its details are kept.</p>}
      {match.available && <p className="tile p-4 text-sm text-fg-muted">Watching and downloading Veo matches are being built. These are Veo's highlights for this match.</p>}
      {(match.halves?.length ?? 0) > 0 && <p className="text-xs text-fg-subtle">
        {match.halves!.map((h, i) => `${HALF[i] ?? `Period ${i + 1}`} ${formatClock(h[0])}–${formatClock(h[1])}`).join(" · ")}</p>}
      {highlights.length > 0 && <ul aria-label="Veo highlights" className="tile divide-y divide-line">
        {highlights.map(h => <li key={h.id} className="flex flex-wrap items-baseline gap-3 px-4 py-2.5 text-sm">
          <span className="w-14 font-mono text-xs text-pin">{formatClock(h.time_s)}</span>
          <span className="font-semibold uppercase">{h.category}</span>
          {h.ai && <span className="inline-flex items-center gap-1 text-[11px] text-fg-subtle"><Sparkles size={11} aria-hidden />Veo AI</span>}
          {h.note && <span className="text-xs text-fg-muted">{h.note}</span>}
        </li>)}
      </ul>}
    </section>
  </div>;
}
