import {expect,it} from "vitest";
import {isPanorama,panoramaBoundaryAt,type Panorama} from "./panorama";
import {imageToPitch,toPitch} from "./metres";
import {rayPanorama} from "./atlasGeometry";
const data:Panorama={panorama_id:"a".repeat(64),source_sha256:"b".repeat(64),image:"pitch_atlas.jpg",width:2400,height:900,times:[0],cuts:[],frame_to_panorama:[[1,0,0,0,1,0,0,0,1]],frame_to_world:[[1,0,-.5,0,1,0,0,0,.8]],projection:{kind:"cylindrical",origin:[-1,-.2],span:[2,1.2]},suggested_boundary:[],keyframe_times:[0]};
it("rejects malformed goal candidates before rendering their post handles",()=>{
 expect(isPanorama({...data,selected_goals:[{posts:null}]})).toBe(false);
});
it("projects an accepted cylindrical boundary into the current frame and composes physical corners to metres",()=>{
 const corners:[number,number][]=[[.1,.9],[.9,.9],[.8,.3],[.2,.3]];
 const panorama=corners.map(([x,y])=>rayPanorama(data,[x-.5,y,.8]));
 const bound={data,review:{panorama_id:data.panorama_id,points:panorama,corners:panorama,accepted:true as const}};
 const boundary=panoramaBoundaryAt(bound,0)!;
 expect(boundary.length).toBeGreaterThanOrEqual(4);
 expect(boundary.every(p=>p.every(n=>n>=0&&n<=1))).toBe(true);
 const h=imageToPitch({times:[],segment:[],total:[],inverse:[],panorama:bound},[],{length_m:55,width_m:37},0)!;
 expect(toPitch(h,corners[0])[0]).toBeCloseTo(0);
 expect(toPitch(h,corners[1])[0]).toBeCloseTo(55);
 expect(toPitch(h,corners[2])[1]).toBeCloseTo(37);
});
