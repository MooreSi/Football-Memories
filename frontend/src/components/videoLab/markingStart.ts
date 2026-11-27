import {applyRay,groundCalibration,panoramaRay} from "./atlasGeometry";
import {DEFAULT_CORNERS,fitLandmarks,inverse,PITCH_CORNERS,project,type Landmark,type Point} from "./landmarks";
import {levelPitch} from "./livePitch";
import {panoramaMatrixAt,type Panorama} from "./panorama";
import {outlineAt,type Camera,type Corners,type PitchKeyframe} from "./pitch";
import {HALFWAY_ENDS,markerPointsAt} from "./pitchMarkers";

export { DEFAULT_CORNERS };
const HALFWAY_NAMES=["Near halfway intersection","Far halfway intersection"];
const clamp=(p:Point):Point=>[Math.min(3,Math.max(-2,p[0])),Math.min(3,Math.max(-2,p[1]))];
const onScreen=([x,y]:Point)=>x>=-.02&&x<=1.02&&y>=-.02&&y<=1.02;
const away=([x,y]:Point)=>Math.hypot(Math.max(0,-x,x-1),Math.max(0,-y,y-1));
/** Where a corner behind the camera goes: well off the picture on its own side, never used in the fit. */
const OFF_SCREEN:Corners=[[-.6,1.8],[1.6,1.8],[1.6,-.6],[-.6,-.6]];

export type MarkingStart={corners:Corners;landmarks:Landmark[];cornerIndices:number[]};

/**
 * Where the pitch marking editor opens (spec 800). An existing mark at this moment reopens as saved.
 * With an atlas, the handles start on the pitch as currently drawn: your markers, else the reviewed
 * corners, else the outline's rectangle on the level ground (what the live 2D pitch reads); the two
 * halfway-line ends are handles wherever they are in front of the camera; corners off the picture
 * start unticked for the fit (as long as four points remain). Without an atlas, the spec 600
 * behaviour: corners only, all used.
 */
export function markingStart(camera:Camera|undefined,marks:PitchKeyframe[],time:number):MarkingStart{
 const existing=marks.find(m=>Math.abs(m.time_s-time)<.05);
 if(existing)return {corners:existing.corners,landmarks:existing.landmarks??[],cornerIndices:existing.fit_corner_indices??[0,1,2,3]};
 if(!camera||!(camera.markers||camera.panorama||camera.proposal))return {corners:(camera&&outlineAt(camera,marks,time))??DEFAULT_CORNERS,landmarks:[],cornerIndices:[0,1,2,3]};
 const bound=camera.panorama??camera.proposal;
 // Pitch points in the picture through a world-ray -> normalised-pitch matrix (null behind the camera).
 const through=(data:Panorama,matrix:number[]|null,points:Point[]):(Point|null)[]|null=>{
  const pose=matrix&&panoramaMatrixAt(data,time);
  if(!pose||!matrix)return null;
  const move=inverse(pose),back=inverse(matrix);
  return points.map(([u,v])=>{const q=applyRay(move,applyRay(back,[u,v,1]));return q[2]>1e-9?[q[0]/q[2],q[1]/q[2]]:null;});
 };
 const reviewed=camera.panorama?.review.corners?groundCalibration(camera.panorama.data,camera.panorama.review.corners,null):null;
 const source:((points:Point[])=>(Point|null)[]|null)|null=camera.markers?points=>markerPointsAt(camera.markers!,time,points)
  :reviewed&&camera.panorama?points=>through(camera.panorama!.data,reviewed.matrix,points)
  :bound?points=>through(bound.data,levelPitch(bound),points):null;
 const raw=source?.(PITCH_CORNERS);
 const corners:Corners=raw&&raw.filter(Boolean).length>=2?raw.map((p,i)=>p?clamp(p):OFF_SCREEN[i]):DEFAULT_CORNERS;
 // The halfway line: as reviewed, else from the same pitch; ends behind the camera are left out.
 const reviewedEnds=!camera.markers&&!reviewed&&bound?.review.halfway?.length===2?[...bound.review.halfway].sort((a,b)=>b[1]-a[1]):null;
 const ends=reviewedEnds?atlasInPicture(bound!.data,reviewedEnds,time):source?.(HALFWAY_ENDS)??null;
 const fit=fitLandmarks(corners.map((image,i)=>({image,pitch:PITCH_CORNERS[i]})));
 const guess=!source&&fit?HALFWAY_ENDS.map(p=>project(inverse(fit),p)):null;
 const landmarks=(ends??guess??[]).flatMap((p,i)=>p?[{name:HALFWAY_NAMES[i],pitch:HALFWAY_ENDS[i],image:clamp(p)}]:[]);
 // On-screen corners, then the off-screen ones nearest the picture until four points fix a fit.
 const order=[0,1,2,3].sort((a,b)=>away(corners[a])-away(corners[b]));
 const used=order.filter((i,n)=>onScreen(corners[i])||n<4-landmarks.length).sort();
 return {corners,landmarks,cornerIndices:used};
}

function atlasInPicture(data:Panorama,points:Point[],time:number):(Point|null)[]|null{
 const pose=panoramaMatrixAt(data,time);
 if(!pose)return null;
 const move=inverse(pose);
 return points.map(p=>{const q=applyRay(move,panoramaRay(data,p));return q[2]>1e-9?[q[0]/q[2],q[1]/q[2]] as Point:null;});
}

/**
 * The halfway ends to save with a mark: those in the picture or that you moved (or added). An
 * off-screen end you never touched is the old pitch's guess, so it is dropped unless it is needed for
 * four points with the corners in use.
 */
export function landmarksToSave(current:Landmark[],start:Landmark[],cornersUsed:number):Landmark[]{
 const moved=(l:Landmark)=>{const s=start.find(x=>x.name===l.name);return !s||Math.hypot(s.image[0]-l.image[0],s.image[1]-l.image[1])>1e-6;};
 const keep=current.filter(l=>onScreen(l.image)||moved(l));
 const spare=current.filter(l=>!keep.includes(l)).sort((a,b)=>away(a.image)-away(b.image));
 const out=[...keep,...spare.slice(0,Math.max(0,4-cornersUsed-keep.length))];
 return current.filter(l=>out.includes(l));
}
