import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Download, Film, FolderArchive, ListVideo, Play, Square } from 'lucide-react';
import { type HudlMoment, hudlBlocked, hudlRequest, useHudlLibrary, useHudlStatus } from '../api/hudl';
import { StreamPlayer } from '../components/settings/HudlAccount';
import { Button } from '../components/ui/Button';
import { formatClock } from '../lib/format';
import { advanceTagged, needsSeek, taggedPlaylist, timeLeft } from '../lib/taggedPlayback';
import { markHudlMomentWatched } from '../lib/hudlWatched';

function DownloadChoice({ count, onChoose, onCancel }: { count: number; onChoose: (combined: boolean) => void; onCancel: () => void }) {
  const title = `Download ${count} ${count === 1 ? 'moment' : 'moments'}`;
  return <div className="fixed inset-0 z-50 grid place-items-center bg-ink-950/70 p-4" onClick={onCancel}>
    <div role="dialog" aria-modal="true" aria-label={title} className="panel w-full max-w-md space-y-4 p-5" onClick={e => e.stopPropagation()}>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm text-fg-muted">Clips are encoded as H.264 MP4 at the match's original resolution so they play on any phone, browser or TV.</p>
      <button type="button" className="tile flex w-full items-start gap-3 p-4 text-left hover:border-accent/60" onClick={() => onChoose(false)}>
        <FolderArchive size={20} className="mt-0.5 shrink-0 text-accent" aria-hidden />
        <span><span className="block font-semibold">Separate files</span><span className="block text-xs text-fg-muted">A ZIP with one video per moment</span></span>
      </button>
      <button type="button" className="tile flex w-full items-start gap-3 p-4 text-left hover:border-accent/60" onClick={() => onChoose(true)}>
        <Film size={20} className="mt-0.5 shrink-0 text-accent" aria-hidden />
        <span><span className="block font-semibold">One combined video</span><span className="block text-xs text-fg-muted">Every moment back to back, in match order</span></span>
      </button>
      <div className="flex justify-end"><Button variant="ghost" onClick={onCancel}>Cancel</Button></div>
    </div>
  </div>;
}

function downloadLabel(filename?: string): string {
  if (filename?.endsWith('.zip')) return 'Download moments ZIP';
  if (filename?.startsWith('hudl-moments-')) return 'Download combined moments video';
  return 'Download original-quality MP4';
}

export function HudlMatchPage() {
  const id = useParams().id!;
  const [params] = useSearchParams();
  return <HudlMatchView key={id} id={id} initialCode={params.get('player') || ''} initialMoment={params.get('moment') || undefined} />;
}

/** One Hudl match: stream, tagged moments by player/code, Play Tagged and downloads.
 *  Used by the match page and, with a match picker above it, by Clips. */
export function HudlMatchView({ id, initialCode = '', initialMoment, embedded = false }: { id: string; initialCode?: string; initialMoment?: string; embedded?: boolean }) {
  const library = useHudlLibrary();
  const status = useHudlStatus();
  const qc = useQueryClient();
  const [code, setCode] = useState(initialCode);
  const [selected, setSelected] = useState<string[]>([]);
  const [seek, setSeek] = useState<{ time: number; nonce: number }>();
  const [asking, setAsking] = useState(false);
  const [queue, setQueue] = useState<{ list: HudlMoment[]; index: number }>();
  const started = useRef(false);
  const linked = useRef(false);
  const action = useMutation({
    mutationFn: (body: unknown) => hudlRequest('/account/action', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hudl-account'] }),
  });
  const match = library.data?.find(m => m.id === id);
  const own = status.data?.match_id === id;
  const blocked = hudlBlocked(status.data);
  useEffect(() => {
    if (match && status.data && !started.current && !blocked) {
      started.current = true;
      if (!own || !status.data.stream_url) action.mutate({ action: 'stream', match_id: id });
    }
  }, [match, status.data, blocked]);
  useEffect(() => { if (own && !blocked) void qc.invalidateQueries({ queryKey: ['hudl-library'] }); }, [status.data?.state, blocked, own, qc]);

  const moments = match?.moments || [];
  useEffect(() => {
    const target = moments.find(m => m.id === initialMoment);
    if (target && !linked.current) {
      linked.current = true;
      setQueue({ list: [target], index: 0 });
      setSeek({ time: target.time_s, nonce: Date.now() });
    }
  }, [moments, initialMoment]);
  const codes = [...new Set(moments.map(m => m.category))].sort();
  const filtered = moments.filter(m => !code || m.category === code);
  const chosen = selected.length ? selected : filtered.map(m => m.id);
  const busy = blocked || action.isPending;
  const streamUrl = own ? status.data?.stream_url : undefined;

  const playTagged = () => {
    const list = taggedPlaylist(moments.filter(m => chosen.includes(m.id)));
    if (!list.length) return;
    setQueue({ list, index: 0 });
    setSeek({ time: list[0].time_s, nonce: Date.now() });
  };
  const onTime = (time: number) => {
    if (!queue) return;
    const next = advanceTagged(queue.list, queue.index, time);
    if (next === null) setQueue(undefined);
    else if (next !== queue.index) {
      setQueue({ list: queue.list, index: next });
      if (needsSeek(queue.list[next], time)) setSeek({ time: queue.list[next].time_s, nonce: Date.now() });
    }
  };
  const download = (combined: boolean) => {
    setAsking(false);
    action.mutate({ action: 'clips', match_id: id, moment_ids: chosen, combined });
  };
  const current = queue?.list[queue.index];
  useEffect(() => { if (current) markHudlMomentWatched(current.id); }, [current]);

  if (!match) return <div className="panel p-6"><Link to="/">← Library</Link><p className="mt-4">{library.isPending ? 'Loading cached match…' : 'This match is not cached. Refresh Hudl from Library.'}</p></div>;
  return <div className="analysis-workspace">
    <aside className="analysis-rail panel overflow-hidden">
      <div className="space-y-2 border-b border-line p-4">{!embedded && <Link to="/" className="text-sm text-fg-muted">← LIBRARY</Link>}<h2 className="text-sm font-semibold">{match.title}</h2><p className="text-xs text-fg-subtle">{match.age_group} · {moments.length} moments</p></div>
      <div className="max-h-[75vh] overflow-y-auto">
        <button className={`flex w-full items-center justify-between px-4 py-3 text-xs ${!code ? 'bg-blue-600 text-white' : 'text-fg-muted'}`} onClick={() => { setCode(''); setSelected([]); }}>ALL MOMENTS <span>{moments.length}</span></button>
        {codes.map(c => <button key={c} className={`flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-xs ${code === c ? 'bg-blue-600 text-white' : 'text-fg-muted hover:bg-white/5'}`} onClick={() => { setCode(c); setSelected([]); }}><span className="truncate">{c}</span><span>{moments.filter(m => m.category === c).length}</span></button>)}
      </div>
    </aside>
    <div className="analysis-stage min-w-0 space-y-5">
      <header className="flex flex-wrap items-center gap-4">
        <div className="mr-auto">{!embedded && <Link to="/" className="text-sm text-fg-muted">← Library</Link>}<p className={`screen-eyebrow ${embedded ? '' : 'mt-4'}`}>{match.age_group} · HUDL MATCH</p><h1 className="text-2xl font-semibold">{match.title}</h1><p className="mt-2 text-sm text-fg-muted">Highest available source quality · Original-resolution offline copies</p></div>
        <Button variant="primary" disabled={busy} onClick={() => action.mutate({ action: 'download', match_id: id })}><Download size={16} /> Download full match</Button>
      </header>
      {streamUrl ? <StreamPlayer url={streamUrl} seek={seek} onTime={onTime} /> : <div className="panel grid aspect-video place-items-center"><div className="space-y-3 text-center"><p>{own ? status.data?.message : 'Preparing highest-quality stream…'}</p>{!busy && <Button onClick={() => action.mutate({ action: 'stream', match_id: id })}>Stream highest quality</Button>}</div></div>}
      {current && <div role="status" aria-label="Tagged playback" className="panel flex flex-wrap items-center gap-3 p-3 text-sm">
        <ListVideo size={16} className="text-accent" aria-hidden />
        <span className="mr-auto">Playing tagged moment {queue!.index + 1} of {queue!.list.length} · <span className="text-pin">{formatClock(current.time_s)}</span> {current.category}</span>
        <Button variant="ghost" aria-label="Stop tagged playback" onClick={() => setQueue(undefined)}><Square size={14} /> Stop</Button>
      </div>}
      {own && status.data?.progress && <div className="panel space-y-2 p-4">
        <div className="flex flex-wrap justify-between gap-2 text-sm"><span>Step {status.data.progress.step} of {status.data.progress.steps}: {status.data.progress.label}</span><span className="text-fg-muted">{Math.round(status.data.progress.fraction * 100)}% · {timeLeft(status.data.progress.eta_s)}</span></div>
        <div role="progressbar" aria-label="Download progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(status.data.progress.fraction * 100)} className="h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-ok to-accent transition-[width] duration-500" style={{ width: `${Math.max(2, status.data.progress.fraction * 100)}%` }} />
        </div>
      </div>}
      {own && <p role="status" className={`text-sm ${status.data?.state === 'error' ? 'text-danger' : 'text-fg-muted'}`}>{status.data?.message}</p>}
      {action.isError && <p role="alert" className="text-danger">{action.error.message}</p>}
      {own && status.data?.download_url && <div className="panel flex flex-wrap items-center gap-4 p-4"><a className="font-semibold text-accent underline" href={status.data.download_url}>{downloadLabel(status.data.filename)}</a>{!status.data.filename?.startsWith('hudl-moments-') && <Link to="/import" className="text-sm text-fg-muted underline">{match.tag_status === 'unsynced' ? 'Import offline match' : 'Import offline match and tags'}</Link>}<Button onClick={() => action.mutate({ action: 'stream', match_id: id })} disabled={busy}>Resume stream</Button></div>}
      <section className="panel space-y-4 p-5" aria-label="Hudl tagged moments">
        <div className="flex flex-wrap items-end gap-3">
          <h2 className="mr-auto text-xl font-semibold">Tagged moments & players</h2>
          <label className="text-xs text-fg-muted">Tagged code / player<select className="field mt-1" aria-label="Tagged code / player" value={code} onChange={e => { setCode(e.target.value); setSelected([]); }}><option value="">All tagged moments</option>{codes.map(c => <option key={c}>{c}</option>)}</select></label>
          {chosen.length > 0 && <Button variant="primary" disabled={!streamUrl} title={streamUrl ? undefined : 'Available once the stream is ready'} onClick={playTagged}><Play size={16} /> Play Tagged ({chosen.length})</Button>}
          <Button disabled={busy || !chosen.length} onClick={() => setAsking(true)}><Download size={16} /> Download {selected.length ? 'selected moments' : code ? 'player / code moments' : 'all moments'}</Button>
        </div>
        {moments.length > 0 && <p className="text-xs text-pin">Tags cached locally · No full-match download required</p>}
        <p className="text-xs text-fg-muted">{filtered.length} tagged ranges. Play Tagged plays each chosen moment back to back. Downloads fetch only the selected moments, keep the original resolution and are encoded as H.264 for easy playback.</p>
        {code && <Link to={`/player/hudl/${encodeURIComponent(code)}`}><Button>See every match tagged “{code}”</Button></Link>}
        {match.tag_status === 'unsynced' && <p role="note" className="rounded-xl border border-warn/20 bg-warn/5 p-4 text-sm text-fg-muted">Hudl has not marked this tag timeline as synced. You can still stream or download the full match. Tagged moment and player downloads are unavailable until verified timings are available.</p>}
        {!moments.length && match.tag_status !== 'unsynced' && <p className="text-sm text-fg-muted">Tags load and cache when you open this match, independently of full-match downloads. Videos without supported tags can still stream.</p>}
        <ul className="grid max-h-[600px] gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">{filtered.map(m => <li aria-current={current?.id === m.id ? true : undefined} className={`tile flex items-center gap-3 p-3 ${current?.id === m.id ? 'border-2 border-ok shadow-[0_0_0_1px_var(--color-ok)]' : ''}`} key={m.id}><input type="checkbox" aria-label={`Select ${m.category} at ${formatClock(m.time_s)}`} checked={selected.includes(m.id)} onChange={e => setSelected(s => e.target.checked ? [...s, m.id] : s.filter(x => x !== m.id))} /><button className="min-w-0 flex-1 text-left" onClick={() => { setQueue(undefined); markHudlMomentWatched(m.id); setSeek({ time: m.time_s, nonce: Date.now() }); }}><span className="text-xs text-pin">{formatClock(m.time_s)}</span><span className="block truncate text-sm">{m.category}</span></button><Play size={14} /></li>)}</ul>
      </section>
    </div>
    {asking && <DownloadChoice count={chosen.length} onChoose={download} onCancel={() => setAsking(false)} />}
  </div>;
}
