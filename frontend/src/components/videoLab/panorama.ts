import { inverse, project } from "./landmarks";
import type { Corners } from "./pitch";
export type Panorama = { panorama_id:string;source_sha256:string;image:string;width:number;height:number;times:number[];cuts:boolean[];frame_to_panorama:(number[]|null)[];suggested_boundary:Corners;keyframe_times:number[] };
export type PanoramaReview = {panorama_id:string;points:Corners;corners?:Corners|null;accepted:true};
export type BoundPanorama = {data:Panorama;review:PanoramaReview};
export function bindPanorama(data:Panorama|undefined,review:PanoramaReview|null|undefined,hash:string|undefined):BoundPanorama|undefined {
 return data&&hash&&data.source_sha256===hash&&review?.accepted&&review.panorama_id===data.panorama_id?{data,review}:undefined;
}
/** A registered image-to-panorama pose; never interpolate through a cut or unknown view. */
export function panoramaMatrixAt(data:Panorama,at:number):number[]|null {
 if(!data.times.length || at<data.times[0] || at>data.times[data.times.length-1]+0.25) return null;
 let lo=0,hi=data.times.length-1;
 while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(data.times[mid]<=at)lo=mid;else hi=mid-1;}
 let matrix=data.frame_to_panorama[lo];
 if(!matrix) return null;
 if(lo+1<data.times.length && at>data.times[lo]+0.001) {
  const next=data.frame_to_panorama[lo+1];
  if(data.cuts[lo] || !next || data.times[lo+1]-data.times[lo]>1.5) return null;
  const f=(at-data.times[lo])/(data.times[lo+1]-data.times[lo]);
  matrix=matrix.map((v,n)=>v+(next[n]-v)*f);
 }
 return matrix;
}
export function panoramaPointsAt({data,review}:BoundPanorama,at:number,calibration=false):Corners|null {
 const points=calibration?review.corners:review.points,matrix=panoramaMatrixAt(data,at);
 if(!points?.length||!matrix)return null;
 const move=inverse(matrix),denom=points.map(([x,y])=>move[6]*x+move[7]*y+move[8]);
 if(denom.some(v=>!Number.isFinite(v)||Math.abs(v)<1e-6)||Math.min(...denom)*Math.max(...denom)<=0)return null;
 const out=points.map(p=>project(move,p));
 return out.every(p=>p.every(v=>Number.isFinite(v)&&Math.abs(v)<100))?out:null;
}

export function isPanorama(v:unknown):v is Panorama {
 if(!v||typeof v!=="object")return false;
 const p=v as Panorama;
 const polygon=(q:unknown)=>Array.isArray(q)&&q.length<=32&&q.every(v=>Array.isArray(v)&&v.length===2&&v.every(n=>Number.isFinite(n)&&n>=0&&n<=1));
 return /^[a-f0-9]{64}$/.test(p.panorama_id)&&/^[a-f0-9]{64}$/.test(p.source_sha256)&&p.image==="pitch_panorama.jpg"&&Number.isFinite(p.width)&&p.width>0&&p.width<=2400&&Number.isFinite(p.height)&&p.height>0&&p.height<=1200&&Array.isArray(p.times)&&p.times.length<=20000&&p.times.every((t,i)=>Number.isFinite(t)&&t>=0&&(i===0||t>p.times[i-1]))&&Array.isArray(p.cuts)&&p.cuts.length===Math.max(0,p.times.length-1)&&p.cuts.every(v=>typeof v==="boolean")&&Array.isArray(p.frame_to_panorama)&&p.frame_to_panorama.length===p.times.length&&p.frame_to_panorama.every(m=>m===null||(Array.isArray(m)&&m.length===9&&m.every(Number.isFinite)))&&polygon(p.suggested_boundary)&&Array.isArray(p.keyframe_times)&&p.keyframe_times.length<=40&&p.keyframe_times.every(Number.isFinite);
}

/** Clip in homogeneous coordinates before dividing: the unseen far side may cross
 * a projective horizon even though the visible playing area is perfectly known. */
export function panoramaBoundaryAt({data,review}:BoundPanorama,at:number):Corners|null {
 const matrix=panoramaMatrixAt(data,at);
 if(!matrix)return null;
 const move=inverse(matrix),front=Math.sign(matrix[6]*.5+matrix[7]*.7+matrix[8])||1;
 let vertices=review.points.map(([x,y])=>[move[0]*x+move[1]*y+move[2],move[3]*x+move[4]*y+move[5],move[6]*x+move[7]*y+move[8]].map(v=>v*front));
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
