import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import VideoLabPage from "../../pages/VideoLabPage";
import { renderWithProviders } from "../../test/render";

afterEach(()=>vi.unstubAllGlobals());
it("adds a fifth known point and saves its image/pitch correspondence",async()=>{
 let saved:Record<string,unknown>|undefined;
 const id="a".repeat(32),hash="b".repeat(64);
 vi.spyOn(HTMLMediaElement.prototype,"pause").mockImplementation(()=>undefined);
 vi.stubGlobal("fetch",vi.fn(async(url:string,init?:RequestInit)=>{
  if(url.endsWith("/me"))return Response.json({csrf_token:"fake"});
  if(url.endsWith("/samples"))return Response.json([]);
  if(init?.method==="PUT"){saved=JSON.parse(init.body as string);return Response.json({...saved,revision:2});}
  if(url.endsWith("/review"))return Response.json({revision:1,source_sha256:hash});
  if(url.endsWith("camera_motion.json"))return Response.json({times:[0,1],steps:[[1,0,0,0,1,0,0,0,1]],cuts:[false]});
  if(url.endsWith("team_assignments.json"))return Response.json({image_width:1920,image_height:1080,observations:[]});
  const job={id,state:"complete",progress:1,summary:{source_sha256:hash},artifacts:["sample.mp4","camera_motion.json","team_assignments.json"]};
  return Response.json(url.endsWith("/jobs")?[job]:job);
 }));
 renderWithProviders(<VideoLabPage/>);
 await userEvent.click(await screen.findByRole("button",{name:"Mark pitch here"}));
 await userEvent.click(screen.getByRole("button",{name:"Add calibration point"}));
 expect(screen.getByRole("slider",{name:"Near halfway intersection"})).toBeInTheDocument();
 await userEvent.click(screen.getByRole("button",{name:"Save pitch mark"}));
 await waitFor(()=>expect(saved?.pitch_keyframes).toEqual([{time_s:0,corners:expect.any(Array),landmarks:[{name:"Near halfway intersection",pitch:[0.5,0],image:expect.any(Array)}]}]),{timeout:3000});
});
