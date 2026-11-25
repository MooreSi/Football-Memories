import {screen,waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {afterEach,expect,it,vi} from "vitest";
import {renderWithProviders} from "../../test/render";
import VideoLabPage from "../../pages/VideoLabPage";
const points=[[.1,.9],[.9,.9],[.8,.2],[.2,.2]];
afterEach(()=>vi.unstubAllGlobals());
it("only applies the stitched boundary after acceptance and saves it in the review",async()=>{
 let saved:Record<string,unknown>|undefined;
 const id="a".repeat(32),hash="b".repeat(64),panoramaId="c".repeat(64);
 vi.stubGlobal("fetch",vi.fn(async(url:string,init?:RequestInit)=>{
  if(url.endsWith("/me"))return Response.json({csrf_token:"synthetic"});
  if(url.endsWith("/samples"))return Response.json([]);
  if(init?.method==="PUT"){saved=JSON.parse(init.body as string);return Response.json({...saved,revision:2});}
  if(url.endsWith("/review"))return Response.json({revision:1,source_sha256:hash});
  if(url.endsWith("camera_motion.json"))return Response.json({source_sha256:hash,times:[0,1],steps:[[1,0,0,0,1,0,0,0,1]],cuts:[false]});
  if(url.endsWith("pitch_panorama.json"))return Response.json({panorama_id:panoramaId,source_sha256:hash,width:1600,height:600,image:"pitch_panorama.jpg",times:[0,1],cuts:[false],frame_to_panorama:[[1,0,0,0,1,0,0,0,1],[1,0,0,0,1,0,0,0,1]],suggested_boundary:points,keyframe_times:[0,1]});
  if(url.endsWith("team_assignments.json"))return Response.json({image_width:1920,image_height:1080,observations:[]});
  const job={id,state:"complete",progress:1,summary:{source_sha256:hash},artifacts:["sample.mp4","camera_motion.json","team_assignments.json","pitch_panorama.json","pitch_panorama.jpg"]};
  return Response.json(url.endsWith("/jobs")?[job]:job);
 }));
 renderWithProviders(<VideoLabPage/>);
 expect(await screen.findByRole("img",{name:"Stitched pitch panorama"})).toBeInTheDocument();
 expect(screen.queryByLabelText("Pitch outline",{selector:"polygon"})).toBeNull();
 await userEvent.click(screen.getByRole("button",{name:"Accept boundary for this video"}));
 await waitFor(()=>expect(saved?.pitch_panorama).toEqual({panorama_id:panoramaId,points,corners:null,accepted:true}),{timeout:3000});
 expect(screen.getByLabelText("Pitch outline",{selector:"polygon"})).toBeInTheDocument();
});
