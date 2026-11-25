import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import VideoLabPage from "../../pages/VideoLabPage";
import { renderWithProviders } from "../../test/render";
const points=[[0,1],[1,1],[1,0.4],[0.7,0.2],[0.3,0.1],[0,0.3]];
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});
it("automatically shows suggested boundary and lets the owner add/remove/save vertices without changing metre calibration",async()=>{
 let saved:Record<string,unknown>|undefined;
 const id="a".repeat(32),hash="b".repeat(64);
 vi.spyOn(HTMLMediaElement.prototype,"pause").mockImplementation(()=>undefined);
 vi.stubGlobal("fetch",vi.fn(async(url:string,init?:RequestInit)=>{
  if(url.endsWith("/me"))return Response.json({csrf_token:"fake"});
  if(url.endsWith("/samples"))return Response.json([]);
  if(init?.method==="PUT"){saved=JSON.parse(init.body as string);return Response.json({...saved,revision:2});}
  if(url.endsWith("/review"))return Response.json({revision:1,source_sha256:hash});
  if(url.endsWith("camera_motion.json"))return Response.json({source_sha256:hash,times:[0,1],steps:[[1,0,0,0,1,0,0,0,1]],cuts:[false],pitch_boundaries:[{time_s:0,points}]});
  if(url.endsWith("team_assignments.json"))return Response.json({image_width:1920,image_height:1080,observations:[]});
  const job={id,state:"complete",progress:1,summary:{source_sha256:hash},artifacts:["sample.mp4","camera_motion.json","team_assignments.json"]};
  return Response.json(url.endsWith("/jobs")?[job]:job);
 }));
 renderWithProviders(<VideoLabPage/>);
 expect(await screen.findByText(/Automatic boundary · review suggested/)).toBeInTheDocument();
 await userEvent.click(screen.getByRole("button",{name:"Edit boundary here"}));
 expect(screen.getAllByRole("slider",{name:/Boundary point/})).toHaveLength(6);
 await userEvent.click(screen.getByRole("button",{name:"Add boundary point"}));
 expect(screen.getAllByRole("slider",{name:/Boundary point/})).toHaveLength(7);
 await userEvent.click(screen.getByRole("button",{name:"Remove selected point"}));
 expect(screen.getAllByRole("slider",{name:/Boundary point/})).toHaveLength(6);
 await userEvent.click(screen.getByRole("button",{name:"Save boundary correction"}));
 await waitFor(()=>expect(saved?.pitch_boundaries).toEqual([{time_s:0,points}]),{timeout:3000});
 expect(saved?.pitch_keyframes).toEqual([]);
});

it("does not display automatic boundaries when both source hashes are absent",async()=>{
 const id="c".repeat(32);
 vi.stubGlobal("fetch",vi.fn(async(url:string)=>{
  if(url.endsWith("/samples"))return Response.json([]);
  if(url.endsWith("/review"))return Response.json({revision:0});
  if(url.endsWith("camera_motion.json"))return Response.json({times:[0,1],steps:[[1,0,0,0,1,0,0,0,1]],cuts:[false],pitch_boundaries:[{time_s:0,points}]});
  const job={id,state:"complete",progress:1,artifacts:["camera_motion.json"]};
  return Response.json(url.endsWith("/jobs")?[job]:job);
 }));
 renderWithProviders(<VideoLabPage/>);
 expect(await screen.findByText("Prepare camera tracking to generate an automatic boundary")).toBeInTheDocument();
 expect(screen.queryByText("Automatic boundary · review suggested")).not.toBeInTheDocument();
});
