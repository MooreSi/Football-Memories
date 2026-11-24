import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useVeoLibrary, veoRequest, type VeoStatus } from "../../api/veo";
import { Button } from "../ui/Button";
import { BASE, csrfToken } from "./useLabData";

type Status = VeoStatus & { analysis_ticket?: string | null };
/** Uses the same permission-guarded helper and serialized Veo operation as the library. */
export function VeoAnalysisPicker({busy,onQueued}:{busy:boolean;onQueued:(id:string)=>void}) {
  const library=useVeoLibrary();
  const matches=Array.isArray(library.data)?library.data:[];
  const [match,setMatch]=useState("");
  const [minutes,setMinutes]=useState("10"),[start,setStart]=useState("0");
  const [pending,setPending]=useState<{match:string;serial:number}|null>(null),[error,setError]=useState("");
  const importing=useRef(false);
  const status=useQuery({queryKey:["video-lab-veo-preparation",pending],enabled:!!pending,retry:false,queryFn:()=>veoRequest<Status>("/account"),refetchInterval:1500});
  const chosen=matches.find(m=>m.id===match),duration=Number(minutes)*60,offset=Number(start)*60;
  const valid=chosen?.available && Number.isInteger(Number(minutes)) && duration>=60 && duration<=600 && Number.isFinite(offset) && offset>=0 && (!chosen.duration_s || offset+duration<=chosen.duration_s+0.1);
  const begin=useMutation({mutationFn:()=>veoRequest("/action",{action:"analysis",match_id:match,start_s:offset,duration_s:duration}),onSuccess:()=>{ importing.current=false;setPending({match,serial:Date.now()});setError(""); },onError:e=>setError(e.message)});
  useEffect(()=>{
    const current=status.data;
    if(!pending || importing.current || !current || current.busy) return;
    if(current.state==="error") {setError(current.message);setPending(null);return;}
    if(current.state!=="done" || current.match_id!==pending.match || !current.analysis_ticket) return;
    importing.current=true;
    void (async()=>{
      try {
        const response=await fetch(BASE+"/veo-jobs",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json","X-CSRF-Token":await csrfToken()},body:JSON.stringify({ticket:current.analysis_ticket})});
        if(!response.ok) throw new Error(response.status===409?"Another analysis is running, or the clip could not be verified. Retry when it finishes.":"The clip could not be added to Video Lab.");
        onQueued((await response.json() as {id:string}).id);
      } catch(e) {setError(e instanceof Error?e.message:"Clip import failed.");}
      finally {setPending(null);}
    })();
  },[pending,status.data,onQueued]);
  return <section className="panel space-y-3 p-4" aria-label="Analyse a Veo match">
    <h2 className="font-semibold">Analyse a Veo match</h2>
    <div className="flex flex-wrap items-end gap-3">
      <label className="min-w-0 basis-full flex-1 text-sm sm:basis-0">Veo match{library.isPending ? <p className="mt-1 text-xs text-fg-muted">Loading cached Veo matches…</p> : <select className="mt-1 block w-full min-w-0 rounded-lg border border-line bg-ink-900 p-2" value={match} disabled={!!pending||begin.isPending} onChange={e=>setMatch(e.target.value)}>
        <option value="">Choose from your Veo library…</option>{matches.map(m=><option key={m.id} value={m.id} disabled={!m.available}>{m.title}{!m.available?" · unavailable":""}</option>)}
      </select>}</label>
      <label className="text-sm">Start minute<input type="number" min={0} step={1} value={start} onChange={e=>setStart(e.target.value)} disabled={!!pending} className="mt-1 block w-24 rounded-lg border border-line bg-ink-900 p-2"/></label>
      <label className="text-sm">Minutes to analyse<input type="number" min={1} max={10} step={1} value={minutes} onChange={e=>setMinutes(e.target.value)} disabled={!!pending} className="mt-1 block w-24 rounded-lg border border-line bg-ink-900 p-2"/></label>
      <Button variant="primary" disabled={!valid||busy||!!pending||begin.isPending} onClick={()=>begin.mutate()}>{pending?"Preparing clip…":begin.isPending?"Starting…":"Analyse selected match"}</Button>
    </div>
    <p className="text-xs text-fg-muted">Choose 1–10 minutes anywhere in the match. The lab prepares camera tracking and multiple player views; your full match is kept.</p>
    {library.isError && <p className="text-sm text-warn">Veo library unavailable. Check Connections and refresh your Veo matches.</p>}
    {!!pending && <p role="status" className="text-sm text-accent">{status.data?.message || "Preparing the selected window…"}</p>}
    {(error||status.isError) && <p role="alert" className="text-sm text-warn">{error||"Could not check the Veo preparation. Reopen the page and retry."}</p>}
  </section>;
}
