import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Activity, Clapperboard, Download, ListVideo, Play, SkipBack, SkipForward, Sparkles, Square } from "lucide-react";
import { type VeoHighlight, type VeoMatch, useVeoLibrary, useVeoStatus, veoExpiry, veoRequest } from "../api/veo";
import { Button } from "../components/ui/Button";
import { MatchDrawing } from "../components/match/MatchDrawing";
import { formatClock } from "../lib/format";
import { fixtureLabel } from "../lib/hudlFixture";
import { advanceTagged, needsSeek, nextMoment, taggedPlaylist } from "../lib/taggedPlayback";
import { DownloadChoice } from "./HudlMatchPage";
import { useVeoClubOf } from "../lib/useVeoClub";
import { SPELL, veoInsights } from "../lib/veoInsights";
import { teamSplit, VEO_MOMENTUM_WEIGHTS, veoMomentum } from "../lib/veoTeamSplit";
import { HeadToHeadRecord, MomentumBars } from "../components/match/MatchInsights";
import { TeamStatsTable } from "../components/match/TeamStatsTable";
import { GoalsPanel } from "../components/match/GoalsPanel";
import { QuickReels } from "../components/match/QuickReels";
import { MatchSections } from "../components/match/MatchSections";
import { recordAgainst } from "../lib/headToHead";
import { fixtureParts } from "../lib/hudlFixture";
import { matchLink, veoAsHudl } from "../lib/veoAsHudl";
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
  const clubOf = useVeoClubOf();
  const ownName = clubOf(match) || "Us";
  // Owner request 2026-11-15: momentum as on a Hudl match, from Veo's team events.
  const flow = veoMomentum(match.team_data?.events ?? [], match.halves, match.duration_s);
  // Owner request 2026-11-15: the record against this opponent across the Veo matches.
  const library = useVeoLibrary();
  const club = clubOf(match);
  const opponent = fixtureParts(match.title, club)?.opponent;
  // Only this club's matches: the account films more than one club.
  const record = opponent ? recordAgainst(library.data?.filter(m => clubOf(m) === club).map(veoAsHudl), club, undefined, opponent) : null;
  // Spec 320: Insights is a tab, so it says when there is nothing rather than vanishing.
  if (!match.moments?.length && !flow.minutes.length && !record) return <section aria-label="Match insights" className="panel p-5">
    <p className="text-sm text-fg-muted">Veo gave no highlights or team events for this match.</p></section>;
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
    <div className="flex flex-wrap gap-8"><div className="min-w-0 flex-[999_1_480px] space-y-5">
    {flow.minutes.length > 0 && <MomentumBars rows={flow.minutes} halves={flow.halves} ours={ownName} theirs="Opponent" onSeek={onSeek}
      caption={`Bars weigh each side's Veo events per minute: ${Object.entries(VEO_MOMENTUM_WEIGHTS).map(([k, v]) => `${k.toLowerCase()} ${v}`).join(", ")}. Dots are goals, dashed lines half-time. Click a bar to watch it. Veo gives no possession data for this account, so there is no possession bar.`} />}
    {match.moments?.length ? <>
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
    </> : null}
    </div>
    {record && <div className="min-w-0 flex-[1_1_260px]"><HeadToHeadRecord record={record} current={match.id} linkTo={id => matchLink({ id, source: "veo" })} /></div>}
    </div>
  </section>;
}

/** Decision 009 (owner, 2026-11-14): Veo's own stats and events with the team each
 *  belongs to, read at Refresh. Shown only when Veo gave them for this match. */
function VeoTeamStats({ match, onSeek }: { match: VeoMatch; onSeek: (t: number) => void }) {
  const ownName = useVeoClubOf()(match) || "Us";
  const rows = teamSplit(match.team_data);
  if (!rows.length) return null;
  const key = (match.team_data?.events ?? []).filter(e => e.side && (e.type === "GOAL" || e.type === "SHOT"));
  const end = Math.max(match.duration_s ?? 0, ...key.map(e => e.time_s + 1), 1);
  const side = (s: "own" | "opponent") => (s === "own" ? ownName : "Opponent");
  return <section aria-label="Team stats" className="panel space-y-5 p-5">
    <h2 className="flex items-center gap-2 text-xl font-semibold"><Activity size={18} className="text-accent" aria-hidden /> Team stats</h2>
    <TeamStatsTable rows={rows} ours={ownName} />
    {key.length > 0 && <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-fg-muted"><span>Goals and shots through the match</span>
        <span className="text-xs"><span className="text-ok">●</span> Goal · <span className="text-accent">●</span> Shot</span></div>
      <div role="group" aria-label="Goals and shots by team" className="space-y-1">
        {(["own", "opponent"] as const).map(s => <div key={s} className="flex items-center gap-3">
          <span className="w-24 shrink-0 truncate text-xs text-fg-subtle">{side(s)}</span>
          <div className="relative h-6 flex-1 rounded-sm bg-white/5">
            {key.filter(e => e.side === s).map(e => {
              const label = `${side(s)} ${e.type} at ${formatClock(e.time_s)}`;
              return <button key={`${e.type}-${e.time_s}`} type="button" aria-label={label} title={label} onClick={() => onSeek(e.time_s)}
                className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-bg hover:scale-125 ${e.type === "GOAL" ? "h-4 w-4 bg-ok" : "h-3 w-3 bg-accent"}`}
                style={{ left: `${(e.time_s / end) * 100}%` }} />;
            })}
          </div>
        </div>)}
      </div>
      <div className="flex justify-between pl-[6.75rem] text-[11px] text-fg-subtle"><span>0:00</span><span>{formatClock(end)}</span></div>
    </div>}
    <p className="text-xs text-fg-subtle">From Veo's own event detection, which marks the team. Click a dot to watch from there.</p>
  </section>;
}

/** Owner request 2026-11-13: one Veo match laid out like a Hudl match page. */
export function VeoMatchFull({ id }: { id: string }) {
  const library = useVeoLibrary();
  const status = useVeoStatus();
  const qc = useQueryClient();
  const clubOf = useVeoClubOf();
  const notes = useNotes(id);
  const saveNote = useSaveNote();
  // Owner request 2026-11-15: several types at once (highlights and team events).
  const [picked, setPicked] = useState<string[]>([]);
  const type = picked.length === 1 ? picked[0] : "";
  const toggle = (t: string) => setPicked(p => (p.includes(t) ? p.filter(x => x !== t) : [...p, t]));
  const [seek, setSeek] = useState<{ time: number; nonce: number }>();
  const [now, setNow] = useState(0);
  const [focus, setFocus] = useState<VeoHighlight>();
  const [drawing, setDrawing] = useState(false);
  // Owner request 2026-11-13: tick boxes as on a Hudl match. Ticked highlights are what
  // Play Tagged plays, the reel uses and Download saves; none ticked means all shown.
  const [selected, setSelected] = useState<string[]>([]);
  const [queue, setQueue] = useState<{ list: VeoHighlight[]; index: number }>();
  const [asking, setAsking] = useState(false);
  const started = useRef(false);
  const list = useRef<HTMLUListElement>(null);
  const navigate = useNavigate();
  const action = useMutation({
    mutationFn: ({ name, label, extra }: { name: "watch" | "download" | "moments"; label?: string; extra?: object }) =>
      veoRequest("/action", { action: name, match_id: id, ...(label ? { name: label } : {}), ...extra }),
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
  // Owner request 2026-11-15: Veo's team events, listed in the rail and chosen like
  // highlights. "All highlights" stays Veo's own highlights.
  const teamMoments = [...(match?.team_moments ?? [])].sort((a, b) => a.time_s - b.time_s);
  const everything = [...highlights, ...teamMoments].sort((a, b) => a.time_s - b.time_s);
  const counted = (list: VeoHighlight[]) => [...list.reduce((all, h) => all.set(h.category, (all.get(h.category) ?? 0) + 1), new Map<string, number>())];
  const types = counted(highlights).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  // Grouped by event (goal, shot, corner...), the owner's team first.
  const stem = (c: string) => c.replace(/^(OUR|OPPONENT) /, "");
  const teamTypes = counted(teamMoments).sort((a, b) => stem(a[0]).localeCompare(stem(b[0])) || (a[0].startsWith("OUR") ? -1 : 1));
  const allEvents = teamTypes.length > 0 && teamTypes.every(([t]) => picked.includes(t));
  const pickAllEvents = () => setPicked(p => (allEvents ? p.filter(t => !teamTypes.some(([x]) => x === t)) : [...p.filter(t => !teamTypes.some(([x]) => x === t)), ...teamTypes.map(([t]) => t)]));
  const chip = (on: boolean) => `rounded-full border px-3 py-1 text-xs uppercase ${on ? "border-blue-500 bg-blue-600 text-white" : "border-line text-fg-muted hover:bg-white/5"}`;
  const shown = picked.length ? everything.filter(h => picked.includes(h.category)) : highlights;
  const chosen = selected.length ? everything.filter(h => selected.includes(h.id)) : shown;
  const current = queue?.list[queue.index];
  const active = current ?? focus;
  const watch = (h: VeoHighlight) => { setQueue(undefined); setFocus(h); setSeek({ time: h.time_s, nonce: Date.now() }); };
  const playTagged = () => {
    const list = taggedPlaylist(chosen);
    if (!list.length) return;
    setQueue({ list, index: 0 });
    setFocus(list[0]);
    setSeek({ time: list[0].time_s, nonce: Date.now() });
  };
  const onTime = (time: number) => {
    setNow(time);
    if (!queue) return;
    const next = advanceTagged(queue.list, queue.index, time);
    if (next === null) setQueue(undefined);
    else if (next !== queue.index) {
      setQueue({ list: queue.list, index: next });
      setFocus(queue.list[next]);
      if (needsSeek(queue.list[next], time)) setSeek({ time: queue.list[next].time_s, nonce: Date.now() });
    }
  };
  const skip = (dir: 1 | -1) => {
    const h = nextMoment(shown, now, dir, active && shown.some(x => x.id === active.id) ? active.id : undefined);
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
  const team = clubOf(match);
  const label = team ? fixtureLabel(match.title, team, age) : undefined;
  const expiry = veoExpiry(match);
  const where = match.home_or_away === "home" ? "Home" : match.home_or_away === "away" ? "Away" : null;
  const seekTo = (time: number) => { setFocus(undefined); setSeek({ time, nonce: Date.now() }); };
  const teamRows = teamSplit(match.team_data);
  const momentsPanel = <section className="panel space-y-4 p-5" aria-label="Veo highlight moments">
        <div className="flex flex-wrap items-center gap-3"><h2 className="mr-auto text-xl font-semibold">Veo highlights</h2>
          {chosen.length > 0 && <Button variant="primary" disabled={!stream} title={stream ? undefined : "Available once the video is ready"} onClick={playTagged}><Play size={16} /> Play Tagged ({chosen.length})</Button>}
          {match.available && chosen.length > 0 && <Button disabled={busy} onClick={() => setAsking(true)}><Download size={16} /> Download {selected.length ? "selected moments" : picked.length > 1 ? "chosen types" : type ? `${type.toLowerCase()} moments` : "all moments"}</Button>}
          {match.available && chosen.length > 0 && <Button disabled={busy} onClick={() => navigate("/clips/reel/new", { state: {
            source: "veo", name: label ? `${label}${picked.length && !selected.length ? ` · ${picked.join(" + ").toLowerCase()}` : ""}` : undefined,
            items: [{ match_id: id, moment_ids: chosen.map(h => h.id) }] } })}><Clapperboard size={16} /> Make highlight reel ({chosen.length})</Button>}</div>
        <p className="text-xs text-fg-muted">{shown.length} highlights{picked.length ? ` of ${picked.length === 1 ? `type ${type}` : `${picked.length} types`}` : ""}{selected.length ? ` · ${selected.length} ticked` : ""}. Pick several highlight types or Veo events, here or on the left, to see them together. Tick highlights to play, download or make a reel of just those. Click one to watch it; N and B step through them. Downloads are cut from the full match if it is saved on this computer; otherwise only the parts needed are read from Veo.</p>
        {/* Owner request 2026-11-15: filter by Veo events here as well as in the rail. */}
        <div className="space-y-2">
          <div role="group" aria-label="Highlight types" className="flex flex-wrap items-center gap-2">
            <span className="w-24 text-[11px] font-semibold tracking-wider text-fg-subtle uppercase">Highlights</span>
            <button type="button" className={chip(!picked.length)} aria-pressed={!picked.length} onClick={() => setPicked([])}>All highlights <span className="opacity-70">{highlights.length}</span></button>
            {types.map(([t, n]) => <button type="button" key={t} className={chip(picked.includes(t))} aria-pressed={picked.includes(t)} onClick={() => toggle(t)}>{t} <span className="opacity-70">{n}</span></button>)}
          </div>
          {teamTypes.length > 0 && <div role="group" aria-label="Veo events" className="flex flex-wrap items-center gap-2">
            <span className="w-24 text-[11px] font-semibold tracking-wider text-fg-subtle uppercase">Veo events</span>
            <button type="button" className={chip(allEvents)} aria-pressed={allEvents} onClick={pickAllEvents}>All events <span className="opacity-70">{teamMoments.length}</span></button>
            {teamTypes.map(([t, n]) => <button type="button" key={t} className={chip(picked.includes(t))} aria-pressed={picked.includes(t)} onClick={() => toggle(t)}>{t} <span className="opacity-70">{n}</span></button>)}
          </div>}
        </div>
        {selected.length > 0 && <button type="button" className="text-xs text-accent underline" onClick={() => setSelected([])}>Clear ticks</button>}
        <ul ref={list} aria-label="Veo highlights" className="grid max-h-[600px] gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
          {shown.map(h => <li key={h.id} data-moment={h.id} aria-current={active?.id === h.id ? true : undefined}
            className={`tile flex items-center gap-1 pl-3 ${active?.id === h.id ? "border-ok bg-ok/10 ring-2 ring-inset ring-ok" : ""}`}>
            <input type="checkbox" aria-label={`Select ${h.category} at ${formatClock(h.time_s)}`} checked={selected.includes(h.id)}
              onChange={e => setSelected(s => e.target.checked ? [...s, h.id] : s.filter(x => x !== h.id))} />
            <button type="button" disabled={!stream} onClick={() => watch(h)} className="flex min-w-0 flex-1 items-center gap-3 p-3 text-left disabled:cursor-default">
              <span className="min-w-0 flex-1"><span className="text-xs text-pin">{formatClock(h.time_s)}</span>
                <span className="block truncate text-sm uppercase">{h.category}</span>
                {h.team && <span className="block truncate text-xs text-fg-subtle">Veo team data</span>}
                {(h.ai || h.note) && <span className="flex items-center gap-1 truncate text-xs text-fg-subtle">{h.ai && <><Sparkles size={11} aria-hidden />Veo AI</>}{h.note && <span className="text-fg-muted">{h.note}</span>}</span>}</span>
              <Play size={14} aria-hidden /></button></li>)}
        </ul>
      </section>;
  return <div className="analysis-workspace">
    <aside className="analysis-rail moments-rail panel flex flex-col overflow-hidden">
      <div className="space-y-2 border-b border-line p-4"><Link to="/" className="text-sm text-fg-muted">← LIBRARY</Link>
        <h2 className="text-sm font-semibold">{label ?? match.title}</h2><p className="text-xs text-fg-subtle">{[age || null, `${highlights.length} highlights`].filter(Boolean).join(" · ")}</p></div>
      <nav aria-label="Highlight types" className="min-h-0 flex-1 overflow-y-auto">
        <button type="button" className={`flex w-full items-center justify-between px-4 py-3 text-xs ${!picked.length ? "bg-blue-600 text-white" : "text-fg-muted hover:bg-white/5"}`} aria-pressed={!picked.length} onClick={() => setPicked([])}>ALL HIGHLIGHTS <span>{highlights.length}</span></button>
        {types.map(([t, n]) => <button type="button" key={t} className={`flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-xs uppercase ${picked.includes(t) ? "bg-blue-600 text-white" : "text-fg-muted hover:bg-white/5"}`} aria-pressed={picked.includes(t)} onClick={() => toggle(t)}><span className="truncate">{t}</span><span>{n}</span></button>)}
        {teamTypes.length > 0 && <h3 className="border-t border-line px-4 pt-4 pb-2 text-[11px] font-semibold tracking-wider text-fg-subtle uppercase">Team events</h3>}
        {teamTypes.map(([t, n]) => <button type="button" key={t} className={`flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-xs uppercase ${picked.includes(t) ? "bg-blue-600 text-white" : "text-fg-muted hover:bg-white/5"}`} aria-pressed={picked.includes(t)} onClick={() => toggle(t)}><span className="truncate">{t}</span><span>{n}</span></button>)}
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
            <VeoPlayer url={stream} seek={seek} onTime={onTime} poster={match.poster_url} />
          </MatchDrawing>
        : <div className="panel grid aspect-video place-items-center"><div className="space-y-3 p-4 text-center">
            <p className="text-sm">{own && status.data?.message ? status.data.message : "Preparing the Veo video…"}</p>
            {!busy && <Button onClick={() => action.mutate({ name: "watch" })}><Play size={14} /> Watch match</Button>}</div></div>}
      {current && <div role="status" aria-label="Tagged playback" className="panel flex flex-wrap items-center gap-3 p-3 text-sm">
        <ListVideo size={16} className="text-accent" aria-hidden />
        <span className="mr-auto">Playing tagged moment {queue!.index + 1} of {queue!.list.length} · <span className="text-pin">{formatClock(current.time_s)}</span> {current.category}</span>
        <Button variant="ghost" aria-label="Stop tagged playback" onClick={() => setQueue(undefined)}><Square size={14} /> Stop</Button>
      </div>}
      {own && status.data?.progress && <div role="progressbar" aria-label="Download progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(status.data.progress.fraction * 100)} className="h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-ok to-accent" style={{ width: `${Math.max(2, status.data.progress.fraction * 100)}%` }} /></div>}
      {own && status.data?.busy && <p role="status" className="text-sm text-accent">{status.data.message}</p>}
      {own && !status.data?.busy && status.data?.state === "done" && <p role="status" className="text-sm text-ok">{status.data.message} It is listed under Downloaded.{status.data.download_url && <> <a href={status.data.download_url} className="font-semibold text-accent underline">Save the highlights</a></>}</p>}
      {(action.isError || (own && status.data?.state === "error")) && <p role="alert" className="text-sm text-danger">{action.error?.message || status.data?.message}</p>}
      <MatchSections match={match} club={null} rows={teamRows} flow={veoMomentum(match.team_data?.events ?? [], match.halves, match.duration_s)}
        ours={team || "Us"} theirs="Opponent" now={now} onSeek={seekTo}
        moments={everything.length > 0 ? <><QuickReels match={match} club={null} />{momentsPanel}</> : null} momentsCount={everything.length}
        stats={teamRows.length ? <VeoTeamStats match={match} onSeek={seekTo} /> : null}
        goals={<GoalsPanel match={match} club={null} onSeek={seekTo} />}
        insights={<VeoInsights match={match} onSeek={seekTo} />} />
    </div>
    {asking && <DownloadChoice count={chosen.length} onCancel={() => setAsking(false)} onChoose={combined => {
      setAsking(false);
      action.mutate({ name: "moments", label, extra: { moment_ids: chosen.map(h => h.id), combined } });
    }} />}
  </div>;
}
