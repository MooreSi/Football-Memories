import { expect, it } from "vitest";
import { boundaryAt } from "./boundary";
import { buildCamera } from "./pitch";
const id=[1,0,0,0,1,0,0,0,1];
const points:[number,number][]=[[0,1],[1,1],[1,0.3],[0.5,0.1],[0,0.3]];
const camera=buildCamera({times:[0,1,2],steps:[id,id],cuts:[false,true]});
it("uses automatic multi-vertex proposals and never carries them across a cut",()=>{
 expect(boundaryAt(camera,[],[{time_s:0,points}],0.5)).toEqual(points);
 expect(boundaryAt(camera,[],[{time_s:0,points}],2)).toBeNull();
});
it("human boundary corrections override automatic ones in their camera shot",()=>{
 const corrected=points.map(([x,y])=>[x,y+0.05] as [number,number]);
 expect(boundaryAt(camera,[{time_s:0,points:corrected}],[{time_s:0,points}],0.5)).toEqual(corrected);
});
it("an explicit no-pitch observation stops a stale automatic boundary",()=>{
 expect(boundaryAt(camera,[],[{time_s:0,points},{time_s:1,points:[]}],1)).toBeNull();
});
it("does not extrapolate automatic suggestions outside their short observation window",()=>{
 const long=buildCamera({times:[0,1,10],steps:[id,id],cuts:[false,false]});
 expect(boundaryAt(long,[],[{time_s:0,points}],10)).toBeNull();
});

it("carries every boundary vertex through a pan at fractional correction times",()=>{
 const pan=buildCamera({times:[0,1,2],steps:[[1,0,-0.1,0,1,0,0,0,1],[1,0,-0.1,0,1,0,0,0,1]],cuts:[false,false]});
 const actual=boundaryAt(pan,[{time_s:0.5,points}],[],1.5)!;
 expect(actual).toHaveLength(5);
 expect(actual[0][0]).toBeCloseTo(-0.1);
 expect(actual[3][0]).toBeCloseTo(0.4);
});

it("shows a painted-line pitch proposal live instead of the colour guess, below human and accepted boundaries",async()=>{
 const {pitchProposal}=await import("./panorama");
 const base={panorama_id:"a".repeat(64),source_sha256:"b".repeat(64),image:"pitch_atlas.jpg",width:2400,height:900,times:[0,1,2],cuts:[false,true],frame_to_panorama:[id,id,id],frame_to_world:[id,id,id],projection:{kind:"cylindrical" as const,origin:[-1,-.5] as [number,number],span:[2,1.5] as [number,number]},keyframe_times:[0]};
 const outline:[number,number][]=[[.3,.5],[.7,.5],[.7,.9],[.3,.9]];
 const lined={...base,suggested_boundary:outline,pitch_outline:{method:"painted_lines"}};
 const proposal=pitchProposal(lined,"b".repeat(64))!;
 expect(proposal).toBeDefined();
 const withProposal={...camera,proposal};
 const live=boundaryAt(withProposal,[],[{time_s:0,points}],0.5)!;
 expect(live).not.toEqual(points);
 expect(live.length).toBeGreaterThanOrEqual(3);
 // A human correction in this shot still wins.
 const corrected=points.map(([x,y])=>[x,y+0.05] as [number,number]);
 expect(boundaryAt(withProposal,[{time_s:0,points:corrected}],[],0.5)).toEqual(corrected);
 // Colour envelopes are not presented as a line-based proposal; nor is another video's atlas.
 expect(pitchProposal({...base,suggested_boundary:outline},"b".repeat(64))).toBeUndefined();
 expect(pitchProposal(lined,"c".repeat(64))).toBeUndefined();
});

it("projects the reviewed halfway line into the live frame, else the line-based proposal's",async()=>{
 const {halfwayAt}=await import("./boundary");
 const {rayPanorama}=await import("./atlasGeometry");
 const base={panorama_id:"a".repeat(64),source_sha256:"b".repeat(64),image:"pitch_atlas.jpg",width:2400,height:900,times:[0,1,2],cuts:[false,true],frame_to_panorama:[id,id,id],frame_to_world:[id,id,id],projection:{kind:"cylindrical" as const,origin:[-1,-.5] as [number,number],span:[2,1.5] as [number,number]},keyframe_times:[0],suggested_boundary:[[.3,.5],[.7,.5],[.7,.9],[.3,.9]] as [number,number][]};
 const at=(x:number,y:number)=>rayPanorama(base,[x,y,1]);
 const proposed=[at(.4,.2),at(.45,.9)],reviewed=[at(.6,.3),at(.55,.8)];
 const lined={...base,pitch_outline:{method:"painted_lines",halfway:proposed}};
 const {pitchProposal,bindPanorama}=await import("./panorama");
 const live=halfwayAt({...camera,proposal:pitchProposal(lined,"b".repeat(64))},.5)!;
 expect(live[0][0]).toBeCloseTo(.4,4);expect(live[0][1]).toBeCloseTo(.2,4);
 expect(live[live.length-1][0]).toBeCloseTo(.45,4);expect(live[live.length-1][1]).toBeCloseTo(.9,4);
 const accepted=bindPanorama(lined,{panorama_id:lined.panorama_id,points:lined.suggested_boundary,halfway:reviewed,accepted:true},"b".repeat(64));
 const mine=halfwayAt({...camera,panorama:accepted,proposal:pitchProposal(lined,"b".repeat(64))},.5)!;
 expect(mine[0][0]).toBeCloseTo(.6,4);expect(mine[mine.length-1][1]).toBeCloseTo(.8,4);
 expect(halfwayAt(camera,.5)).toBeNull();
});
