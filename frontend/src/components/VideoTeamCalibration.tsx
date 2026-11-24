import { useEffect, useState } from "react";
import {useVideoMetadata} from "./VideoMetadataSidebar";
import { Button } from "./ui/Button";

type Queued = {id:string;state?:string};
export function VideoTeamCalibration({jobId,sourceHash,onQueued,artifacts=[]}:{jobId:string;sourceHash:string;artifacts?:string[];onQueued:(job:Queued)=>void}){
 const metadata=useVideoMetadata({jobId,artifacts});
 const [own,setOwn]=useState("");const [opponent,setOpponent]=useState("");
 const [ownLabel,setOwnLabel]=useState("Our team");const [opponentLabel,setOpponentLabel]=useState("Opponent");
 const [busy,setBusy]=useState(false);const [error,setError]=useState("");
 useEffect(()=>{
  const teams=metadata.data?.teams?.teams;
  const ours=teams?.find(t=>t.source_side==="own");const theirs=teams?.find(t=>t.source_side==="opponent");
  if(ours){setOwn(ours.colour_hex);setOwnLabel(ours.label);}
  if(theirs){setOpponent(theirs.colour_hex);setOpponentLabel(theirs.label);}
 },[metadata.data]);
 const valid=/^#[0-9a-fA-F]{6}$/.test(own)&&/^#[0-9a-fA-F]{6}$/.test(opponent)&&own.toLowerCase()!==opponent.toLowerCase()&&!!ownLabel.trim()&&!!opponentLabel.trim();
 async function apply(){
  if(!valid)return;
  setBusy(true);setError("");
  try{
   const identity=await fetch("/_portal/api/me",{credentials:"same-origin",cache:"no-store"});
   if(!identity.ok)throw new Error("Please sign in again.");
   const me=await identity.json() as {csrf_token:string};
   const response=await fetch(`/_admin/api/video-analytics/jobs/${jobId}/team-calibration`,{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json","X-CSRF-Token":me.csrf_token},body:JSON.stringify({source_sha256:sourceHash,kits:[{id:"own",label:ownLabel.trim(),colour_hex:own},{id:"opponent",label:opponentLabel.trim(),colour_hex:opponent}]})});
   if(!response.ok)throw new Error(response.status===409?"An analysis is already running or video changed. Reload before retrying.":"Team colours could not be applied. Check the colours and try again.");
   onQueued(await response.json() as Queued);
  }catch(e){setError(e instanceof Error?e.message:"Team colours could not be applied.");}
  finally{setBusy(false);}
 }
 return <section className="panel min-w-0 space-y-4 p-5" aria-label="Team jersey tagging">
  <h2 className="font-semibold">Tag team jerseys</h2>
  <p className="text-sm text-fg-muted">Pause on a clear frame and choose each team's shirt colour as it appears in the video. Player candidates are tagged to that team when pitch, colour and track evidence agree. Referees, goalkeepers and uncertain people can remain unassigned.</p>
  <div className="grid min-w-0 gap-4 sm:grid-cols-2">{[{side:"Our team",name:ownLabel,setName:setOwnLabel,colour:own,setColour:setOwn},{side:"Opponent",name:opponentLabel,setName:setOpponentLabel,colour:opponent,setColour:setOpponent}].map(team=><fieldset key={team.side} className="min-w-0 space-y-3 rounded-lg border border-line p-3"><legend className="px-1 text-sm">{team.side}</legend><label className="block text-sm">{team.side} name<input className="mt-1 w-full min-w-0 rounded-lg border border-line bg-ink-900 p-2" maxLength={100} value={team.name} onChange={e=>team.setName(e.target.value)}/></label><label className="flex flex-wrap items-center justify-between gap-2 text-sm">{team.side} jersey colour<input type="color" className="h-10 w-16 shrink-0 rounded border border-line" value={/^#[0-9a-fA-F]{6}$/.test(team.colour)?team.colour:"#000000"} onChange={e=>team.setColour(e.target.value)}/></label><label className="block text-xs text-fg-muted">{team.side} jersey hex value<input className="mt-1 w-full min-w-0 rounded-lg border border-line bg-ink-900 p-2 text-sm" maxLength={7} placeholder="#RRGGBB" value={team.colour} onChange={e=>team.setColour(e.target.value.toLowerCase())}/></label></fieldset>)}</div>
  <p className="text-xs text-fg-muted">Applying colours creates a new run from the cached detections. Original videos, results and reviews stay unchanged; detector inference is reused. Team-tagged actions still require a verified actor.</p>
  <Button disabled={!valid||busy} onClick={()=>void apply()}>{busy?"Queueing…":"Apply jersey colours"}</Button>
  {error&&<p role="alert" className="text-sm text-warn">{error}</p>}
 </section>;
}
