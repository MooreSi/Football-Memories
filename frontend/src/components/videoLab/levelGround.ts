import {applyRay,aspectBounds,panoramaRay,rayPanorama,type GroundCalibration} from "./atlasGeometry";
import {inverse} from "./landmarks";
import type {Panorama} from "./panorama";
import type {Corners} from "./pitch";

/* Camera-level ground model (bird's-eye geometry without goal anchors).
 *
 * Every registered frame is a pure rotation of one static camera, and Veo's virtual
 * camera keeps the horizon level: each frame's image x-axis is horizontal. Across a
 * pan those axes span the horizontal plane, so the ground normal is the direction
 * perpendicular to all of them (the smallest eigenvector of their scatter). Rays then
 * meet the ground at distance 1/(down·ray): a metric plan view up to one scale (the
 * unknown camera height). Four goal-post contacts cannot do this: they are two tight
 * clusters, so a fit through them extrapolates the pitch width several times over and
 * a false goal detection collapses the whole view. */

export type Level={down:number[];forward:number[];right:number[]};
type V=number[];
const dot=(a:V,b:V)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const unit=(a:V)=>{const n=Math.hypot(a[0],a[1],a[2]);return a.map(v=>v/n);};
const cross=(a:V,b:V)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
/** Minimum pan spread (sin² of about 3°) before the horizontal plane is determined. */
const MIN_SPREAD=2.5e-3;
/** Largest mean squared tilt of frame x-axes off one plane (about 3°) for a level camera. */
const MAX_RESIDUAL=2.5e-3;
/** Rays shallower than this (about 2°) meet the ground too far away to bound a view. */
const MIN_DEPRESSION=0.035;

/** Eigen-decomposition of a symmetric 3x3 matrix (cyclic Jacobi); ascending eigenvalues. */
function eigen(m:number[]):{values:number[];vectors:V[]}{
 const a=[[m[0],m[1],m[2]],[m[3],m[4],m[5]],[m[6],m[7],m[8]]],v=[[1,0,0],[0,1,0],[0,0,1]];
 for(let sweep=0;sweep<50;sweep++){
  const off=a[0][1]**2+a[0][2]**2+a[1][2]**2;
  if(off<1e-30)break;
  for(const [p,q] of [[0,1],[0,2],[1,2]]){
   if(Math.abs(a[p][q])<1e-300)continue;
   const theta=(a[q][q]-a[p][p])/(2*a[p][q]),tt=Math.sign(theta||1)/(Math.abs(theta)+Math.sqrt(theta*theta+1));
   const c=1/Math.sqrt(tt*tt+1),s=tt*c;
   for(let k=0;k<3;k++){const x=a[k][p],y=a[k][q];a[k][p]=c*x-s*y;a[k][q]=s*x+c*y;}
   for(let k=0;k<3;k++){const x=a[p][k],y=a[q][k];a[p][k]=c*x-s*y;a[q][k]=s*x+c*y;}
   for(let k=0;k<3;k++){const x=v[k][p],y=v[k][q];v[k][p]=c*x-s*y;v[k][q]=s*x+c*y;}
  }
 }
 return [0,1,2].map(i=>({value:a[i][i],vector:[v[0][i],v[1][i],v[2][i]]})).sort((x,y)=>x.value-y.value).reduce((o,e)=>({values:[...o.values,e.value],vectors:[...o.vectors,e.vector]}),{values:[] as number[],vectors:[] as V[]});
}

const frames=(data:Panorama)=>(data.projection?data.frame_to_world??[]:[]).filter((m):m is number[]=>!!m&&m.every(Number.isFinite));

/** Ground directions in atlas world axes, or null when the pan cannot fix the horizon. */
export function levelGround(data:Panorama):Level|null{
 const all=frames(data);if(all.length<2)return null;
 const scatter=[0,0,0,0,0,0,0,0,0],centre=[0,0,0];
 for(const m of all){
  const x=unit([m[0],m[3],m[6]]),c=unit(applyRay(m,[.5,.5,1]));
  if(!x.every(Number.isFinite)||!c.every(Number.isFinite))return null;
  for(let i=0;i<3;i++){centre[i]+=c[i];for(let j=0;j<3;j++)scatter[i*3+j]+=x[i]*x[j]/all.length;}
 }
 const {values,vectors}=eigen(scatter);
 if(values[1]<MIN_SPREAD||values[0]>MAX_RESIDUAL||values[0]>values[1]/4)return null;
 let down=unit(vectors[0]);if(dot(down,centre)<0)down=down.map(v=>-v);
 const ahead=centre.map((v,i)=>v-dot(centre,down)*down[i]);
 if(Math.hypot(...ahead)<1e-9)return null;
 const forward=unit(ahead),right=cross(down,forward);
 return down.every(Number.isFinite)&&right.every(Number.isFinite)?{down,forward,right}:null;
}

/** Ground position (across, away) of a ray in camera-centred plan axes; null above the horizon. */
const plan=(g:Level,ray:V):[number,number]|null=>{const d=dot(g.down,ray);return d>1e-9?[dot(g.right,ray)/d,dot(g.forward,ray)/d]:null;};

/** Angle of the long side of the minimum-area rectangle around ground points. */
function longAxis(points:[number,number][]):number|null{
 const hull:[number,number][]=[];
 const sorted=[...points].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
 const turn=(o:number[],a:number[],b:number[])=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
 for(const pass of [sorted,[...sorted].reverse()]){const start=hull.length;for(const p of pass){while(hull.length>=start+2&&turn(hull[hull.length-2],hull[hull.length-1],p)<=0)hull.pop();hull.push(p);}hull.pop();}
 if(hull.length<3)return null;
 let best:{area:number;angle:number;wide:boolean}|null=null;
 hull.forEach((p,i)=>{
  const q=hull[(i+1)%hull.length],a=Math.atan2(q[1]-p[1],q[0]-p[0]),c=Math.cos(a),s=Math.sin(a);
  const u=hull.map(([x,z])=>c*x+s*z),w=hull.map(([x,z])=>-s*x+c*z);
  const du=Math.max(...u)-Math.min(...u),dw=Math.max(...w)-Math.min(...w);
  if(!best||du*dw<best.area-1e-12)best={area:du*dw,angle:a,wide:du>=dw};
 });
 if(!best)return null;
 const b:{area:number;angle:number;wide:boolean}=best;
 let angle=b.wide?b.angle:b.angle+Math.PI/2;
 // Keep the camera at the bottom: the smallest turn from the camera-facing view.
 while(angle>Math.PI/2)angle-=Math.PI;while(angle<=-Math.PI/2)angle+=Math.PI;
 return angle;
}

/** Ground points actually seen by registered frames, for bounding the plan view. */
function observed(data:Panorama,g:Level):[number,number][]{
 const all=frames(data),step=Math.max(1,Math.floor(all.length/60)),out:[number,number][]=[];
 for(let i=0;i<all.length;i+=step)for(let y=0;y<=4;y++)for(let x=0;x<=4;x++){
  const ray=unit(applyRay(all[i],[x/4,y/4,1]));
  if(dot(g.down,ray)<MIN_DEPRESSION)continue;
  const p=plan(g,ray);if(p)out.push(p);
 }
 return out;
}
const percentile=(v:number[],q:number)=>{const s=[...v].sort((a,b)=>a-b);return s[Math.min(s.length-1,Math.max(0,Math.round(q*(s.length-1))))];};

/** Plan-view calibration from camera geometry alone. `orient` (the reviewed boundary)
 * only turns and frames the view; it never changes the ground shape. */
export function levelCalibration(data:Panorama,orient:Corners|null,{wide=false}:{wide?:boolean}={}):GroundCalibration|null{
 const g=levelGround(data);if(!g)return null;
 const ground=orient&&orient.length>=3?orient.map(p=>plan(g,panoramaRay(data,p))):[];
 const usable=ground.length>=3&&ground.every(p=>p&&p.every(Number.isFinite))?ground as [number,number][]:null;
 const angle=(usable&&longAxis(usable))??0,c=Math.cos(angle),s=Math.sin(angle);
 const along=g.right.map((v,i)=>c*v+s*g.forward[i]),away=g.right.map((v,i)=>-s*v+c*g.forward[i]);
 const matrix=[...along,...away.map(v=>-v),...g.down];
 const toView=([x,z]:[number,number])=>[c*x+s*z,-(-s*x+c*z)];
 const seen=observed(data,g).map(toView);
 const fit=[...(usable?usable.map(toView):[]),...(!usable||wide?seen:[])];
 if(fit.length<3)return null;
 const xs=fit.map(p=>p[0]),ys=fit.map(p=>p[1]),trim=usable&&!wide?0:.02;
 const bounds=aspectBounds([percentile(xs,trim),percentile(ys,trim),percentile(xs,1-trim),percentile(ys,1-trim)]);
 const inv=inverse(matrix);
 return matrix.every(Number.isFinite)&&inv.every(Number.isFinite)&&bounds.every(Number.isFinite)?{matrix,inverse:inv,normal:g.down,bounds,kind:"camera"}:null;
}

/** Atlas points along each boundary edge. A straight line on the ground is a plane
 * through the camera, i.e. the positive span of its two end rays; interpolating atlas
 * pixels instead bends every long edge (the cylinder is not a plane). */
export function groundOutline(data:Panorama,points:Corners,steps=16):Corners{
 if(points.length<2)return points;
 return points.flatMap((p,i)=>{
  const a=unit(panoramaRay(data,p)),b=unit(panoramaRay(data,points[(i+1)%points.length]));
  return Array.from({length:steps},(_,j)=>rayPanorama(data,a.map((v,k)=>v*(1-j/steps)+b[k]*j/steps)));
 });
}

/** Ground midpoint of an edge (angular midpoint when the ground model is unknown). */
export function rayMidpoint(data:Panorama,p:[number,number],q:[number,number]):[number,number]{
 const a=unit(panoramaRay(data,p)),b=unit(panoramaRay(data,q)),g=levelGround(data);
 const da=g?dot(g.down,a):0,db=g?dot(g.down,b):0;
 return rayPanorama(data,da>1e-9&&db>1e-9?a.map((v,i)=>v/da+b[i]/db):a.map((v,i)=>v+b[i]));
}

/** Editable starting outline when the worker proposed none: a ground rectangle in the
 * middle of the seen area, shrunk about its centre until every corner lies in the atlas. */
export function groundStartBoundary(data:Panorama,c:GroundCalibration):Corners|null{
 if(c.kind!=="camera")return null;
 const [l,t,r,b]=c.bounds,cx=(l+r)/2,cy=(t+b)/2;
 for(let scale=1;scale>.2;scale-=.1){
  const plan=[[-.32,-.29],[.32,-.29],[.32,.3],[-.32,.3]].map(([x,y])=>[cx+x*scale*(r-l),cy+y*scale*(b-t),1]);
  const out=plan.map(p=>{let ray=applyRay(c.inverse,p);if(dot(ray,c.normal)<0)ray=ray.map(v=>-v);return rayPanorama(data,ray);});
  if(out.every(p=>p.every(v=>Number.isFinite(v)&&v>=.01&&v<=.99)))return out;
 }
 return null;
}
