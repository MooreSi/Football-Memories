import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Film, RefreshCw } from 'lucide-react';
import { hudlRequest, useHudlLibrary, useHudlStatus } from '../../api/hudl';
import { Button } from '../ui/Button';
export function HudlLibrary(){
 const library=useHudlLibrary();const status=useHudlStatus();const qc=useQueryClient();
 const [age,setAge]=useState(()=>localStorage.getItem('fm.hudl.age')||'');
 const refresh=useMutation({mutationFn:()=>hudlRequest('/account/action',{action:'refresh'}),onSuccess:()=>qc.invalidateQueries({queryKey:['hudl-account']})});
 useEffect(()=>{if(status.data&&!status.data.busy)void qc.invalidateQueries({queryKey:['hudl-library']});},[status.data?.busy,qc]);
 if(library.isError||!library.data?.length)return null;
 const groups=[...new Set(library.data.map(m=>m.age_group))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
 const matches=library.data.filter(m=>!age||m.age_group===age);
 return <section aria-label="Hudl match library" className="panel space-y-4 p-5" style={{gridColumn:'1 / -1',gridRow:2}}>
  <div className="flex flex-wrap items-center gap-3"><div className="mr-auto"><p className="screen-eyebrow">CONNECTED LIBRARY</p><h2 className="text-xl font-semibold">Your Hudl matches</h2></div>
  <label className="text-sm">Age group<select aria-label="Hudl age group" className="field mt-1 w-auto" value={age} onChange={e=>{setAge(e.target.value);localStorage.setItem('fm.hudl.age',e.target.value);}}><option value="">All age groups</option>{groups.map(g=><option key={g}>{g}</option>)}</select></label>
  <Button disabled={status.data?.busy||refresh.isPending} onClick={()=>refresh.mutate()}><RefreshCw size={15}/> Refresh Hudl</Button></div>
  <p className="text-xs text-fg-muted">{matches.length} cached videos · Age groups from video titles · Opens at highest available quality</p>
  {status.data?.busy&&<p role="status" className="text-xs text-accent">{status.data.message}</p>}
  {refresh.isError&&<p role="alert" className="text-sm text-danger">{refresh.error.message}</p>}
  <div className="grid max-h-[660px] gap-4 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{matches.map(m=><article key={m.id} className="tile overflow-hidden"><Link to={`/hudl/${encodeURIComponent(m.id)}`} className="block"><div className="aspect-video bg-ink-950">{m.thumbnail_url?<img crossOrigin="anonymous" src={m.thumbnail_url} alt={m.title} loading="lazy" className="h-full w-full object-cover"/>:<div className="grid h-full place-items-center text-fg-subtle"><Film size={32}/><span className="text-xs">Refresh to cache thumbnail</span></div>}</div><div className="space-y-2 p-3"><p className="text-xs text-accent">{m.age_group} · Hudl</p><h3 className="text-sm font-semibold">{m.title}</h3><p className="text-xs text-fg-muted">Watch match · Download match or tagged moments</p></div></Link></article>)}</div>
 </section>;
}
