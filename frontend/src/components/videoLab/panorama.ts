import {panoramaRay,applyRay} from "./atlasGeometry";
import { inverse } from "./landmarks";
import type { Corners } from "./pitch";
export type GoalCandidate={id:string;posts:Corners;tops:Corners;time_s:number;support:number;score:number;requires_review:true};
export type CylinderProjection={kind:"cylindrical";origin:[number,number];span:[number,number]};
export type Panorama = { projection?:CylinderProjection;frame_to_world?:(number[]|null)[];selected_goals?:GoalCandidate[];goal_candidates?:GoalCandidate[];birdseye?:{matrix:number[];normal:number[];bounds:number[]}; panorama_id:string;source_sha256:string;image:string;width:number;height:number;times:number[];cuts:boolean[];frame_to_panorama:(number[]|null)[];suggested_boundary:Corners;keyframe_times:number[] };
export type PanoramaReview = {panorama_id:string;points:Corners;corners?:Corners|null;goal_posts?:Corners|null;goals_confirmed?:boolean;accepted:true};
export type BoundPanorama = {data:Panorama;review:PanoramaReview};
export function bindPanorama(data:Panorama|undefined,review:PanoramaReview|null|undefined,hash:string|undefined):BoundPanorama|undefined {
 return data&&hash&&data.source_sha256===hash&&review?.accepted&&review.panorama_id===data.panorama_id?{data,review}:undefined;
}
/** A registered image-to-panorama pose; never interpolate through a cut or unknown view. */
export function panoramaMatrixAt(data:Panorama,at:number):number[]|null {
 if(!data.times.length || at<data.times[0] || at>data.times[data.times.length-1]+0.25) return null;
 let lo=0,hi=data.times.length-1;
 while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(data.times[mid]<=at)lo=mid;else hi=mid-1;}
 const frames=data.projection?data.frame_to_world!:data.frame_to_panorama;
 let matrix=frames[lo];
 if(!matrix) return null;
 if(lo+1<data.times.length && at>data.times[lo]+0.001) {
  const next=frames[lo+1];
  if(data.cuts[lo] || !next || data.times[lo+1]-data.times[lo]>1.5) return null;
  const f=(at-data.times[lo])/(data.times[lo+1]-data.times[lo]);
  matrix=matrix.map((v,n)=>v+(next[n]-v)*f);
 }
 return matrix;
}
export function panoramaPointsAt({data,review}:BoundPanorama,at:number,calibration=false):Corners|null {
 const points=calibration?review.corners:review.points,matrix=panoramaMatrixAt(data,at);
 if(!points?.length||!matrix)return null;
 const move=inverse(matrix),rays=points.map(p=>panoramaRay(data,p)),denom=rays.map(p=>applyRay(move,p)[2]);
 if(denom.some(v=>!Number.isFinite(v)||Math.abs(v)<1e-6)||Math.min(...denom)*Math.max(...denom)<=0)return null;
 const out=rays.map(p=>{const q=applyRay(move,p);return [q[0]/q[2],q[1]/q[2]] as [number,number];});
 return out.every(p=>p.every(v=>Number.isFinite(v)&&Math.abs(v)<100))?out:null;
}

export function isPanorama(v:unknown):v is Panorama {
 if(!v||typeof v!=="object")return false;
 const p=v as Panorama;
 if(p.projection&&(!(p.projection.kind==="cylindrical")||!Array.isArray(p.projection.origin)||p.projection.origin.length!==2||!p.projection.origin.every(Number.isFinite)||!Array.isArray(p.projection.span)||p.projection.span.length!==2||!p.projection.span.every(v=>Number.isFinite(v)&&v>0)||!Array.isArray(p.frame_to_world)||!Array.isArray(p.times)||p.frame_to_world.length!==p.times.length||!p.frame_to_world.every(m=>m===null||(Array.isArray(m)&&m.length===9&&m.every(Number.isFinite)))))return false;
 const polygon=(q:unknown)=>Array.isArray(q)&&q.length<=32&&q.every(v=>Array.isArray(v)&&v.length===2&&v.every(n=>Number.isFinite(n)&&n>=0&&n<=1));
 const goals=(g:unknown)=>Array.isArray(g)&&g.length<=128&&g.every(v=>v&&typeof v==="object"&&typeof v.id==="string"&&polygon(v.posts)&&v.posts.length===2&&polygon(v.tops)&&v.tops.length===2&&Number.isFinite(v.time_s));
 if(p.selected_goals!==undefined&&(!goals(p.selected_goals)||p.selected_goals.length>2))return false;
 if(p.goal_candidates!==undefined&&!goals(p.goal_candidates))return false;
 if(p.birdseye&&(!Array.isArray(p.birdseye.bounds)||p.birdseye.bounds.length!==4||!p.birdseye.bounds.every(Number.isFinite)))return false;
 return /^[a-f0-9]{64}$/.test(p.panorama_id)&&/^[a-f0-9]{64}$/.test(p.source_sha256)&&(p.projection?p.image==="pitch_atlas.jpg":p.image==="pitch_panorama.jpg")&&Number.isFinite(p.width)&&p.width>0&&p.width<=2400&&Number.isFinite(p.height)&&p.height>0&&p.height<=1200&&Array.isArray(p.times)&&p.times.length<=20000&&p.times.every((t,i)=>Number.isFinite(t)&&t>=0&&(i===0||t>p.times[i-1]))&&Array.isArray(p.cuts)&&p.cuts.length===Math.max(0,p.times.length-1)&&p.cuts.every(v=>typeof v==="boolean")&&Array.isArray(p.frame_to_panorama)&&p.frame_to_panorama.length===p.times.length&&p.frame_to_panorama.every(m=>m===null||(Array.isArray(m)&&m.length===9&&m.every(Number.isFinite)))&&polygon(p.suggested_boundary)&&Array.isArray(p.keyframe_times)&&p.keyframe_times.length<=(p.projection?128:40)&&p.keyframe_times.every(Number.isFinite);
}

/** Clip in homogeneous coordinates before dividing: the unseen far side may cross
 * a projective horizon even though the visible playing area is perfectly known. */
export function panoramaBoundaryAt({data,review}:BoundPanorama,at:number):Corners|null {
 const matrix=panoramaMatrixAt(data,at);
 if(!matrix)return null;
 const move=inverse(matrix),front=data.projection?1:Math.sign(matrix[6]*.5+matrix[7]*.7+matrix[8])||1;
 // Boundary edges are straight on the ground: the positive span of their end rays. The
 // pose is linear in rays, so edges stay straight here and homogeneous clipping is exact.
 // Interpolating atlas pixels instead would bend every long edge across the pitch.
 let vertices=review.points.map(p=>applyRay(move,panoramaRay(data,p)).map(v=>v*front));
 if(!vertices.every(p=>p.every(Number.isFinite)))return null;
 const planes=[(p:number[])=>p[2]-1e-8,(p:number[])=>p[0],(p:number[])=>p[2]-p[0],(p:number[])=>p[1],(p:number[])=>p[2]-p[1]];
 for(const distance of planes){
  const clipped:number[][]=[];
  if(!vertices.length)return null;
  let previous=vertices[vertices.length-1],before=distance(previous);
  for(const current of vertices){
   const here=distance(current);
   if((here>=0)!==(before>=0)){const t=before/(before-here);clipped.push(previous.map((v,i)=>v+(current[i]-v)*t));}
   if(here>=0)clipped.push(current);
   previous=current;before=here;
  }
  vertices=clipped;
 }
 const points=vertices.map(p=>[Math.max(0,Math.min(1,p[0]/p[2])),Math.max(0,Math.min(1,p[1]/p[2]))] as [number,number]);
 const area=points.reduce((s,a,i)=>{const b=points[(i+1)%points.length];return s+a[0]*b[1]-a[1]*b[0];},0);
 return points.length>=3&&Math.abs(area)>1e-8?points:null;
}
