import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Activity, Clapperboard, Download, Play, SkipBack, SkipForward, Sparkles } from "lucide-react";
import { type VeoHighlight, type VeoMatch, useVeoLibrary, useVeoStatus, veoExpiry, veoRequest } from "../api/veo";
import { Button } from "../components/ui/Button";
import { MatchDrawing } from "../components/match/MatchDrawing";
import { formatClock } from "../lib/format";
import { fixtureLabel } from "../lib/hudlFixture";
import { nextMoment } from "../lib/taggedPlayback";
import { useVeoTeam } from "../lib/useHomeTeams";
import { SPELL, veoInsights } from "../lib/veoInsights";
import { useNotes, useSaveNote } from "../lib/viewerState";

const HALF = ["1st half", "2nd half", "Extra time 1", "Extra time 2"];

export function VeoMatchFullPage() {
  const id = useParams().id!;
  return <VeoMatchFull key={id} id={id} />;
}

/** Plain MP4 from the helper's /veo/stream (Range), with seek and play-position. */
function VeoPlayer({ url, seek, onTime, poster }: { url: string; seek?: { time: number; nonce: number }; onTime: (t: number) => void; poster?: string | null }) {
  const video = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const el = video.current;
    if (!el || !seek) return;
    const go = () => { el.currentTime = seek.time; void Promise.resolve(el.play?.()).catch(() => undefined); };
    if (el.readyState) go(); else el.addEventListener("loadedmetadata", go, { once: true });
  }, [seek?.nonce]);
  return <div className="space-y-2">
    <video ref={video} aria-label="Veo match video" className="aspect-video w-full rounded-xl bg-black" controls playsInline preload="metadata"
      crossOrigin="anonymous" src={url} poster={poster ?? undefined} onTimeUpdate={e => onTime(e.currentTarget.currentTime)}
      onError={() => setFailed(true)} onLoadedMetadata={() => setFailed(false)} />
    {failed && <p role="alert" className="text-sm text-danger">The video stopped loading. Select Watch match to start it again.</p>}
  </div>;
}

/** Owner request 2026-11-13: what Veo's highlights allow (types and times, no team). */
function VeoInsights({ match, onSeek }: { match: VeoMatch; onSeek: (t: number) => void }) {
  const s = veoInsights(match.moments ?? [], match.halves, match.duration_s);
  if (!match.moments?.length) return null;
  const peak = Math.max(1, ...s.spells.map(x => x.goals + x.shots + x.other));
  const tiles: [string, string][] = [
    ["Score", match.score ? `${match.score.ours}–${match.score.theirs}` : "–"],
    ["Goals tagged", String(s.goals)],
    ["Shots on goal", String(s.shots)],
    ["First goal", s.firstGoal === null ? "–" : formatClock(s.firstGoal)],
    ["Busiest spell", s.busiest === null ? "–" : `${formatClock(s.busiest)}–${formatClock(s.busiest + SPELL)}`],
    ["Recorded", match.duration_s ? `${Math.round(match.duration_s / 60)} min` : "–"],
  ];
  return <section aria-label="Match insights" className="panel space-y-5 p-5">
    <h2 className="flex items-center gap-2 text-xl font-semibold"><Activity size={18} className="text-accent" aria-hidden /> Match insights</h2>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {tiles.map(([label, value]) => <div key={label} className="tile p-3"><p className="text-xs text-fg-subtle">{label}</p><p className="mt-1 text-xl font-semibold tabular-nums">{value}</p></div>)}
    </div>
    {s.halves.length > 1 && <div className="grid gap-3 sm:grid-cols-2">
      {s.halves.map(h => <div key={h.label} className="tile flex flex-wrap items-baseline gap-x-4 gap-y-1 p-3 text-sm">
        <span className="mr-auto font-semibold">{h.label}</span>
        <span>{h.goals} {h.goals === 1 ? "goal" : "goals"}</span><span>{h.shots} {h.shots === 1 ? "shot" : "shots"}</span>
        <span className="text-fg-muted">{h.highlights} highlights</span></div>)}
    </div>}
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-fg-muted"><span>Highlights through the match, 5 minutes a bar</span>
        <span className="text-xs"><span className="text-ok">■</span> Goal · <span className="text-accent">■</span> Shot · <span className="text-fg-subtle">■</span> Other</span></div>
      <div role="group" aria-label="Highlights by 5 minutes" className="flex h-28 items-end gap-1">
        {s.spells.map(x => {
          const total = x.goals + x.shots + x.other;
          const label = `${formatClock(x.start)} to ${formatClock(x.start + SPELL)}: ${x.goals} goals, ${x.shots} shots${x.other ? `, ${x.other} other` : ""}`;
          return <button key={x.start} type="button" aria-label={label} title={label} disabled={!total} onClick={() => onSeek(x.start)}
            className="flex h-full min-w-0 flex-1 flex-col-reverse rounded-sm bg-white/5 hover:bg-white/10 disabled:cursor-default">
            <span className="block bg-ok" style={{ height: `${(x.goals / peak) * 100}%` }} />
            <span className="block bg-accent" style={{ height: `${(x.shots / peak) * 100}%` }} />
            <span className="block bg-fg-subtle/60" style={{ height: `${(x.other / peak) * 100}%` }} />
          </button>;
        })}
      </div>
      <div className="flex justify-between text-[11px] text-fg-subtle"><span>0:00</span><span>{formatClock(s.spells.length * SPELL)}</span></div>
    </div>
    <p className="text-xs text-fg-subtle">Veo marks the type and time of each highlight but not the team, so these count both teams. Click a bar to watch from there.</p>
  </section>;
}

/** Owner request 2026-11-13: one Veo match laid out like a Hudl match page. */
export function VeoMatchFull({ id }: { id: string }) {
  const library = useVeoLibrary();
  const status = useVeoStatus();
  const qc = useQueryClient();
  const team = useVeoTeam();
  const notes = useNotes(id);
  const saveNote = useSaveNote();
  const [type, setType] = useState("");
  const [seek, setSeek] = useState<{ time: number; nonce: number }>();
  const [now, setNow] = useState(0);
  const [focus, setFocus] = useState<VeoHighlight>();
  const [drawing, setDrawing] = useState(false);
  const started = useRef(false);
  const list = useRef<HTMLUListElement>(null);
  const navigate = useNavigate();
  const action = useMutation({
    mutationFn: ({ name, label }: { name: "watch" | "download"; label?: string }) =>
      veoRequest("/action", { action: name, match_id: id, ...(label ? { name: label } : {}) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["veo-account"] }),
  });
  const match = library.data?.find(m => m.id === id);
  const own = status.data?.match_id === id;
  const busy = Boolean(status.data?.busy) || action.isPending;
  const stream = own && !status.data?.busy ? status.data?.stream_url ?? undefined : undefined;
  // Like a Hudl match: opening the page starts the stream once (one Veo read if the
  // helper has not got this match's video address in memory yet).
  useEffect(() => {
    if (!match?.available || !status.data || started.current || status.data.busy) return;
    started.current = true;
    if (!own || !status.data.stream_url) action.mutate({ name: "watch" });
  }, [match, status.data]);

  const highlights = [...(match?.moments ?? [])].sort((a, b) => a.time_s - b.time_s);
  const types = [...highlights.reduce((all, h) => all.set(h.category, (all.get(h.category) ?? 0) + 1), new Map<string, number>())]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const shown = highlights.filter(h => !type || h.category === type);
  const watch = (h: VeoHighlight) => { setFocus(h); setSeek({ time: h.time_s, nonce: Date.now() }); };
  const skip = (dir: 1 | -1) => {
    const h = nextMoment(shown, now, dir, focus && shown.some(x => x.id === focus.id) ? focus.id : undefined);
    if (!h) return;
    const held = document.activeElement;
    if (held instanceof HTMLElement && list.current?.contains(held)) held.blur();
    watch(h);
    requestAnimationFrame(() => list.current?.querySelector<HTMLElement>(`li[data-moment="${CSS.escape(h.id)}"]`)?.scrollIntoView?.({ block: "nearest" }));
  };
  const skipRef = useRef(skip);
  skipRef.current = skip;
  useEffect(() => {
    if (drawing || !stream) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target;
      if (e.metaKey || e.ctrlKey || e.altKey || (el instanceof HTMLElement && (["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) || el.isContentEditable))) return;
      if (e.key.toLowerCase() === "n") skipRef.current(1);
      if (e.key.toLowerCase() === "b") skipRef.current(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawing, stream]);

  if (library.isPending) return <div className="panel p-6 text-sm text-fg-muted">Loading the Veo match…</div>;
  if (library.isError) return <div className="panel space-y-3 p-6"><Link to="/">← Library</Link><p role="alert" className="text-sm text-danger">Veo matches unavailable. Start the desktop helper.</p></div>;
  if (!match) return <div className="panel space-y-3 p-6"><Link to="/">← Library</Link><p className="text-sm text-fg-muted">This match is not in the Veo cache. Select Refresh matches in Settings → Connections → Veo.</p></div>;
  const age = match.age_group && match.age_group !== "Unclassified" ? match.age_group : "";
  const label = team ? fixtureLabel(match.title, team, age) : undefined;
  const expiry = veoExpiry(match);
  const where = match.home_or_away === "home" ? "Home" : match.home_or_away === "away" ? "Away" : null;
  return <div className="analysis-workspace">
    <aside className="analysis-rail panel overflow-hidden">
      <div className="space-y-2 border-b border-line p-4"><Link to="/" className="text-sm text-fg-muted">← LIBRARY</Link>
        <h2 className="text-sm font-semibold">{label ?? match.title}</h2><p className="text-xs text-fg-subtle">{[age || null, `${highlights.length} highlights`].filter(Boolean).join(" · ")}</p></div>
      <nav aria-label="Highlight types" className="max-h-[75vh] overflow-y-auto">
        <button type="button" className={`flex w-full items-center justify-between px-4 py-3 text-xs ${!type ? "bg-blue-600 text-white" : "text-fg-muted hover:bg-white/5"}`} onClick={() => setType("")}>ALL HIGHLIGHTS <span>{highlights.length}</span></button>
        {types.map(([t, n]) => <button type="button" key={t} className={`flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-xs uppercase ${type === t ? "bg-blue-600 text-white" : "text-fg-muted hover:bg-white/5"}`} onClick={() => setType(t)}><span className="truncate">{t}</span><span>{n}</span></button>)}
      </nav>
    </aside>
    <div className="analysis-stage min-w-0 space-y-5">
      <header className="flex flex-wrap items-center gap-4">
        <div className="mr-auto"><Link to="/" className="text-sm text-fg-muted">← Library</Link>
          <p className="screen-eyebrow mt-4">{[age, match.season_label, "VEO MATCH"].filter(Boolean).join(" · ")}</p>
          <h1 className="text-2xl font-semibold">{label ?? match.title}</h1>
          <p className="mt-2 text-sm text-fg-muted">{[where, match.duration_s ? `${Math.round(match.duration_s / 60)} min recorded` : null,
            ...(match.halves ?? []).map((h, i) => `${HALF[i] ?? `Period ${i + 1}`} ${formatClock(h[0])}–${formatClock(h[1])}`)].filter(Boolean).join(" · ")}</p>
          {expiry && <p className="mt-1 text-xs text-warn">{expiry}</p>}</div>
        {match.score && <div className="tile flex items-baseline gap-3 px-5 py-3"><span className="text-3xl font-semibold tabular-nums">{match.score.ours}–{match.score.theirs}</span><span className="text-xs text-fg-subtle">From Veo</span></div>}
        {match.available && <Button variant="primary" disabled={busy} onClick={() => action.mutate({ name: "download", label })}><Download size={16} /> Download full match</Button>}
      </header>
      {!match.available ? <p className="panel p-5 text-sm text-fg-muted">Veo no longer has the video for this match, so only its details are kept.</p>
        : stream ? <MatchDrawing matchId={id} title={label ?? match.title} notes={notes.data} target={focus} now={now} saving={saveNote.isPending}
            error={saveNote.isError ? saveNote.error.message : undefined} onSave={(note, done) => saveNote.mutate(note, { onSuccess: done })}
            onGoTo={time => setSeek({ time, nonce: Date.now() })} onEditing={setDrawing}
            controls={shown.length > 0 && <span className="flex items-center gap-1">
              <Button variant="ghost" aria-label="Previous highlight (B)" title="Previous highlight (B)" onClick={() => skip(-1)}><SkipBack size={15} /></Button>
              <Button aria-label="Next highlight (N)" title="Next highlight (N)" onClick={() => skip(1)}><SkipForward size={15} className="text-accent" /> Next moment</Button>
            </span>}>
            <VeoPlayer url={stream} seek={seek} onTime={setNow} poster={match.poster_url} />
          </MatchDrawing>
        : <div className="panel grid aspect-video place-items-center"><div className="space-y-3 p-4 text-center">
            <p className="text-sm">{own && status.data?.message ? status.data.message : "Preparing the Veo video…"}</p>
            {!busy && <Button onClick={() => action.mutate({ name: "watch" })}><Play size={14} /> Watch match</Button>}</div></div>}
      {own && status.data?.progress && <div role="progressbar" aria-label="Download progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(status.data.progress.fraction * 100)} className="h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-ok to-accent" style={{ width: `${Math.max(2, status.data.progress.fraction * 100)}%` }} /></div>}
      {own && status.data?.busy && <p role="status" className="text-sm text-accent">{status.data.message}</p>}
      {own && !status.data?.busy && status.data?.state === "done" && <p role="status" className="text-sm text-ok">{status.data.message} It is listed under Downloaded.</p>}
      {(action.isError || (own && status.data?.state === "error")) && <p role="alert" className="text-sm text-danger">{action.error?.message || status.data?.message}</p>}
      <VeoInsights match={match} onSeek={time => { setFocus(undefined); setSeek({ time, nonce: Date.now() }); }} />
      {highlights.length > 0 && <section className="panel space-y-4 p-5" aria-label="Veo highlight moments">
        <div className="flex flex-wrap items-center gap-3"><h2 className="mr-auto text-xl font-semibold">Veo highlights</h2>
          {match.available && shown.length > 0 && <Button variant="primary" disabled={busy} onClick={() => navigate("/clips/reel/new", { state: {
            source: "veo", name: label ? `${label}${type ? ` · ${type.toLowerCase()}` : ""}` : undefined,
            items: [{ match_id: id, moment_ids: shown.map(h => h.id) }] } })}><Clapperboard size={16} /> Make highlight reel ({shown.length})</Button>}</div>
        <p className="text-xs text-fg-muted">{shown.length} highlights{type ? ` of type ${type}` : ""}. Click one to watch it; N and B step through them.</p>
        <ul ref={list} aria-label="Veo highlights" className="grid max-h-[600px] gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
          {shown.map(h => <li key={h.id} data-moment={h.id} aria-current={focus?.id === h.id ? true : undefined}
            className={`tile ${focus?.id === h.id ? "border-ok bg-ok/10 ring-2 ring-inset ring-ok" : ""}`}>
            <button type="button" disabled={!stream} onClick={() => watch(h)} className="flex w-full items-center gap-3 p-3 text-left disabled:cursor-default">
              <span className="min-w-0 flex-1"><span className="text-xs text-pin">{formatClock(h.time_s)}</span>
                <span className="block truncate text-sm uppercase">{h.category}</span>
                {(h.ai || h.note) && <span className="flex items-center gap-1 truncate text-xs text-fg-subtle">{h.ai && <><Sparkles size={11} aria-hidden />Veo AI</>}{h.note && <span className="text-fg-muted">{h.note}</span>}</span>}</span>
              <Play size={14} aria-hidden /></button></li>)}
        </ul>
      </section>}
    </div>
  </div>;
}
