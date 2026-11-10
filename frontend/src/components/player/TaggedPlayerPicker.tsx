import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useHudlLibrary } from '../../api/hudl';
import { Button } from '../ui/Button';
export function TaggedPlayerPicker(){
 const navigate=useNavigate();const qc=useQueryClient();const [code,setCode]=useState('');
 const tags=useQuery<{name:string;moments:number;matches:number}[]>({queryKey:['tagged-player-codes'],queryFn:async()=>{const r=await fetch('/api/players/tagged-codes');if(!r.ok)throw new Error('Tags unavailable');return r.json();},retry:false});
 const remote=useHudlLibrary();const names=[...new Set([...(tags.data||[]).map(t=>t.name),...(remote.data||[]).flatMap(m=>(m.moments||[]).map(t=>t.category))])].sort();
 const pick=useMutation({mutationFn:async()=>{if(!(tags.data||[]).some(t=>t.name===code)){const r=await api.playerFromHudlTag(code);localStorage.removeItem('fm.hudl.player');return '/player/'+r.player_id;}const r=await fetch('/api/players/from-tag',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({category:code})});const d=await r.json();if(!r.ok)throw new Error(d.detail);localStorage.removeItem('fm.hudl.player');return '/player/'+d.player_id;},onSuccess:path=>{void qc.invalidateQueries();navigate(path);}});
 return <section className="panel mb-6 space-y-3 p-5" aria-label="Choose from video tags"><h2 className="font-semibold">Choose a tagged player</h2><p className="text-sm text-fg-muted">Select your player's exact code from the videos. This explicitly identifies that code as your player; other overlapping tags are not attributed to them. Tags for every Hudl match are indexed automatically after each refresh.</p><div className="flex flex-wrap gap-3"><select className="field max-w-md" aria-label="Player from video tags" value={code} onChange={e=>setCode(e.target.value)}><option value="">Select a tagged name…</option>{names.map(n=><option key={n}>{n}</option>)}</select><Button variant="primary" disabled={!code||pick.isPending} onClick={()=>pick.mutate()}>Choose tagged player</Button></div>{pick.isError&&<p role="alert" className="text-danger">{pick.error.message}</p>}</section>;
}
