import {applyRay,multiply,rayPanorama} from "./atlasGeometry";
import {DEFAULT_CORNERS,fitLandmarks,fixesPitch,inverse,PITCH_CORNERS,project,type Point} from "./landmarks";
import {panoramaBoundaryAt,panoramaLineAt,panoramaMatrixAt,type Panorama} from "./panorama";
import type {PitchSize} from "./metres";
import type {Corners,PitchKeyframe} from "./pitch";

/* Spec 800: your pitch markers, placed on the paused video at several moments, as reference points
 * fixed on the ground. Each marker's image position is turned into a ground ray with that moment's
 * registered camera pose, so the pitch follows every pan and zoom through the poses.
 *
 * Each mark gets its own ray -> pitch fit (normalised pitch: near-left 0,0, far-right 1,1), exact
 * through its own points; another mark's points only help when a mark's own points cannot fix a fit
 * (near-collinear). Between two marks the fits blend by time, so registration drift between moments
 * is spread out instead of carried; before the first and after the last mark the nearest holds. */
export type MarkerModel={data:Panorama;normal:number[];keys:{time_s:number;matrix:number[]}[]};
type Ref={ray:number[];pitch:Point};

const OTHER_WEIGHT=.02;
export const HALFWAY_ENDS:Point[]=[[.5,0],[.5,1]];
const normalise=(a:number[])=>{const n=Math.hypot(...a);return a.map(v=>v/n);};
const cross=(a:number[],b:number[])=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a:number[],b:number[])=>a.reduce((s,v,i)=>s+v*b[i],0);

/** A mark saved with the editor's default handles, none placed on the pitch (6c216d41 has one at 0:00):
 * it measures nothing, so it must not override the atlas. */
function untouched(k:PitchKeyframe):boolean{
 if(!k.corners.every((p,i)=>Math.hypot(p[0]-DEFAULT_CORNERS[i][0],p[1]-DEFAULT_CORNERS[i][1])<1e-9))return false;
 const h=fitLandmarks(DEFAULT_CORNERS.map((image,i)=>({image,pitch:PITCH_CORNERS[i]})));
 return !!h&&(k.landmarks??[]).every(l=>{const p=project(inverse(h),l.pitch);return Math.hypot(p[0]-l.image[0],p[1]-l.image[1])<1e-6;});
}

function refsOf(data:Panorama,k:PitchKeyframe):Ref[]|null{
 const pose=panoramaMatrixAt(data,k.time_s);
 if(!pose)return null;
 const points=[...k.corners.flatMap((image,i)=>!k.fit_corner_indices||k.fit_corner_indices.includes(i)?[{image,pitch:PITCH_CORNERS[i]}]:[]),...(k.landmarks??[])];
 return points.map(p=>({ray:applyRay(pose,[p.image[0],p.image[1],1]),pitch:p.pitch}));
}

/** The marks that land on a registered view, as a model; null when none do. */
export function buildMarkers(data:Panorama|undefined,marks:PitchKeyframe[]):MarkerModel|null{
 if(!data||!marks.length)return null;
 const sets=marks.filter(k=>!untouched(k)).flatMap(k=>{const refs=refsOf(data,k);return refs&&refs.length>=4&&refs.every(r=>r.ray.every(Number.isFinite))?[{time_s:k.time_s,refs}]:[];});
 if(!sets.length)return null;
 // One chart for every fit, centred on the marked ground, so fits are comparable and blendable.
 const normal=normalise([0,1,2].map(i=>sets.reduce((s,x)=>s+x.refs.reduce((t,r)=>t+normalise(r.ray)[i],0),0)));
 if(!normal.every(Number.isFinite))return null;
 const axis=Math.abs(normal[1])>.9?[1,0,0]:[0,1,0];
 const x=normalise(cross(axis,normal)),y=cross(normal,x),basis=[...x,...y,...normal];
 const chart=(r:Ref)=>{const c=applyRay(basis,r.ray);return c[2]>1e-6?[{image:[c[0]/c[2],c[1]/c[2]] as Point,pitch:r.pitch}]:[];};
 const keys=sets.flatMap(s=>{
  const own=s.refs.flatMap(chart);
  const others=sets.filter(o=>o!==s).flatMap(o=>o.refs.flatMap(chart)).map(p=>({...p,weight:OTHER_WEIGHT}));
  // A mark whose own points cannot fix the pitch (three on one line) leans on the other marks; alone it is not used.
  const strong=fixesPitch(own.map(p=>p.pitch));
  if(!strong&&!others.length)return [];
  const fit=strong?fitLandmarks(own)??fitLandmarks([...own,...others]):fitLandmarks([...own,...others]);
  if(!fit)return [];
  const m=multiply(fit,basis),w=dot(m.slice(6),normal);
  // Scaled so the marked ground's centre ray has weight 1: the same scale for every mark, for blending.
  if(!(Math.abs(w)>1e-12))return [];
  const matrix=m.map(v=>v/w);
  return matrix.every(Number.isFinite)?[{time_s:s.time_s,matrix}]:[];
 }).sort((a,b)=>a.time_s-b.time_s);
 return keys.length?{data,normal,keys}:null;
}

/** World ray -> normalised pitch at a time. */
export function markerMatrixAt({keys}:MarkerModel,at:number):number[]{
 if(at<=keys[0].time_s)return keys[0].matrix;
 const last=keys[keys.length-1];
 if(at>=last.time_s)return last.matrix;
 const b=keys.findIndex(k=>k.time_s>at),a=keys[b-1],f=(at-a.time_s)/(keys[b].time_s-a.time_s);
 return a.matrix.map((v,i)=>v+(keys[b].matrix[i]-v)*f);
}

/** Image (normalised) -> normalised pitch at a time; null where the camera has no registered pose. */
export function markerImageToPitch(m:MarkerModel,at:number):number[]|null{
 const pose=panoramaMatrixAt(m.data,at);
 if(!pose)return null;
 const out=multiply(markerMatrixAt(m,at),pose);
 return out.every(Number.isFinite)?out:null;
}

function raysOf(m:MarkerModel,at:number,points:Point[]):number[][]{
 const back=inverse(markerMatrixAt(m,at));
 return points.map(([u,v])=>{const r=applyRay(back,[u,v,1]);return dot(r,m.normal)<0?r.map(n=>-n):r;});
}

/** Pitch points in the frame at a time (unclipped; off-screen allowed). A point behind the camera is
 * null; the whole result is null where the camera has no registered pose. */
export function markerPointsAt(m:MarkerModel,at:number,points:Point[]):(Point|null)[]|null{
 const pose=panoramaMatrixAt(m.data,at);
 if(!pose)return null;
 const move=inverse(pose);
 return raysOf(m,at,points).map(r=>{const q=applyRay(move,r);return q[2]>1e-9&&Number.isFinite(q[0]/q[2])&&Number.isFinite(q[1]/q[2])?[q[0]/q[2],q[1]/q[2]]:null;});
}

const atlasPoints=(m:MarkerModel,at:number,points:Point[]):Corners=>raysOf(m,at,points).map(r=>rayPanorama(m.data,r));

/** The marked pitch's outline in the frame, clipped to it (edges straight on the ground). */
export function markerOutlineAt(m:MarkerModel,at:number):Corners|null{
 return panoramaBoundaryAt({data:m.data,review:{panorama_id:m.data.panorama_id,points:atlasPoints(m,at,PITCH_CORNERS),accepted:true}},at);
}

/** The marked halfway line in the frame. */
export function markerHalfwayAt(m:MarkerModel,at:number):Corners|null{
 return panoramaLineAt(m.data,atlasPoints(m,at,HALFWAY_ENDS),at);
}

/* Penalty areas, depth from the goal line x width, from The FA Guide to Pitch Dimensions (metric):
 * 5v5 37x27 m: 8x15; 7v7 55x37: 9x16; 9v9 73x46: 12x29; U13-U14 82x50: 13x32; U15-U16 91x55: 16x40.
 * The adult 100x64 pitch uses Law 1's 16.5 x 40.3 m (the FA diagram rounds it to 16 x 40). A pitch of
 * another size takes the box of the format nearest its length (a 9v9 across a full pitch, 68 m, is 9v9). */
const BOXES=[{length:37,depth:8,width:15},{length:55,depth:9,width:16},{length:73,depth:12,width:29},{length:82,depth:13,width:32},{length:91,depth:16,width:40},{length:100,depth:16.5,width:40.3}];
export type PenaltyBox={side:"Left"|"Right";points:{name:string;pitch:Point}[]};
export const isBoxPoint=(name:string|undefined)=>/^(Left|Right) box, /.test(name??"");
const BOX_POINTS=["near goal-line end","near front corner","far front corner","far goal-line end"];

/** Both penalty boxes in normalised pitch points, each from the near goal-line end round to the far one. */
export function penaltyBoxes({length_m:l,width_m:w}:PitchSize):PenaltyBox[]{
 const f=BOXES.reduce((a,b)=>Math.abs(b.length-l)<Math.abs(a.length-l)?b:a);
 const d=Math.min(.5,f.depth/l),y0=Math.max(0,(w-f.width)/2/w),y1=Math.min(1,(w+f.width)/2/w);
 const box=(side:"Left"|"Right",goal:number,front:number):PenaltyBox=>({side,points:([[goal,y0],[front,y0],[front,y1],[goal,y1]] as Point[]).map((pitch,i)=>({name:`${side} box, ${BOX_POINTS[i]}`,pitch}))});
 return [box("Left",0,d),box("Right",1,1-d)];
}

/** The penalty boxes' three marked sides in the frame, each a straight ground line. */
export function markerBoxesAt(m:MarkerModel,at:number,size:PitchSize):Corners[]{
 return penaltyBoxes(size).flatMap(b=>{
  const atlas=atlasPoints(m,at,b.points.map(p=>p.pitch));
  return [0,1,2].flatMap(k=>{const line=panoramaLineAt(m.data,[atlas[k],atlas[k+1]],at);return line?[line]:[];});
 });
}
