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
