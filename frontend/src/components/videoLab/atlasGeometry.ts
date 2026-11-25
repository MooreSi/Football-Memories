import {fitLandmarks,inverse} from "./landmarks";
import type {Panorama} from "./panorama";
import type {Corners} from "./pitch";
export type GroundCalibration={matrix:number[];inverse:number[];normal:number[];bounds:[number,number,number,number];kind:"corners"|"goals"|"camera"};
export const multiply=(a:number[],b:number[])=>[0,1,2].flatMap(r=>[0,1,2].map(c=>a[r*3]*b[c]+a[r*3+1]*b[3+c]+a[r*3+2]*b[6+c]));
export const applyRay=(h:number[],p:number[])=>[0,1,2].map(r=>h[r*3]*p[0]+h[r*3+1]*p[1]+h[r*3+2]*p[2]);
const dot=(a:number[],b:number[])=>a.reduce((s,v,i)=>s+v*b[i],0);
const normalise=(a:number[])=>{const n=Math.hypot(...a);return a.map(v=>v/n);};
const cross=(a:number[],b:number[])=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export function panoramaRay(data:Panorama,[x,y]:[number,number]):number[]{
 if(!data.projection)return [x,y,1];
 const {origin,span}=data.projection,t=origin[0]+x*span[0],v=origin[1]+y*span[1];
 return [Math.sin(t),v,Math.cos(t)];
}
export function rayPanorama(data:Panorama,p:number[]):[number,number]{
 if(!data.projection)return [p[0]/p[2],p[1]/p[2]];
 const {origin,span}=data.projection;let t=Math.atan2(p[0],p[2]);
 t+=Math.round((origin[0]+span[0]/2-t)/(Math.PI*2))*Math.PI*2;
 return [(t-origin[0])/span[0],(p[1]/Math.hypot(p[0],p[2])-origin[1])/span[1]];
}
export function groundCalibration(data:Panorama,corners:Corners|null,goals:Corners|null):GroundCalibration|null{
 const markers=corners??goals;if(markers?.length!==4)return null;
 const rays=markers.map(p=>panoramaRay(data,p)),units=rays.map(normalise);
 const normal=normalise([0,1,2].map(i=>units.reduce((s,p)=>s+p[i],0)));
 if(!normal.every(Number.isFinite))return null;
 const axis=Math.abs(normal[1])>.9?[1,0,0]:[0,1,0];
 const x=normalise(cross(axis,normal)),y=cross(normal,x),basis=[...x,...y,...normal];
 const chart=rays.map(p=>applyRay(basis,p));if(chart.some(p=>p[2]<1e-6))return null;
 const targets=corners?[[0,0],[1,0],[1,1],[0,1]]:[[0,0],[0,1],[1,1],[1,0]];
 const fit=fitLandmarks(chart.map((p,i)=>({image:[p[0]/p[2],p[1]/p[2]],pitch:targets[i] as [number,number]})));
 if(!fit)return null;
 const matrix=multiply(fit,basis),inv=inverse(matrix);
 if(!matrix.every(Number.isFinite)||!inv.every(Number.isFinite))return null;
 return {matrix,inverse:inv,normal,bounds:corners?[-.05,-.05,1.05,1.05]:[-.08,-4,1.08,5],kind:corners?"corners":"goals"};
}
export function toBird(data:Panorama,c:GroundCalibration,points:Corners):Corners{
 const [l,t,r,b]=c.bounds;
 // A camera-level plan has a true ground side: a point above the horizon has no ground position.
 return points.map(p=>{const q=applyRay(c.matrix,panoramaRay(data,p));return c.kind==="camera"&&q[2]<=1e-9?[NaN,NaN]:[(q[0]/q[2]-l)/(r-l),(q[1]/q[2]-t)/(b-t)];});
}
export function fromBird(data:Panorama,c:GroundCalibration,points:Corners):Corners{
 const [l,t,r,b]=c.bounds;
 return points.map(([x,y])=>{let ray=applyRay(c.inverse,[l+x*(r-l),t+y*(b-t),1]);if(dot(ray,c.normal)<0)ray=ray.map(v=>-v);return rayPanorama(data,ray);});
}
/** Equal-scale bounds: the bird canvas is `aspect` wide, so metres stay square on screen. */
export function aspectBounds([l,t,r,b]:number[],aspect=8/5,pad=.06):[number,number,number,number]{
 let w=(r-l)*(1+2*pad),h=(b-t)*(1+2*pad);const cx=(l+r)/2,cy=(t+b)/2;
 if(w/h>aspect)h=w/aspect;else w=h*aspect;
 return [cx-w/2,cy-h/2,cx+w/2,cy+h/2];
}

/** Keep all existing handles reachable without changing the calibration or inventing ground. */
export function fitBirdBoundary(data:Panorama,c:GroundCalibration,points:Corners):GroundCalibration{
 const raw=points.map(p=>applyRay(c.matrix,panoramaRay(data,p))).filter(q=>c.kind!=="camera"||q[2]>1e-9).map(q=>[q[0]/q[2],q[1]/q[2]]);
 if(!raw.length||!raw.every(p=>p.every(Number.isFinite)))return c;
 const xs=raw.map(p=>p[0]),ys=raw.map(p=>p[1]);
 const l=Math.min(c.bounds[0],...xs),r=Math.max(c.bounds[2],...xs),t=Math.min(c.bounds[1],...ys),b=Math.max(c.bounds[3],...ys);
 return {...c,bounds:c.kind==="camera"?aspectBounds([l,t,r,b],8/5,.04):[l-(r-l)*.04,t-(b-t)*.04,r+(r-l)*.04,b+(b-t)*.04]};
}
export function applyBirdEdit(data:Panorama,c:GroundCalibration,points:Corners,bird:Corners):Corners{
 const before=toBird(data,c,points);
 return bird.map((p,i)=>{
  if(before[i]&&Math.hypot(p[0]-before[i][0],p[1]-before[i][1])<1e-10)return points[i];
  return fromBird(data,c,[p])[0];
 });
}
