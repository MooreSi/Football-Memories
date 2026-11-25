import {expect,it} from "vitest";
import type {Panorama} from "./panorama";
import {panoramaRay,rayPanorama,groundCalibration,toBird,fromBird} from "./atlasGeometry";
const data:Panorama={panorama_id:"a".repeat(64),source_sha256:"b".repeat(64),image:"pitch_atlas.jpg",width:2400,height:900,times:[0],cuts:[],frame_to_panorama:[[1,0,0,0,1,0,0,0,1]],frame_to_world:[[1,0,0,0,1,0,0,0,1]],projection:{kind:"cylindrical",origin:[-1,-.2],span:[2,1.2]},suggested_boundary:[],keyframe_times:[0]};
it("round-trips left and right ends through the cylindrical projection",()=>{
 for(const p of [[.05,.7],[.95,.7],[.5,.5]] as [number,number][]){
  const ray=panoramaRay(data,p);expect(ray[0]/ray[2]).toBeCloseTo(Math.tan(-1+p[0]*2));
  expect(rayPanorama(data,ray)[0]).toBeCloseTo(p[0]);expect(rayPanorama(data,ray)[1]).toBeCloseTo(p[1]);
 }
});
it("links boundary edits between the stitched view and the goal-based bird's-eye view",()=>{
 const goals:[number,number][]=[[.1,.8],[.15,.6],[.85,.6],[.9,.8]];
 const c=groundCalibration(data,null,goals)!;expect(c).not.toBeNull();
 const top=toBird(data,c,goals);const round=fromBird(data,c,top);
 expect(top[0][0]).toBeCloseTo(.08/1.16);expect(top[1][0]).toBeCloseTo(.08/1.16);
 expect(round[0][0]).toBeCloseTo(goals[0][0]);expect(round[3][1]).toBeCloseTo(goals[3][1]);
});
it("does not invent a top-down image without valid goal or physical corner anchors",()=>{
 expect(groundCalibration(data,null,null)).toBeNull();
 expect(groundCalibration(data,null,[[.5,.5],[.5,.5],[.5,.5],[.5,.5]])).toBeNull();
});
it("fits every proposed boundary handle inside the bird's-eye editing viewport",async()=>{
 const {fitBirdBoundary}=await import("./atlasGeometry");
 const c=groundCalibration(data,null,[[.1,.8],[.15,.6],[.85,.6],[.9,.8]])!;
 const points:[number,number][]=[[.02,.95],[.98,.95],[.9,.3],[.1,.3]];
 const fitted=fitBirdBoundary(data,c,points);
 const visible=toBird(data,fitted,points);
 expect(visible.every(p=>p.every(n=>n>=0&&n<=1))).toBe(true);
 expect(fromBird(data,fitted,visible)[0][0]).toBeCloseTo(.02);
});
it("keeps unrelated panorama vertices unchanged when a bird edit crosses a projection horizon",async()=>{
 const {applyBirdEdit}=await import("./atlasGeometry");
 const wide={...data,projection:{kind:"cylindrical" as const,origin:[-2,-.2] as [number,number],span:[4,1.2] as [number,number]}};
 const c=groundCalibration(wide,null,[[.3,.8],[.4,.6],[.6,.6],[.7,.8]])!;
 const p:[number,number][]=[[.01,.95],[.99,.95],[.7,.3],[.3,.3]];
 const bird=toBird(wide,c,p);bird[2]=[bird[2][0]+.001,bird[2][1]];
 const edited=applyBirdEdit(wide,c,p,bird);
 expect(edited[0]).toEqual(p[0]);expect(edited[1]).toEqual(p[1]);expect(edited[3]).toEqual(p[3]);
 expect(edited[2]).not.toEqual(p[2]);
});
