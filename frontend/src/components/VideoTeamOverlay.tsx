import {useQuery} from "@tanstack/react-query";

type Assignment={track_id:number;time_s:number;team_id:string|null;role:string;image_box?:number[]};
type Data={image_width:number;image_height:number;teams:{id:string;label:string;colour_hex:string}[];observations:Assignment[]};
export function VideoTeamOverlay({jobId,at}:{jobId:string;at:number}){
 const query=useQuery({queryKey:["video-lab-team-overlay",jobId],retry:false,staleTime:Infinity,queryFn:async()=>{
  const response=await fetch(`/_admin/api/video-analytics/jobs/${jobId}/files/team_assignments.json`,{credentials:"same-origin",cache:"no-store"});
  if(!response.ok)throw new Error("Team overlay unavailable");
  const value=await response.json() as Data;
  if(!value||!Array.isArray(value.observations)||!Array.isArray(value.teams)||!(value.image_width>0)||!(value.image_height>0))throw new Error("Team overlay unavailable");
  return value;
 }});
 const data=query.data;
 const candidates=(data?.observations??[]).filter(row=>row.time_s<=at&&at-row.time_s<=.5);
 const latest=candidates.reduce((value,row)=>Math.max(value,row.time_s),-1);
 const visible=candidates.filter(row=>row.time_s===latest&&row.image_box?.length===4&&row.image_box.every(n=>Number.isFinite(n)&&n>=0&&n<=1));
 const label=(row:Assignment)=>data?.teams.find(t=>t.id===row.team_id)?.label??(row.role==="official_candidate"?"Referee candidate":row.role==="sideline_candidate"?"Sideline candidate":"Unassigned");
 return <div className="pointer-events-none absolute inset-0" aria-label="Experimental team overlay">
  {query.isPending&&<p className="absolute left-2 top-2 rounded bg-black/80 p-2 text-xs text-white">Loading team overlay…</p>}
  {query.isError&&<p className="absolute left-2 top-2 rounded bg-black/80 p-2 text-xs text-white">Team overlay unavailable</p>}
  {data&&visible.length===0&&<p className="absolute left-2 top-2 rounded bg-black/80 p-2 text-xs text-white">No current team observations</p>}
  {data&&<svg className="h-full w-full" viewBox={`0 0 ${data.image_width} ${data.image_height}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Candidate teams and roles">
   {visible.map(row=>{
    const box=row.image_box!;const x=box[0]*data.image_width,y=box[1]*data.image_height,w=(box[2]-box[0])*data.image_width,h=(box[3]-box[1])*data.image_height;
    const colour=data.teams.find(t=>t.id===row.team_id)?.colour_hex;
    const stroke=colour&&/^#[0-9a-fA-F]{6}$/.test(colour)?colour:row.role==="official_candidate"?"#facc15":"#e8eef8";
    return <g key={row.track_id}><rect x={x} y={y} width={w} height={h} fill="none" stroke={stroke} strokeWidth={Math.max(1,data.image_width/640)} strokeDasharray={row.team_id?undefined:"5 4"}/><text x={x} y={Math.max(data.image_height/50,y-5)} fill={stroke} stroke="black" strokeWidth={data.image_width/1600} paintOrder="stroke" fontSize={data.image_height/45}>{label(row)} · T{row.track_id}</text></g>;
   })}
  </svg>}
 </div>;
}
