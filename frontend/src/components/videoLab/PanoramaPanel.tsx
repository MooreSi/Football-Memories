import {AtlasReview} from "./AtlasReview";
import {useState} from "react";
import {Button} from "../ui/Button";
import {BoundaryLayer} from "./BoundaryEditor";
import {validBoundary} from "./boundary";
import {MarkLayer,PAD} from "./MarkLayer";
import {DEFAULT_CORNERS} from "./PitchPanel";
import {BASE,csrfToken} from "./useLabData";
import type {Corners} from "./pitch";
import type {Panorama,PanoramaReview} from "./panorama";

type Props={jobId:string;sourceHash:string;data?:Panorama;review?:PanoramaReview|null;onAccept:(r:PanoramaReview|null)=>void;onQueued:(id:string)=>void};
const inside=(p:Corners)=>validBoundary(p)&&p.every(v=>v.every(n=>n>=0&&n<=1));

/** One explicit human review of the observed pitch, reused by registered camera views. */
export function PanoramaPanel({jobId,sourceHash,data,review,onAccept,onQueued}:Props) {
 const usable=data?.source_sha256===sourceHash?data:undefined;
 const accepted=usable&&review?.panorama_id===usable.panorama_id&&review.accepted?review:null;
 const [draft,setDraft]=useState<Corners|null>(null),[selected,setSelected]=useState(0);
 const [corners,setCorners]=useState<Corners|null>(null),[cornerMode,setCornerMode]=useState(false),[checked,setChecked]=useState(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 const points=draft??accepted?.points??usable?.suggested_boundary??[];
 const editing=draft!==null||cornerMode;
 const valid=inside(points)&&(!checked||(!!corners&&inside(corners)));
 const matched=usable?.frame_to_panorama.filter(Boolean).length??0,total=usable?.times.length??0;
 async function prepare(){
  setBusy(true);setError("");
  try{
   const response=await fetch(`${BASE}/jobs/${jobId}/track-camera`,{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json","X-CSRF-Token":await csrfToken()},body:JSON.stringify({source_sha256:sourceHash})});
   if(!response.ok)throw new Error(response.status===409?"Wait for the current analysis to finish, then try again.":"The stitched pitch could not be prepared.");
   onQueued((await response.json() as {id:string}).id);
  }catch(e){setError(e instanceof Error?e.message:"Preparation failed.");}finally{setBusy(false);}
 }
 const begin=()=>{setDraft(points.length>=3?points:DEFAULT_CORNERS);setSelected(0);setCorners(accepted?.corners??null);setChecked(!!accepted?.corners);setCornerMode(false);};
 if(usable?.projection)return <AtlasReview jobId={jobId} sourceHash={sourceHash} data={usable} review={review} onAccept={onAccept} onQueued={onQueued}/>;
 return <section className="panel min-w-0 space-y-3 p-3" aria-label="Stitched pitch review">
  <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">Whole-pitch panorama</h2><span className="text-xs text-fg-muted">{accepted?"Accepted · applied to registered views":usable?"Automatic proposal · check before accepting":"Prepare from saved footage"}</span></div>
  <p className="text-sm text-fg-muted">Left, centre and right views stitched into one image. Adjust the boundary, then accept it once for all registered moments in this analysed video. Unseen ground and unmatched camera views remain uncalibrated.</p>
  {usable?<>
   <p className="text-xs text-fg-muted">{matched} of {total} sampled camera views matched ({total?Math.round(matched/total*100):0}%). Check the complete boundary and the joins; green apron or adjacent pitches may need removing.</p>
   <div className="relative overflow-hidden rounded-lg bg-black" style={{aspectRatio:`${usable.width}/${usable.height}`}}>
    <img src={`${BASE}/jobs/${jobId}/files/pitch_panorama.jpg`} alt="Stitched pitch panorama" className="block h-full w-full object-contain" style={editing?{transform:`scale(${1-2*PAD})`}:undefined}/>
    {editing?(cornerMode&&corners?<MarkLayer corners={corners} onChange={setCorners}/>:<BoundaryLayer points={points} onChange={setDraft} selected={selected} onSelect={setSelected}/>):points.length>=3&&<svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1 1" preserveAspectRatio="none" aria-label="Panoramic boundary"><polygon points={points.map(p=>p.join(",")).join(" ")} fill="#22c55e" fillOpacity={.08} stroke="#22c55e" strokeWidth={.003}/></svg>}
   </div>
   {editing?<>
    <p className="text-xs text-fg-muted">{cornerMode?"Place Near-left, Near-right, Far-right and Far-left on the actual physical corners. Leave metre calibration off if any corner is unseen.":"Drag numbered handles or use arrow keys. Double-click an edge to insert a point; Delete removes it. Keep every point inside the observed panorama."}</p>
    {!cornerMode&&<div className="flex flex-wrap gap-2"><Button disabled={points.length>=32} onClick={()=>{const a=points[selected],b=points[(selected+1)%points.length],p=[...points];p.splice(selected+1,0,[(a[0]+b[0])/2,(a[1]+b[1])/2]);setDraft(p);setSelected(selected+1);}}>Add panorama point</Button><Button disabled={points.length<=3} onClick={()=>{setDraft(points.filter((_,i)=>i!==selected));setSelected(Math.max(0,selected-1));}}>Remove panorama point</Button></div>}
    <div className="flex flex-wrap gap-2"><Button onClick={()=>{setCornerMode(!cornerMode);setCorners(corners??accepted?.corners??DEFAULT_CORNERS);}}> {cornerMode?"Edit boundary shape":"Mark physical pitch corners"}</Button></div>
    {corners&&<label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={checked} onChange={e=>setChecked(e.target.checked)}/>I checked all four physical corners; use them for metre calibration</label>}
    {!valid&&<p role="alert" className="text-sm text-warn">Keep distinct points inside the panorama, without crossing edges.</p>}
   </>:<Button onClick={begin}>Edit panoramic boundary</Button>}
   <div className="flex flex-wrap gap-2"><Button variant="primary" disabled={!valid||busy} onClick={()=>{onAccept({panorama_id:usable.panorama_id,points,corners:checked?corners:editing?null:accepted?.corners??null,accepted:true});setDraft(null);setCornerMode(false);}}>Accept boundary for this video</Button>{editing&&<Button onClick={()=>{setDraft(null);setCornerMode(false);setCorners(null);setChecked(false);}}>Cancel panorama edit</Button>}{accepted&&<Button onClick={()=>onAccept(null)}>Stop using panorama</Button>}</div>
  </>:<p className="text-sm text-fg-muted">Build this once from overlapping views in the saved video. If the camera never pans or views cannot be aligned, preparation reports that a stitched pitch is unavailable.</p>}
  {error&&<p role="alert" className="text-sm text-warn">{error}</p>}
  <Button disabled={busy} onClick={()=>void prepare()}>{busy?"Starting…":usable?"Rebuild stitched pitch":"Build stitched pitch"}</Button>
 </section>;
}
