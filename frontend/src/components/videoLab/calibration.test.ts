import { expect, it } from "vitest";
import * as geometry from "./pitch";
import { toPitch } from "./metres";

it("fits extra known pitch landmarks and refuses degenerate geometry", () => {
  const fit = (geometry as unknown as { fitLandmarks?: (p: { image: [number,number]; pitch: [number,number] }[]) => number[] | null }).fitLandmarks;
  expect(fit, "More than four image/pitch correspondences must be usable").toBeTypeOf("function");
  const points = [[0,0],[1,0],[1,1],[0,1],[0.5,0],[0.5,1],[0.5,0.5]] as [number,number][];
  const h = fit!(points.map(p => ({ pitch: p, image: [p[0] * 0.8 + 0.1, p[1] * 0.6 + 0.2] })))!;
  expect(toPitch(h, [0.5, 0.5])[0]).toBeCloseTo(0.5, 5);
  expect(toPitch(h, [0.5, 0.5])[1]).toBeCloseTo(0.5, 5);
  expect(fit!(points.map(p => ({ pitch: p, image: [0.5, 0.5] })))).toBeNull();
});

it("extra landmarks correct the outline and camera motion still carries it", () => {
  const camera = geometry.buildCamera({times:[0,1], steps:[[1,0,-0.1,0,1,0,0,0,1]], cuts:[false]});
  const mark = {time_s:0,corners:[[0,0],[1,0],[1,1],[0,1]] as [number,number][], landmarks:[
    {image:[0.5,0.1] as [number,number],pitch:[0.5,0] as [number,number]},
  ]};
  const outline=geometry.outlineAt(camera,[mark],1)!;
  expect(outline[0][1]).toBeGreaterThan(0.01);
  expect(outline[0][0]).toBeLessThan(0);
});

it("anchors a correction at the exact paused time between camera samples",()=>{
 const camera=geometry.buildCamera({times:[0,1],steps:[[1,0,-0.1,0,1,0,0,0,1]],cuts:[false]});
 const corners:[[number,number],[number,number],[number,number],[number,number]]=[[0.1,0.9],[0.9,0.9],[0.9,0.1],[0.1,0.1]];
 expect(geometry.outlineAt(camera,[{time_s:0.5,corners,landmarks:[]}],0.5)![0][0]).toBeCloseTo(0.1);
});

it("fits visible corners plus halfway points without trusting guessed offscreen corners",()=>{
 const camera=geometry.buildCamera({times:[0],steps:[],cuts:[]});
 const mark={time_s:0,corners:[[0.1,0.9],[0.6,0.8],[0.6,0.2],[0.1,0.1]] as [number,number][],fit_corner_indices:[0,3],landmarks:[
  {image:[0.5,0.9] as [number,number],pitch:[0.5,0] as [number,number]},
  {image:[0.5,0.1] as [number,number],pitch:[0.5,1] as [number,number]},
 ]};
 expect(geometry.outlineAt(camera,[mark],0)![1][0]).toBeCloseTo(0.9,5);
});
