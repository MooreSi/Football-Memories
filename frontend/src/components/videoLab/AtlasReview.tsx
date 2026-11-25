import {useMemo,useState} from "react";
import {Button} from "../ui/Button";
import {BoundaryLayer} from "./BoundaryEditor";
import {BirdEyeEditor} from "./BirdEyeEditor";
import {groundCalibration,toBird} from "./atlasGeometry";
import {groundOutline,groundStartBoundary,levelCalibration,rayMidpoint} from "./levelGround";
import {validBoundary} from "./boundary";
import {MarkLayer,PAD} from "./MarkLayer";
import {DEFAULT_CORNERS} from "./PitchPanel";
import {BASE,csrfToken} from "./useLabData";
import type {Panorama,PanoramaReview} from "./panorama";
import type {Corners} from "./pitch";
const inside=(p:Corners)=>validBoundary(p)&&p.every(v=>v.every(n=>n>=0&&n<=1));
export function AtlasReview({jobId,sourceHash,data,review,onAccept,onQueued}:{jobId:string;sourceHash:string;data:Panorama;review?:PanoramaReview|null;onAccept:(r:PanoramaReview|null)=>void;onQueued:(id:string)=>void}){
 const accepted=review?.accepted&&review.panorama_id===data.panorama_id?review:null;
 const [draft,setDraft]=useState<Corners|null>(null),[mode,setMode]=useState<"boundary"|"goals"|"corners"|null>(null),[selected,setSelected]=useState(0);
 const initialGoals=useMemo(()=>{const g=data.selected_goals??[];return accepted?.goal_posts??(g.length===2?[...g[0].posts,...[...g[1].posts].reverse()]:null);},[accepted,data]);
 const [goalDraft,setGoalDraft]=useState<Corners|null>(null),[cornerDraft,setCornerDraft]=useState<Corners|null>(null);
 const [goalsConfirmed,setGoalsConfirmed]=useState(!!accepted?.goals_confirmed),[cornersConfirmed,setCornersConfirmed]=useState(!!accepted?.corners);
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 const points=draft??accepted?.points??data.suggested_boundary,goals=goalDraft??initialGoals,corners=cornerDraft??accepted?.corners??null;
 // Confirmed physical corners give metres. Otherwise the plan comes from the camera's level
 // horizon; goal contacts are only a last resort for a camera that never pans. The base
 // boundary (not the draft) turns the view, so it stays still while handles move.
 const base=accepted?.points??data.suggested_boundary;
 const level=useMemo(()=>levelCalibration(data,base),[data,base]),levelWide=useMemo(()=>levelCalibration(data,base,{wide:true}),[data,base]);
 const calibration=useMemo(()=>{if(cornersConfirmed&&corners){const c=groundCalibration(data,corners,null);if(c)return c;}if(level)return level;const c=groundCalibration(data,null,goals);return c&&c.kind==="goals"&&!goalDraft&&!accepted?.goal_posts&&data.birdseye?{...c,bounds:data.birdseye.bounds as [number,number,number,number]}:c;},[data,cornersConfirmed,corners,goals,goalDraft,accepted,level]);
 const outline=(p:Corners)=>groundOutline(data,p);
 const edge=(a:[number,number],b:[number,number])=>[...groundOutline(data,[a,b]).slice(0,16),b];
 const grounded=calibration?.kind!=="camera"||toBird(data,calibration,points).every(p=>p.every(Number.isFinite));
 const valid=inside(points)&&grounded&&(!cornersConfirmed||(!!corners&&inside(corners)))&&(!goalsConfirmed||(!!goals&&goals.length===4&&goals.every(p=>p.every(n=>n>=0&&n<=1))));
 const src=`${BASE}/jobs/${jobId}/files/pitch_atlas.jpg`;
 const begin=(next:typeof mode)=>{setDraft(points.length>=3?points:(calibration&&groundStartBoundary(data,calibration))??DEFAULT_CORNERS);setSelected(0);setMode(next);if(next==="corners")setCornerDraft(corners??DEFAULT_CORNERS);if(next==="goals")setGoalDraft(goals??[[.1,.8],[.15,.6],[.85,.6],[.9,.8]]);};
 async function rebuild(){setBusy(true);setError("");try{const r=await fetch(`${BASE}/jobs/${jobId}/track-camera`,{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json","X-CSRF-Token":await csrfToken()},body:JSON.stringify({source_sha256:sourceHash})});if(!r.ok)throw new Error("The pitch could not be rebuilt. Wait for any current analysis to finish, then retry.");onQueued((await r.json() as {id:string}).id);}catch(e){setError(e instanceof Error?e.message:"Preparation failed.");}finally{setBusy(false);}}
 return <section className="panel min-w-0 space-y-3 p-3" aria-label="Stitched pitch review">
  <div className="flex flex-wrap justify-between gap-2"><h2 className="font-semibold">Whole-pitch calibration</h2><span className="text-xs text-fg-muted">{accepted?"Accepted · applied to registered views":"Automatic proposal · review before accepting"}</span></div>
  <p className="text-sm text-fg-muted">A full-duration pan preserves the left, middle and right views. Check both goal ends and the touchlines, then accept one boundary for every registered moment in this analysed video.</p>
  <p className="text-sm">{goals?"Both goal ends located · candidates need review":"Goal-end coverage incomplete · locate both goals before claiming full pitch coverage"}</p>
  <div className="relative overflow-hidden rounded-lg bg-black" style={{aspectRatio:`${data.width}/${data.height}`}}>
   <img src={src} alt="Complete pitch panorama" className="block h-full w-full object-contain" style={mode?{transform:`scale(${1-2*PAD})`}:undefined}/>
   {mode==="boundary"?<BoundaryLayer points={points} onChange={setDraft} selected={selected} onSelect={setSelected} edge={edge}/>:mode==="corners"&&corners?<MarkLayer corners={corners} onChange={p=>{setCornerDraft(p);setCornersConfirmed(false);}}/>:mode==="goals"&&goals?<BoundaryLayer points={goals} selected={selected} onSelect={setSelected} onChange={p=>{if(p.length===4){setGoalDraft(p);setGoalsConfirmed(false);}}}/>:<svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1 1" preserveAspectRatio="none" aria-label="Panoramic boundary"><polygon points={outline(points).map(p=>p.join(",")).join(" ")} fill="#22c55e" fillOpacity={.08} stroke="#22c55e" strokeWidth={.003}/>{goals?.map(([x,y],i)=><circle key={i} cx={x} cy={y} r={.005} fill="#38bdf8"><title>Goal ground contact {i+1}</title></circle>)}</svg>}
  </div>
  {mode==="goals"&&<p className="text-xs text-fg-muted">Place 1 and 2 at the left goal’s near and far post ground contacts; 3 and 4 at the right goal’s far and near contacts. Use the bottom of each post, not the crossbar. Candidates may include spare goals.</p>}
  {mode==="corners"&&<p className="text-xs text-fg-muted">Mark near-left, near-right, far-right and far-left physical pitch corners. Leave confirmation off if any corner is unseen.</p>}
  <BirdEyeEditor data={data} src={src} calibration={calibration} wide={calibration===level?levelWide:null} points={points} editing={mode==="boundary"} onChange={setDraft}/>
  <div className="flex flex-wrap gap-2"><Button onClick={()=>begin("boundary")}>Edit linked boundary</Button><Button onClick={()=>begin("goals")}>Correct goal ground contacts</Button><Button onClick={()=>begin("corners")}>Mark physical pitch corners</Button></div>
  {mode==="boundary"&&<div className="flex flex-wrap gap-2"><Button disabled={points.length>=32} onClick={()=>{const p=[...points];p.splice(selected+1,0,rayMidpoint(data,points[selected],points[(selected+1)%points.length]));setDraft(p);setSelected(selected+1);}}>Add boundary point</Button><Button disabled={points.length<=3} onClick={()=>{setDraft(points.filter((_,i)=>i!==selected));setSelected(Math.max(0,selected-1));}}>Remove boundary point</Button></div>}
  {goals&&<label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={goalsConfirmed} onChange={e=>setGoalsConfirmed(e.target.checked)}/>I checked both goals and all four post ground contacts</label>}
  {corners&&<label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={cornersConfirmed} onChange={e=>setCornersConfirmed(e.target.checked)}/>I checked all four physical corners; use them for metre calibration</label>}
  {!valid&&<p role="alert" className="text-sm text-warn">{grounded?"Keep distinct boundary points inside the panorama without crossing edges.":"A boundary point is above the horizon. Move every point onto the ground."}</p>}
  <div className="flex flex-wrap gap-2"><Button variant="primary" disabled={!valid||busy} onClick={()=>{onAccept({panorama_id:data.panorama_id,points,corners:cornersConfirmed?corners:null,goal_posts:goals,goals_confirmed:goalsConfirmed,accepted:true});setMode(null);setDraft(null);}}>Accept pitch calibration</Button>{mode&&<Button onClick={()=>{setMode(null);setDraft(null);setGoalDraft(null);setCornerDraft(null);setGoalsConfirmed(!!accepted?.goals_confirmed);setCornersConfirmed(!!accepted?.corners);}}>Cancel pitch edit</Button>}{accepted&&<Button onClick={()=>onAccept(null)}>Stop using panorama</Button>}<Button disabled={busy} onClick={()=>void rebuild()}>{busy?"Starting…":"Rebuild complete pitch"}</Button></div>
  <p className="text-xs text-fg-muted">Unseen ground stays black; unmatched views remain uncalibrated. The goal-guided outline is a starting estimate; check touchlines and spare goals. Its width is approximate when both touchlines cannot be recovered. Goal-based shape is relative, not metres. Goal proposals are reusable landmarks and require confirmation.</p>
  <a className="text-xs underline" href={`${BASE}/jobs/${jobId}/files/goal_posts.json`} download>Download goalpost observations</a>
  {error&&<p role="alert" className="text-sm text-warn">{error}</p>}
 </section>;
}
