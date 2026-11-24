import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

type Moment = {id?:string;source_id?:string;type?:string;source_label?:string;side?:string;time_s:number;source_time_s?:number};
type Track = {track_id:number;role:string;team_id:string|null;start_s:number;end_s:number;observations:number};
type Team = {id:string;label:string;colour_hex:string;person_observations:number;source_side?:string|null};
type Stats = {status:string;teams:Team[];roles:Record<string,number>;analysed:Record<string,Record<string,number>>;veo:Record<string,Record<string,number>>;proximity:Record<string,number>;tracks:Track[];limitations:string[]};
type Metadata = {veo?:{events:Moment[];highlights:Moment[]};actions?:Moment[];teams?:Stats;errors:string[]};
type Props = {jobId:string;artifacts:string[]};
type Item = {key:string;section:string;label:string;time:number;sourceTime?:number;detail?:string};
const BASE="/_admin/api/video-analytics/jobs/";
const text=(value:string)=>value==="official_candidate"?"referee candidate":value.replaceAll("_"," ");
const side=(value?:string)=>value==="own"?"Our":value==="opponent"?"Opponent":"Unassigned";
const time=(value:number)=>`${Math.floor(value/60)}:${Math.floor(value%60).toString().padStart(2,"0")}`;
const counts=(value:Record<string,number>|undefined)=>Object.entries(value??{}).map(([k,v])=>`${text(k)} ${v}`).join(" · ")||"None attributed";
export function useVideoMetadata({jobId,artifacts}:Props){
 const available=artifacts.filter(n=>["veo_tags.json","event_suggestions.json","team_stats.json"].includes(n)).sort();
 return useQuery({queryKey:["video-lab-metadata",jobId,available.join(",")],retry:false,queryFn:async()=>{
  const data:Metadata={errors:[]};
  await Promise.all(available.map(async name=>{
   try{
    const response=await fetch(`${BASE}${jobId}/files/${name}`,{credentials:"same-origin",cache:"no-store"});
    if(!response.ok)throw new Error("unavailable");
    const value:unknown=await response.json();
    if(name==="veo_tags.json"){
     const veo=value as Metadata["veo"];
     if(!veo||!Array.isArray(veo.events)||!Array.isArray(veo.highlights))throw new Error("invalid");
     data.veo=veo;
    }else if(name==="event_suggestions.json"){
     if(!Array.isArray(value))throw new Error("invalid");
     data.actions=value as Moment[];
    }else{
     const stats=value as Stats;
     if(!stats||!Array.isArray(stats.teams)||!Array.isArray(stats.tracks))throw new Error("invalid");
     data.teams=stats;
    }
   }catch{data.errors.push(name==="veo_tags.json"?"Veo metadata unavailable":name==="team_stats.json"?"Team metadata unavailable":"Analysed actions unavailable");}
  }));
  return data;
 }});
}
export function VideoMetadataSidebar(props:Props&{onSeek:(time:number)=>void}){
 const query=useVideoMetadata(props);
 const [filter,setFilter]=useState<string|null>(null);
 const [limit,setLimit]=useState(30);
 const items=useMemo(()=>{
  const result:Item[]=[];
  function add(rows:Moment[]|undefined,section:string,team=false){
   for(const [i,row] of (rows??[]).entries()){
    if(!Number.isFinite(row.time_s)||row.time_s<0)continue;
    const label=text(row.type??row.source_label??"other").toLowerCase();
    result.push({key:`${section}-${row.id??row.source_id??i}`,section,label:team?`${side(row.side)} ${label}`:label,time:row.time_s,sourceTime:row.source_time_s});
   }
  }
  add(query.data?.veo?.highlights,"Veo highlights");add(query.data?.veo?.events,"Veo team events",true);
  add(query.data?.actions,"Analysed actions");
  for(const [i,row] of (query.data?.teams?.tracks??[]).entries()){
   if(!Number.isFinite(row.start_s)||row.start_s<0)continue;
   const team=query.data?.teams?.teams.find(t=>t.id===row.team_id)?.label;
   result.push({key:`track-${i}`,section:"People and teams",label:team??text(row.role),time:row.start_s,detail:`Track ${row.track_id} · ${row.observations} sampled observations`});
  }
  return result.sort((a,b)=>a.time-b.time);
 },[query.data]);
 const groups=new Map<string,Map<string,number>>();
 for(const item of items){const group=groups.get(item.section)??new Map<string,number>();group.set(item.label,(group.get(item.label)??0)+1);groups.set(item.section,group);}
 const visible=items.filter(item=>!filter||`${item.section}:${item.label}`===filter);
 function choose(next:string|null){setFilter(next);setLimit(30);}
 const button=(active:boolean)=>`flex w-full min-w-0 items-center justify-between gap-3 px-4 py-3 text-left text-xs uppercase tracking-wide ${active?"bg-blue-600 text-white":"text-fg-muted hover:bg-white/5"}`;
 return <section className="min-w-0 border-t border-line pt-4" aria-label="Match metadata filters">
  <h2 className="px-4 pb-3 font-semibold">Match metadata</h2>
  <p className="px-4 pb-3 text-xs text-fg-muted">Veo tags and model suggestions await review. Counts describe records; sources may describe the same incident.</p>
  {query.isPending&&<p role="status" className="px-4 text-sm">Loading metadata…</p>}
  {query.data?.errors.map(error=><p key={error} role="status" className="px-4 py-2 text-xs text-warn">{error}. Other sources remain available.</p>)}
  <button className={button(!filter)} aria-pressed={!filter} onClick={()=>choose(null)}>All metadata <span>{items.length}</span></button>
  {[...groups].sort((a,b)=>["Veo highlights","Veo team events","Analysed actions","People and teams"].indexOf(a[0])-["Veo highlights","Veo team events","Analysed actions","People and teams"].indexOf(b[0])).map(([section,labels])=><div key={section} className="border-t border-line py-3"><h3 className="px-4 py-2 text-xs uppercase tracking-widest text-fg-subtle">{section}</h3>{[...labels].map(([label,count])=><button key={label} className={button(filter===`${section}:${label}`)} aria-label={`${section}: ${label} (${count})`} aria-pressed={filter===`${section}:${label}`} onClick={()=>choose(`${section}:${label}`)}><span className="min-w-0 break-words">{label}</span><span className="shrink-0 tabular-nums">{count}</span></button>)}</div>)}
  {!query.isPending&&items.length===0&&<p className="px-4 py-3 text-xs text-fg-muted">No timeline metadata is available for this run.</p>}
  {items.length>0&&<div className="space-y-2 border-t border-line p-3"><h3 className="text-sm font-semibold">Moments · {visible.length}</h3><p className="text-xs text-fg-muted">Select a moment to seek the video. People counts are track groups, not unique players.</p><div className="max-h-96 space-y-2 overflow-y-auto">{visible.slice(0,limit).map(item=><button key={item.key} onClick={()=>props.onSeek(item.time)} className="block w-full min-w-0 rounded-lg border border-line p-2 text-left text-xs hover:border-accent"><span className="block break-words text-accent">{item.label} · {time(item.time)}</span><span className="block text-fg-muted">{item.section}</span>{item.sourceTime!==undefined&&<span className="block text-fg-muted">Source time {time(item.sourceTime)}</span>}{item.detail&&<span className="block break-words text-fg-muted">{item.detail}</span>}</button>)}</div>{visible.length>limit&&<button className="text-sm text-accent underline" onClick={()=>setLimit(limit+30)}>Show more moments</button>}</div>}
 </section>;
}
export function VideoTeamStats(props:Props){
 const query=useVideoMetadata(props);const stats=query.data?.teams;const teachers=query.data?.veo?.events;
 const teacherCounts=stats?.veo??(teachers?teachers.reduce<Record<string,Record<string,number>>>((all,event)=>{const key=event.side==="own"||event.side==="opponent"?event.side:"unknown";const bucket=all[key]??{};const type=event.type??"other";bucket[type]=(bucket[type]??0)+1;all[key]=bucket;return all;},{}):undefined);
 if(!stats&&!teachers)return null;
 return <section className="panel min-w-0 space-y-4 p-5" aria-label="Team statistics"><h2 className="font-semibold">Team statistics</h2>
  {teacherCounts&&<div className="space-y-2"><h3 className="text-sm font-semibold">Veo team tags · unreviewed source counts</h3>{Object.entries(teacherCounts).filter(([,value])=>Object.keys(value).length>0).map(([key,value])=><p key={key} className="break-words text-sm">{key==="own"?"Our team":key==="opponent"?"Opponent":"Unknown side"} · {counts(value)}</p>)}</div>}
  {stats?<><p className="text-sm text-fg-muted">Analysed kit groups · {stats.status.replaceAll("_"," ")}. {stats.teams.length===2&&stats.teams.every(t=>t.source_side)?"Jersey colours are tagged to Our team and Opponent; assignments remain experimental.":"Club and Our/Opponent mapping awaits verification."} Referee candidates may be goalkeepers; sideline candidates are excluded from team counts.</p>
   <div className="grid min-w-0 gap-3 sm:grid-cols-2">{stats.teams.map(team=><div key={team.id} className="min-w-0 space-y-2 rounded-lg border border-line p-3"><h3 className="flex items-center gap-2 font-semibold"><span className="h-4 w-4 rounded-full border border-line" style={{backgroundColor:/^#[0-9a-fA-F]{6}$/.test(team.colour_hex)?team.colour_hex:undefined}} aria-hidden/>{team.label}</h3><p className="text-sm">{team.person_observations.toLocaleString()} person observations</p><p className="text-sm">Ball proximity observations: {stats.proximity[team.id]??0}</p><p className="break-words text-sm">Attributed action suggestions: {counts(stats.analysed[team.id])}</p></div>)}</div>
   <p className="break-words text-sm">Unassigned actions: {counts(stats.analysed.unknown)}</p>
   <p className="break-words text-xs text-fg-muted">Sampled roles: {counts(stats.roles)}. Ball proximity is not possession or a verified pass. Tracklets are not unique players.</p>
   <details className="text-xs text-fg-muted"><summary className="cursor-pointer">Classification limits</summary><ul className="mt-2 list-disc space-y-1 pl-4">{stats.limitations.map(line=><li key={line}>{line}</li>)}</ul></details></>:<p className="text-sm text-fg-muted">This earlier run has no pitch/kit classification. Veo counts remain available.</p>}
 </section>;
}
