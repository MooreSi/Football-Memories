import {expect,it} from "vitest";
import {bindPanorama,panoramaPointsAt,type Panorama,type PanoramaReview} from "./panorama";
const points:[number,number][]=[[.1,.2],[.9,.2],[.9,.8],[.1,.8]];
const data:Panorama={panorama_id:"b".repeat(64),source_sha256:"a".repeat(64),image:"pitch_panorama.jpg",width:1600,height:450,times:[0,1,2],cuts:[true,true],frame_to_panorama:[[.5,0,0,0,1,0,0,0,1],null,[.5,0,.5,0,1,0,0,0,1]],suggested_boundary:points,keyframe_times:[0,2]};
const review:PanoramaReview={panorama_id:data.panorama_id,points,corners:points,accepted:true};
it("projects one accepted panorama into separately registered views after a cut",()=>{
 const bound=bindPanorama(data,review,data.source_sha256)!;
 expect(panoramaPointsAt(bound,0)?.[0]).toEqual([.2,.2]);
 expect(panoramaPointsAt(bound,2)?.[0]).toEqual([-.8,.2]);
 expect(panoramaPointsAt(bound,2,true)).toEqual(panoramaPointsAt(bound,2));
});
it("refuses proposals, stale maps, absent source hashes and unregistered times",()=>{
 expect(bindPanorama(data,null,data.source_sha256)).toBeUndefined();
 expect(bindPanorama(data,{...review,panorama_id:"c".repeat(64)},data.source_sha256)).toBeUndefined();
 expect(bindPanorama(data,review,undefined)).toBeUndefined();
 expect(bindPanorama(data,review,"d".repeat(64))).toBeUndefined();
 const bound=bindPanorama(data,review,data.source_sha256)!;
 expect(panoramaPointsAt(bound,1)).toBeNull();
 expect(panoramaPointsAt(bound,.5)).toBeNull();
 expect(panoramaPointsAt(bound,9)).toBeNull();
});

it("rejects malformed registration arrays before they reach the player",async()=>{
 const {isPanorama}=await import("./panorama");
 expect(isPanorama({...data,frame_to_panorama:[[1,2,3]]})).toBe(false);
 expect(isPanorama({...data,times:[0,2,1]})).toBe(false);
 expect(isPanorama({...data,width:Infinity})).toBe(false);
});

it("feeds accepted physical corners to metre positions and drops unmatched views",async()=>{
 const {buildCamera}=await import("./pitch");const {positions}=await import("./metres");
 const camera={...buildCamera({times:data.times,steps:[[1,0,0,0,1,0,0,0,1],[1,0,0,0,1,0,0,0,1]],cuts:data.cuts}),panorama:bindPanorama(data,review,data.source_sha256)};
 const rows=[0,1,2].map(time_s=>({track_id:1,time_s,team_id:null,role:"unknown",image_box:[.4,.2,.6,.5]}));
 const mapped=positions(rows,camera,[],{length_m:100,width_m:60});
 expect(mapped.map(p=>p.time_s)).toEqual([0,2]);
 expect(mapped[0].x).toBeCloseTo(18.75);expect(mapped[1].x).toBeCloseTo(81.25);
});

it("clips the visible ground rather than rejecting the whole pitch when distant vertices cross the horizon",async()=>{
 const {inverse}=await import("./landmarks");const {panoramaBoundaryAt}=await import("./panorama");
 const move=[1,0,-.4,0,.1,-.02,1,0,-.3];
 const horizonData={...data,frame_to_panorama:[inverse(move),null,null]};
 const bound=bindPanorama(horizonData,review,data.source_sha256)!;
 const visible=panoramaBoundaryAt(bound,0);
 expect(visible?.length).toBeGreaterThanOrEqual(3);
 expect(visible?.every(p=>p.every(v=>v>=0&&v<=1))).toBe(true);
 expect(panoramaBoundaryAt(bound,1)).toBeNull();
});
it("composes panorama calibration into metres even when distant corners are behind the current view",async()=>{
 const {inverse}=await import("./landmarks");const {buildCamera}=await import("./pitch");const {positions}=await import("./metres");
 const horizonData={...data,frame_to_panorama:[inverse([1,0,-.4,0,.1,-.02,1,0,-.3]),null,null]};
 const camera={...buildCamera({times:data.times,steps:[[1,0,0,0,1,0,0,0,1],[1,0,0,0,1,0,0,0,1]],cuts:data.cuts}),panorama:bindPanorama(horizonData,review,data.source_sha256)};
 const mapped=positions([{track_id:1,time_s:0,role:"unknown",team_id:null,image_box:[.4,.1,.6,.2]}],camera,[],{length_m:100,width_m:60});
 expect(mapped).toHaveLength(1);expect(mapped[0].x).toBeCloseTo(50);expect(mapped[0].y).toBeCloseTo(40);
});

it("uses the accepted panorama instead of an older local boundary throughout the video",async()=>{
 const {buildCamera}=await import("./pitch");const {boundaryAt}=await import("./boundary");
 const camera={...buildCamera({times:data.times,steps:[[1,0,0,0,1,0,0,0,1],[1,0,0,0,1,0,0,0,1]],cuts:data.cuts}),panorama:bindPanorama(data,review,data.source_sha256)};
 const old:[number,number][]=[[.8,.8],[.95,.8],[.95,.95],[.8,.95]];
 expect(boundaryAt(camera,[{time_s:0,points:old}],[],0)?.[0]).toEqual([.2,.2]);
});
