import {panoramaBoundaryAt,panoramaLineAt,type BoundPanorama} from "./panorama";
import {markerHalfwayAt,markerOutlineAt} from "./pitchMarkers";
import { carryPoints, type Camera, type Corners } from "./pitch";
export type Boundary = {time_s:number; points:Corners};

/** Latest fresh automatic observation, overridden by the nearest human correction
 * in the same shot. An empty observation explicitly means no pitch is known. */
export function boundaryAt(camera:Camera,manual:Boundary[],automatic:Boundary[],at:number):Corners|null {
 // Spec 800: your pitch markers place the pitch ahead of the atlas outline.
 if(camera.markers) return markerOutlineAt(camera.markers,at);
 if(camera.panorama) return panoramaBoundaryAt(camera.panorama,at);
 const human=manual.map(k=>({k,points:carryPoints(camera,k.points,k.time_s,at)})).filter(v=>v.points);
 if(human.length) return human.reduce((a,b)=>Math.abs(a.k.time_s-at)<=Math.abs(b.k.time_s-at)?a:b).points;
 if(camera.proposal) return panoramaBoundaryAt(camera.proposal,at);
 const latest=automatic.filter(k=>k.time_s<=at).sort((a,b)=>b.time_s-a.time_s)[0];
 if(!latest || at-latest.time_s>1.5 || latest.points.length<3) return null;
 return carryPoints(camera,latest.points,latest.time_s,at);
}

export function validBoundary(p:Corners):boolean {
 if(p.length<3 || p.length>32 || !p.every(v=>v.every(n=>Number.isFinite(n)&&n>=-2&&n<=3))) return false;
 const cross=(a:number[],b:number[],c:number[])=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 const area=p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-a[1]*b[0];},0);
 if(Math.abs(area)<0.0001 || new Set(p.map(v=>v.join(","))).size!==p.length) return false;
 for(let i=0;i<p.length;i++) for(let j=i+2;j<p.length;j++) {
  if(i===0&&j===p.length-1) continue;
  const a=p[i],b=p[(i+1)%p.length],c=p[j],d=p[(j+1)%p.length];
  if(cross(a,b,c)*cross(a,b,d)<=0&&cross(c,d,a)*cross(c,d,b)<=0&&Math.max(Math.min(a[0],b[0]),Math.min(c[0],d[0]))<=Math.min(Math.max(a[0],b[0]),Math.max(c[0],d[0]))&&Math.max(Math.min(a[1],b[1]),Math.min(c[1],d[1]))<=Math.min(Math.max(a[1],b[1]),Math.max(c[1],d[1]))) return false;
 }
 return true;
}

/** The halfway line in the current frame: from your pitch markers, else the reviewed one, else the line-based
 * proposal's. Sampled along the ground line (ray span) so it stays straight. */
export function halfwayAt(camera:Camera,at:number):Corners|null{
 if(camera.markers) return markerHalfwayAt(camera.markers,at);
 const source:BoundPanorama|undefined=camera.panorama?.review.halfway?camera.panorama:camera.proposal?.review.halfway?camera.proposal:undefined;
 const ends=source?.review.halfway;
 return source&&ends?panoramaLineAt(source.data,ends,at):null;
}
