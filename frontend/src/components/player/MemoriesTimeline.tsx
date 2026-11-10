import { useQuery } from '@tanstack/react-query';
import { Heart, Images, Play } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { formatClock, formatDate } from '../../lib/format';
import type { HudlPlayerMatch } from '../../lib/hudlPlayer';
import { watchedHudlMoments } from '../../lib/hudlWatched';
import { groupTimeline } from '../../lib/player';
import { Spinner } from '../ui/Spinner';

type Memory = {id:string; href:string; time:number; label:string; viewed:boolean; favourite?:boolean};
type Match = {id:string; season:string; date:string; opponent:string; subtitle:string; href:string; thumbnail?:string|null; remote?:boolean; moments:Memory[]};

function MemoryMatch({match:m}:{match:Match}) {
 const [expanded,setExpanded]=useState(false);
 const visible=expanded?m.moments:m.moments.slice(0,6);
 return <article className="tile min-w-0 overflow-hidden p-4">
  <div className="mb-4 flex items-start gap-3">
   <Link to={m.href} aria-label={`Open match vs ${m.opponent}`} className="grid aspect-video w-24 shrink-0 place-items-center overflow-hidden rounded-xl bg-ink-800 sm:w-32">
    {m.thumbnail?<img src={m.thumbnail} crossOrigin={m.remote?'anonymous':undefined} alt="" loading="lazy" className="size-full object-cover"/>:<Images size={22} className="text-fg-subtle"/>}
   </Link>
   <div className="min-w-0 flex-1"><h5 className="truncate font-semibold">vs {m.opponent}</h5><p className="mt-1 text-xs text-fg-muted">{m.date?formatDate(m.date):'Date unknown'} · {m.subtitle}</p><p className="mt-2 text-xs text-fg-subtle">{m.moments.length} moments · {m.moments.filter(x=>!x.viewed).length} unwatched</p></div>
  </div>
  <ul aria-label={`Moments vs ${m.opponent}`} className="grid gap-2 sm:grid-cols-2">
   {visible.map(x=><li key={x.id}><Link to={x.href} aria-label={`${formatClock(x.time)} ${x.label}`} className="flex min-w-0 items-center gap-2 rounded-lg border border-line bg-white/[0.02] px-3 py-2 text-xs hover:border-accent/50">
    <Play size={11} className="shrink-0 text-fg-subtle"/><span className="font-mono text-pin">{formatClock(x.time)}</span><span className={`truncate ${x.viewed?'text-fg-muted':'text-fg'}`}>{x.label}</span>{x.favourite&&<Heart size={11} className="ml-auto shrink-0 fill-danger text-danger" aria-label="favourite"/>}
   </Link></li>)}
  </ul>
  {m.moments.length>6&&<button className="mt-3 text-xs font-semibold text-accent hover:underline" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}>{expanded?'Show fewer moments':`Show all ${m.moments.length} moments`}</button>}
 </article>;
}

/** One chronological season/month stream; all tags remain one click away. */
export function MemoriesTimeline({playerId,categories,hudl=[]}:{playerId:number;categories:string[];hudl?:HudlPlayerMatch[]}) {
 const [view,setView]=useState<'all'|'favourites'|'unwatched'>('all');const [category,setCategory]=useState('');const [limit,setLimit]=useState(12);
 const q=useQuery({queryKey:['player',playerId,'timeline',view,category],queryFn:()=>api.playerMoments(playerId,{category:category||undefined,favourites:view==='favourites',unwatched:view==='unwatched'})});
 const watched=watchedHudlMoments();
 const offline:Match[]=groupTimeline(q.data?.items??[]).flatMap(s=>s.months.flatMap(mo=>mo.matches.map(m=>({id:`offline-${m.match_id}`,season:s.season,date:m.match_date,opponent:m.opponent,subtitle:`${m.team_name}${m.age_group?` ${m.age_group}`:''} · Offline`,href:`/matches/${m.match_id}`,thumbnail:m.thumbnail_url,moments:m.moments.map(x=>({id:String(x.event_id),href:`/matches/${x.match_id}?moment=${x.event_id}`,time:x.time_s,label:x.category,viewed:x.viewed,favourite:x.favourite}))}))));
 const remote:Match[]=view==='favourites'?[]:hudl.map(m=>({id:`hudl-${m.id}`,season:m.season,date:m.date??'',opponent:m.opponent,subtitle:`${m.age} · Hudl`,href:`/hudl/${encodeURIComponent(m.id)}?player=${encodeURIComponent(m.moments[0]?.category??'')}`,thumbnail:m.thumbnail_url,remote:true,moments:m.moments.filter(x=>(!category||x.category===category)&&(view!=='unwatched'||!watched.has(x.id))).map(x=>({id:x.id,href:`/hudl/${encodeURIComponent(m.id)}?moment=${encodeURIComponent(x.id)}`,time:x.time_s,label:x.category,viewed:watched.has(x.id)}))})).filter(m=>m.moments.length);
 const matches=[...offline,...remote].sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id));
 const shown=matches.slice(0,limit);
 const seasons=[...new Set(shown.map(m=>m.season))].sort().reverse();
 return <section aria-label="Memories timeline" className="panel min-w-0 p-5 sm:p-6">
  <header className="mb-6 flex flex-wrap items-center gap-3"><div className="mr-auto"><p className="screen-eyebrow mb-1">THE JOURNEY</p><h2 className="text-xl font-semibold">Memories timeline</h2><p className="mt-1 text-sm text-fg-muted">{matches.length} matches · A season of moments, one game at a time.</p></div>
   <div role="tablist" aria-label="Timeline view" className="flex flex-wrap rounded-full border border-line p-1 text-xs">{(['all','favourites','unwatched'] as const).map(v=><button key={v} role="tab" aria-selected={v===view} onClick={()=>{setView(v);setLimit(12);}} className={`rounded-full px-3 py-2 capitalize ${v===view?'bg-blue-600 text-white':'text-fg-muted'}`}>{v==='all'?'All moments':v}</button>)}</div>
   <label><span className="sr-only">Event type</span><select className="field w-auto max-w-full rounded-full" value={category} onChange={e=>{setCategory(e.target.value);setLimit(12);}}><option value="">All event types</option>{categories.map(c=><option key={c}>{c}</option>)}</select></label>
  </header>
  {q.isPending?<Spinner label="Loading memories"/>:q.isError?<p role="alert" className="text-sm text-danger">Offline memories could not load. {q.error.message}</p>:null}
  {!q.isPending&&!matches.length&&<p className="py-10 text-center text-sm text-fg-muted">{view==='favourites'?'No favourites yet. Tap the heart on a moment to keep it here.':view==='unwatched'?'You have watched every moment.':'No moments yet.'}</p>}
  <ol className="space-y-8">{seasons.map(season=><li key={season}>
   <div className="mb-5 flex items-center gap-3"><h3 className="text-base font-semibold">Season {season}</h3><span className="text-xs text-fg-subtle">{matches.filter(m=>m.season===season).length} matches</span><span className="h-px flex-1 bg-line"/></div>
   <ol className="space-y-6">{[...new Set(shown.filter(m=>m.season===season).map(m=>m.date.slice(0,7)))].map(month=><li key={month}>
    <h4 className="mb-3 text-xs font-semibold uppercase tracking-widest text-fg-subtle">{month?new Date(month+'-01T12:00:00').toLocaleDateString(undefined,{month:'long',year:'numeric'}):'Undated matches'}</h4>
    <div className="grid gap-4 lg:grid-cols-2">{shown.filter(m=>m.season===season&&m.date.slice(0,7)===month).map(m=><MemoryMatch key={m.id} match={m}/>)}</div>
   </li>)}</ol>
  </li>)}</ol>
  {shown.length<matches.length&&<div className="mt-5 text-center"><button className="rounded-full border border-line px-5 py-2 text-sm text-fg-muted hover:border-accent/50" onClick={()=>setLimit(n=>n+12)}>Show more matches</button><p className="mt-2 text-xs text-fg-subtle">{shown.length} of {matches.length} matches</p></div>}
 </section>;
}
