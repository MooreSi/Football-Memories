import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, Download, Play, Sparkles } from "lucide-react";
import { useVeoLibrary, useVeoStatus, veoExpiry, veoRequest } from "../api/veo";
import { Button } from "../components/ui/Button";
import { formatClock } from "../lib/format";
import { fixtureLabel } from "../lib/hudlFixture";
import { useVeoTeam } from "../lib/useHomeTeams";

const HALF = ["1st half", "2nd half", "Extra time 1", "Extra time 2"];

/** Spec 260: one cached Veo match at /veo/:id (also used directly by tests). */
export function VeoMatchPage() {
  return <VeoMatchView id={useParams().id!} />;
}

/** Owner request 2026-11-13: /veo/:id links open the match in the Clip explorer. */
export function VeoOpenInClips() {
  return <Navigate replace to={`/clips?match=${encodeURIComponent(useParams().id!)}`} />;
}

/** One cached Veo match; Watch and Download run in the desktop helper. */
export function VeoMatchView({ id, embedded = false }: { id: string; embedded?: boolean }) {
  const library = useVeoLibrary();
  const status = useVeoStatus();
  const qc = useQueryClient();
  const video = useRef<HTMLVideoElement>(null);
  const team = useVeoTeam();
  const action = useMutation({
    mutationFn: ({ name, label }: { name: "watch" | "download"; label?: string }) =>
      veoRequest("/action", { action: name, match_id: id, ...(label ? { name: label } : {}) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["veo-account"] }),
  });
  const match = library.data?.find(m => m.id === id);
  const back = embedded ? null : <Link to="/" className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg"><ArrowLeft size={14} aria-hidden /> All matches</Link>;
  if (library.isPending) return <div className="p-6 text-sm text-fg-muted">Loading the Veo match…</div>;
  if (library.isError) return <div className="space-y-3 p-6">{back}<p role="alert" className="text-sm text-danger">Veo matches unavailable. Start the desktop helper.</p></div>;
  if (!match) return <div className="space-y-3 p-6">{back}<p className="text-sm text-fg-muted">This match is not in the Veo cache. Select Refresh matches in Settings → Connections → Veo.</p></div>;
  const highlights = [...(match.moments ?? [])].sort((a, b) => a.time_s - b.time_s);
  const types = [...highlights.reduce((all, h) => all.set(h.category, (all.get(h.category) ?? 0) + 1), new Map<string, number>())]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const expiry = veoExpiry(match);
  const age = match.age_group && match.age_group !== "Unclassified" ? match.age_group : "";
  const label = team ? fixtureLabel(match.title, team, age) : undefined;
  const own = status.data?.match_id === id;
  const busy = Boolean(status.data?.busy) || action.isPending;
  const stream = own && !status.data?.busy ? status.data?.stream_url : null;
  const seek = (seconds: number) => { if (video.current) { video.current.currentTime = seconds; void video.current.play?.()?.catch?.(() => undefined); } };
  return <div className={embedded ? "grid gap-5 md:grid-cols-[250px_1fr]" : "mx-auto grid max-w-6xl gap-5 p-4 md:grid-cols-[250px_1fr] md:p-6"}>
    <aside className="space-y-4">
      {back}
      <div className="tile space-y-2 p-4">
        <h1 className="text-base font-semibold leading-snug">{label ?? match.title}</h1>
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
      {match.available && <div className="flex flex-wrap items-center gap-2">
        <Button disabled={busy} onClick={() => action.mutate({ name: "watch" })}><Play size={14} aria-hidden /> Watch match</Button>
        <Button variant="ghost" disabled={busy} onClick={() => action.mutate({ name: "download", label })}><Download size={14} aria-hidden /> Download full match</Button>
      </div>}
      {own && status.data?.busy && <p role="status" className="text-xs text-accent">{status.data.message}</p>}
      {own && !status.data?.busy && status.data?.state === "done" && <p role="status" className="text-xs text-ok">{status.data.message} It is listed under Downloaded.</p>}
      {(action.isError || (own && status.data?.state === "error")) && <p role="alert" className="text-sm text-danger">{action.error?.message || status.data?.message}</p>}
      {stream && <video ref={video} aria-label="Veo match video" className="aspect-video w-full rounded-xl bg-black" controls playsInline crossOrigin="anonymous" src={stream} />}
      {(match.halves?.length ?? 0) > 0 && <p className="text-xs text-fg-subtle">
        {match.halves!.map((h, i) => `${HALF[i] ?? `Period ${i + 1}`} ${formatClock(h[0])}–${formatClock(h[1])}`).join(" · ")}</p>}
      {highlights.length > 0 && <ul aria-label="Veo highlights" className="tile divide-y divide-line">
        {highlights.map(h => {
          const row = <>
            <span className="w-14 font-mono text-xs text-pin">{formatClock(h.time_s)}</span>
            <span className="font-semibold uppercase">{h.category}</span>
            {h.ai && <span className="inline-flex items-center gap-1 text-[11px] text-fg-subtle"><Sparkles size={11} aria-hidden />Veo AI</span>}
            {h.note && <span className="text-xs text-fg-muted">{h.note}</span>}
          </>;
          return <li key={h.id} className="text-sm">{stream
            ? <button type="button" aria-label={`${formatClock(h.time_s)} ${h.category}`} onClick={() => seek(h.time_s)}
                className="flex w-full flex-wrap items-baseline gap-3 px-4 py-2.5 text-left hover:bg-white/5">{row}</button>
            : <div className="flex flex-wrap items-baseline gap-3 px-4 py-2.5">{row}</div>}</li>;
        })}
      </ul>}
    </section>
  </div>;
}
