import {applyRay,multiply,panoramaRay} from "./atlasGeometry";
import type {BallPoint} from "./ball";
import type {Observation} from "./labTypes";
import {levelCalibration} from "./levelGround";
import {imageToPitch,type PitchSize} from "./metres";
import {panoramaMatrixAt,type BoundPanorama} from "./panorama";
import {feet,type Camera,type PitchKeyframe} from "./pitch";

/* The live 2D pitch: every tracked person's feet on a top-down pitch (near-left corner = 0,0,
 * x along the near touchline, y towards the far one), gliding between detections.
 *
 * Exact positions need the owner's marked pitch or confirmed corners. Without them the worker's
 * automatic outline still frames the camera-level ground plan (levelGround), so a freshly analysed
 * match gets a pitch at once: shape is true up to scale, the outline's rectangle is stretched onto
 * the pitch size, and the far half is approximate on a low camera. */
export type PitchPoint={time_s:number;x:number;y:number};
export type PitchSource={exact:boolean;project:(time:number,point:[number,number])=>[number,number]|null};

const GLIDE_S=1.5,HOLD_S=.5,MAX_SPEED_MS=12,SMOOTH_S=.6;

function level(bound:BoundPanorama,{length_m:l,width_m:w}:PitchSize):PitchSource|null{
 const {data,review}=bound;
 if(!data.projection||review.points.length<3)return null;
 const c=levelCalibration(data,review.points);
 if(!c)return null;
 const plan=review.points.map(p=>applyRay(c.matrix,panoramaRay(data,p)));
 if(plan.some(q=>!(q[2]>1e-9)))return null;
 const xs=plan.map(q=>q[0]/q[2]),ys=plan.map(q=>q[1]/q[2]);
 const x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
 if(!(x1-x0>1e-9&&y1-y0>1e-9))return null;
 // Plan view has the far touchline at the top (small y); pitch y grows away from the camera.
 const fit=[l/(x1-x0),0,-x0*l/(x1-x0),0,-w/(y1-y0),y1*w/(y1-y0),0,0,1],toPlan=multiply(fit,c.matrix);
 return {exact:false,project:(time,[x,y])=>{
  const pose=panoramaMatrixAt(data,time);
  if(!pose)return null;
  const q=applyRay(multiply(toPlan,pose),[x,y,1]);
  // A point at or above the horizon has no ground position.
  return q[2]>1e-9?[q[0]/q[2],q[1]/q[2]]:null;
 }};
}

/** How image points reach the pitch, or null when nothing places the pitch yet. */
export function pitchSource(camera:Camera,marks:PitchKeyframe[],size:PitchSize):PitchSource|null{
 if(marks.length||camera.panorama?.review.corners){
  const cache=new Map<number,number[]|null>();
  return {exact:true,project:(time,[x,y])=>{
   if(!cache.has(time))cache.set(time,imageToPitch(camera,marks,size,time));
   const h=cache.get(time);
   if(!h)return null;
   const d=h[6]*x+h[7]*y+h[8],p:[number,number]=[(h[0]*x+h[1]*y+h[2])/d,(h[3]*x+h[4]*y+h[5])/d];
   return p.every(Number.isFinite)?p:null;
  }};
 }
 const bound=camera.panorama??camera.proposal;
 return bound?level(bound,size):null;
}

/** Each track's feet on the pitch over time. A step faster than a sprint is a swapped or
 * mismatched box and is dropped; close neighbours are lightly averaged to calm jitter. */
export function trackPaths(rows:Observation[],source:PitchSource):Map<number,PitchPoint[]>{
 const raw=new Map<number,PitchPoint[]>();
 for(const o of rows){
  if(o.image_box?.length!==4)continue;
  const p=source.project(o.time_s,feet(o));
  if(!p)continue;
  const list=raw.get(o.track_id)??[];list.push({time_s:o.time_s,x:p[0],y:p[1]});raw.set(o.track_id,list);
 }
 const out=new Map<number,PitchPoint[]>();
 for(const [track,list] of raw){
  list.sort((a,b)=>a.time_s-b.time_s);
  const kept:PitchPoint[]=[];
  for(const p of list){
   const last=kept[kept.length-1];
   if(last&&p.time_s===last.time_s)continue;
   if(last&&p.time_s-last.time_s<=GLIDE_S&&Math.hypot(p.x-last.x,p.y-last.y)>MAX_SPEED_MS*(p.time_s-last.time_s))continue;
   kept.push(p);
  }
  out.set(track,kept.map((p,i)=>{
   const a=kept[i-1],b=kept[i+1];
   if(!a||!b||p.time_s-a.time_s>SMOOTH_S||b.time_s-p.time_s>SMOOTH_S)return p;
   return {time_s:p.time_s,x:(a.x+2*p.x+b.x)/4,y:(a.y+2*p.y+b.y)/4};
  }));
 }
 return out;
}

/** Position on a path at a time: glides between close samples, holds briefly after the last. */
export function pointAt(path:PitchPoint[],at:number,hold=HOLD_S):PitchPoint|null{
 let lo=0,hi=path.length-1,found=-1;
 while(lo<=hi){const mid=(lo+hi)>>1;if(path[mid].time_s<=at){found=mid;lo=mid+1;}else hi=mid-1;}
 const a=path[found],b=path[found+1];
 if(!a)return null;
 if(b&&b.time_s-a.time_s<=GLIDE_S){const f=(at-a.time_s)/(b.time_s-a.time_s);return {time_s:at,x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f};}
 return at-a.time_s<=hold?a:null;
}

export function playersAt(paths:Map<number,PitchPoint[]>,at:number):{track_id:number;x:number;y:number}[]{
 const out:{track_id:number;x:number;y:number}[]=[];
 for(const [track_id,path] of paths){const p=pointAt(path,at);if(p)out.push({track_id,x:p.x,y:p.y});}
 return out;
}

/** The last `seconds` of one continuous stretch of a path, ending at the current position. */
export function trailOf(path:PitchPoint[],at:number,seconds=3):PitchPoint[]{
 const now=pointAt(path,at);
 if(!now)return [];
 const out:PitchPoint[]=[now];
 for(let i=path.length-1;i>=0;i--){
  const p=path[i];
  if(p.time_s>=at)continue;
  if(p.time_s<at-seconds||out[0].time_s-p.time_s>GLIDE_S)break;
  out.unshift(p);
 }
 return out;
}

/** The tracked ball's ground contact on the pitch. Ball points are fractions of the frame with the
 * radius a fraction of its width, so the contact (centre plus radius) is scaled by the frame shape. */
export function ballPath(ball:BallPoint[],source:PitchSource,width:number,height:number):PitchPoint[]{
 const out:PitchPoint[]=[];
 for(const b of ball){const p=source.project(b.time_s,[b.x,b.y+b.r*width/height]);if(p)out.push({time_s:b.time_s,x:p[0],y:p[1]});}
 return out;
}

const SIDELINE_M=4,STILL_M=4;

/** People who stand along a touchline: the middle of their track is within 4 m of either touchline
 * (or beyond it) and they stay within 4 m of that spot nine-tenths of the time. On NL 91f49e12 this
 * was parents and coaches lining the far side: half of every observation, moving at a median
 * 0.43 m/s against 1.9 m/s on the pitch, and measuring adult height. Your labelled people (`keep`)
 * are never treated this way; "Show everyone" shows them all. */
export function sidelineTracks(paths:Map<number,PitchPoint[]>,{width_m:w}:PitchSize,keep:(track:number)=>boolean):Set<number>{
 const out=new Set<number>();
 const middle=(v:number[])=>{const s=[...v].sort((a,b)=>a-b);return s[s.length>>1];};
 for(const [track,path] of paths){
  if(!path.length||keep(track))continue;
  const mx=middle(path.map(p=>p.x)),my=middle(path.map(p=>p.y));
  if(my>SIDELINE_M&&my<w-SIDELINE_M)continue;
  const d=path.map(p=>Math.hypot(p.x-mx,p.y-my)).sort((a,b)=>a-b);
  if(d[Math.floor(.9*(d.length-1))]<STILL_M)out.add(track);
 }
 return out;
}
