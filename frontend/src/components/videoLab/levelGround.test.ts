import {expect,it} from "vitest";
import {applyRay,rayPanorama,toBird,fromBird,groundCalibration} from "./atlasGeometry";
import {levelGround,levelCalibration,groundOutline,rayMidpoint} from "./levelGround";
import {panoramaBoundaryAt,type Panorama} from "./panorama";
import type {Corners} from "./pitch";

/* A synthetic Veo-like camera 1 unit above flat ground. It pans (yaw) across the
 * pitch while tilted down and rolled by nothing, exactly as the worker registers
 * frames: every world ray is expressed in the FIRST frame's camera axes. */
const rx=(a:number)=>[1,0,0,0,Math.cos(a),-Math.sin(a),0,Math.sin(a),Math.cos(a)];
const ry=(a:number)=>[Math.cos(a),0,Math.sin(a),0,1,0,-Math.sin(a),0,Math.cos(a)];
const mul=(a:number[],b:number[])=>[0,1,2].flatMap(r=>[0,1,2].map(c=>a[r*3]*b[c]+a[r*3+1]*b[3+c]+a[r*3+2]*b[6+c]));
const t=(m:number[])=>[m[0],m[3],m[6],m[1],m[4],m[7],m[2],m[5],m[8]];
const aspect=9/16,kinv=[1,0,-.5,0,aspect,-.5*aspect,0,0,.8];
const cam=(yaw:number,tilt:number)=>mul(ry(yaw),rx(-tilt));
function synthetic(tilt:number,startYaw:number):{data:Panorama;toWorld:(p:number[])=>number[]}{
 const first=cam(startYaw,tilt),yaws=[-.9,-.6,-.3,0,.3,.6,.9];
 const frame_to_world=yaws.map(y=>mul(mul(t(first),cam(y,tilt)),kinv));
 const data:Panorama={panorama_id:"a".repeat(64),source_sha256:"b".repeat(64),image:"pitch_atlas.jpg",width:2400,height:900,times:yaws.map((_,i)=>i),cuts:yaws.slice(1).map(()=>false),frame_to_panorama:frame_to_world,frame_to_world,projection:{kind:"cylindrical",origin:[-2.2,-.6],span:[4.4,1.8]},suggested_boundary:[],keyframe_times:[0]};
 return {data,toWorld:p=>applyRay(t(first),p)};
}
/** Ground point (x across, z away from the camera, metres) seen in the atlas. */
const atlasAt=(s:ReturnType<typeof synthetic>,x:number,z:number)=>rayPanorama(s.data,s.toWorld([x,1,z]));
const pitch=(s:ReturnType<typeof synthetic>,c:[number,number][])=>c.map(([x,z])=>atlasAt(s,x,z)) as Corners;
/** Display-space vector: the bird canvas is 8:5, so equal metres need equal pixels. */
const shown=(p:[number,number])=>[p[0]*8,p[1]*5];
const angle=(a:number[],b:number[],c:number[])=>{const u=[a[0]-b[0],a[1]-b[1]],v=[c[0]-b[0],c[1]-b[1]];return Math.acos((u[0]*v[0]+u[1]*v[1])/Math.hypot(...u)/Math.hypot(...v))*180/Math.PI;};

it("recovers the true ground normal from the level horizon of every registered frame",()=>{
 const s=synthetic(.25,.2),g=levelGround(s.data)!;
 expect(g).not.toBeNull();
 const truth=s.toWorld([0,1,0]);
 expect(g.down.reduce((a,v,i)=>a+v*truth[i],0)).toBeCloseTo(1,6);
});

it("refuses a ground model when the camera never pans, rather than guessing its tilt",()=>{
 const s=synthetic(.25,0);
 const still={...s.data,frame_to_world:[s.data.frame_to_world![3],s.data.frame_to_world![3]],times:[0,1],cuts:[false]};
 expect(levelGround(still)).toBeNull();
});

it("shows a real rectangular pitch as an undistorted rectangle without any goal anchors",()=>{
 const s=synthetic(.22,.35);
 const corners=pitch(s,[[-30,6],[30,6],[30,46],[-30,46]]);
 const c=levelCalibration(s.data,null)!;
 expect(c.kind).toBe("camera");
 const bird=toBird(s.data,c,corners).map(shown);
 for(let i=0;i<4;i++)expect(angle(bird[(i+3)%4],bird[i],bird[(i+1)%4])).toBeCloseTo(90,3);
 const long=Math.hypot(bird[1][0]-bird[0][0],bird[1][1]-bird[0][1]),short=Math.hypot(bird[2][0]-bird[1][0],bird[2][1]-bird[1][1]);
 expect(long/short).toBeCloseTo(60/40,3);
 expect(fromBird(s.data,c,toBird(s.data,c,corners))[2][0]).toBeCloseTo(corners[2][0],6);
});

it("does not let a mis-detected goal pair skew the bird's-eye view",()=>{
 const s=synthetic(.22,.35);
 const corners=pitch(s,[[-30,6],[30,6],[30,46],[-30,46]]);
 // Four "goal contacts" scattered mid-pitch, like a false detection on real footage.
 const wrong=pitch(s,[[-12,10],[-20,16],[6,24],[14,14]]);
 const goalBased=toBird(s.data,groundCalibration(s.data,null,wrong)!,corners).map(shown);
 expect(Math.abs(angle(goalBased[3],goalBased[0],goalBased[1])-90)).toBeGreaterThan(10);
 const bird=toBird(s.data,levelCalibration(s.data,null)!,corners).map(shown);
 expect(angle(bird[3],bird[0],bird[1])).toBeCloseTo(90,3);
});

it("turns the bird's-eye view so the reviewed boundary's long side is level",()=>{
 const s=synthetic(.22,0);
 const a=35*Math.PI/180,rot=([x,z]:[number,number]):[number,number]=>[x*Math.cos(a)-(z-26)*Math.sin(a),x*Math.sin(a)+(z-26)*Math.cos(a)+26];
 const corners=pitch(s,([[-25,12],[25,12],[25,40],[-25,40]] as [number,number][]).map(rot));
 const bird=toBird(s.data,levelCalibration(s.data,corners)!,corners).map(shown);
 const edge=(i:number)=>{const p=bird[i],q=bird[(i+1)%4];return Math.atan2(q[1]-p[1],q[0]-p[0])*180/Math.PI;};
 expect(Math.abs(Math.sin(edge(0)*Math.PI/180))).toBeLessThan(1e-6);
 expect(Math.hypot(bird[1][0]-bird[0][0],bird[1][1]-bird[0][1])).toBeGreaterThan(Math.hypot(bird[2][0]-bird[1][0],bird[2][1]-bird[1][1]));
 expect(bird.every(p=>p[0]>=0&&p[0]<=8&&p[1]>=0&&p[1]<=5)).toBe(true);
});

it("marks boundary points above the horizon as unusable in the bird's-eye view",()=>{
 const s=synthetic(.22,.35),c=levelCalibration(s.data,null)!;
 const sky=rayPanorama(s.data,s.toWorld([0,-1,20]));
 expect(toBird(s.data,c,[sky])[0].every(Number.isFinite)).toBe(false);
});

it("draws panorama edges along the same straight ground lines as the bird's-eye view",()=>{
 const s=synthetic(.22,.35),c=levelCalibration(s.data,null)!;
 const corners=pitch(s,[[-30,6],[30,6],[30,46],[-30,46]]);
 const outline=groundOutline(s.data,corners,12);
 expect(outline.length).toBe(48);
 const bird=toBird(s.data,c,outline).map(shown),ends=toBird(s.data,c,corners).map(shown);
 for(let i=0;i<4;i++)for(let j=0;j<12;j++){
  const p=bird[i*12+j],a=ends[i],b=ends[(i+1)%4];
  const cross=((b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]))/Math.hypot(b[0]-a[0],b[1]-a[1]);
  expect(Math.abs(cross)).toBeLessThan(1e-9);
 }
 const mid=toBird(s.data,c,[rayMidpoint(s.data,corners[0],corners[1])]).map(shown)[0];
 expect(mid[0]).toBeCloseTo((ends[0][0]+ends[1][0])/2,6);expect(mid[1]).toBeCloseTo((ends[0][1]+ends[1][1])/2,6);
});

it("projects an accepted boundary into a live frame with straight touchlines",()=>{
 const s=synthetic(.22,.35);
 const points=pitch(s,[[-30,6],[30,6],[30,46],[-30,46]]);
 const bound={data:s.data,review:{panorama_id:s.data.panorama_id,points,accepted:true as const}};
 const frame=panoramaBoundaryAt(bound,3)!;
 expect(frame).not.toBeNull();
 // Every visible vertex is either a projected corner or lies on a straight frame edge between two of them.
 const move=s.data.frame_to_world![3]!,inv=(()=>{const [a,b,c,d,e,f,g,h,i]=move;const co=[e*i-f*h,c*h-b*i,b*f-c*e,f*g-d*i,a*i-c*g,c*d-a*f,d*h-e*g,b*g-a*h,a*e-b*d];const det=a*co[0]+b*co[3]+c*co[6];return co.map(v=>v/det);})();
 const world=[[-30,6],[30,6],[30,46],[-30,46]].map(([x,z])=>applyRay(inv,s.toWorld([x,1,z])));
 const lines=world.map((p,i)=>{const q=world[(i+1)%4];return [p[1]*q[2]-p[2]*q[1],p[2]*q[0]-p[0]*q[2],p[0]*q[1]-p[1]*q[0]];});
 const onEdge=(p:[number,number])=>lines.some(l=>Math.abs(l[0]*p[0]+l[1]*p[1]+l[2])/Math.hypot(l[0],l[1])<1e-6)||p.some(v=>v===0||v===1);
 expect(frame.every(onEdge)).toBe(true);
});

it("starts an unproposed boundary as a ground rectangle inside the atlas, even when the atlas is narrower than the seen ground",async()=>{
 const {groundStartBoundary}=await import("./levelGround");
 const s=synthetic(.22,.35),narrow={...s.data,projection:{kind:"cylindrical" as const,origin:[-1.1,-.6] as [number,number],span:[1.9,1.8] as [number,number]}};
 const c=levelCalibration(narrow,null)!,start=groundStartBoundary(narrow,c)!;
 expect(start).not.toBeNull();
 expect(start.every(p=>p.every(v=>v>0&&v<1))).toBe(true);
 const bird=toBird(narrow,c,start).map(shown);
 for(let i=0;i<4;i++)expect(angle(bird[(i+3)%4],bird[i],bird[(i+1)%4])).toBeCloseTo(90,3);
});
