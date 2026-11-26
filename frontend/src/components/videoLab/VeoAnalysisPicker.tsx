import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useVeoLibrary, veoRequest, type VeoStatus } from "../../api/veo";
import { hudlAgeGroups, hudlRequest, useHudlLibrary, type HudlStatus } from "../../api/hudl";
import { Button } from "../ui/Button";
import { BASE, csrfToken } from "./useLabData";
import { AnalysisProgress } from "./AnalysisProgress";
import { scanPlan } from "./preAnalysis";

type Status = (VeoStatus | HudlStatus) & { analysis_ticket?: string | null; progress?: { fraction?: number } | null };
type Source = "veo" | "hudl";
type Choice = { id: string; title: string; available: boolean; duration_s?: number | null; halves?: number[][] };
/** Owner request 2026-11-26: Hudl games of this season's U11 team, kept in their own group. */
export const HUDL_AGE = "U11", HUDL_SEASON = "2026/27";
const HUDL_PREFIX = "hudl:";
/** Uses the same permission-guarded helpers and serialized source operations as the library. */
export function VeoAnalysisPicker({busy,onQueued}:{busy:boolean;onQueued:(id:string)=>void}) {
  const library=useVeoLibrary(), hudlLibrary=useHudlLibrary();
  const veoMatches:Choice[]=Array.isArray(library.data)?library.data:[];
  const hudlMatches:Choice[]=(Array.isArray(hudlLibrary.data)?hudlLibrary.data:[])
    .filter(m=>m.source!=="veo" && m.season_label===HUDL_SEASON && hudlAgeGroups(m).includes(HUDL_AGE))
    .map(m=>({id:m.id,title:m.title,available:true,duration_s:m.duration_s}));
  const [selected,setMatch]=useState("");
  const source:Source=selected.startsWith(HUDL_PREFIX)?"hudl":"veo";
  const match=source==="hudl"?selected.slice(HUDL_PREFIX.length):selected;
  const matches=source==="hudl"?hudlMatches:veoMatches;
  const [minutes,setMinutes]=useState("10"),[start,setStart]=useState("0");
  const [pending,setPending]=useState<{match:string;source:Source;serial:number}|null>(null),[preWindow,setPreWindow]=useState<{start_s:number;duration_s:number}|null>(null),[error,setError]=useState("");
  const importing=useRef(false);
  const [importStage,setImportStage]=useState(false);
  const status=useQuery({queryKey:["video-lab-veo-preparation",pending],enabled:!!pending,retry:false,queryFn:()=>pending?.source==="hudl"?hudlRequest<Status>("/account"):veoRequest<Status>("/account"),refetchInterval:1500});
  const chosen=matches.find(m=>m.id===match),duration=Number(minutes)*60,offset=Number(start)*60;
  const valid=chosen?.available && Number.isInteger(Number(minutes)) && duration>=60 && duration<=600 && Number.isFinite(offset) && offset>=0 && (!chosen.duration_s || offset+duration<=chosen.duration_s+0.1);
  const blockedReason=busy ? "Another analysis is queued or running. This button will unlock automatically when it finishes."
    : chosen?.available && !valid ? (chosen.duration_s && offset+duration>chosen.duration_s+0.1
      ? "The selected window ends after this match. Choose an earlier start or fewer minutes."
      : "Choose a start of zero or later and 1–10 whole minutes to analyse.") : "";
  const plan=chosen?.available ? scanPlan(chosen.duration_s, chosen.halves) : null;
  const clock=(s:number)=>`${Math.floor(s/60)}:${String(Math.round(s%60)).padStart(2,"0")}`;
  const begin=useMutation({mutationFn:(window:{start_s:number;duration_s:number})=>{
    const body={action:"analysis",match_id:match,...window};
    return source==="hudl"?hudlRequest("/account/action",body):veoRequest("/action",body);
  },onSuccess:()=>{ importing.current=false;setPending({match,source,serial:Date.now()});setError(""); },onError:e=>setError(e.message)});
  useEffect(()=>{
    const current=status.data;
    if(!pending || importing.current || !current || current.busy) return;
    if(current.state==="error") {setError(current.message);setPending(null);return;}
    const imported=pending.source;
    if(current.state!=="done" || current.match_id!==pending.match || !current.analysis_ticket) return;
    importing.current=true;
    setImportStage(true);
    void (async()=>{
      try {
        const response=await fetch(BASE+(imported==="hudl"?"/hudl-jobs":"/veo-jobs"),{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json","X-CSRF-Token":await csrfToken()},body:JSON.stringify({ticket:current.analysis_ticket})});
        if(!response.ok) throw new Error(response.status===409?"Another analysis is running, or the clip could not be verified. Retry when it finishes.":"The clip could not be added to Video Lab.");
        onQueued((await response.json() as {id:string}).id);
      } catch(e) {setError(e instanceof Error?e.message:"Clip import failed.");}
      finally {setPending(null);setImportStage(false);}
    })();
  },[pending,status.data,onQueued]);
  return <section className="panel space-y-3 p-4" aria-label="Analyse a Match">
    <h2 className="font-semibold">Analyse a Match</h2>
    <div className="flex flex-wrap items-end gap-3">
      <label className="min-w-0 basis-full flex-1 text-sm sm:basis-0">Match{library.isPending && !hudlMatches.length ? <p className="mt-1 text-xs text-fg-muted">Loading cached matches…</p> : <select className="mt-1 block w-full min-w-0 rounded-lg border border-line bg-ink-900 p-2" value={selected} disabled={!!pending||begin.isPending} onChange={e=>setMatch(e.target.value)}>
        <option value="">Choose a match…</option>
        {veoMatches.length>0 && <optgroup label="Veo">{veoMatches.map(m=><option key={m.id} value={m.id} disabled={!m.available}>{m.title}{!m.available?" · unavailable":""}</option>)}</optgroup>}
        {hudlMatches.length>0 && <optgroup label={`Hudl · ${HUDL_AGE} ${HUDL_SEASON}`}>{hudlMatches.map(m=><option key={m.id} value={HUDL_PREFIX+m.id}>{m.title}</option>)}</optgroup>}
      </select>}</label>
      <label className="text-sm">Start minute<input type="number" min={0} step={1} value={start} onChange={e=>setStart(e.target.value)} disabled={!!pending} className="mt-1 block w-24 rounded-lg border border-line bg-ink-900 p-2"/></label>
      <label className="text-sm">Minutes to analyse<input type="number" min={1} max={10} step={1} value={minutes} onChange={e=>setMinutes(e.target.value)} disabled={!!pending} className="mt-1 block w-24 rounded-lg border border-line bg-ink-900 p-2"/></label>
      <Button variant="primary" aria-describedby={blockedReason ? "veo-analysis-blocked" : undefined} disabled={!valid||busy||!!pending||begin.isPending} onClick={()=>{setPreWindow(null);begin.mutate({start_s:offset,duration_s:duration});}}>{pending&&!preWindow?"Preparing clip…":begin.isPending?"Starting…":"Analyse selected match"}</Button>
      <Button aria-describedby="pre-analysis-plan" disabled={!plan||busy||!!pending||begin.isPending} onClick={()=>{if(!plan)return;const w={start_s:plan.start_s,duration_s:plan.duration_s};setPreWindow(w);begin.mutate(w);}}>{(pending||begin.isPending)&&preWindow?`Pre-analysing ${clock(preWindow.start_s)}–${clock(preWindow.start_s+preWindow.duration_s)}…`:"Pre-analysis"}</Button>
    </div>
    <p className="text-xs text-fg-muted">Choose 1–10 minutes anywhere in the match. Only the selected footage is fetched, plus the video index and a small seeking buffer; an existing saved match is reused. The lab prepares camera tracking and multiple player views.</p>
    {plan && <p id="pre-analysis-plan" className="text-xs text-fg-muted">Pre-analysis scans {clock(plan.start_s)}–{clock(plan.start_s+plan.duration_s)}: {plan.reason} It builds the stitched pitch, outline and bird's-eye, and finds people, the ball and look-alike groups; the run then shows a pre-analysis check.</p>}
    {blockedReason && <p id="veo-analysis-blocked" role="status" className="text-sm text-fg-muted">{blockedReason}</p>}
    {library.isError && <p className="text-sm text-warn">Veo library unavailable. Check Connections and refresh your Veo matches.</p>}
    {source==="hudl" && !!match && <p className="text-xs text-fg-muted">Hudl games open the match stream in the helper and fetch only the segments covering this window; nothing is saved to your downloads.</p>}
    {!!pending && <AnalysisProgress label={importStage ? "Adding clip to Video Lab" : "Preparing analysis clip"} fraction={importStage ? null : status.data?.progress?.fraction} detail={importStage ? "Transferring and verifying the selected clip…" : status.data?.message || "Connecting to the selected footage…"} />}
    {(error||status.isError) && <p role="alert" className="text-sm text-warn">{error||"Could not check the clip preparation. Reopen the page and retry."}</p>}
  </section>;
}
