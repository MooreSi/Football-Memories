import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Film, FlaskConical } from "lucide-react";
import { Button } from "../components/ui/Button";

import { VideoReviewPanel } from "../components/VideoReviewPanel";

const BASE="/_admin/api/video-analytics";
type Sample={id:string;label:string;duration_s:number;source_offset_s:number};
type Summary={sampled_frames:number;person_detections:number;ball_detections:number;unique_tracklets:number;ball_observation_coverage:number;football_events_confirmed:number;elapsed_s?:number;quality?:string};
type Job={id:string;sample_id?:string;state:string;progress:number;summary?:Summary;artifacts?:string[];error?:string};
async function get<T,>(path:string):Promise<T>{
 const response=await fetch(BASE+path,{credentials:"same-origin",cache:"no-store"});
 if(!response.ok)throw new Error("Local video analysis is unavailable. Please retry when the worker is connected.");
 return response.json() as Promise<T>;
}
export default function VideoLabPage(){
 const cache=useQueryClient();
 const video=useRef<HTMLVideoElement>(null);
 const [at,setAt]=useState(0);
 const [sample,setSample]=useState("");
 const [selected,setSelected]=useState<string|null>(null);
 const samples=useQuery({queryKey:["video-lab-samples"],queryFn:()=>get<Sample[]>("/samples"),retry:false});
 const jobs=useQuery({queryKey:["video-lab-jobs"],queryFn:()=>get<Job[]>("/jobs"),retry:false});
 const job=useQuery({queryKey:["video-lab-job",selected],queryFn:()=>get<Job>(`/jobs/${selected}`),enabled:!!selected,retry:false,
  refetchInterval:q=>["queued","running"].includes(q.state.data?.state??"")?2000:false});
 useEffect(()=>{if(!selected&&jobs.data?.length)setSelected(jobs.data[0].id);},[jobs.data,selected]);
 const submit=useMutation({mutationFn:async()=>{
  const me=await fetch("/_portal/api/me",{credentials:"same-origin",cache:"no-store"});
  if(!me.ok)throw new Error("Please sign in again.");
  const identity=await me.json() as {csrf_token:string};
  const response=await fetch(BASE+"/jobs",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json","X-CSRF-Token":identity.csrf_token},body:JSON.stringify({sample_id:sample||samples.data?.[0]?.id})});
  if(!response.ok)throw new Error(response.status===409?"An analysis is already queued or running.":"Could not start analysis.");
  return response.json() as Promise<Job>;
 },onSuccess:data=>{setSelected(data.id);cache.setQueryData(["video-lab-job",data.id],data);void cache.invalidateQueries({queryKey:["video-lab-jobs"]});}});
 const active=job.data;
 const running=active&&["queued","running"].includes(active.state);
 const error=samples.error||jobs.error||job.error||submit.error;
 const summary=active?.summary;
 const chosen=samples.data?.find(s=>s.id===sample)||samples.data?.[0];
 const duration=chosen?.duration_s??120;
 const durationLabel=duration===120?"two minutes":`${duration/60} minutes`;
 return <div className="mx-auto w-full max-w-6xl space-y-6 pb-10">
  <header><p className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest text-accent"><FlaskConical size={16} aria-hidden/>Private admin preview · local processing</p><h1 className="text-3xl font-semibold">Video analysis lab</h1><p className="mt-3 max-w-3xl text-sm text-fg-muted">Explore what the camera can see. Analyse a Veo sample of up to ten minutes, inspect the detections and download the video and metadata.</p></header>
  {error&&<p role="alert" className="panel p-4 text-warn">{error.message}</p>}
  <div className="grid min-w-0 gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
   <aside className="panel min-w-0 space-y-5 p-5"><h2 className="font-semibold">Sample footage</h2>
    <label className="block text-sm">Veo sample<select className="mt-2 w-full rounded-lg border border-line bg-ink-900 p-2" value={sample||samples.data?.[0]?.id||""} onChange={e=>setSample(e.target.value)}>
     {samples.data?.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
    </select></label>
    <p className="text-xs leading-relaxed text-fg-muted">{duration}-second local sample. Originals stay unchanged. Processing runs on this Mac.</p>
    <Button onClick={()=>submit.mutate()} disabled={!samples.data?.length||submit.isPending||!!running}>{submit.isPending?"Queueing…":`Analyse ${durationLabel}`}</Button>
    {active&&<div role="status" className="space-y-2"><p className="text-sm capitalize">{active.state} · {Math.round((active.progress||0)*100)}%</p><progress className="h-2 w-full accent-blue-500" aria-label="Analysis progress" max={1} value={active.progress||0}/>{active.error&&<p className="text-sm text-warn">{active.error}</p>}</div>}
    {!!jobs.data?.length&&<div className="space-y-2"><h3 className="text-xs uppercase tracking-wider text-fg-muted">Previous runs</h3>{jobs.data.map(j=><button key={j.id} onClick={()=>setSelected(j.id)} className="block w-full rounded-lg border border-line p-2 text-left text-xs">{j.id.slice(0,8)} · {j.state}</button>)}</div>}
   </aside>
   <section className="min-w-0 space-y-5" aria-label="Analysis results">
    <div className="panel overflow-hidden p-3">{active?.state==="complete"&&active.artifacts?.includes("annotated.mp4")?<video ref={video} onTimeUpdate={e=>setAt(e.currentTarget.currentTime)} className="aspect-video w-full rounded-xl bg-black" controls preload="metadata" src={`${BASE}/jobs/${active.id}/files/annotated.mp4`} aria-label="Annotated Veo sample"/>:<div className="flex aspect-video flex-col items-center justify-center gap-3 rounded-xl bg-black/40 p-5 text-center text-fg-muted"><Film size={36} aria-hidden/><p>{running?"Analysing the sample…":"Your annotated video will appear here."}</p></div>}</div>
    {summary&&<><dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[["Sampled frames",summary.sampled_frames],["Person detections",summary.person_detections],["Ball detections",summary.ball_detections],["Short tracklets",summary.unique_tracklets]].map(([label,value])=><div className="panel min-w-0 p-4" key={label}><dt className="text-xs text-fg-muted">{label}</dt><dd className="mt-2 text-2xl font-semibold">{Number(value).toLocaleString()}</dd></div>)}</dl>
    <div className="panel p-5"><h2 className="font-semibold">What these results mean</h2><p className="mt-2 text-sm leading-relaxed text-fg-muted">No confirmed football events are produced automatically. Review model suggestions and verify player labels below. People may include referees and spectators. Tracklets are temporary tracks, not named players. Ball proximity does not establish possession, passes or tackles.</p><p className="mt-3 text-sm">Ball observed in {(summary.ball_observation_coverage*100).toFixed(1)}% of sampled frames{summary.elapsed_s!==undefined?` · Processing time ${Math.round(summary.elapsed_s)} seconds`:""}.</p>{summary.quality==="insufficient_ball_evidence"&&<p className="mt-2 text-sm text-warn">Insufficient ball evidence for reliable action analysis.</p>}</div></>}
    {active?.state==="complete"&&<VideoReviewPanel key={active.id} jobId={active.id} hasSuggestions={active.artifacts?.includes("event_suggestions.json")} hasJerseys={active.artifacts?.includes("jersey_candidates.json")} at={at} onSeek={time=>{if(video.current){video.current.currentTime=time;setAt(time);}}}/>}
    {active?.state==="complete"&&<div className="panel p-5"><h2 className="mb-3 font-semibold">Download results</h2><div className="flex flex-wrap gap-3">{active.artifacts?.map(name=><a key={name} className="inline-flex max-w-full items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm hover:border-accent" href={`${BASE}/jobs/${active.id}/files/${name}`} download><Download size={14} aria-hidden/><span className="break-all">Download {name}</span></a>)}</div></div>}
   </section>
  </div>
 </div>;
}
