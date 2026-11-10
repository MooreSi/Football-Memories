import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, UserRound } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { hudlBlocked, hudlRequest, useHudlLibrary, useHudlStatus } from '../api/hudl';
import { TaggedPlayerPicker } from '../components/player/TaggedPlayerPicker';
import { Button } from '../components/ui/Button';

/** Every cached Hudl match where the chosen player code is tagged. */
export function HudlPlayerPage() {
  const name = useParams().name!;
  const library = useHudlLibrary();
  const status = useHudlStatus();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const all = library.data || [];
  const matches = all.filter(m => m.moments?.some(t => t.category === name));
  const indexed = all.filter(m => m.tag_status || m.moments?.length).length;
  const unreadable = all.filter(m => m.tag_status === 'unavailable').length;
  const hub = useMutation({
    mutationFn: () => api.playerFromHudlTag(name),
    onSuccess: r => { localStorage.removeItem('fm.hudl.player'); void qc.invalidateQueries(); navigate(`/player/${r.player_id}`); },
  });
  const sync = useMutation({
    mutationFn: () => hudlRequest('/account/action', { action: 'sync_tags' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hudl-account'] }),
  });
  return <div className="space-y-5">
    <header className="flex flex-wrap items-end gap-4">
      <div className="mr-auto"><p className="screen-eyebrow">MY PLAYER · VIDEO TAGS</p><h1 className="text-3xl font-semibold">{name}</h1>
        <p className="mt-2 text-sm text-fg-muted">Tagged in {matches.length} {matches.length === 1 ? 'match' : 'matches'} · Highest-quality streaming and downloads</p></div>
      <Button variant="primary" disabled={hub.isPending} onClick={() => hub.mutate()}><UserRound size={16} /> Player hub: photo & details</Button>
    </header>
    {hub.isError && <p role="alert" className="text-danger">{hub.error.message}</p>}
    {all.length > 0 && <div className="panel flex flex-wrap items-center gap-3 p-4 text-sm">
      <p className="mr-auto text-fg-muted">Tags indexed for {indexed} of {all.length} matches{unreadable ? ` (${unreadable} ${unreadable === 1 ? 'video has' : 'videos have'} no readable tags and will be retried in a week)` : ''}. {status.data?.syncing ? status.data.message : indexed < all.length ? 'Tags for new matches are recorded automatically after each Hudl refresh (metadata only, no video).' : 'Every cached match is indexed.'}</p>
      {indexed < all.length && !status.data?.syncing && <Button disabled={hudlBlocked(status.data) || sync.isPending} onClick={() => sync.mutate()}><RefreshCw size={14} /> Index remaining matches</Button>}
    </div>}
    {sync.isError && <p role="alert" className="text-danger">{sync.error.message}</p>}
    <TaggedPlayerPicker />
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{matches.map(m => <Link key={m.id} to={`/hudl/${encodeURIComponent(m.id)}?player=${encodeURIComponent(name)}`} className="panel overflow-hidden">{m.thumbnail_url && <img crossOrigin="anonymous" src={m.thumbnail_url} alt="" className="aspect-video w-full object-cover" />}<div className="space-y-2 p-4"><h2 className="font-semibold">{m.title}</h2><p className="text-sm text-fg-muted">{m.moments?.filter(t => t.category === name).length} tagged moments</p><p className="text-sm text-accent">Watch / download player moments →</p></div></Link>)}</div>
  </div>;
}
